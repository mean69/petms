<?php

namespace App\Http\Controllers;

use App\Models\AuthProvider;
use App\Models\Role;
use App\Models\User;
use App\Services\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class GoogleAuthController extends Controller
{
    public function start(Request $request): JsonResponse
    {
        abort_unless(config('services.google.client_id') && config('services.google.client_secret'), 503, 'Google sign-in has not been configured by the administrator.');
        $data = $request->validate(['role' => ['nullable', 'in:staff,client']]);
        $request->session()->put('google_registration_role', $data['role'] ?? null);
        $request->session()->put('google_link_user', $request->user()?->id);

        return response()->json(['url' => Socialite::driver('google')->enablePKCE()->redirect()->getTargetUrl()]);
    }

    public function callback(Request $request): RedirectResponse
    {
        $destination = rtrim(config('petfave.frontend_url'), '/').'/login';
        if ($request->has('error')) {
            $request->session()->forget(['state', 'code_verifier', 'google_registration_role', 'google_link_user']);

            return redirect($destination.'?google_error=cancelled');
        }
        try {
            $google = Socialite::driver('google')->enablePKCE()->user();
            $role = $request->session()->pull('google_registration_role');
            $linkUserId = $request->session()->pull('google_link_user');
            if (($google->user['email_verified'] ?? false) !== true || ! $google->getEmail() || ! $google->getId()) {
                return redirect($destination.'?google_error=unverified');
            }
            $provider = AuthProvider::where('provider', 'google')->where('subject', $google->getId())->first();
            if ($provider && $linkUserId && $provider->user_id !== $linkUserId) {
                return redirect($destination.'?google_error=linked');
            }
            if ($provider) {
                $user = $provider->user;
            } else {
                $email = strtolower($google->getEmail());
                if ($linkUserId) {
                    if ($request->user()?->id !== $linkUserId || strtolower($request->user()->email) !== $email) {
                        return redirect($destination.'?google_error=link_failed');
                    }
                    $user = $request->user();
                    DB::transaction(function () use ($user, $google) {
                        AuthProvider::create(['user_id' => $user->id, 'provider' => 'google', 'subject' => $google->getId()]);
                        Audit::record('account.google_linked', $user, null, ['provider' => 'google']);
                    });
                } else {
                    if (User::where('email', $email)->exists()) {
                        return redirect($destination.'?google_error=email_exists');
                    }
                    if (! in_array($role, ['client', 'staff'], true)) {
                        return redirect($destination.'?google_error=role_required');
                    }
                    $user = DB::transaction(function () use ($google, $role, $email) {
                        $user = User::create(['name' => $google->getName() ?: $email, 'email' => $email, 'password' => Str::random(64),
                            'role_id' => Role::where('name', $role)->sole()->id, 'approval_status' => $role === 'staff' ? 'pending' : 'approved', 'email_verified_at' => now()]);
                        AuthProvider::create(['user_id' => $user->id, 'provider' => 'google', 'subject' => $google->getId()]);
                        Audit::record('account.google_registered', $user, null, ['role' => $role, 'approval_status' => $user->approval_status]);

                        return $user;
                    });
                }
            }
            $user->refresh();
            Auth::login($user);
            $request->session()->regenerate();

            return redirect(rtrim(config('petfave.frontend_url'), '/').'/app');
        } catch (\Throwable $exception) {
            $request->session()->forget(['state', 'code_verifier', 'google_registration_role', 'google_link_user']);
            logger()->warning('Google authentication failed.', ['exception_type' => $exception::class]);

            return redirect($destination.'?google_error=failed');
        }
    }
}
