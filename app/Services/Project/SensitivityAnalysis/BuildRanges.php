<?php

namespace App\Services\Project\SensitivityAnalysis;

use App\Models\Project;
use App\Services\Project\Core\LinearProgrammingCoreService;
use App\Services\Project\ProjectService;
use App\Services\Project\Support\ProjectAnalysisSupportService;

class BuildRanges
{
    private const EPSILON = 1e-5;

    // Fun??o __construct respons?vel por executar esta etapa do service.
    public function __construct(
        protected SensitivityAnalysisService $sensitivityAnalysis,
        protected LinearProgrammingCoreService $core,
        protected ProjectService $projectService,
        protected ProjectAnalysisSupportService $analysisSupport,
    ) {}

    public function buildObjectiveRanges(
        array $coefficients,
        array $reducedCosts,
        array $constraints,
        array $solution,
        string $optimizationType
    ): array {
        $twoVariableRanges = $this->buildTwoVariableObjectiveRanges(
            $coefficients,
            $constraints,
            $solution,
            $optimizationType
        );

        if (! empty($twoVariableRanges)) {
            return $twoVariableRanges;
        }

        $ranges = [];

        foreach ($coefficients as $index => $value) {
            $name = 'x' . ($index + 1);
            $reducedCost = (float) ($reducedCosts[$name] ?? 0.0);

            $ranges[$name] = [
                'variable' => strtoupper($name),
                'current_coefficient' => $this->sensitivityAnalysis->roundNumber((float) $value),
                'reduced_cost' => $this->sensitivityAnalysis->roundNumber($reducedCost),
                'allowable_increase' => abs($reducedCost) > self::EPSILON
                    ? $this->sensitivityAnalysis->roundNumber(abs($reducedCost))
                    : null,
                'allowable_decrease' => abs($reducedCost) > self::EPSILON
                    ? $this->sensitivityAnalysis->roundNumber(abs($reducedCost))
                    : null,
            ];
        }

        return $ranges;
    }

    // Calcula os intervalos da funcao objetivo para problemas com duas variaveis.
    private function buildTwoVariableObjectiveRanges(
        array $coefficients,
        array $constraints,
        array $solution,
        string $optimizationType
    ): array {
        if (
            count($coefficients) !== 2
            || ! isset($solution['x1'], $solution['x2'])
        ) {
            return [];
        }

        $points = $this->analysisSupport->buildIntersections($constraints);
        $vertices = $this->analysisSupport->filterFeasibleVertices($points, $constraints);

        if (empty($vertices)) {
            return [];
        }

        $currentPoint = [
            (float) $solution['x1'],
            (float) $solution['x2'],
        ];

        $rows = [];

        foreach ($coefficients as $targetIndex => $coefficient) {
            $range = $this->sensitivityAnalysis->calculateObjectiveCoefficientRange(
                $coefficients,
                $vertices,
                $currentPoint,
                $targetIndex,
                $optimizationType
            );

            if ($range === null) {
                return [];
            }

            $currentCoefficient = (float) $coefficient;
            $minimum = $range['minimum'];
            $maximum = $range['maximum'];

            $rows['x' . ($targetIndex + 1)] = [
                'variable' => 'X' . ($targetIndex + 1),
                'current_coefficient' => $this->sensitivityAnalysis->roundNumber($currentCoefficient),
                'reduced_cost' => 0.0,
                'allowable_increase' => $maximum === null
                    ? null
                    : $this->roundNullableNumber($maximum - $currentCoefficient),
                'allowable_decrease' => $minimum === null
                    ? null
                    : $this->roundNullableNumber($currentCoefficient - $minimum),
                'minimum' => $this->roundNullableNumber($minimum),
                'maximum' => $this->roundNullableNumber($maximum),
            ];
        }

        return $rows;
    }

    // Monta os intervalos de variacao do lado direito de cada restricao.
    public function buildRhsRangeRows(
        array $constraints,
        array $solution,
        array $shadowPrices
    ): array {
        $ranges = [];

        $numberOfVariables = $this->countDecisionVariablesFromConstraints($constraints);

        foreach ($constraints as $index => $constraint) {
            $rhs = (float) $constraint['rhs_value'];
            $lhs = $this->sensitivityAnalysis->calculateLhs($constraint, $solution);

            $slack = match ($constraint['operator']) {
                '<=' => $rhs - $lhs,
                '>=' => $lhs - $rhs,
                default => abs($lhs - $rhs),
            };

            $isActive = abs($slack) <= self::EPSILON;

            if ($isActive) {
                $range = $this->buildActiveConstraintRhsRange(
                    $constraints,
                    $solution,
                    $index,
                    $numberOfVariables
                );
            } else {
                $range = $this->buildInactiveConstraintRhsRange(
                    $constraint,
                    $rhs,
                    $lhs
                );
            }

            $minimum = $range['minimum'];
            $maximum = $range['maximum'];

            $ranges['c' . ($index + 1)] = [
                'restriction' => 'R' . ($index + 1),
                'current_rhs' => $this->sensitivityAnalysis->roundNumber($rhs),
                'slack' => $this->sensitivityAnalysis->roundNumber($slack),
                'shadow_price' => $this->sensitivityAnalysis->roundNumber(
                    (float) ($shadowPrices['y' . ($index + 1)] ?? 0.0)
                ),
                'allowable_increase' => $maximum === null
                    ? null
                    : $this->sensitivityAnalysis->roundNumber($maximum - $rhs),
                'allowable_decrease' => $minimum === null
                    ? null
                    : $this->sensitivityAnalysis->roundNumber($rhs - $minimum),
                'minimum' => $minimum === null
                    ? null
                    : $this->sensitivityAnalysis->roundNumber($minimum),
                'maximum' => $maximum === null
                    ? null
                    : $this->sensitivityAnalysis->roundNumber($maximum),
                'minimum_label' => $minimum === null
                    ? 'Sem limite inferior'
                    : $this->sensitivityAnalysis->cleanValue((float) $minimum),
                'maximum_label' => $maximum === null
                    ? 'Sem limite superior'
                    : $this->sensitivityAnalysis->cleanValue((float) $maximum),
            ];
        }

        return $ranges;
    }

