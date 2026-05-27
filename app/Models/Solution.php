<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Solution extends Model
{
    protected $fillable = [
        'project_id',
        'method_used',
        'z_value',
        'variables_result',
    ];

    protected $casts = [
        'variables_result' => 'array',
        'z_value' => 'float',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
