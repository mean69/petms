<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAccountReady
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        abort_unless($user && $user->enabled, 403, 'This account has been disabled.');
        abort_unless($user->approval_status === 'approved', 403, 'Your staff application is '.$user->approval_status.'.');
        abort_unless($user->profileComplete(), 403, 'Complete your contact number and address before continuing.');

        return $next($request);
    }
}
