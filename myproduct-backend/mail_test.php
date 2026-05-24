<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    echo "Sending test mail...\n";
    Illuminate\Support\Facades\Mail::raw('This is a test email from Shopply.', function ($message) {
        $message->to('robertpahugot123456@gmail.com')
                ->subject('Shopply SMTP Test');
    });
    echo "Mail sent successfully!\n";
} catch (\Exception $e) {
    echo "Mail sending failed: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}
