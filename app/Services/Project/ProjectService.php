<?php

namespace App\Services\Project;

use App\Models\Project;
use App\Models\Solution;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ProjectService
{
    // Cria um projeto e grava seus relacionamentos principais sem carregar solucoes por padrao.
    public function create(array $data): Project
    {
        return DB::transaction(function () use ($data) {
            $project = Project::create([
                'user_id' => $this->resolveUserId(),
                'title' => $data['title'],
                'description' => $data['description'] ?? null,
                'num_variables' => (int) $data['num_variables'],
                'num_constraints' => (int) $data['num_constraints'],
                'optimization_type' => $data['optimization_type'],
            ]);

            $project->objectiveFunction()->create([
                'coefficients' => $this->normalizeCoefficients(
                    $data['objective_function']['coefficients']
                ),
            ]);

            foreach ($data['constraints'] as $constraint) {
                $project->constraints()->create([
                    'coefficients' => $this->normalizeCoefficients(
                        $constraint['coefficients']
                    ),
                    'operator' => $constraint['operator'],
                    'rhs_value' => (float) $constraint['rhs_value'],
                ]);
            }

            return $project->load([
                'objectiveFunction',
                'constraints',
                'solutions'
            ]);
        });
    }

    // Atualiza o projeto e recarrega apenas os relacionamentos essenciais.
    public function update(Project $project, array $data): Project
    {
        return DB::transaction(function () use ($project, $data) {
            $project->update([
                'title' => $data['title'],
                'description' => $data['description'] ?? null,
                'num_variables' => (int) $data['num_variables'],
                'num_constraints' => (int) $data['num_constraints'],
                'optimization_type' => $data['optimization_type'],
            ]);

            $project->objectiveFunction()->update([
                'coefficients' => $this->normalizeCoefficients(
                    $data['objective_function']['coefficients']
                ),
            ]);

            $project->constraints()->delete();

            foreach ($data['constraints'] as $constraint) {
                $project->constraints()->create([
                    'coefficients' => $this->normalizeCoefficients(
                        $constraint['coefficients']
                    ),
                    'operator' => $constraint['operator'],
                    'rhs_value' => (float) $constraint['rhs_value'],
                ]);
            }

            return $project->fresh([
                'objectiveFunction',
                'constraints',
                'solutions'
            ]);
        });
    }

    // Carrega o projeto com os relacionamentos basicos e, opcionalmente, as solucoes.
    public function load(Project $project, bool $withSolutions = false): Project
    {
        $relations = [
            'objectiveFunction',
            'constraints',
            'solutions'
        ];

        // if ($withSolutions) {
        //     $relations[] = 'solutions';
        // }

        return $project->load($relations);
    }

    // Retorna as solucoes gravadas para o projeto sem trazer os dados completos de cada resposta.
    public function getSolutions(Project $project): array
    {
        return $project->solutions()
            ->latest()
            ->get()
            ->map(function (Solution $solution) {
                return [
                    'id' => $solution->id,
                    'method_used' => $solution->method_used,
                    'z_value' => $solution->z_value,
                    'variables_result' => $solution->variables_result,
                    'created_at' => $solution->created_at,
                ];
            })
            ->values()
            ->all();
    }

    // Persiste a solucao gerada por um metodo numerico no relacionamento solutions do projeto.
    public function persistSolution(Project $project, string $method, array $result): Solution
    {
        $objectiveValue = $this->extractObjectiveValue($result);
        $solutionPayload = $this->buildPersistedVariablesResult($method, $result, $objectiveValue);

        return $project->solutions()->create([
            'method_used' => $method,
            'z_value' => $objectiveValue,
            'variables_result' => $solutionPayload,
        ]);
    }

    // Resolve o usuario atual ou cria o usuario tecnico interno quando nao ha autenticacao.
    private function resolveUserId(): int
    {
        $authUserId = Auth::id();
        if ($authUserId) {
            return (int) $authUserId;
        }

        $systemUser = User::query()->where('email', 'system@woodpecker.local')->first();
        if ($systemUser) {
            return (int) $systemUser->id;
        }

        return (int) User::query()->create([
            'name' => 'System',
            'email' => 'system@woodpecker.local',
            'password' => Hash::make(Str::random(32)),
        ])->id;
    }

    // Converte os coeficientes recebidos para float antes de salvar no banco.
    private function normalizeCoefficients(array $coefficients): array
    {
        return array_map(
            fn ($value) => (float) $value,
            $coefficients
        );
    }

    // Monta o payload minimo para salvar no banco e inclui iteracoes somente quando o metodo e simplex.
    private function buildPersistedVariablesResult(string $method, array $result, float $objectiveValue): array
    {
        $payload = [
            'solution' => $this->extractPersistedSolution($method, $result),
            'objective_value' => $objectiveValue,
        ];

        if ($method === 'simplex') {
            $payload['iterations'] = data_get($result, 'iterations', []);
        }

        return $payload;
    }

    // Extrai apenas a solucao final que deve ser salva no banco para cada metodo.
    private function extractPersistedSolution(string $method, array $result): array
    {
        $solution = match ($method) {
            'integer' => data_get($result, 'solution', data_get($result, 'best_solution', [])),
            'graphical' => data_get($result, 'optimal_solution', data_get($result, 'solution', [])),
            'sensitivity' => data_get($result, 'primal_solution', data_get($result, 'variables', [])),
            'dual' => data_get($result, 'solution.primal_solution', data_get($result, 'solution', [])),
            default => data_get($result, 'solution', data_get($result, 'best_solution', [])),
        };

        if (! is_array($solution)) {
            return [];
        }

        return $this->stripSolutionMetadata($solution);
    }

    // Remove campos auxiliares da solucao e mantem apenas as variaveis finais para persistencia.
    private function stripSolutionMetadata(array $solution): array
    {
        if (isset($solution['variables']) && is_array($solution['variables'])) {
            $solution = $solution['variables'];
        }

        $filtered = [];

        foreach ($solution as $key => $value) {
            if (preg_match('/^[xy]\d+$/i', (string) $key)) {
                $filtered[(string) $key] = $value;
            }
        }

        return ! empty($filtered) ? $filtered : $solution;
    }

    // Extrai o valor objetivo de qualquer formato de retorno gerado pelos services.
    private function extractObjectiveValue(array $result): float
    {
        $value = data_get($result, 'objective_value');

        if ($value === null) {
            $value = data_get($result, 'solution.z');
        }

        if ($value === null) {
            $value = data_get($result, 'solution.objective_value');
        }

        if ($value === null) {
            $value = data_get($result, 'optimal_solution.objective_value');
        }

        if ($value === null) {
            $value = data_get($result, 'best_solution.objective_value');
        }

        if ($value === null) {
            $value = data_get($result, 'primal_solution.objective_value');
        }

        return (float) ($value ?? 0.0);
    }
}
