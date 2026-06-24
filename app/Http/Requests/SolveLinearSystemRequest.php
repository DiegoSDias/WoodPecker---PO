<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class SolveLinearSystemRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'matrix_a' => [
                'required', 
                'array', 
                'min:2'
            ],
            'matrix_a.*' => [
                'required', 
                'array'
            ],
            'matrix_a.*.*' => [
                'required', 
                'numeric'
            ],

            'vector_b' => [
                'required', 
                'array'
            ],
            'vector_b.*' => [
                'required', 
                'numeric'
            ],
        ];
    }

    public function withValidator(Object $validator): void
    {
        $validator->after(function ($validator) {
            $matrixA = $this->input('matrix_a');
            $vectorB = $this->input('vector_b');

            if (!$matrixA || !$vectorB) {
                return;
            }

            $rows = count($matrixA);

            // Verifica se a matriz é quadrada
            foreach ($matrixA as $row) {
                if (count($row) !== $rows) {
                    $validator->errors()->add(
                        'matrix_a',
                        'A matriz A deve ser quadrada.'
                    );

                    return;
                }
            }

            if (count($vectorB) !== $rows) {
                $validator->errors()->add(
                    'vector_b',
                    'O vetor B deve possuir a mesma quantidade de elementos da matriz A.'
                );
            }
        });
    }

    public function messages(): array
    {
        return [
            'matrix_a.required' => 'A matriz A é obrigatória.',
            'matrix_a.array' => 'A matriz A deve ser um array.',

            'matrix_a.*.array' => 'Cada linha da matriz deve ser um array.',
            'matrix_a.*.*.numeric' => 'Todos os coeficientes da matriz devem ser numéricos.',

            'vector_b.required' => 'O vetor B é obrigatório.',
            'vector_b.array' => 'O vetor B deve ser um array.',
            'vector_b.*.numeric' => 'Todos os valores do vetor B devem ser numéricos.',
        ];
    }
}
