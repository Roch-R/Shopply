<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    Illuminate\Support\Facades\DB::connection()->getPdo();
    echo "DB Connection Successful\n";
    
    $jobsExist = Illuminate\Support\Facades\Schema::hasTable('jobs');
    echo "Jobs table exists: " . ($jobsExist ? 'Yes' : 'No') . "\n";
    
    $usersCount = App\Models\User::count();
    echo "Users count: $usersCount\n";
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
