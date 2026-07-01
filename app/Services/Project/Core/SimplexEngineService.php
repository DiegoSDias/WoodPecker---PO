<?php

namespace App\Services\Project\Core;

class SimplexEngineService
{

    private const EPSILON = 1e-9;

    // Fun??o __construct respons?vel por executar esta etapa do service.
    public function __construct(
        protected SimplexResultFormatterService $simplexResultFormatterService,
    ) {}

    // Resolve uma fase do Simplex aplicando os pivôs até a otimalidade ou falha.
    //SIMPLEX
    public function solvePhase(
        array $constraintRows,
        array $basis,
        array $objectiveCoefficients,
        array $eligibleColumns,
        array $columnNames,
        bool $storeIterations,
        int $maxIterations
    ): array {
        $tableau = $constraintRows;
        $tableau[] = $this->buildObjectiveRow(
            $constraintRows,
            $basis,
            $objectiveCoefficients
        );

        $iterations = [];
        $degenerate = false;
        $objectiveRowIndex = count($tableau) - 1;
        $rhsIndex = count($tableau[0]) - 1;
        $seenBases = [];
        $loopCounter = 0;

        while (true) {
            if (++$loopCounter > $maxIterations) {
                return [
                    'status' => 'iteration_limit',
                    'iterations' => $iterations,
                    'tableau_rows' => array_slice($tableau, 0, -1),
                    'tableau' => $this->simplexResultFormatterService->cleanTableau($tableau),
                    'basis' => $basis,
                    'objective_value' => $tableau[$objectiveRowIndex][$rhsIndex],
                    'degenerate' => $degenerate,
                ];
            }

            $basisKey = implode(',', $basis);
            if (isset($seenBases[$basisKey])) {
                return [
                    'status' => 'cycled',
                    'iterations' => $iterations,
                    'tableau_rows' => array_slice($tableau, 0, -1),
                    'tableau' => $this->simplexResultFormatterService->cleanTableau($tableau),
                    'basis' => $basis,
                    'objective_value' => $tableau[$objectiveRowIndex][$rhsIndex],
                    'degenerate' => true,
                ];
            }
            $seenBases[$basisKey] = true;

            $enteringColumn = $this->findEnteringColumn(
                $tableau[$objectiveRowIndex],
                $eligibleColumns
            );

            if ($enteringColumn === null) {
                break;
            }

            $leavingRow = $this->findLeavingRow($tableau, $enteringColumn, $rhsIndex);

            if ($leavingRow === null) {
                return [
                    'status' => 'unbounded',
                    'iterations' => $iterations,
                    'tableau_rows' => array_slice($tableau, 0, -1),
                    'tableau' => $this->simplexResultFormatterService->cleanTableau($tableau),
                    'basis' => $basis,
                    'objective_value' => $tableau[$objectiveRowIndex][$rhsIndex],
                    'degenerate' => $degenerate,
                ];
            }

            $pivotValue = $tableau[$leavingRow][$enteringColumn];
            $ratio = $tableau[$leavingRow][$rhsIndex] / $pivotValue;
            $leavingVariableIndex = $basis[$leavingRow];
            $leavingVariableName = $columnNames[$leavingVariableIndex] ?? null;

            if (abs($ratio) < self::EPSILON) {
                $degenerate = true;
            }

            $this->pivotTableau($tableau, $leavingRow, $enteringColumn);
            $basis[$leavingRow] = $enteringColumn;

            if ($storeIterations) {
                $iterations[] = [
                    'iteration' => count($iterations) + 1,
                    'entering_variable' => $columnNames[$enteringColumn] ?? ('x' . ($enteringColumn + 1)),
                    'leaving_variable' => $leavingVariableName ?? ('x' . ($leavingVariableIndex + 1)),
                    'pivot' => $this->simplexResultFormatterService->cleanValue($pivotValue),
                    'pivot_row_index' => $leavingRow,
                    'pivot_column_index' => $enteringColumn,
                    'tableau' => $this->simplexResultFormatterService->cleanTableau($tableau),
                ];
            }
        }

        return [
            'status' => 'optimal',
            'iterations' => $iterations,
            'tableau_rows' => array_slice($tableau, 0, -1),
            'tableau' => $this->simplexResultFormatterService->cleanTableau($tableau),
            'basis' => $basis,
            'objective_value' => $tableau[$objectiveRowIndex][$rhsIndex],
            'degenerate' => $degenerate,
        ];
    }

