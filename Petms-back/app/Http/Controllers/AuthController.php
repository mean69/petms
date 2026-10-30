<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileRequest;
use App\Http\Requests\RegistrationRequest;
use App\Http\Resources\UserResource;
use App\Models\OwnerProfile;
use App\Models\Role;
use App\Models\User;
use App\Services\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(RegistrationRequest $request): JsonResponse
    {
        $user = DB::transaction(function () use ($request) {
            $data = $request->validated();
            $user = User::create([
                'name' => $data['name'], 'email' => $data['email'], 'password' => $data['password'],
                'role_id' => Role::where('name', $data['role'])->sole()->id,
                'approval_status' => $data['role'] === 'staff' ? 'pending' : 'approved',
                'contact_number' => $data['role'] === 'staff' ? $data['contact_number'] : null,
                'address' => $data['role'] === 'staff' ? $data['address'] : null,
            ]);
            if ($data['role'] === 'client') {
                OwnerProfile::create(['user_id' => $user->id, 'name' => $data['name'], 'email' => $data['email'], 'contact_number' => $data['contact_number'], 'address' => $data['address']]);
            }
            Audit::record('account.registered', $user, null, ['role' => $data['role'], 'approval_status' => $user->approval_status]);

            return $user;
        });
        $user->refresh();
        Auth::login($user);
        $request->session()->regenerate();

        return response()->json((new UserResource($user))->resolve(), 201);
    }

    public function login(Request $request): UserResource
    {
        if ($request->user()) {
            $request->session()->regenerate();

            return new UserResource($request->user());
        }
        $data = $request->validate(['email' => ['required', 'email'], 'password' => ['required', 'string']]);
        if (! Auth::attempt(['email' => strtolower(trim($data['email'])), 'password' => $data['password']])) {
            throw ValidationException::withMessages(['email' => 'The email or password is incorrect.']);
        }
        $request->session()->regenerate();

        return new UserResource($request->user());
    }

    public function me(Request $request): JsonResponse
    {
        return (new UserResource($request->user()))->response()->setStatusCode(200);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Signed out.']);
    }

    public function profile(ProfileRequest $request): UserResource
    {
        $user = $request->user();
        abort_unless($user->enabled, 403, 'This account has been disabled.');
        abort_if($user->hasRole('staff') && $user->profileComplete() && $user->approval_status !== 'approved', 403, 'Only account status is available while your application is pending or rejected.');
        $data = $request->validated();
        DB::transaction(function () use ($user, $data) {
            $before = (new UserResource($user))->resolve();
            $user->update(['name' => $data['name']]);
            if ($user->hasRole('client') || $user->ownerProfile) {
                $user->ownerProfile()->updateOrCreate(['user_id' => $user->id], [...$data, 'email' => $user->email]);
            } else {
                $user->update($data);
            }
            Audit::record('account.profile_updated', $user, $before, $data);
        });

        return new UserResource($user->fresh());
    }
}
