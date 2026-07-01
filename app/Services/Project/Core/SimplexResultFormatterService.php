<?php

namespace App\Services\Project\Core;

class SimplexResultFormatterService
{

    private const EPSILON = 1e-9;

    // Monta o retorno padrao quando o metodo nao converge como esperado.
    public function buildFailureResult(
        string $status,
        array $iterations,
        array $tableau,
        array $columnNames,
        int $decisionCount,
        array $extra,
        bool $includeColumnNames = false
    ): array {
        $result = [
            'status' => $status,
            'flags' => [],
            'iterations' => $iterations,
            'solution' => [],
            'objective_value' => 0.0,
            'tableau_final' => $this->cleanTableau($tableau),
            'has_multiple_solution' => false,
            'alternative_solutions' => [],
            'reduced_costs' => [],
        ];

        if ($includeColumnNames) {
            $result['column_names'] = $columnNames;
        }

        return array_merge($result, $extra);
    }

    // Monta o retorno detalhado quando o metodo falha em modo com historico.
    public function buildDetailedFailureResult(
        string $status,
        array $iterations,
        array $tableau,
        array $columnNames,
        array $extra
    ): array {
        return $this->buildFailureResult(
            $status,
            $iterations,
            $tableau,
            $columnNames,
            0,
            $extra,
            true
        );
    }

    // Reindexa e concatena as iteracoes de duas fases do calculo.
    public function mergeIterations(
        array $first,
        array $second,
        int $offset,
        ?string $phase = null,
        ?string $phaseLabel = null
    ): array {
        foreach ($second as $index => $iteration) {
            $iteration['iteration'] = $offset + $index + 1;
            if ($phase !== null) {
                $iteration['phase'] = $phase;
                $iteration['phase_label'] = $phaseLabel;
            }
            $first[] = $iteration;
        }

        return $first;
    }

    // Limpa o tableau arredondando os valores numericos para exibicao.
    public function cleanTableau(array $tableau): array
    {
        return array_map(
            fn(array $row) => $this->cleanRow($row),
            $tableau
        );
    }

    // ver se realmente precisa dessas duas funções
    public function cleanRow(array $row): array
    {
        return array_map(
            fn($value) => $this->cleanValue((float) $value),
            $row
        );
    }

    // Normaliza valores muito pequenos para zero e arredonda com precisao fixa.
    public function cleanValue(float $value): float
    {
        if (abs($value) < self::EPSILON) {
            return 0.0;
        }

        return round($value, 6);
    }
}