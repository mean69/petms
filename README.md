# PetFave · Pet Management System

React 19 + Vite frontend, Laravel 13 + Sanctum cookie sessions, and MySQL 8+.

Pet profiles, owner records, verified ownership history, weight measurements, dated medical history, allergies, vaccinations, staff approvals, correction requests, and audit logs. No appointment, billing, inventory, prescription, or reporting modules.

## Start locally

This workspace runs the PetFave API at **http://localhost:8001** because port 8000 is occupied by a different Laravel project. The frontend remains **http://localhost:5173**. The existing backend environment was preserved; `npm run dev:api` supplies the local URL and cookie settings for this project without changing that file.

The standard environment example retains port 8000 for conventional Laravel setup. This checkout has a frontend `.env.local` override for port 8001. In a fresh checkout, create `petms-front/.env.local` with `VITE_API_URL=http://localhost:8001` when using the development helper.

Prerequisites: PHP 8.3+, Composer 2, Node 22.12+ (or a version supported by the installed Vite), MySQL 8.0.16+ with CHECK constraints. PHP extensions: PDO MySQL, PDO SQLite for tests, mbstring, openssl, curl, fileinfo, DOM, XML.

The existing backend `.env` was left untouched. If it already contains your MySQL credentials, **keep it** and add the frontend/session/Google settings shown in [the example](Petms-back/.env.example). Only copy the example if you do not have an environment file.

1. Create an empty MySQL database named `petfave` (or use your existing configured database). Configure DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME and DB_PASSWORD privately.
2. In a terminal:

   ```powershell
   cd Petms-back
   composer install
   # Only when .env does not exist:
   Copy-Item .env.example .env
   # Only when APP_KEY is empty:
   php artisan key:generate
   php artisan config:clear
   php artisan migrate --seed
   php artisan petfave:admin admin@example.com
   ```

   The administrator command prompts for name, contact details, address, and a hidden password. Public registration cannot create an administrator. Existing accounts are never silently promoted by the command. Migration is additive; do not use `migrate:fresh` against an application database you need to keep.

3. In another terminal:

   ```powershell
   cd petms-front
   npm install
   # Only when this file does not already exist:
   Copy-Item .env.example .env
   npm run dev:api
   ```

4. Keep the API terminal running. In a third terminal, run:

   ```powershell
   cd petms-front
   npm run dev
   ```

5. Open **http://localhost:5173**. Sign in with the administrator account or register a pet owner or staff account.

Use `localhost` for both services. Mixing `localhost` and `127.0.0.1` prevents cookies from being shared correctly. If a port is occupied by an existing server, reuse that server or update Vite, FRONTEND_URL and SANCTUM_STATEFUL_DOMAINS consistently.

Vite now stops if port 5173 is occupied instead of silently opening another port. Open the existing frontend at http://localhost:5173. The local API helper accepts localhost ports 5173 and 5174 for CORS and Sanctum sessions, including an already-open second frontend. For a custom frontend port, set `PETFAVE_FRONTEND_URL` before starting `npm run dev:api` and pass the same port to Vite. Direct Laravel deployments can set `CORS_ALLOWED_ORIGINS` to an explicit comma-separated list; otherwise CORS uses `FRONTEND_URL`.

## Optional local demonstration data

On a local database only:

```powershell
cd Petms-back
php artisan db:seed --class=DemoSeeder
```

The opt-in demo seeder creates `admin@petfave.test`, `staff@petfave.test`, `pending@petfave.test`, `owner@petfave.test`, and `other@petfave.test`. The public demonstration password is **PetFaveDemo123!**. These are test credentials; the seeder refuses to run outside local/testing environments. Default seeding installs reference data only and creates no default login.

## Roles and record access

| Feature | Administrator | Approved clinic staff | Pet owner |
| --- | --- | --- | --- |
| Basic pet profile | All pets | All pets | Own pets |
| Archive / restore | All pets | View archived records | Own pets |
| Owner contacts | Create, view, edit, verify account links | View; select existing owners | Own profile |
| Weight, medical, allergy, vaccination records | View, add, update | View, add, update | View own pets only |
| Correction requests | Review, accept/reject, apply validated changes | No resolution access | Submit and view own requests |
| Ownership transfers | Verified transfers with history | No | Request correction |
| Accounts, staff approvals, activity log | Manage / review | No | No |

