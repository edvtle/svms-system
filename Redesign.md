# Target Architecture Plan: SVMS Redesign

## Summary
Redesign the project into a small monorepo with separate deployable apps and shared packages. The target shape is: `student web` on Vercel, `admin desktop` in Electron, and `Supabase-first backend services` replacing most of the current custom Express server. Keep one shared design/data foundation so student and admin experiences stay consistent without forcing both into one React app.

Recommended target structure:

```text
svms-system/
  apps/
    student-web/
      src/
        app/
        routes/
        pages/
        features/
        providers/
      public/
      package.json
      vite.config.js

    admin-app/
      src/
        app/
        routes/
        pages/
        features/
        providers/
      public/
      package.json
      vite.config.js

    admin-desktop/
      electron/
        main.cjs
        preload.cjs
      package.json

  packages/
    ui/
      src/
        components/
        layout/
        theme/
      package.json

    core/
      src/
        auth/
        session/
        config/
        constants/
        utils/
        validation/
      package.json

    data-access/
      src/
        supabase/
        queries/
        mutations/
        storage/
        edge-functions/
      package.json

    features/
      src/
        notifications/
        profile/
        violations/
        archives/
        reports/
        settings/
      package.json

    types/
      src/
        database.ts
        dto.ts
        domain.ts
      package.json

  supabase/
    migrations/
    seed/
    functions/
      admin-archive/
      send-student-credentials/
      audit-log/
    storage/
      buckets.md
    policies/
      rls.sql

  scripts/
    setup/
    verify/

  docs/
    architecture/
    deployment/
    migration/

  package.json
  jsconfig.json
  .env.example
```

## Key Changes
### App boundaries
- `apps/student-web`: student-facing web app only; no admin pages or admin-only logic.
- `apps/admin-app`: admin React renderer only; optimized for desktop workflows and reusable in browser if needed.
- `apps/admin-desktop`: thin Electron shell that loads `admin-app` and contains only desktop process concerns.
- Remove the current “single app with both `/admin` and `/student` routes” structure as the target end state.

### Shared packages
- `packages/ui`: shared visual system, table shells, cards, modals, navigation primitives, and branding tokens.
- `packages/core`: app-agnostic auth/session helpers, config loading, role guards, validators, and shared constants.
- `packages/data-access`: the only place allowed to talk to Supabase clients, storage, and Edge Functions.
- `packages/features`: domain modules grouped by business capability instead of by current page file layout.
- `packages/types`: canonical domain/database types consumed by both apps and functions.

### Supabase-first backend
- Move database ownership out of `server/db.js` bootstrapping and into `supabase/migrations`.
- Move auth to Supabase Auth; remove custom login/password-reset ownership from the app server.
- Move uploads to Supabase Storage; remove `server/uploads` as permanent storage.
- Move sensitive multi-step admin actions to `supabase/functions`, especially archive flows, audit logging, account emails, and other privileged mutations.
- Treat direct DB access from app code as forbidden outside the shared data-access package.

### Feature ownership
- `student-web` consumes `profile`, `notifications`, and `violations` feature modules in read-focused flows.
- `admin-app` consumes `students`, `violations`, `archives`, `reports`, and `settings` feature modules with mutation-heavy flows.
- Shared features live in packages; app-level pages only compose them into screens and route entries.

### Configuration and interfaces
- Introduce a root workspace config and shared path aliases for `apps/*` and `packages/*`.
- Replace ad hoc `fetch('/api/...')` usage with explicit service modules in `packages/data-access`.
- Public interfaces added:
  - shared `Supabase client` factory for browser and desktop renderer use
  - typed query/mutation functions per feature
  - Edge Function contracts for admin-only operations
  - shared domain types for `Student`, `Violation`, `Notification`, `Archive`, `SystemSettings`, and `AuditLog`

## Implementation Changes
### Folder migration rules
- Current `src/components/ui` and layout primitives migrate into `packages/ui`.
- Current student/admin page logic migrates into `packages/features` first, then gets composed by `apps/student-web` and `apps/admin-app`.
- Current `electron/` stays minimal and moves under `apps/admin-desktop/electron`.
- Current `server/` does not survive as a primary runtime; its reusable business rules are extracted into `packages/core` or rewritten as Edge Functions.

### Data flow target
- Student app: React page -> feature module -> data-access package -> Supabase query/function.
- Admin app: React page -> feature module -> data-access package -> Supabase query/function.
- Desktop shell: Electron main/preload -> loads `admin-app`; no direct database or business logic in main process.
- Supabase Functions handle privileged admin workflows, audit writes, email sending, and any transactional server-side orchestration.

### Deployment target
- `student-web`: Vercel deployment.
- `admin-app`: built artifact consumed by Electron.
- `admin-desktop`: packaged `.exe`.
- Supabase hosts database, auth, storage, and functions.
- No always-on Express server in the target architecture.

## Test Plan
- Workspace builds each app independently: `student-web`, `admin-app`, and `admin-desktop`.
- Shared packages compile without app-specific imports crossing boundaries.
- Student app can authenticate, load profile, notifications, and personal violations using Supabase-backed data-access modules.
- Admin app can authenticate, manage students, manage violations, update settings, and trigger archive flows through typed data-access modules and Edge Functions.
- Electron package loads the admin renderer without requiring a local Node API process.
- Storage-backed logo/signature uploads work from both student/admin surfaces where applicable.
- Route-level authorization blocks students from admin-only features and vice versa.
- Supabase migration set can initialize a fresh environment without runtime table-creation code.

## Assumptions
- Chosen structure is `split apps` with shared packages, not a single combined frontend.
- Chosen admin direction is `shared renderer`: Electron wraps the admin React app rather than owning a separate independent UI codebase.
- Student experience remains web-first; admin experience is desktop-first but may still be runnable as a browser app for maintenance/testing.
- The redesign target is cost minimization and deployment simplicity, so the custom Express API is intentionally retired rather than preserved.
- Archive logic, audit logging, and outbound email remain server-side responsibilities, but they move to Supabase Functions instead of a long-running Node server.
