<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;

class DeleteUnverifiedUsers extends Command
{
    protected $signature = 'users:delete-unverified';
    protected $description = 'Delete users who never verified their email after OTP expired';

    public function handle()
    {
        $deleted = User::whereNull('email_verified_at')
            ->where('otp_expires_at', '<', now())
            ->get();

        foreach ($deleted as $user) {
            $user->tokens()->delete();
            $user->delete();
        }

        $this->info("Deleted {$deleted->count()} unverified user(s).");
    }
}