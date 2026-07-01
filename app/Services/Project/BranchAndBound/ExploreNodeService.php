<?php

namespace App\Services\Project\BranchAndBound;

use App\Models\Project;
use App\Services\Project\Core\LinearProgrammingCoreService;
use App\Services\Project\ProjectService;
use App\Services\Project\Support\ProjectAnalysisSupportService;

class ExploreNodeService
{

    private const MAX_NODES = 64;
    private const MAX_DEPTH = 20;

        // Função __construct respons?vel por executar esta etapa do service.
    public function __construct(
        protected LinearProgrammingCoreService $core,
        protected ProjectService $projectService,
        protected FormatBoundService $formatBoundService,
        protected BranchAndBoundService $branchAndBoundService,
        protected ProjectAnalysisSupportService $analysisSupport
    ) {}

    // Função exploreNode responsável por executar esta etapa do service.
    public function exploreNode(
        Project $project,
        array $extraConstraints,
        ?int $parentId,
        int $depth,
        array &$iterations,
        array &$summary,
        ?array &$bestSolution,
        int &$nextId
    ): void 
    {
        if ($summary['nodes_explored'] >= self::MAX_NODES || $depth > self::MAX_DEPTH) {
            $summary['termination_reason'] ??= 'limit';
            return;
        }

        $nodeId = ++$nextId;
        $summary['nodes_explored']++;
        $summary['max_depth'] = max($summary['max_depth'], $depth);

        $constraints = array_merge($this->analysisSupport->formatConstraints($project), $extraConstraints);
        $relaxation = $this->core->solveSimplex(
            $project->objectiveFunction->coefficients,
            $constraints,
            $project->optimization_type->value,
            [
                'store_iterations' => false,
                'detect_multiple_solutions' => false,
                'max_iterations' => 100,
            ]
        );

        $record = [
            'iteration' => count($iterations) + 1,
            'node_id' => $nodeId,
            'parent_id' => $parentId,
            'depth' => $depth,
            'status' => $relaxation['status'] ?? 'unknown',
            'objective_value' => $relaxation['objective_value'] ?? null,
            'solution' => $relaxation['solution'] ?? [],
            'branch_variable' => null,
            'branch_value' => null,
            'new_bound' => $this->formatBoundService->formatLatestBound($extraConstraints),
            'pruned_reason' => null,
        ];

        if (in_array($relaxation['status'], ['infeasible', 'unbounded', 'iteration_limit', 'cycled'], true)) {
            $record['status'] = 'pruned';
            $record['pruned_reason'] = $relaxation['status'];
            $summary['pruned_nodes']++;
            $summary['termination_reason'] ??= $relaxation['status'];
            $iterations[] = $record;
            return;
        }

        if ($this->branchAndBoundService->cannotBeatIncumbent($project, $bestSolution, $relaxation)) {
            $record['status'] = 'pruned';
            $record['pruned_reason'] = 'bound_not_better';
            $summary['pruned_nodes']++;
            $iterations[] = $record;
            return;
        }

        if ($this->branchAndBoundService->isIntegerSolution($record['solution'])) {
            $record['status'] = 'integer';
            $summary['integer_nodes']++;
            $this->branchAndBoundService->updateBestSolution($bestSolution, $record, $project);
            $iterations[] = $record;
            return;
        }
        $fractional = $this->branchAndBoundService->findFractionalVariable($record['solution']);
        //pq tem isso? 
        if ($fractional === null) {
            $record['status'] = 'integer';
            $summary['integer_nodes']++;
            $this->branchAndBoundService->updateBestSolution($bestSolution, $record, $project);
            $iterations[] = $record;
            return;
        }

        $record['status'] = 'branch';
        $record['branch_variable'] = $fractional['name'];
        $record['branch_value'] = $fractional['value'];
        $summary['branched_nodes']++;
        $iterations[] = $record;

        $leftConstraints = $extraConstraints;
        $leftConstraints[] = $this->formatBoundService->buildBoundConstraint(
            $fractional['index'],
            '<=',
            floor($fractional['value']),
            $project->num_variables
        );

        $rightConstraints = $extraConstraints;
        $rightConstraints[] = $this->formatBoundService->buildBoundConstraint(
            $fractional['index'],
            '>=',
            ceil($fractional['value']),
            $project->num_variables
        );

        $this->exploreNode(
            $project,
            $leftConstraints,
            $nodeId,
            $depth + 1,
            $iterations,
            $summary,
            $bestSolution,
            $nextId
        );

        $this->exploreNode(
            $project,
            $rightConstraints,
            $nodeId,
            $depth + 1,
            $iterations,
            $summary,
            $bestSolution,
            $nextId
        );
    }
}