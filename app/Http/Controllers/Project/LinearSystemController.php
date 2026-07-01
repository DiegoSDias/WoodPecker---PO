<?php

namespace App\Http\Controllers\Project;

use App\Http\Controllers\Controller;
use App\Http\Requests\SolveLinearSystemRequest;
use App\Services\Project\LinearSystem\LinearSystemService;

class LinearSystemController extends Controller
{
    public function __construct(protected LinearSystemService $linearSystemService) 
    {
    }

    public function solve(SolveLinearSystemRequest $request)
    {
        try {
            $data = $request->validated();
            $result = $this->linearSystemService->solve($data);
            return $this->sendResponse($result, 'Sistema linear resolvido com sucesso!');
        } catch (\Throwable $th) {
            return $this->sendError(['detalhe' => $th->getMessage()], 'Erro ao resolver sistema linear');
        }
    }
}
