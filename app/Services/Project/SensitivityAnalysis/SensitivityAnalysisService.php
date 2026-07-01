<?php

namespace App\Services\Project\SensitivityAnalysis;

use App\Models\Project;
use App\Services\Project\Core\LinearProgrammingCoreService;
use App\Services\Project\ProjectService;
use App\Services\Project\Support\ProjectAnalysisSupportService;

class SensitivityAnalysisService
{
    private const EPSILON = 1e-5;
    private const DECIMAL_PLACES = 2;

    // Fun??o __construct respons?vel por executar esta etapa do service.
    public function __construct(
        protected LinearProgrammingCoreService $core,
        protected ProjectService $projectService,
        protected ProjectAnalysisSupportService $analysisSupport,
        protected BuildRanges $buildRanges
    ) {}

    // Executa a analise de sensibilidade e monta o retorno final para o front.
    public function analyze(Project $project): array
    {
        $project = $this->projectService->load($project);

        $constraints = $this->analysisSupport->formatConstraints($project);

        $primal = $this->core->solveSimplex(
            $project->objectiveFunction->coefficients,
            $constraints,
            $project->optimization_type->value
        );

        $dualProblem = $this->core->buildDualProblem(
            $project->objectiveFunction->coefficients,
            $constraints,
            $project->optimization_type->value
        );

        $dual = $this->core->solveSimplex(
            $dualProblem['objective_function']['coefficients'],
            $dualProblem['constraints'],
            $dualProblem['optimization_type']
        );

        $shadowPrices = $this->analysisSupport->reconstructDualVariables(
            $dualProblem,
            $dual['solution'] ?? []
        );

        //tudo acima é igual ao inicio do metodo solve da class DualSimplexService

        $decisionVariables = $this->buildDecisionVariables($primal['solution'] ?? []);

        $shadowPriceRows = $this->buildShadowPriceRows(
            $constraints,
            $shadowPrices,
            $primal['solution'] ?? []
        );

        $reducedCostRows = $this->buildReducedCostRows(
            $project->objectiveFunction->coefficients,
            $primal['reduced_costs'] ?? [],
            $primal['solution'] ?? []
        );

        $objectiveRangeRows = $this->buildRanges->buildObjectiveRanges(
            $project->objectiveFunction->coefficients,
            $primal['reduced_costs'] ?? [],
            $constraints,
            $primal['solution'] ?? [],
            $project->optimization_type->value
        );

        $rhsRangeRows = $this->buildRanges->buildRhsRangeRows(
            $constraints,
            $primal['solution'] ?? [],
            $shadowPrices
        );

        $analysis = [
            'status' => $primal['status'] ?? 'optimal',
            'method_used' => 'sensitivity',
            'optimization_type' => $project->optimization_type->value,
            'objective_value' => $this->roundNumber($primal['objective_value'] ?? null),
            'primal_solution' => $decisionVariables,
            'variables' => $decisionVariables,
            'shadow_prices' => $shadowPriceRows,
            'reduced_costs' => $reducedCostRows,
            'objective_ranges' => $objectiveRangeRows,
            'rhs_ranges' => $rhsRangeRows,
            'active_constraints' => $this->extractConstraintNames(
                $shadowPriceRows,
                'Ativa'
            ),
            'slack_constraints' => $this->extractConstraintNames(
                $shadowPriceRows,
                'Folga'
            ),
            'summary' => $this->buildSummary(
                $project,
                $decisionVariables,
                $shadowPriceRows,
                $objectiveRangeRows,
                $rhsRangeRows,
                $primal['objective_value'] ?? null
            ),
        ];

        $solution = $this->projectService->persistSolution(
            $project,
            'sensitivity',
            $analysis
        );

        // acho que pode sair
        $analysis['saved_solution_id'] = $solution->id;

        return $analysis;
    }

    // Calcula o intervalo permitido para um coeficiente da funcao objetivo.
    //MUDAR
    public function calculateObjectiveCoefficientRange(
        array $coefficients,
        array $vertices,
        array $currentPoint,
        int $targetIndex,
        string $optimizationType
    ): ?array {
        $lower = -INF;
        $upper = INF;
        $otherIndex = $targetIndex === 0 ? 1 : 0;

        foreach ($vertices as $vertex) {
            $a = $currentPoint[$targetIndex] - (float) $vertex[$targetIndex];
            $b = ((float) $coefficients[$otherIndex] * (float) $vertex[$otherIndex])
                - ((float) $coefficients[$otherIndex] * $currentPoint[$otherIndex]);

            if (abs($a) <= self::EPSILON) {
                $isSatisfied = $optimizationType === 'max'
                    ? 0 >= $b - self::EPSILON
                    : 0 <= $b + self::EPSILON;

                if (! $isSatisfied) {
                    return null;
                }

                continue;
            }

            $limit = $b / $a;

            if ($optimizationType === 'max') {
                if ($a > 0) {
                    $lower = max($lower, $limit);
                } else {
                    $upper = min($upper, $limit);
                }
            } else {
                if ($a > 0) {
                    $upper = min($upper, $limit);
                } else {
                    $lower = max($lower, $limit);
                }
            }
        }

        return [
            'minimum' => is_infinite($lower) ? null : $lower,
            'maximum' => is_infinite($upper) ? null : $upper,
        ];
    }

