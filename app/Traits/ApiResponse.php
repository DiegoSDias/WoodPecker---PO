<?php

namespace App\Traits;

use Illuminate\Http\Response;

trait ApiResponse
{
    protected function sendResponse(array $result, string $message, int $code = Response::HTTP_OK)
    {
        $response = [
            'sucess' => true,
            'message' => $message,
            'data' => $result
        ];

        return response()->json($response, $code);
    }

    protected function sendError(array $error = [], string $errorMessage, int $code = Response::HTTP_NOT_FOUND)
    {
        $response = [
            'sucess' => false,
            'message' => $errorMessage,
            'data' => []
        ];

        if(!empty($error)) {
            $response['error'] = $error;
        }

        return response()->json($response, $code);
    }
}
