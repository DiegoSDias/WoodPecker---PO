<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Constraint extends Model
{
    protected $fillable = [
        'project_id',
        'coefficients',
        'operator',
        'rhs_value',
    ];

    protected $casts = [
        'coefficients' => 'array',
        'rhs_value' => 'float',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
