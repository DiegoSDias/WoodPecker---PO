<?php

namespace App\Services\Project\Core;

class ProblemBuilderService
{
    // Monta o problema dual a partir do problema primal informado.
    //DUAL
    public function buildDualProblem(
        array $objectiveCoefficients,
        array $constraints,
        string $optimizationType
    ): array {
        $objectiveCoefficients = $this->normalizeVector($objectiveCoefficients);
        $constraints = $this->normalizeConstraints($constraints);

        $primalVariableCount = count($objectiveCoefficients);
        $dualObjectiveType = $optimizationType === 'max' ? 'min' : 'max';

        $dualVariableMap = [];
        $dualObjectiveCoefficients = [];
        $transformedVariables = [];

        foreach ($constraints as $index => $constraint) {
            $dualVariableMap[$index] = [
                'type' => $this->dualVariableType(
                    $constraint['operator'],
                    $optimizationType
                ),
                'columns' => [],
            ];

            $rhs = (float) $constraint['rhs_value'];

            if ($dualVariableMap[$index]['type'] === 'positive') {
                $transformedVariables[] = [
                    'name' => 'y' . ($index + 1),
                    'constraint_index' => $index,
                    'sign' => 1.0,
                ];
                $dualVariableMap[$index]['columns'][] = count($transformedVariables) - 1;
                $dualObjectiveCoefficients[] = $rhs;
            } elseif ($dualVariableMap[$index]['type'] === 'negative') {
                $transformedVariables[] = [
                    'name' => 'y' . ($index + 1) . '_neg',
                    'constraint_index' => $index,
                    'sign' => -1.0,
                ];
                $dualVariableMap[$index]['columns'][] = count($transformedVariables) - 1;
                $dualObjectiveCoefficients[] = -$rhs;
            } else {
                $transformedVariables[] = [
                    'name' => 'y' . ($index + 1) . '_pos',
                    'constraint_index' => $index,
                    'sign' => 1.0,
                ];
                $dualVariableMap[$index]['columns'][] = count($transformedVariables) - 1;
                $dualObjectiveCoefficients[] = $rhs;

                $transformedVariables[] = [
                    'name' => 'y' . ($index + 1) . '_neg',
                    'constraint_index' => $index,
                    'sign' => -1.0,
                ];
                $dualVariableMap[$index]['columns'][] = count($transformedVariables) - 1;
                $dualObjectiveCoefficients[] = -$rhs;
            }
        }

        $dualConstraints = [];

        for ($variableIndex = 0; $variableIndex < $primalVariableCount; $variableIndex++) {
            $dualRow = [];

            foreach ($constraints as $constraintIndex => $constraint) {
                $coefficient = (float) $constraint['coefficients'][$variableIndex];
                $dualType = $dualVariableMap[$constraintIndex]['type'];

                if ($dualType === 'positive') {
                    $dualRow[] = $coefficient;
                } elseif ($dualType === 'negative') {
                    $dualRow[] = -$coefficient;
                } else {
                    $dualRow[] = $coefficient;
                    $dualRow[] = -$coefficient;
                }
            }

            $dualConstraints[] = [
                'coefficients' => $dualRow,
                'operator' => $optimizationType === 'max' ? '>=' : '<=',
                'rhs_value' => $objectiveCoefficients[$variableIndex],
            ];
        }

        return [
            'optimization_type' => $dualObjectiveType,
            'objective_function' => [
                'coefficients' => $dualObjectiveCoefficients,
            ],
            'constraints' => $dualConstraints,
            'variable_map' => $transformedVariables,
            'dual_variable_map' => $dualVariableMap,
        ];
    }