Pending/rejected staff can inspect account status and sign out. Incomplete Google registrations first complete the required profile. Business APIs additionally require an enabled, approved account with a complete profile. Disabling a user blocks existing sessions from business access.

Every protected request checks authentication and account readiness. Role middleware is registered in `bootstrap/app.php`; pet policies and scoped queries enforce record access. Health endpoints bind records through the selected pet. Clients cannot select another owner, change their role or approval state, or directly write clinical records. Permanent deletion routes are absent.

## Database and implementation stages

[DATABASE.md](DATABASE.md) contains the ERD, cardinalities, 3NF explanation, and history rules. The schema is implemented in the PetFave migration.

1. Database, authentication and authorization: normalized schema; Sanctum SPA sessions; role/status middleware; per-pet policies; Google code flow.
2. Pet profiles and ownership: owner profiles with optional account links, species/breed consistency, calculated exact/estimated ages, archiving, verified transfers.
3. Clinical records and corrections: dated weight/history/allergy/vaccination records, validated correction targets, administrator resolution, transactional before/after audit logs.
4. Interface: responsive public landing and role dashboards, search, active/archive views, accessible forms, confirmations, loading/empty/error states.

A verified new owner can read the pet’s preserved health history. Former owners immediately lose pet access, including their old correction requests for that pet. Owner contact history is administrator-only. Client clinical payloads omit the recording user’s identity, so historical user identities do not disclose a former owner’s personal details. Clinic personnel can inspect recording users; administrators can inspect the complete audit trail. Free-text clinical notes should contain pet health information.

The current weight comes from the newest measurement date, with ID as a deterministic tie-breaker. Updates preserve the original recorder and log the acting editor separately. Allergy information distinguishes unknown, no known allergies, and recorded allergy information. Vaccination dates are entered records, never generated schedules; dashboard dates use the latest record for each pet/vaccine.

Unlinked owner profiles can be created before the owner has an account. Later linking requires an administrator and a verification reference. Email equality never automatically links an account. A client account that already has ownership history cannot be relinked through the empty-profile linking workflow.

## Google sign-in

1. Create Google OAuth web application credentials.
2. Set **backend-only** GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI. Register the exact callback URI `http://localhost:8001/auth/google/callback` when using `npm run dev:api`. Conventional port-8000 setup uses `http://localhost:8000/auth/google/callback` instead.
3. Run `php artisan config:clear` after configuration changes.
4. New users select Pet Owner or Clinic Staff before continuing with Google. Missing contact number/address must be completed; staff still require approval.
5. Existing Google-linked accounts retain their role and approval state. For an existing password account, sign in with the password, then use **My profile → Link Google account** with the same verified Google email.

Socialite exchanges the authorization code on the server using session state and PKCE and retrieves the identity from Google. Provider subjects are unique. An unauthenticated email match is rejected rather than automatically linked. OAuth denial, invalid state and provider failures return to the login screen with a clear message.

Live Google-provider sign-in requires your own credentials and consent-screen configuration. Automated tests cover redirect state/PKCE, invalid state, verified identities, account linking, missing profiles, role choice and preserved approvals using provider doubles.

## API and frontend organization

Business endpoints live under `/api/v1`. Authentication endpoints `/register`, `/login`, `/logout` and Google initiation use Laravel’s session/CSRF web middleware.

| Routes | Purpose |
| --- | --- |
| GET `/me`, PATCH `/profile` | Account status and profile completion |
| GET `/references`, GET `/dashboard` | Reference selections and scoped due dates |
| GET/POST `/owners`, GET/PUT/PATCH `/owners/{owner}` | Owner contacts |
| POST `/owners/{owner}/link` | Verified administrator account linking |
| GET/POST `/pets`, GET/PUT/PATCH `/pets/{pet}` | Scoped pet profiles |
| POST `/pets/{pet}/archive` or `/restore` | Reversible archive actions |
| GET/POST `/pets/{pet}/{kind}`, GET/PUT/PATCH `/pets/{pet}/{kind}/{record}` | Clinical records; kind is weights, medical-history, allergies or vaccinations |
| PATCH `/pets/{pet}/allergy-status` | Clinic-maintained information status |
| GET `/pets/{pet}/ownerships`, POST `/pets/{pet}/transfer` | Administrator ownership history / transfer |
| GET/POST `/corrections`, POST `/corrections/{correction}/resolve` | Client submission / administrator resolution |
| GET `/users`, PATCH `/users/{user}`, POST `/users/{user}/decision` | Accounts and staff decisions |
| GET `/activity-logs` | Administrator audit inspection |

