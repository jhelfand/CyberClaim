# GAIG Security Claims

Standalone GAIG specialty security-claims application built from scratch with Next.js, React, TypeScript, and the UiPath TypeScript SDK.

The app supports:

- OAuth sign-in with the UiPath browser flow using `sdk.initialize()`
- PAT-backed server sessions for secret-based authentication
- A purpose-built `SECURITY_CLAIM` workflow:
  Intake -> Initial Triage -> Security Assessment -> Forensic Review -> Settle -> Close
- Incident intake with evidence uploads
- A claims dashboard with KPI cards, filters, and detail drill-down
- Claim detail tabs for incident data, evidence, tasks, and notes/decisions
- Best-effort UiPath synchronization for processes, tasks, cases, and bucket storage
- Seeded demo claims for a bank burglary, jewellery store break-in, and false alarm

## Stack

- Next.js App Router
- React 19 + TypeScript
- UiPath TypeScript SDK: `@uipath/uipath-typescript`
- Node.js route handlers for protected server-side mediation

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Copy the example env file:

```bash
cp .env.example .env.local
```

3. Update the UiPath values in `.env.local`.

4. Start the app:

```bash
npm run dev
```

5. Open the printed local URL in your browser.

Important:

- The recommended redirect URI is `http://localhost:3000`.
- If port `3000` is already in use, Next.js will pick another port such as `3001` or `3002`.
- When that happens, update both `UIPATH_REDIRECT_URI` and your UiPath external app redirect URI to match the actual running port.

## Environment Variables

Required base settings:

```env
UIPATH_BASE_URL=https://cloud.uipath.com
UIPATH_ORG_NAME=your-org
UIPATH_TENANT_NAME=DefaultTenant
UIPATH_CLIENT_ID=your-external-app-client-id
UIPATH_REDIRECT_URI=http://localhost:3000
UIPATH_SCOPE=OR.Administration OR.Jobs.Write OR.Tasks PIMS OR.Execution.Read
UIPATH_SECRET=
```

Optional integration settings:

```env
UIPATH_FOLDER_ID=
UIPATH_FOLDER_KEY=
UIPATH_BUCKET_ID=
UIPATH_SECURITY_CLAIM_PROCESS_KEY=SECURITY_CLAIM
UIPATH_BUCKET_PATH_PREFIX=security-claims
```

Client-safe OAuth mirrors:

```env
NEXT_PUBLIC_UIPATH_BASE_URL=${UIPATH_BASE_URL}
NEXT_PUBLIC_UIPATH_ORG_NAME=${UIPATH_ORG_NAME}
NEXT_PUBLIC_UIPATH_TENANT_NAME=${UIPATH_TENANT_NAME}
NEXT_PUBLIC_UIPATH_CLIENT_ID=${UIPATH_CLIENT_ID}
NEXT_PUBLIC_UIPATH_REDIRECT_URI=${UIPATH_REDIRECT_URI}
NEXT_PUBLIC_UIPATH_SCOPE=${UIPATH_SCOPE}
```

## Authentication Modes

### OAuth mode

Use this for adjuster-facing browser sign-in.

The client auth provider:

- builds a UiPath SDK instance with `baseUrl`, `orgName`, `tenantName`, `clientId`, `redirectUri`, and `scope`
- calls `sdk.initialize()` when the user clicks the OAuth button
- checks `sdk.isAuthenticated()` on load
- completes the redirect callback automatically
- calls `sdk.logout()` on sign-out

Protected API calls include the OAuth access token as a bearer header. The server recreates a UiPath SDK instance from that bearer token so route handlers can keep using the SDK.

### PAT secret mode

Use this for demos or service-account-backed flows.

The server:

- reads `UIPATH_SECRET`
- creates the UiPath SDK in secret mode
- exposes a PAT login button that sets an httpOnly session cookie
- protects API routes with that cookie

This keeps the secret off the client.

## UiPath External App Setup

Create a non-confidential external application in UiPath Cloud and configure:

- Redirect URI:
  `http://localhost:3000`
- Scopes:
  `OR.Administration`
  `OR.Jobs.Write`
  `OR.Tasks`
  `PIMS`
  `OR.Execution.Read`

Production deployment:

- Add your production URL as an additional redirect URI in the same UiPath external app.
- Update `UIPATH_REDIRECT_URI` and `NEXT_PUBLIC_UIPATH_REDIRECT_URI` to the deployed URL.

## Workflow Design

The app models the new `SECURITY_CLAIM` process definition with these stages:

1. Intake
2. Initial Triage
3. Security Assessment
4. Forensic Review
5. Settle
6. Close

Stage task coverage includes:

- Collect police reports and alarm logs
- Schedule on-site assessments
- Obtain CCTV footage
- Review evidence

The app creates stage tasks locally for demo continuity and also attempts to mirror them into UiPath Action Center when folder configuration and authentication are available.

## UiPath Service Usage

The server route handlers use the UiPath SDK to:

- start the `SECURITY_CLAIM` process with `Processes.start()`
- create and complete Action Center tasks with `Tasks.create()` and `Tasks.complete()`
- upload evidence into buckets with `Buckets.uploadFile()`
- fetch case snapshots with `CaseInstances.getById()`, `getStages()`, and `getActionTasks()`
- close a case when the claim reaches the final stage

If UiPath connectivity is incomplete, the app falls back to demo mode and still functions with seeded and newly created local claims.

## Demo Data

The app ships with three seeded claims:

- MetroTrust Community Bank burglary
- Carlton Jewelers break-in
- Riverside Distribution Warehouse false alarm

Uploaded files are stored in one of two ways:

- UiPath buckets when `UIPATH_BUCKET_ID` and folder configuration are available
- Local demo storage under `storage/uploads/` when bucket sync is unavailable

## Deployment

Vercel is the simplest option for this app.

1. Push the project to a Git provider.
2. Create a Vercel project from the repo.
3. Add the same environment variables used locally.
4. Set the production redirect URI in UiPath Cloud to your deployed domain.
5. Redeploy after updating the external app.

Netlify also works, but Vercel is the smoother fit for App Router route handlers.

## Verification

Verified locally with:

```bash
npm run build
npm run typecheck
```

The dev server also started successfully during smoke test. In this workspace on March 16, 2026 it bound to `http://localhost:3002` because port `3000` was already occupied.
