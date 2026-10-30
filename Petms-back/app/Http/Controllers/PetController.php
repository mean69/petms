<?php

namespace App\Http\Controllers;

use App\Http\Requests\PetRequest;
use App\Http\Resources\ClinicalRecordResource;
use App\Models\Pet;
use App\Models\Species;
use App\Models\VaccinationRecord;
use App\Models\VaccineDefinition;
use App\Services\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class PetController extends Controller
{
    public function dashboard(Request $request): JsonResponse
    {
        $pets = Pet::query();
        if ($request->user()->hasRole('client')) {
            $pets->whereHas('currentOwnership.owner', fn ($owners) => $owners->where('user_id', $request->user()->id));
        }
        $activePets = (clone $pets)->whereNull('archived_at');
        $recentPets = (clone $activePets)->with(['species', 'breed', 'currentOwnership.owner', 'weights' => fn ($weights) => $weights->orderByDesc('measured_at')->orderByDesc('id')->limit(1)])
            ->orderByDesc('created_at')->orderByDesc('id')->limit(4)->get()->map(fn (Pet $pet) => $this->present($pet));
        $query = VaccinationRecord::with(['pet:id,name', 'vaccine'])->whereNotNull('next_due_at')->whereHas('pet', function ($pets) use ($request) {
            $pets->whereNull('archived_at');
            if ($request->user()->hasRole('client')) {
                $pets->whereHas('currentOwnership.owner', fn ($owners) => $owners->where('user_id', $request->user()->id));
            }
        });
        $query->whereNotExists(function ($newer) {
            $newer->selectRaw('1')->from('vaccination_records as newer')->whereColumn('newer.pet_id', 'vaccination_records.pet_id')
                ->whereColumn('newer.vaccine_definition_id', 'vaccination_records.vaccine_definition_id')
                ->where(function ($dates) {
                    $dates->whereColumn('newer.administered_at', '>', 'vaccination_records.administered_at')
                        ->orWhere(function ($same) {
                            $same->whereColumn('newer.administered_at', 'vaccination_records.administered_at')->whereColumn('newer.id', '>', 'vaccination_records.id');
                        });
                });
        });

        return response()->json([
            'pets' => ['total' => $activePets->count(), 'data' => $recentPets],
            'archived' => ['total' => (clone $pets)->whereNotNull('archived_at')->count()],
            'due_dates' => $query->orderBy('next_due_at')->limit(5)->get()->map(fn ($record) => [...$record->only(['id', 'pet_id', 'administered_at', 'next_due_at']), 'pet' => $record->pet, 'vaccine' => $record->vaccine]),
        ]);
    }

    public function references(): JsonResponse
    {
        return response()->json(['species' => Species::with('breeds')->orderBy('name')->get(), 'vaccines' => VaccineDefinition::orderBy('name')->get()]);
    }

    public function index(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', Pet::class);
        $data = $request->validate(['search' => ['nullable', 'string', 'max:150'], 'species_id' => ['nullable', 'integer', 'exists:species,id'], 'archived' => ['nullable', 'boolean'], 'page' => ['nullable', 'integer', 'min:1']]);
        $query = Pet::with(['species', 'breed', 'currentOwnership.owner'])->with(['weights' => fn ($q) => $q->orderByDesc('measured_at')->orderByDesc('id')->limit(1)])->orderByDesc('created_at');
        if ($request->user()->hasRole('client')) {
            $query->whereHas('currentOwnership.owner', fn ($q) => $q->where('user_id', $request->user()->id));
        }
        $request->boolean('archived') ? $query->whereNotNull('archived_at') : $query->whereNull('archived_at');
        if ($data['species_id'] ?? null) {
            $query->where('species_id', $data['species_id']);
        }
        if ($data['search'] ?? null) {
            $term = '%'.$data['search'].'%';
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', $term)->orWhere('breed_description', 'like', $term)
                    ->orWhereHas('breed', fn ($b) => $b->where('name', 'like', $term))
                    ->orWhereHas('species', fn ($s) => $s->where('name', 'like', $term))
                    ->orWhereHas('currentOwnership.owner', fn ($o) => $o->where('name', 'like', $term));
            });
        }
        $results = $query->paginate(12);
        $results->setCollection($results->getCollection()->map(fn (Pet $pet) => $this->present($pet)));

        return response()->json($results);
    }

    public function show(Pet $pet): JsonResponse
    {
        Gate::authorize('view', $pet);
        $pet->load(['species', 'breed', 'currentOwnership.owner', 'weights' => fn ($q) => $q->orderByDesc('measured_at')->orderByDesc('id'),
            'weights.recorder:id,name', 'medicalEntries' => fn ($q) => $q->orderByDesc('event_date')->orderByDesc('id'),
            'medicalEntries.recorder:id,name', 'allergies.recorder:id,name',
            'vaccinations' => fn ($q) => $q->orderByDesc('administered_at')->orderByDesc('id'), 'vaccinations.vaccine', 'vaccinations.recorder:id,name']);

        return response()->json([...$this->present($pet),
            'weights' => ClinicalRecordResource::collection($pet->weights)->resolve(),
            'medical_history' => ClinicalRecordResource::collection($pet->medicalEntries)->resolve(),
            'allergies' => ClinicalRecordResource::collection($pet->allergies)->resolve(),
            'vaccinations' => ClinicalRecordResource::collection($pet->vaccinations)->resolve()]);
    }

    public function store(PetRequest $request): JsonResponse
    {
        Gate::authorize('create', Pet::class);
        $pet = DB::transaction(function () use ($request) {
            $data = $request->validated();
            $ownerId = $request->user()->hasRole('client') ? $request->user()->ownerProfile->id : $data['owner_profile_id'];
            $pet = Pet::create(Arr::except($data, ['owner_profile_id']));
            $ownership = $pet->ownerships()->create(['owner_profile_id' => $ownerId, 'verified_by' => $request->user()->id,
                'verification_reference' => $request->user()->hasRole('client') ? 'Self-registration by authenticated owner' : 'Clinic registration by authorized personnel', 'started_at' => now()]);
            $pet->update(['current_ownership_id' => $ownership->id]);
            Audit::record('pet.created', $pet);
            Audit::record('ownership.registered', $ownership);

            return $pet;
        });

        return response()->json($this->present($pet->load(['species', 'breed', 'currentOwnership.owner', 'weights'])), 201);
    }

    public function update(PetRequest $request, Pet $pet): JsonResponse
    {
        Gate::authorize('update', $pet);
        DB::transaction(function () use ($request, $pet) {
            $pet = Pet::lockForUpdate()->findOrFail($pet->id);
            Gate::authorize('update', $pet);
            $before = $pet->getAttributes();
            $pet->update($request->validated());
            Audit::record('pet.updated', $pet, $before);
        });

        return $this->show($pet->fresh());
    }

    public function archive(Pet $pet): JsonResponse
    {
        return $this->setArchive($pet, true);
    }

    public function restore(Pet $pet): JsonResponse
    {
        return $this->setArchive($pet, false);
    }

    private function setArchive(Pet $pet, bool $archive): JsonResponse
    {
        Gate::authorize('archive', $pet);
        DB::transaction(function () use ($pet, $archive) {
            $pet = Pet::lockForUpdate()->findOrFail($pet->id);
            Gate::authorize('archive', $pet);
            $before = $pet->getAttributes();
            $pet->update(['archived_at' => $archive ? now() : null]);
            Audit::record($archive ? 'pet.archived' : 'pet.restored', $pet, $before);
        });

        return response()->json(['message' => $archive ? 'Pet archived. All health records are preserved.' : 'Pet restored.']);
    }

    public function allergyStatus(Request $request, Pet $pet): JsonResponse
    {
        Gate::authorize('clinical', $pet);
        $data = $request->validate(['allergy_information_status' => ['required', 'in:unknown,no_known_allergies,recorded']]);
        DB::transaction(function () use ($pet, $data) {
            $pet = Pet::lockForUpdate()->findOrFail($pet->id);
            abort_if($data['allergy_information_status'] !== 'recorded' && $pet->allergies()->where('status', 'active')->exists(), 422, 'Resolve active allergy records before changing allergy information status.');
            $before = $pet->getAttributes();
            $pet->update($data);
            Audit::record('pet.allergy_status_updated', $pet, $before);
        });

        return response()->json($data);
    }

    private function present(Pet $pet): array
    {
        $birth = $pet->birth_date;
        $age = null;
        if ($birth) {
            $months = (int) $birth->diffInMonths(today());
            $age = ($pet->birth_date_estimated ? 'Estimated ' : '').($months >= 12 ? intdiv($months, 12).' years'.($months % 12 ? ', '.($months % 12).' months' : '') : $months.' months');
        }

        return [...Arr::except($pet->attributesToArray(), ['current_ownership_id']),
            'species' => $pet->species, 'breed' => $pet->breed, 'age_label' => $age ?? 'Age unknown',
            'owner' => $pet->currentOwnership?->owner?->only(['id', 'name', 'contact_number', 'address', 'email']),
            'current_ownership_id' => $pet->current_ownership_id,
            'current_weight' => ($latest = $pet->weights->sortByDesc(fn ($w) => $w->measured_at->format('Y-m-d').str_pad((string) $w->id, 20, '0', STR_PAD_LEFT))->first()) ? (new ClinicalRecordResource($latest))->resolve() : null];
    }
}
