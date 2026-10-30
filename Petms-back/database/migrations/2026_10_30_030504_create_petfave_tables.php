<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
        });
        DB::table('roles')->insert([['id' => 1, 'name' => 'administrator'], ['id' => 2, 'name' => 'staff'], ['id' => 3, 'name' => 'client']]);
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('role_id')->default(3)->constrained()->restrictOnDelete();
            $table->string('contact_number', 40)->nullable();
            $table->text('address')->nullable();
            $table->string('approval_status')->default('approved')->index();
            $table->text('approval_note')->nullable();
            $table->boolean('enabled')->default(true);
        });
        Schema::create('owner_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->unique()->constrained()->restrictOnDelete();
            $table->string('name');
            $table->string('contact_number', 40);
            $table->text('address');
            $table->string('email')->nullable()->index();
            $table->timestamps();
        });
        Schema::create('auth_providers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->string('provider');
            $table->string('subject');
            $table->unique(['provider', 'subject']);
            $table->unique(['user_id', 'provider']);
            $table->timestamps();
        });
        Schema::create('species', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
        });
        Schema::create('breeds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('species_id')->constrained('species')->restrictOnDelete();
            $table->string('name');
            $table->unique(['species_id', 'name']);
            $table->unique(['species_id', 'id']);
        });
        Schema::create('pets', function (Blueprint $table) {
            $table->id();
            $table->string('name')->index();
            $table->foreignId('species_id')->constrained('species')->restrictOnDelete();
            $table->unsignedBigInteger('breed_id')->nullable();
            $table->foreign(['species_id', 'breed_id'])->references(['species_id', 'id'])->on('breeds')->restrictOnDelete();
            $table->string('breed_description')->nullable();
            $table->date('birth_date')->nullable();
            $table->boolean('birth_date_estimated')->default(false);
            $table->string('sex');
            $table->string('allergy_information_status')->default('unknown');
            $table->unsignedBigInteger('current_ownership_id')->nullable();
            $table->timestamp('archived_at')->nullable()->index();
            $table->timestamps();
        });
        Schema::create('pet_ownerships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pet_id')->constrained()->restrictOnDelete();
            $table->foreignId('owner_profile_id')->constrained()->restrictOnDelete();
            $table->foreignId('verified_by')->constrained('users')->restrictOnDelete();
            $table->string('verification_reference');
            $table->timestamp('started_at');
            $table->timestamp('ended_at')->nullable();
            $table->timestamps();
            $table->unique(['pet_id', 'id']);
            $table->index(['owner_profile_id', 'ended_at']);
        });
        Schema::table('pets', function (Blueprint $table) {
            $table->foreign(['id', 'current_ownership_id'])->references(['pet_id', 'id'])->on('pet_ownerships')->restrictOnDelete();
        });
        Schema::create('vaccine_definitions', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
        });
        Schema::create('weight_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pet_id')->constrained()->restrictOnDelete();
            $table->decimal('weight_kg', 8, 3);
            $table->date('measured_at');
            $table->index(['pet_id', 'measured_at']);
            $table->text('notes')->nullable();
            $table->foreignId('recorded_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
        });
        Schema::create('medical_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pet_id')->constrained()->restrictOnDelete();
            $table->date('event_date');
            $table->text('summary');
            $table->index(['pet_id', 'event_date']);
            $table->text('notes')->nullable();
            $table->foreignId('recorded_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
        });
        Schema::create('allergy_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pet_id')->constrained()->restrictOnDelete();
            $table->string('allergen');
            $table->text('reaction')->nullable();
            $table->string('severity')->nullable();
            $table->date('identified_at')->nullable();
            $table->string('status')->default('active');
            $table->text('notes')->nullable();
            $table->foreignId('recorded_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
        });
        Schema::create('vaccination_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pet_id')->constrained()->restrictOnDelete();
            $table->foreignId('vaccine_definition_id')->constrained()->restrictOnDelete();
            $table->date('administered_at');
            $table->date('next_due_at')->nullable();
            $table->string('dose')->nullable();
            $table->string('batch_number')->nullable();
            $table->string('administering_clinic')->nullable();
            $table->index(['pet_id', 'administered_at']);
            $table->text('notes')->nullable();
            $table->foreignId('recorded_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
        });
        $key = DB::getDriverName() === 'sqlite' ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY';
        $foreignKey = DB::getDriverName() === 'sqlite' ? 'INTEGER' : 'BIGINT UNSIGNED';
        DB::statement("CREATE TABLE correction_requests (
            id {$key}, pet_id {$foreignKey} NOT NULL REFERENCES pets(id),
            requested_by {$foreignKey} NOT NULL REFERENCES users(id),
            target_type VARCHAR(30) NOT NULL,
            weight_record_id {$foreignKey} NULL REFERENCES weight_records(id),
            medical_entry_id {$foreignKey} NULL REFERENCES medical_entries(id),
            allergy_record_id {$foreignKey} NULL REFERENCES allergy_records(id),
            vaccination_record_id {$foreignKey} NULL REFERENCES vaccination_records(id),
            pet_ownership_id {$foreignKey} NULL REFERENCES pet_ownerships(id),
            description TEXT NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'pending',
            resolution_note TEXT NULL, resolved_by {$foreignKey} NULL REFERENCES users(id),
            resolved_at TIMESTAMP NULL, created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL,
            CONSTRAINT correction_target_check CHECK (
                (CASE WHEN weight_record_id IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN medical_entry_id IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN allergy_record_id IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN vaccination_record_id IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN pet_ownership_id IS NOT NULL THEN 1 ELSE 0 END) = 1
                AND ((target_type = 'weight' AND weight_record_id IS NOT NULL)
                  OR (target_type = 'medical' AND medical_entry_id IS NOT NULL)
                  OR (target_type = 'allergy' AND allergy_record_id IS NOT NULL)
                  OR (target_type = 'vaccination' AND vaccination_record_id IS NOT NULL)
                  OR (target_type = 'ownership' AND pet_ownership_id IS NOT NULL))
            )
        )");
        Schema::table('correction_requests', function (Blueprint $table) {
            $table->index(['requested_by', 'status']);
            if (DB::getDriverName() !== 'sqlite') {
                foreach (['pet_id' => 'pets', 'requested_by' => 'users', 'weight_record_id' => 'weight_records', 'medical_entry_id' => 'medical_entries', 'allergy_record_id' => 'allergy_records', 'vaccination_record_id' => 'vaccination_records', 'pet_ownership_id' => 'pet_ownerships', 'resolved_by' => 'users'] as $column => $target) {
                    $table->foreign($column)->references('id')->on($target)->restrictOnDelete();
                }
            }
        });
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('actor_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->string('action')->index();
            $table->string('subject_type');
            $table->unsignedBigInteger('subject_id');
            $table->json('before_values')->nullable();
            $table->json('after_values')->nullable();
            $table->timestamp('created_at')->useCurrent()->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
        Schema::dropIfExists('correction_requests');
        foreach (['vaccination_records', 'allergy_records', 'medical_entries', 'weight_records', 'vaccine_definitions'] as $table) {
            Schema::dropIfExists($table);
        }
        Schema::table('pets', function (Blueprint $table) {
            $table->dropForeign(['id', 'current_ownership_id']);
        });
        foreach (['pet_ownerships', 'pets', 'breeds', 'species', 'auth_providers', 'owner_profiles'] as $table) {
            Schema::dropIfExists($table);
        }
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('role_id');
            $table->dropColumn(['contact_number', 'address', 'approval_status', 'approval_note', 'enabled']);
        });
        Schema::dropIfExists('roles');
    }
};
