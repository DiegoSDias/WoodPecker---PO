<?php

namespace App\Services\Project\Simplex;

use App\Models\Project;
use App\Services\Project\Core\LinearProgrammingCoreService;
use App\Services\Project\ProjectService;
use App\Services\Project\Support\ProjectAnalysisSupportService;

class SimplexService
{
    // Injeta o núcleo de cálculo, o service de projetos e o apoio compartilhado de análise.
    public function __construct(
        protected LinearProgrammingCoreService $core,
        protected ProjectService $projectService,
        protected ProjectAnalysisSupportService $analysisSupport
    ) {
    }

    // Executa o simplex, salva a solução e devolve o resultado no formato esperado pelo front.
    public function solve(Project $project): array
    {
        $project = $this->projectService->load($project);

        $result = $this->core->solveSimplexWithHistory(
            $project->objectiveFunction->coefficients,
            $this->analysisSupport->formatConstraints($project),
            $project->optimization_type->value
        );

        $solution = $this->projectService->persistSolution(
            $project,
            'simplex',
            $result
        );

        // Mantém o identificador salvo para o front continuar lendo a solução persistida.
        $result['saved_solution_id'] = $solution->id;

        return $result;
    }
}
