<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;


Route::get('/', function () {
    return Inertia::render('Dashboard');
})->name('dashboard');

Route::middleware('auth')->group(function () {
    require __DIR__.'/user.php';

    
});
    
Route::prefix('project')->group(function() {
    require __DIR__.'/project.php';
});

require __DIR__.'/auth.php';
