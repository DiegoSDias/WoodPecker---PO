<?php

namespace App\Services\Project\BranchAndBound;

use App\Models\Project;
use App\Services\Project\Core\LinearProgrammingCoreService;
use App\Services\Project\ProjectService;

class BranchAndBoundService
{
    private const EPSILON = 1e-6;

    // Função __construct respons?vel por executar esta etapa do service.
    public function __construct(
        protected LinearProgrammingCoreService $core,
        protected ProjectService $projectService,
        protected ExploreNodeService $exploreNodeService,
        protected FormatBoundService $formatBoundService,
    ) {}

    // Executa o metodo principal do service e devolve o resultado final.
    public function solve(Project $project): array
    {
        $project = $this->projectService->load($project);

        $iterations = [];
        $summary = [
            'nodes_explored' => 0,
            'branched_nodes' => 0,
            'integer_nodes' => 0,
            'pruned_nodes' => 0,
            'max_depth' => 0,
            'termination_reason' => null,
        ];

        $bestSolution = null;
        $nextId = 0;

        $this->exploreNodeService->exploreNode(
            $project,
            [],
            null,
            0,
            $iterations,
            $summary,
            $bestSolution,
            $nextId
        );

        $result = [
            'status' => $this->resolveStatus($bestSolution, $summary),
            'summary' => $this->buildSummary($summary, $bestSolution),
            'best_solution' => $this->formatBoundService->formatBestSolution($bestSolution),
            'best_path_ids' => $this->buildBestPathIds($iterations, $bestSolution['node_id'] ?? null),
            'iterations' => $iterations,
            'solution' => $this->formatBoundService->formatBestSolution($bestSolution)
        ];

        $solution = $this->projectService->persistSolution(
            $project,
            'integer',
            $result
        );

        $result['saved_solution_id'] = $solution->id;

        return $result;
    }

    // Verifica se a solucao atual ja possui apenas valores inteiros.
    public function isIntegerSolution(array $solution): bool
    {
        foreach ($solution as $value) {
            if (abs($value - round($value)) > self::EPSILON) {
                return false;
            }
        }

        return true;
    }

    // Localiza a variavel fracionaria mais relevante para ramificar.
    public function findFractionalVariable(array $solution): ?array
    {
        $bestIndex = null;
        $bestFraction = 0.0;

        foreach ($solution as $name => $value) {
            $fraction = abs($value - round($value));
            if ($fraction <= self::EPSILON) {
                continue;
            }

            if ($fraction > $bestFraction) {
                $bestFraction = $fraction;
                $bestIndex = (int) substr($name, 1) - 1;
            }
        }

        if ($bestIndex === null) {
            return null;
        }

        $variableName = 'x' . ($bestIndex + 1);

        return [
            'index' => $bestIndex,
            'name' => $variableName,
            'value' => (float) $solution[$variableName],
        ];
    }

    // Atualiza a melhor solucao inteira encontrada ate o momento.
    public function updateBestSolution(?array &$bestSolution, array $record, Project $project): void
    {
        $candidate = [
            'node_id' => $record['node_id'],
            'parent_id' => $record['parent_id'],
            'depth' => $record['depth'],
            'objective_value' => $record['objective_value'],
            'solution' => $record['solution'],
        ];

        if ($bestSolution === null) {
            $bestSolution = $candidate;
            return;
        }

        $current = (float) $candidate['objective_value'];
        $best = (float) $bestSolution['objective_value'];

        if ($project->optimization_type->value === 'max' && $current > $best + self::EPSILON) {
            $bestSolution = $candidate;
        }

        if ($project->optimization_type->value === 'min' && $current < $best - self::EPSILON) {
            $bestSolution = $candidate;
        }
    }

    // qual a função desse metodo?
    public function cannotBeatIncumbent(
        Project $project,
        ?array $bestSolution,
        array $relaxation
    ): bool 
    {
        if ($bestSolution === null) {
            return false;
        }

        $current = (float) ($relaxation['objective_value'] ?? 0.0);
        $best = (float) ($bestSolution['objective_value'] ?? 0.0);

        if ($project->optimization_type->value === 'max') {
            return $current <= $best + self::EPSILON;
        }

        return $current >= $best - self::EPSILON;
    }

    // Reconstrói o caminho da melhor solucao a partir da arvore explorada.
    private function buildBestPathIds(array $iterations, ?int $bestNodeId): array
    {
        if ($bestNodeId === null) {
            return [];
        }

        $parentMap = [];
        foreach ($iterations as $iteration) {
            $parentMap[$iteration['node_id']] = $iteration['parent_id'];
        }

        $path = [];
        $current = $bestNodeId;

        while ($current !== null && isset($parentMap[$current])) {
            $path[] = $current;
            $current = $parentMap[$current];
        }

        if ($current !== null) {
            $path[] = $current;
        }

        return array_reverse($path);
    }

    // Monta o resumo consolidado da exploracao da arvore.
    private function buildSummary(array $summary, ?array $bestSolution): array
    {
        return [
            'nodes_explored' => $summary['nodes_explored'],
            'branched_nodes' => $summary['branched_nodes'],
            'integer_nodes' => $summary['integer_nodes'],
            'pruned_nodes' => $summary['pruned_nodes'],
            'max_depth' => $summary['max_depth'],
            'termination_reason' => $summary['termination_reason'],
            'best_objective_value' => $bestSolution['objective_value'] ?? null,
        ];
    }


    // Define o status final do Branch and Bound.
    private function resolveStatus(?array $bestSolution, array $summary): string
    {
        if ($bestSolution !== null) {
            return 'optimal';
        }

        return $summary['termination_reason'] ?? 'no_integer_solution';
    }
}