    // Calcula o lado esquerdo de uma restricao usando a solucao atual.
    public function calculateLhs(array $constraint, array $solution): float
    {
        $lhs = 0.0;

        foreach (($constraint['coefficients'] ?? []) as $index => $coefficient) {
            $lhs += (float) $coefficient * (float) ($solution['x' . ($index + 1)] ?? 0.0);
        }

        return $lhs;
    }

    // Monta as linhas de custos reduzidos para a tela de sensibilidade.
    private function buildReducedCostRows(
        array $coefficients,
        array $reducedCosts,
        array $solution
    ): array {
        $rows = [];

        foreach ($coefficients as $index => $value) {
            $name = 'x' . ($index + 1);
            $reducedCost = (float) ($reducedCosts[$name] ?? 0.0);
            $variableValue = (float) ($solution[$name] ?? 0.0);

            $rows[] = [
                'variable' => strtoupper($name),
                'value' => $this->roundNumber($variableValue),
                'reducedCost' => $this->roundNumber($reducedCost),
                'interpretation' => abs($variableValue) > self::EPSILON
                    ? 'Variável básica'
                    : (abs($reducedCost) > self::EPSILON
                        ? 'Fora da base'
                        : 'Variável básica'),
            ];
        }

        return $rows;
    }

    // Monta as linhas dos precos-sombra e identifica restricoes ativas.
    private function buildShadowPriceRows(
        array $constraints,
        array $shadowPrices,
        array $solution
    ): array {
        $rows = [];

        foreach ($constraints as $index => $constraint) {
            $currentRhs = (float) $constraint['rhs_value'];
            $lhs = $this->calculateLhs($constraint, $solution);

            $slack = match ($constraint['operator']) {
                '<=' => $currentRhs - $lhs,
                '>=' => $lhs - $currentRhs,
                default => abs($lhs - $currentRhs),
            };

            $rows[] = [
                'restriction' => 'R' . ($index + 1),
                'current_rhs' => $this->roundNumber($currentRhs),
                'slack' => $this->roundNumber($slack),
                'shadowPrice' => $this->roundNumber(
                    (float) ($shadowPrices['y' . ($index + 1)] ?? 0.0)
                ),
                'status' => abs($slack) > self::EPSILON ? 'Folga' : 'Ativa',
            ];
        }

        return $rows;
    }

    // Identifica a base viavel usada no calculo bidimensional de sensibilidade.
    //MUDAR
    public function findTwoVariableBasis(
        array $constraints,
        array $solution,
        int $targetConstraintIndex
    ): ?array {
        $activeIndexes = [];

        foreach ($constraints as $index => $constraint) {
            $rhs = (float) $constraint['rhs_value'];
            $lhs = $this->calculateLhs($constraint, $solution);

            $slack = match ($constraint['operator']) {
                '<=' => $rhs - $lhs,
                '>=' => $lhs - $rhs,
                default => abs($lhs - $rhs),
            };

            if (abs($slack) <= self::EPSILON) {
                $activeIndexes[] = $index;
            }
        }

        if (! in_array($targetConstraintIndex, $activeIndexes, true)) {
            return null;
        }

        foreach ($activeIndexes as $firstIndex) {
            foreach ($activeIndexes as $secondIndex) {
                if ($firstIndex === $secondIndex) {
                    continue;
                }

                if (
                    $firstIndex !== $targetConstraintIndex
                    && $secondIndex !== $targetConstraintIndex
                ) {
                    continue;
                }

                $matrix = [
                    [
                        (float) $constraints[$firstIndex]['coefficients'][0],
                        (float) $constraints[$firstIndex]['coefficients'][1],
                    ],
                    [
                        (float) $constraints[$secondIndex]['coefficients'][0],
                        (float) $constraints[$secondIndex]['coefficients'][1],
                    ],
                ];

                if ($this->invertTwoByTwoMatrix($matrix) !== null) {
                    return [$firstIndex, $secondIndex];
                }
            }
        }

        return null;
    }

