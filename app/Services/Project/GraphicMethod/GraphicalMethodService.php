<?php

namespace App\Services\Project\GraphicMethod;

use App\Models\Project;
use App\Services\Project\Core\LinearProgrammingCoreService;
use App\Services\Project\Support\ProjectAnalysisSupportService;
use App\Services\Project\ProjectService;
use RuntimeException;

class GraphicalMethodService
{

    // Funcao __construct responsavel por preparar as dependencias usadas no metodo grafico.
    public function __construct(
        protected LinearProgrammingCoreService $core,
        protected ProjectService $projectService,
        protected ProjectAnalysisSupportService $analysisSupport
    ) {
    }

    // Executa o metodo principal do service e devolve o resultado final.
    public function solve(Project $project): array
    {
        $project = $this->projectService->load($project);

        if ((int) $project->num_variables !== 2) {
            throw new RuntimeException('O metodo grafico exige exatamente 2 variaveis.');
        }

        $constraints = $this->analysisSupport->formatConstraints($project);
        $objective = $project->objectiveFunction->coefficients;
        $intersections = $this->analysisSupport->buildIntersections($constraints);
        $feasibleVertices = $this->analysisSupport->filterFeasibleVertices($intersections, $constraints);
        $orderedVertices = $this->orderVertices($feasibleVertices);
        $optimalResult = $this->findOptimalResult(
            $orderedVertices,
            $objective,
            $project->optimization_type->value
        );
        $optimal = $optimalResult['optimal_solution'];

        $result = [
            'status' => $optimalResult['status'],
            'objective_value' => $optimalResult['objective_value'],
            'intersection_points' => $intersections,
            'vertices' => $orderedVertices,
            'objective_line' => $this->buildObjectiveLine($objective, $optimal),
            'optimal_solution' => $optimal,
            'optimal_vertices' => $optimalResult['optimal_vertices'],
            'optimal_segment' => $optimalResult['optimal_segment'],
            'has_multiple_solution' => $optimalResult['has_multiple_solution'],
            'solution' => $orderedVertices
        ];
  
        $solution = $this->projectService->persistSolution(
            $project,
            'graphical',
            $result
        );

        $result['saved_solution_id'] = $solution->id;

        return $result;
    }

    // Ordena os vertices em sentido angular para facilitar a renderizacao.
    private function orderVertices(array $vertices): array
    {
        if (empty($vertices)) {
            return [];
        }

        $centerX = array_sum(array_column($vertices, 'x')) / count($vertices);
        $centerY = array_sum(array_column($vertices, 'y')) / count($vertices);

        usort($vertices, function (array $left, array $right) use ($centerX, $centerY) {
            $angleLeft = atan2($left['y'] - $centerY, $left['x'] - $centerX);
            $angleRight = atan2($right['y'] - $centerY, $right['x'] - $centerX);

            return $angleLeft <=> $angleRight;
        });

        return array_values($vertices);
    }

    // Encontra o melhor vertice de acordo com o tipo de otimizacao.
    private function findOptimalResult(array $vertices, array $objective, string $optimizationType): array
    {
        $bestVertex = null;
        $bestValue = null;
        $bestVertices = [];

        foreach ($vertices as $vertex) {
            $value = ((float) $objective[0] * (float) $vertex['x'])
                + ((float) $objective[1] * (float) $vertex['y']);

            // entender melhor esses if
            if ($bestVertex === null) {
                $bestVertex = $vertex;
                $bestValue = $value;
                $bestVertices = [$vertex];
                continue;
            }

            if ($optimizationType === 'max' && $value > $bestValue + 1e-9) {
                $bestVertex = $vertex;
                $bestValue = $value;
                $bestVertices = [$vertex];
                continue;
            }

            if ($optimizationType === 'min' && $value < $bestValue - 1e-9) {
                $bestVertex = $vertex;
                $bestValue = $value;
                $bestVertices = [$vertex];
                continue;
            }

            if (abs($value - $bestValue) <= 1e-9) {
                $bestVertices[] = $vertex;
            }
        }

        if ($bestVertex === null) {
            return [
                'status' => 'infeasible',
                'objective_value' => null,
                'optimal_solution' => [
                    'status' => 'infeasible',
                    'message' => 'Nao foi possivel encontrar vertices viaveis.',
                ],
                'optimal_vertices' => [],
                'optimal_segment' => null,
                'has_multiple_solution' => false,
            ];
        }

        $optimalVertices = $this->cleanVertices($this->analysisSupport->uniquePoints($bestVertices));
        $hasMultipleSolution = count($optimalVertices) >= 2;

        return [
            'status' => $hasMultipleSolution ? 'multiple' : 'optimal',
            'objective_value' => $this->analysisSupport->sanitizeCoordinate($bestValue),
            'optimal_solution' => [
                'x1' => $this->analysisSupport->sanitizeCoordinate((float) $bestVertex['x']),
                'x2' => $this->analysisSupport->sanitizeCoordinate((float) $bestVertex['y']),
                'objective_value' => $this->analysisSupport->sanitizeCoordinate($bestValue),
                'status' => $hasMultipleSolution ? 'multiple' : 'optimal',
            ],
            'optimal_vertices' => $optimalVertices,
            'optimal_segment' => $hasMultipleSolution
                ? $this->buildOptimalSegment($optimalVertices)
                : null,
            'has_multiple_solution' => $hasMultipleSolution,
        ];
    }

    // Normaliza os vertices otimos para evitar ruido numerico.
    private function cleanVertices(array $vertices): array
    {
        return array_values(array_map(
            fn (array $vertex) => [
                'x' => $this->analysisSupport->sanitizeCoordinate((float) $vertex['x']),
                'y' => $this->analysisSupport->sanitizeCoordinate((float) $vertex['y']),
            ],
            $vertices
        ));
    }

    // Escolhe um segmento representativo quando a solucao otima e multipla.
    private function buildOptimalSegment(array $vertices): ?array
    {
        if (count($vertices) < 2) {
            return null;
        }

        $bestSegment = null;
        $bestDistance = -1.0;

        for ($firstIndex = 0; $firstIndex < count($vertices); $firstIndex++) {
            for ($secondIndex = $firstIndex + 1; $secondIndex < count($vertices); $secondIndex++) {
                $first = $vertices[$firstIndex];
                $second = $vertices[$secondIndex];
                $distance = (($first['x'] - $second['x']) ** 2)
                    + (($first['y'] - $second['y']) ** 2);

                if ($distance > $bestDistance) {
                    $bestDistance = $distance;
                    $bestSegment = [
                        'start' => $first,
                        'end' => $second,
                    ];
                }
            }
        }

        return $bestSegment;
    }

    // Monta a linha de nivel da funcao objetivo para exibicao no grafico.
    private function buildObjectiveLine(array $objective, array $optimal): array
    {
        if (($optimal['status'] ?? null) === 'infeasible') {
            return [
                'coefficients' => $objective,
                'z' => null,
            ];
        }

        return [
            'coefficients' => $objective,
            'z' => $optimal['objective_value'] ?? null,
        ];
    }
}