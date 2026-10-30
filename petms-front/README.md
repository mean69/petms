# PetFave frontend

React 19 + Vite, React Router, Axios, and Lucide icons.

See [the workspace README](../README.md) for full installation, role workflows, API configuration, and verification.

```powershell
npm install
npm run dev:api
# In another terminal:
npm run dev
npm run build
npm run test:e2e
```

Set VITE_API_URL to the Laravel origin. This workspace uses http://localhost:8001 through `.env.local` and `npm run dev:api`; the standard environment example uses http://localhost:8000. The helper preserves the backend `.env` and supplies unique local session-cookie settings. All API access uses `src/api/axios.jsx`; authentication uses HttpOnly server sessions rather than browser credential storage.

Browser tests run against a separate database and ports 5184 / 8011, avoiding local frontend ports 5173 and 5174. Installed Chrome is the default test browser.