    // Inverte uma matriz 2x2 usada nos calculos de sensibilidade.
    //MUDAR
    public function invertTwoByTwoMatrix(array $matrix): ?array
    {
        $a = (float) $matrix[0][0];
        $b = (float) $matrix[0][1];
        $c = (float) $matrix[1][0];
        $d = (float) $matrix[1][1];

        $determinant = ($a * $d) - ($b * $c);

        if (abs($determinant) <= self::EPSILON) {
            return null;
        }

        return [
            [
                $d / $determinant,
                -$b / $determinant,
            ],
            [
                -$c / $determinant,
                $a / $determinant,
            ],
        ];
    }

    // Monta o conjunto de variaveis de decisao com arredondamento padrao.
    private function buildDecisionVariables(array $solution): array
    {
        $variables = [];

        foreach ($solution as $name => $value) {
            if (! preg_match('/^x\d+$/i', (string) $name)) {
                continue;
            }

            $variables[strtoupper((string) $name)] = $this->roundNumber((float) $value);
        }

        ksort($variables, SORT_NATURAL);

        return $variables;
    }

    // Extrai o nome das restricoes filtrando pelo status informado.
    private function extractConstraintNames(array $rows, string $status): array
    {
        return array_values(array_map(
            fn(array $row) => $row['restriction'],
            array_filter(
                $rows,
                fn(array $row) => ($row['status'] ?? null) === $status
            )
        ));
    }

    // Monta o resumo consolidado da exploracao da arvore.
    private function buildSummary(
        Project $project,
        array $decisionVariables,
        array $shadowPriceRows,
        array $objectiveRangeRows,
        array $rhsRangeRows,
        float|int|string|null $objectiveValue
    ): string {
        $optimization = strtolower($project->optimization_type->value);

        $variablesText = ! empty($decisionVariables)
            ? implode(', ', array_map(
                fn($value, $name) => $name . ' = ' . $this->cleanValue((float) $value),
                $decisionVariables,
                array_keys($decisionVariables)
            ))
            : 'sem variáveis ótimas identificadas';

        $activeConstraints = array_values(array_map(
            fn(array $row) => $row['restriction'],
            array_filter(
                $shadowPriceRows,
                fn(array $row) => ($row['status'] ?? null) === 'Ativa'
            )
        ));

        $slackConstraints = array_values(array_map(
            fn(array $row) => $row['restriction'],
            array_filter(
                $shadowPriceRows,
                fn(array $row) => ($row['status'] ?? null) === 'Folga'
            )
        ));

        $objectiveRangesText = count($objectiveRangeRows) > 0
            ? count($objectiveRangeRows) . ' intervalos de coeficientes analisados'
            : 'nenhum intervalo de coeficiente disponível';

        $rhsRangesText = count($rhsRangeRows) > 0
            ? count($rhsRangeRows) . ' intervalos de RHS analisados'
            : 'nenhum intervalo de RHS disponível';

        return sprintf(
            'A análise de sensibilidade para o problema de %s encontrou Z = %s, com %s. As restrições ativas são %s, enquanto as restrições com folga são %s. Também foram avaliados %s e %s, permitindo observar como pequenas variações nos coeficientes e nos lados direitos podem afetar a solução ótima.',
            $optimization,
            $this->cleanValue((float) ($objectiveValue ?? 0.0)),
            $variablesText,
            ! empty($activeConstraints) ? implode(', ', $activeConstraints) : 'nenhuma restrição ativa identificada',
            ! empty($slackConstraints) ? implode(', ', $slackConstraints) : 'nenhuma restrição com folga identificada',
            $objectiveRangesText,
            $rhsRangesText
        );
    }

    // Normaliza valores muito pequenos para zero e arredonda com precisao fixa.
    public function cleanValue(float $value): string
    {
        $roundedValue = $this->roundNumber($value);

        if (abs($roundedValue) < self::EPSILON) {
            return '0';
        }

        if (abs($roundedValue - round($roundedValue)) < self::EPSILON) {
            return (string) (int) round($roundedValue);
        }

        return rtrim(rtrim(number_format($roundedValue, 2, '.', ''), '0'), '.');
    }

    // Arredonda um valor para a quantidade fixa de casas usada na tela.
    public function roundNumber(float|int|string|null $value): float
    {
        if ($value === null || $value === '') {
            return 0.0;
        }

        $number = (float) $value;
        $rounded = round($number, self::DECIMAL_PLACES);

        if (abs($rounded) < self::EPSILON) {
            return 0.0;
        }

        return $rounded;
    }
}
