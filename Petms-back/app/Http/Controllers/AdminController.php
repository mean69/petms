<?php

namespace App\Http\Controllers;

use App\Http\Requests\AccountUpdateRequest;
use App\Http\Resources\UserResource;
use App\Models\ActivityLog;
use App\Models\OwnerProfile;
use App\Models\Role;
use App\Models\User;
use App\Services\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

class AdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate(['page' => ['nullable', 'integer', 'min:1']]);
        $page = User::with(['role', 'ownerProfile'])->orderByDesc('id')->paginate(30);
        $page->setCollection($page->getCollection()->map(fn ($user) => (new UserResource($user))->resolve()));

        return response()->json($page);
    }

    public function update(AccountUpdateRequest $request, User $user): UserResource
    {
        abort_if($user->id === $request->user()->id && ($request->has('role') || $request->has('enabled')), 422, 'Use another administrator to change your own permissions or access.');
        DB::transaction(function () use ($request, $user) {
            $user = User::lockForUpdate()->findOrFail($user->id);
            $before = Arr::except($user->getAttributes(), ['password', 'remember_token']);
            $data = Arr::only($request->validated(), ['name', 'enabled']);
            if ($request->has('role')) {
                $data['role_id'] = Role::where('name', $request->role)->sole()->id;
                if ($user->role_id !== $data['role_id'] && $user->approval_status !== 'approved') {
                    abort(422, 'Approve the staff application before changing its role.');
                }
                if ($request->role === 'client' && ! $user->ownerProfile && filled($user->contact_number) && filled($user->address)) {
                    OwnerProfile::create(['user_id' => $user->id, 'name' => $user->name, 'email' => $user->email, 'contact_number' => $user->contact_number, 'address' => $user->address]);
                    $data['contact_number'] = null;
                    $data['address'] = null;
                }
            }
            $user->update($data);
            Audit::record('account.permissions_updated', $user, $before, [...Arr::except($user->getAttributes(), ['password', 'remember_token']), 'reason' => $request->reason]);
        });

        return new UserResource($user->fresh());
    }

    public function decision(Request $request, User $user): UserResource
    {
        $data = $request->validate(['status' => ['required', 'in:approved,rejected'], 'note' => ['required', 'string', 'min:5', 'max:2000']]);
        DB::transaction(function () use ($user, $data) {
            $user = User::lockForUpdate()->findOrFail($user->id);
            abort_unless($user->hasRole('staff'), 422, 'Only staff applications can be approved or rejected.');
            abort_unless(in_array($user->approval_status, ['pending', 'rejected'], true), 422, 'This staff application has already been approved.');
            $before = ['approval_status' => $user->approval_status, 'approval_note' => $user->approval_note];
            $user->update(['approval_status' => $data['status'], 'approval_note' => $data['note']]);
            Audit::record('staff.'.$data['status'], $user, $before, ['approval_status' => $user->approval_status, 'approval_note' => $user->approval_note]);
        });

        return new UserResource($user->fresh());
    }

    public function logs(Request $request): JsonResponse
    {
        $data = $request->validate(['search' => ['nullable', 'string', 'max:150'], 'page' => ['nullable', 'integer', 'min:1']]);
        $query = ActivityLog::with('actor:id,name')->orderByDesc('id');
        if ($data['search'] ?? null) {
            $query->where('action', 'like', '%'.$data['search'].'%');
        }

        return response()->json($query->paginate(30));
    }
}