    // Prepara o tableau inicial e as estruturas auxiliares do Simplex.
    //BuildProblem -- SIMPLEX
    public function buildProblem(
        array $objectiveCoefficients,
        array $constraints,
        string $optimizationType
    ): array {
        $objectiveCoefficients = $this->normalizeVector($objectiveCoefficients);
        $constraints = $this->normalizeConstraints($constraints);

        if ($optimizationType === 'min') {
            $objectiveCoefficients = array_map(
                fn(float $value) => -$value,
                $objectiveCoefficients
            );
        }

        $decisionCount = count($objectiveCoefficients);
        $metadata = [];
        $columnNames = [];
        $artificialColumns = [];

        for ($index = 0; $index < $decisionCount; $index++) {
            $columnNames[] = 'x' . ($index + 1);
        }

        $slackCount = 0;
        $surplusCount = 0;
        $artificialCount = 0;

        foreach ($constraints as $index => $constraint) {
            $operator = $constraint['operator'];
            $metadata[$index] = [
                'operator' => $operator,
                'slack_index' => null,
                'surplus_index' => null,
                'artificial_index' => null,
            ];

            if ($operator === '<=') {
                $metadata[$index]['slack_index'] = count($columnNames);
                $columnNames[] = 's' . (++$slackCount);
            } elseif ($operator === '>=') {
                $metadata[$index]['surplus_index'] = count($columnNames);
                $columnNames[] = 'e' . (++$surplusCount);

                $metadata[$index]['artificial_index'] = count($columnNames);
                $columnNames[] = 'a' . (++$artificialCount);
                $artificialColumns[] = $metadata[$index]['artificial_index'];
            } else {
                $metadata[$index]['artificial_index'] = count($columnNames);
                $columnNames[] = 'a' . (++$artificialCount);
                $artificialColumns[] = $metadata[$index]['artificial_index'];
            }
        }

        $columnCount = count($columnNames);
        $constraintRows = [];
        $basis = [];

        foreach ($constraints as $index => $constraint) {
            $row = array_fill(0, $columnCount + 1, 0.0);

            foreach ($constraint['coefficients'] as $columnIndex => $value) {
                $row[$columnIndex] = (float) $value;
            }

            $meta = $metadata[$index];

            if ($meta['slack_index'] !== null) {
                $row[$meta['slack_index']] = 1.0;
                $basis[$index] = $meta['slack_index'];
            }

            if ($meta['surplus_index'] !== null) {
                $row[$meta['surplus_index']] = -1.0;
            }

            if ($meta['artificial_index'] !== null) {
                $row[$meta['artificial_index']] = 1.0;
                $basis[$index] = $meta['artificial_index'];
            }

            $row[$columnCount] = (float) $constraint['rhs_value'];
            $constraintRows[] = $row;
        }

        $phase1Objective = array_fill(0, $columnCount, 0.0);
        foreach ($artificialColumns as $columnIndex) {
            $phase1Objective[$columnIndex] = -1.0;
        }

        $phase2Objective = array_fill(0, $columnCount, 0.0);
        for ($i = 0; $i < $decisionCount; $i++) {
            $phase2Objective[$i] = $objectiveCoefficients[$i];
        }

        return [
            'decision_count' => $decisionCount,
            'column_names' => $columnNames,
            'constraint_rows' => $constraintRows,
            'tableau_rows' => $constraintRows,
            'basis' => $basis,
            'phase1_objective' => $phase1Objective,
            'phase2_objective' => $phase2Objective,
            'eligible_phase1' => array_keys($columnNames),
            'eligible_phase2' => $this->buildEligiblePhase2($columnNames),
        ];
    }

    // Seleciona as colunas permitidas para a fase 2 do Simplex.
    //buildProblem -- SIMPLEX
    private function buildEligiblePhase2(array $columnNames): array
    {
        $eligible = [];

        foreach ($columnNames as $index => $name) {
            if (str_starts_with($name, 'a')) {
                continue;
            }

            $eligible[] = $index;
        }

        return $eligible;
    }

    // Normaliza as restricoes para garantir sinais e valores consistentes.
    //DUAL e SIMPLEX
    private function normalizeConstraints(array $constraints): array
    {
        $normalized = [];

        foreach ($constraints as $constraint) {
            $coefficients = $this->normalizeVector($constraint['coefficients']);
            $rhsValue = (float) $constraint['rhs_value'];
            $operator = $constraint['operator'];

            if ($rhsValue < 0) {
                $coefficients = array_map(
                    fn(float $value) => -$value,
                    $coefficients
                );
                $rhsValue *= -1;
                $operator = $this->flipOperator($operator);
            }

            $normalized[] = [
                'coefficients' => $coefficients,
                'operator' => $operator,
                'rhs_value' => $rhsValue,
            ];
        }

        return $normalized;
    }

    // Inverte o operador da restricao quando o lado direito precisa ser ajustado.
    //SUPPORT
    private function flipOperator(string $operator): string
    {
        return match ($operator) {
            '<=' => '>=',
            '>=' => '<=',
            default => '=',
        };
    }

    // Define como cada variavel dual deve ser representada no problema auxiliar.
    //DUAL
    private function dualVariableType(
        string $operator,
        string $optimizationType
    ): string {
        return match ($optimizationType) {
            'max' => match ($operator) {
                '<=' => 'positive',
                '>=' => 'negative',
                default => 'free',
            },
            'min' => match ($operator) {
                '<=' => 'negative',
                '>=' => 'positive',
                default => 'free',
            },
            default => 'free',
        };
    }

    // Converte um vetor de entrada para valores numericos reais.
    private function normalizeVector(array $vector): array
    {
        return array_map(
            fn($value) => (float) $value,
            $vector
        );
    }
}