<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ObjectiveFunction extends Model
{
    protected $fillable = [
        'project_id',
        'coefficients',
    ];

    protected $casts = [
        'coefficients' => 'array',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