    // Escolhe a coluna que entra na base na proxima iteracao.
    //SolvePhase -- SIMPLEX
    private function findEnteringColumn(array $objectiveRow, array $eligibleColumns): ?int
    {
        $enteringColumn = null;
        $mostNegative = -self::EPSILON;

        foreach ($eligibleColumns as $columnIndex) {
            if ($columnIndex >= count($objectiveRow) - 1) {
                continue;
            }

            $value = $objectiveRow[$columnIndex];
            if ($value < $mostNegative) {
                $mostNegative = $value;
                $enteringColumn = $columnIndex;
            }
        }

        return $enteringColumn;
    }

    // Escolhe a linha que sai da base usando o teste do quociente.
    //SolvePhase -- SIMPLEX
    public function findLeavingRow(array $tableau, int $enteringColumn, int $rhsIndex): ?int
    {
        $leavingRow = null;
        $minimumRatio = null;

        for ($rowIndex = 0; $rowIndex < count($tableau) - 1; $rowIndex++) {
            $pivotValue = $tableau[$rowIndex][$enteringColumn];
            if ($pivotValue <= self::EPSILON) {
                continue;
            }

            $ratio = $tableau[$rowIndex][$rhsIndex] / $pivotValue;

            if ($ratio < -self::EPSILON) {
                continue;
            }

            if ($minimumRatio === null || $ratio < $minimumRatio - self::EPSILON) {
                $minimumRatio = $ratio;
                $leavingRow = $rowIndex;
            }
        }

        return $leavingRow;
    }

    // Aplica o pivô no tableau e normaliza todas as linhas afetadas.
    public function pivotTableau(array &$tableau, int $pivotRow, int $pivotColumn): void
    {
        $rowCount = count($tableau);
        $columnCount = count($tableau[0]);
        $pivotValue = $tableau[$pivotRow][$pivotColumn];

        for ($columnIndex = 0; $columnIndex < $columnCount; $columnIndex++) {
            $tableau[$pivotRow][$columnIndex] /= $pivotValue;
        }

        for ($rowIndex = 0; $rowIndex < $rowCount; $rowIndex++) {
            if ($rowIndex === $pivotRow) {
                continue;
            }

            $factor = $tableau[$rowIndex][$pivotColumn];
            if (abs($factor) < self::EPSILON) {
                continue;
            }

            for ($columnIndex = 0; $columnIndex < $columnCount; $columnIndex++) {
                $tableau[$rowIndex][$columnIndex] -= $factor * $tableau[$pivotRow][$columnIndex];
            }
        }

        $tableau = $this->simplexResultFormatterService->cleanTableau($tableau);
    }

    // Monta a linha objetivo do tableau com base na solucao corrente.
    //SIMPLEX
    public function buildObjectiveRow(
        array $constraintRows,
        array $basis,
        array $objectiveCoefficients
    ): array {
        $columnCount = count($objectiveCoefficients);
        $objectiveRow = array_fill(0, $columnCount + 1, 0.0);

        for ($columnIndex = 0; $columnIndex < $columnCount; $columnIndex++) {
            $objectiveRow[$columnIndex] = -$objectiveCoefficients[$columnIndex];
        }

        foreach ($constraintRows as $rowIndex => $row) {
            $basicColumn = $basis[$rowIndex] ?? null;
            if ($basicColumn === null) {
                continue;
            }

            $coefficient = $objectiveCoefficients[$basicColumn] ?? 0.0;
            if (abs($coefficient) < self::EPSILON) {
                continue;
            }

            for ($columnIndex = 0; $columnIndex <= $columnCount; $columnIndex++) {
                $objectiveRow[$columnIndex] += $coefficient * $row[$columnIndex];
            }
        }

        return $this->simplexResultFormatterService->cleanRow($objectiveRow);
    }

    // Verifica se o problema precisa de duas fases por causa de variaveis artificiais.
    public function requiresTwoPhase(array $columnNames): bool
    {
        foreach ($columnNames as $columnName) {
            if (str_starts_with((string) $columnName, 'a')) {
                return true;
            }
        }
        return false;
    }
}