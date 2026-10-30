<?php

use App\Models\User;
use App\Services\Audit;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

Artisan::command('petfave:admin {email} {--name=} {--contact=} {--address=}', function () {
    $data = ['email' => strtolower($this->argument('email')), 'name' => $this->option('name') ?: $this->ask('Full name'),
        'contact_number' => $this->option('contact') ?: $this->ask('Contact number'), 'address' => $this->option('address') ?: $this->ask('Address'),
        'password' => $this->secret('Administrator password (at least 10 characters, letters and numbers)')];
    $validation = Validator::make($data, ['email' => ['required', 'email', 'unique:users,email'], 'name' => ['required', 'max:150'],
        'contact_number' => ['required', 'max:40'], 'address' => ['required', 'max:2000'], 'password' => ['required', Password::min(10)->letters()->numbers()]]);
    if ($validation->fails()) {
        foreach ($validation->errors()->all() as $message) {
            $this->error($message);
        }

return 1;
    }
    DB::transaction(function () use ($data) {
        $user = User::create([...$data, 'role_id' => 1, 'approval_status' => 'approved']);
        Audit::record('account.administrator_created_from_console', $user, null, ['email' => $user->email, 'role' => 'administrator']);
    });
    $this->info('Administrator created. Sign in through the frontend.');

    return 0;
})->purpose('Create an administrator using a hidden password prompt');