Run `php artisan route:list --path=api` for exact methods. Lists are paginated. `pets` accepts `search`, `species_id`, `archived`, `page`. Owner lists accept `search`, `page`; logs accept `search`, `page`.

Correction submission supplies `pet_id`, `target_type`, `description` and exactly one matching foreign key (`weight_record_id`, `medical_entry_id`, `allergy_record_id`, `vaccination_record_id`, `pet_ownership_id`). Accepted clinical requests require validated `changes` plus a resolution note. Ownership corrections must first go through a verified ownership transfer; accepting the request then records the decision. Resolution and clinical changes are atomic.

Axios modules are in the existing `petms-front/src/api/` directory (the project’s actual frontend folder), including `axios.jsx`, `Auth.jsx`, `login.jsx`, owner profiles, pets, weights, medical history, allergies, vaccinations, ownership, staff approvals, corrections and logs. The base URL is the backend **origin**, not `/api/v1`. All requests use the shared credentialed/XSRF-enabled instance. Account identity is fetched on startup; credentials are never persisted in browser storage.

## Verification

Backend tests use an isolated in-memory SQLite database, never your configured MySQL application database:

```powershell
cd Petms-back
php artisan test --compact
```

For a MySQL test run, create a separate disposable MySQL database first, then set DB_CONNECTION=mysql and DB_DATABASE to that isolated name in the test process. The tests migrate their database; never point them at the application database. The same authorization and integrity tests have also been run against MySQL.

Real-browser tests run the Vite frontend and Laravel API on dedicated ports **5184 / 8011**, with a separate `database/petfave-e2e.sqlite` file and demonstration accounts. The test frontend uses an additional explicitly allowed origin, covering CORS and Sanctum session configuration:

```powershell
cd petms-front
npm run test:e2e
npm run build
```

The browser configuration uses installed Chrome by default. To use Playwright’s Chromium instead, install it with `npx playwright install chromium` and set PLAYWRIGHT_CHANNEL=chromium. E2E servers use local environment settings so CSRF runs normally. The isolated runner uses PHP OPcache when it is available; it never changes the installed PHP configuration. These tests exercise cookie flags and JavaScript inaccessibility, CSRF rejection, role navigation, pet creation and refresh, clinical forms, correction submission, archive/restore and logout. Screenshots and traces are in `test-results/`; the HTML report is in `playwright-report/`.

Browser DevTools → Application → Cookies shows `petfave_session` as HttpOnly and `XSRF-TOKEN` as readable for CSRF headers. The session value is not readable through document.cookie. A request without authentication returns 401, forbidden actions return 403, invalid data returns 422 and missing/expired CSRF tokens return 419.

## Production

Use HTTPS with frontend/backend under a shared parent domain, such as app.example.com and api.example.com. [The production example](Petms-back/.env.production.example) shows matching CORS, stateful-domain and cookie settings. Set VITE_API_URL to the API’s HTTPS origin before building the frontend. Never use wildcard credentialed CORS.

Set a unique APP_KEY, database credentials, APP_DEBUG=false and SESSION_SECURE_COOKIE=true. The application always sets the session cookie HttpOnly. Use a dedicated least-privilege database account; serve Laravel’s public directory and configure the frontend host to serve index.html for React routes. Build the frontend, run additive migrations with backups, seed reference data, and cache Laravel configuration. OAuth credentials stay on the backend.

## Framework references

[Sanctum SPA authentication](https://laravel.com/framework/docs/sanctum), [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect), and the installed Socialite provider implementation informed authentication setup.
