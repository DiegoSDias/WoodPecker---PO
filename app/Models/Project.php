<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Project extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'title',
        'description',
        'num_variables',
        'num_constraints',
        'optimization_type',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function objectiveFunction(): HasOne
    {
        return $this->hasOne(ObjectiveFunction::class);
    }

    public function constraints(): HasMany
    {
        return $this->hasMany(Constraint::class);
    }

    public function solutions(): HasMany
    {
        return $this->hasMany(Solution::class);
    }
}