<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Clean out expired login tokens once a day (needs the Laravel scheduler running: php artisan schedule:work).
Schedule::command('sanctum:prune-expired --hours=24')->daily();