    // Calcula o intervalo de RHS para restricoes que nao estao ativas.
    private function buildInactiveConstraintRhsRange(
        array $constraint,
        float $rhs,
        float $lhs
    ): array {
        return match ($constraint['operator']) {
            '<=' => [
                'minimum' => $lhs,
                'maximum' => null,
            ],
            '>=' => [
                'minimum' => null,
                'maximum' => $lhs,
            ],
            default => [
                'minimum' => $rhs,
                'maximum' => $rhs,
            ],
        };
    }

    // Calcula o intervalo de RHS para restricoes ativas.
    private function buildActiveConstraintRhsRange(
        array $constraints,
        array $solution,
        int $targetConstraintIndex,
        int $numberOfVariables
    ): array {
        $currentRhs = (float) $constraints[$targetConstraintIndex]['rhs_value'];

        if ($numberOfVariables !== 2) {
            return [
                'minimum' => $currentRhs,
                'maximum' => $currentRhs,
            ];
        }

        $basisIndexes = $this->sensitivityAnalysis->findTwoVariableBasis(
            $constraints,
            $solution,
            $targetConstraintIndex
        );

        if ($basisIndexes === null) {
            return [
                'minimum' => $currentRhs,
                'maximum' => $currentRhs,
            ];
        }

        [$firstBasisIndex, $secondBasisIndex] = $basisIndexes;

        $basisMatrix = [
            [
                (float) $constraints[$firstBasisIndex]['coefficients'][0],
                (float) $constraints[$firstBasisIndex]['coefficients'][1],
            ],
            [
                (float) $constraints[$secondBasisIndex]['coefficients'][0],
                (float) $constraints[$secondBasisIndex]['coefficients'][1],
            ],
        ];

        $inverse = $this->sensitivityAnalysis->invertTwoByTwoMatrix($basisMatrix);

        if ($inverse === null) {
            return [
                'minimum' => $currentRhs,
                'maximum' => $currentRhs,
            ];
        }

        if ($targetConstraintIndex === $firstBasisIndex) {
            $deltaVector = [
                $inverse[0][0],
                $inverse[1][0],
            ];
        } elseif ($targetConstraintIndex === $secondBasisIndex) {
            $deltaVector = [
                $inverse[0][1],
                $inverse[1][1],
            ];
        } else {
            return [
                'minimum' => $currentRhs,
                'maximum' => $currentRhs,
            ];
        }

        $currentX = [
            (float) ($solution['x1'] ?? 0.0),
            (float) ($solution['x2'] ?? 0.0),
        ];

        $deltaMin = -1 * INF;
        $deltaMax = INF;

        foreach ($constraints as $constraintIndex => $constraint) {
            if ($constraintIndex === $targetConstraintIndex) {
                continue;
            }

            $a1 = (float) $constraint['coefficients'][0];
            $a2 = (float) $constraint['coefficients'][1];
            $constraintRhs = (float) $constraint['rhs_value'];

            $currentValue = $a1 * $currentX[0] + $a2 * $currentX[1];
            $sensitivity = $a1 * $deltaVector[0] + $a2 * $deltaVector[1];

            if (abs($sensitivity) <= self::EPSILON) {
                continue;
            }

            $limit = ($constraintRhs - $currentValue) / $sensitivity;

            if ($constraint['operator'] === '<=') {
                if ($sensitivity > 0) {
                    $deltaMax = min($deltaMax, $limit);
                } else {
                    $deltaMin = max($deltaMin, $limit);
                }
            }

            if ($constraint['operator'] === '>=') {
                if ($sensitivity > 0) {
                    $deltaMin = max($deltaMin, $limit);
                } else {
                    $deltaMax = min($deltaMax, $limit);
                }
            }

            if ($constraint['operator'] === '=') {
                $deltaMin = max($deltaMin, $limit);
                $deltaMax = min($deltaMax, $limit);
            }
        }

        foreach ([0, 1] as $variableIndex) {
            $sensitivity = $deltaVector[$variableIndex];

            if (abs($sensitivity) <= self::EPSILON) {
                continue;
            }

            $limit = -$currentX[$variableIndex] / $sensitivity;

            if ($sensitivity > 0) {
                $deltaMin = max($deltaMin, $limit);
            } else {
                $deltaMax = min($deltaMax, $limit);
            }
        }

        return [
            'minimum' => is_infinite($deltaMin) ? null : $currentRhs + $deltaMin,
            'maximum' => is_infinite($deltaMax) ? null : $currentRhs + $deltaMax,
        ];
    }

    // ver se realmente precisa dessa função
    private function roundNullableNumber(float|int|string|null $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        return $this->sensitivityAnalysis->roundNumber($value);
    }

    // Conta quantas variaveis de decisao existem nas restricoes.
    private function countDecisionVariablesFromConstraints(array $constraints): int
    {
        $max = 0;

        foreach ($constraints as $constraint) {
            $max = max($max, count($constraint['coefficients'] ?? []));
        }

        return $max;
    }
}
