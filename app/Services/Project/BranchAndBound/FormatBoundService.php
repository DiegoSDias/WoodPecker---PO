<?php

namespace App\Services\Project\BranchAndBound;


class FormatBoundService
{

        // Formata a melhor solucao para ser persistida e exibida. 2
    public function formatBestSolution(?array $bestSolution): ?array
    {
        if ($bestSolution === null) {
            return null;
        }

        return [
            'node_id' => $bestSolution['node_id'],
            'parent_id' => $bestSolution['parent_id'],
            'depth' => $bestSolution['depth'],
            'objective_value' => $bestSolution['objective_value'],
            'variables' => $bestSolution['solution'],
        ];
    }

        // Monta a descricao do ultimo limite inserido na arvore. 2
    public function formatLatestBound(array $extraConstraints): ?array
    {
        if (empty($extraConstraints)) {
            return null;
        }

        $bound = end($extraConstraints);

        return [
            'coefficients' => $bound['coefficients'],
            'operator' => $bound['operator'],
            'rhs_value' => $bound['rhs_value'],
            'label' => $this->boundToLabel($bound),
        ];
    }

        // Cria a restricao de limite usada na ramificacao do Branch and Bound. 2
    public function buildBoundConstraint(
        int $variableIndex,
        string $operator,
        float $rhs,
        int $variableCount
    ): array 
    {
        $coefficients = array_fill(0, $variableCount, 0.0);
        $coefficients[$variableIndex] = 1.0;

        return [
            'coefficients' => $coefficients,
            'operator' => $operator,
            'rhs_value' => $rhs,
        ];
    }
    
    // Fun??o boundToLabel respons?vel por executar esta etapa do service.
    private function boundToLabel(array $bound): string
    {
        $variableIndex = array_search(1.0, $bound['coefficients'], true);
        $variableName = $variableIndex === false ? 'x?' : 'x' . ($variableIndex + 1);

        return $variableName . ' ' . $bound['operator'] . ' ' . $bound['rhs_value'];
    }
}