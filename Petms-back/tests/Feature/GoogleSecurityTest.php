<?php

namespace Tests\Feature;

use App\Models\AuthProvider;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Socialite\Facades\Socialite;
use Mockery;
use Tests\TestCase;

class GoogleSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_google_redirect_uses_state_pkce_and_keeps_secret_on_backend(): void
    {
        config(['services.google.client_id' => 'test-client', 'services.google.client_secret' => 'test-secret', 'services.google.redirect' => 'http://localhost:8000/auth/google/callback']);
        $url = $this->postJson('/auth/google/start', ['role' => 'staff'])->assertOk()->json('url');
        parse_str(parse_url($url, PHP_URL_QUERY), $params);
        $this->assertNotEmpty($params['state']);
        $this->assertNotEmpty($params['code_challenge']);
        $this->assertSame('S256', $params['code_challenge_method']);
        $this->assertStringNotContainsString('test-secret', $url);
        $this->assertSame('staff', session('google_registration_role'));
    }

    public function test_invalid_oauth_state_is_rejected_before_network_exchange(): void
    {
        config(['services.google.client_id' => 'test-client', 'services.google.client_secret' => 'test-secret', 'services.google.redirect' => 'http://localhost:8000/auth/google/callback']);
        $this->withSession(['state' => 'expected', 'google_registration_role' => 'client'])->get('/auth/google/callback?state=forged&code=fake')->assertRedirect('http://localhost:5173/login?google_error=failed');
        $this->assertGuest();
        $this->assertDatabaseCount('users', 0);
    }

    private function identity(string $subject, string $email): void
    {
        $identity = (new \Laravel\Socialite\Two\User)->setRaw(['email_verified' => true])->map(['id' => $subject, 'email' => $email, 'name' => 'Google User']);
        $driver = Mockery::mock();
        $driver->shouldReceive('enablePKCE')->andReturnSelf();
        $driver->shouldReceive('user')->andReturn($identity);
        Socialite::shouldReceive('driver')->with('google')->andReturn($driver);
    }

    public function test_google_registration_requires_explicit_role_choice(): void
    {
        $this->identity('new-subject', 'new@example.test');
        $this->get('/auth/google/callback?code=test')->assertRedirect('http://localhost:5173/login?google_error=role_required');
        $this->assertDatabaseCount('users', 0);
    }

    public function test_existing_user_can_explicitly_link_verified_google_identity_while_signed_in(): void
    {
        $user = User::factory()->create(['role_id' => 2, 'approval_status' => 'rejected']);
        $this->identity('verified-subject', $user->email);
        $this->actingAs($user)->withSession(['google_link_user' => $user->id])->get('/auth/google/callback?code=test')->assertRedirect('http://localhost:5173/app');
        $this->assertDatabaseHas('auth_providers', ['user_id' => $user->id, 'subject' => 'verified-subject']);
        $this->assertSame('rejected', $user->fresh()->approval_status);
        $this->assertSame(2, $user->fresh()->role_id);
    }

    public function test_google_identity_cannot_be_linked_to_a_different_existing_account(): void
    {
        $one = User::factory()->create();
        $two = User::factory()->create();
        AuthProvider::create(['provider' => 'google', 'subject' => 'already-linked', 'user_id' => $one->id]);
        $this->identity('already-linked', $one->email);
        $this->actingAs($two)->withSession(['google_link_user' => $two->id])->get('/auth/google/callback?code=test')->assertRedirect('http://localhost:5173/login?google_error=linked');
        $this->assertDatabaseCount('auth_providers',1);
    }
}
