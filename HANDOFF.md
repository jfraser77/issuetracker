# CBO / NSN IT Management Portal — Developer Handoff
**Last updated:** 2026-03-11
**Maintained by:** Joe Fraser (Admin)
**Live URL:** https://cboinventory-fse2g6h2fub6apac.centralus-01.azurewebsites.net

---

## 1. What This App Does

An internal HR/IT employee lifecycle portal for NSN Revenue Resources / USPI. It manages:

- **Employee Onboarding** — new hire checklists and access provisioning
- **Employee Terminations** — equipment return tracking, IT access removal checklist, automated HR email notifications
- **IT Assets / Inventory** — device assignment and pool management
- **Admin / User Management** — role-based access (Admin, I.T., HR)

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI Components | Radix UI, Heroicons |
| Database | SQL Server (Azure SQL) via `mssql` package |
| Authentication | Custom (bcryptjs + session), password reset via nodemailer |
| Email | Nodemailer → Office 365 SMTP |
| Hosting | Azure App Service (Node 20-LTS, Linux) |
| CI/CD | GitHub Actions → Azure |

---

## 3. Local Development Setup

```bash
# From the repo root
cd issuetracker
npm install --legacy-peer-deps   # --legacy-peer-deps is required

# Create a .env.local file (see Section 6 for required vars)
npm run dev                       # runs on http://localhost:3000
```

> **Note:** `typescript.ignoreBuildErrors: true` and `eslint.ignoreDuringBuilds: true` are set in `next.config.js`. TypeScript/lint errors will not fail the build.

---

## 4. Project Structure

```
issuetracker/
├── app/                          # Next.js App Router
│   ├── api/                      # App Router API routes
│   │   ├── auth/                 # Login, logout, user session
│   │   ├── terminations/         # Termination CRUD + email triggers
│   │   │   ├── route.ts          # GET list / POST create (sends initiation email)
│   │   │   ├── check-overdue/    # POST — marks overdue, sends reminder emails
│   │   │   ├── [id]/
│   │   │   │   ├── route.ts      # GET / PUT / DELETE single termination
│   │   │   │   ├── return/       # POST — marks equipment returned (sends completion email)
│   │   │   │   └── archive/      # POST — archives completed termination
│   │   ├── employees/
│   │   ├── it-assets/
│   │   └── users/
│   ├── management-portal/        # All page UI
│   │   ├── terminations/
│   │   │   ├── TerminationsContent.tsx   # Main terminations UI component
│   │   │   ├── archived/page.tsx         # Archived terminations (restore + delete)
│   │   │   └── [id]/edit/page.tsx        # Edit single termination
│   │   ├── employees/
│   │   ├── it-assets/
│   │   └── admin/
│   └── actions/                  # Next.js Server Actions
├── pages/api/                    # Legacy Pages Router API routes (mixed)
├── hooks/
│   ├── useTerminationData.ts     # All termination data-fetching + mutation logic
│   └── useChecklist.ts           # Checklist toggle/add/remove/group operations
├── components/
│   └── terminations/
│       └── ChecklistSection.tsx  # Checklist UI (module-level — avoids remount bug)
├── types/
│   └── termination.ts            # Shared types + utility fns (isOverdue, canArchive, etc.)
├── lib/
│   ├── db.ts                     # SQL Server connection pool
│   ├── email.ts                  # Nodemailer transporter + helper functions
│   ├── terminationConstants.ts   # HR_EMAILS + DEFAULT_CHECKLIST (single source of truth)
│   └── apiResponse.ts            # Standardized API response helpers (ok, badRequest, etc.)
├── services/
│   └── employeeService.ts
├── middleware.ts                  # Auth middleware — cookie check + publicPaths allow-list
├── server.js                     # Custom server — listens on PORT or 8080
└── next.config.js
```

---

## 5. Deployment

### How Deploys Work
Push to `main` → GitHub Actions triggers → builds → deploys to Azure App Service `CBOInventory`.

Workflow file: `.github/workflows/main_cboinventory.yml`

```
push to main
  └── npm install --legacy-peer-deps
  └── npm run build  (standalone output, DB secrets injected at build time)
  └── deploy artifact → Azure App Service "CBOInventory" Production slot
```

### Required GitHub Secrets
| Secret | Purpose |
|---|---|
| `AZURE_WEBAPP_PUBLISH_PROFILE` | Azure deployment credential |
| `DB_USER` | SQL Server username |
| `DB_PASSWORD` | SQL Server password |
| `DB_SERVER` | SQL Server hostname |
| `DB_NAME` | Database name |

### Manual Deploy
Trigger via GitHub Actions → `workflow_dispatch` (no code push needed).

---

## 6. Environment Variables

Required in `.env.local` for local dev and as Azure App Settings in production:

```env
DB_SERVER=your-server.database.windows.net
DB_USER=your-username
DB_PASSWORD=your-password
DB_NAME=your-database-name

SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASSWORD=your-email-password
SMTP_FROM=noreply@yourdomain.com
```

---

## 7. Database

**Engine:** Azure SQL (SQL Server)
**ORM:** None — raw `mssql` queries

### Key Tables
| Table | Purpose |
|---|---|
| `Terminations` | Termination records, equipment tracking, IT checklist |
| `Employees` | Employee records |
| `Users` | Portal user accounts (Admin, I.T., HR roles) |
| `ITAssets` | Device inventory |

### Terminations Table — Important Columns
```sql
id                  INT IDENTITY PRIMARY KEY
employeeName        NVARCHAR
employeeEmail       NVARCHAR
terminationDate     DATE
status              NVARCHAR  -- 'pending', 'equipment_returned', 'overdue', 'archived'
trackingNumber      NVARCHAR
equipmentDisposition NVARCHAR -- 'return_to_pool', 'retire', 'pending_assessment', 'malicious_damage'
checklist           NVARCHAR  -- JSON string of IT checklist items
completedByUserId   INT
computerSerial      NVARCHAR  -- added March 2026
computerModel       NVARCHAR  -- added March 2026
isOverdue           BIT
daysRemaining       INT
timestamp           DATETIME
```

---

## 8. ⚠️ Pending Database Migration

> **This must be run before `computerSerial` and `computerModel` fields will save.**

Connect to the Azure SQL database via Azure Data Studio or SSMS and run:

```sql
ALTER TABLE Terminations
ADD computerSerial NVARCHAR(255) NULL,
    computerModel  NVARCHAR(255) NULL;
```

The application code is already updated to read/write these columns. The migration is the only remaining step.

---

## 9. Email Notification System

All emails use Office 365 SMTP via `lib/email.ts`.

### HR Email Recipients
Defined once in `lib/terminationConstants.ts` as `HR_EMAILS`, imported by all routes:
- aogden@uspi.com
- aevans@nsnrevenue.com
- anwaters@uspi.com
- eolson@nsnrevenue.com

### Triggered Emails

| Trigger | Route | Recipients | Subject |
|---|---|---|---|
| Termination initiated | `POST /api/terminations` | HR team | "Termination Initiated: [Name] – Equipment Return Required" |
| Equipment marked returned | `POST /api/terminations/[id]/return` | HR team | "Equipment Return Satisfied: [Name]" |
| 30 days overdue, still pending | `POST /api/terminations/check-overdue` | Employee + HR CC | "Reminder: Return Company Equipment" |
| 30 days overdue (HR alert) | `POST /api/terminations/check-overdue` | HR team | "URGENT: Equipment Not Returned – [Name]" |

> All emails are **fire-and-forget** — a mail failure will log to console but will never block or fail the API response.

### Overdue Check Cadence
The frontend calls `check-overdue` on a 24-hour interval (`setInterval`) when the Terminations page is open. There is no independent cron job — it only runs while a browser has the page loaded.

---

## 10. Termination Workflow

```
1. User clicks "Initiate Termination" → fills name, email, date
2. POST /api/terminations → record created (status: pending)
   └── Email sent to HR: initiation notice + 30-day deadline + tracking number task
3. IT works through the IT Access Removal Checklist on the record
4. IT enters tracking number, equipment disposition, selects IT staff
5. IT clicks "Mark Equipment Returned" → POST /api/terminations/[id]/return
   └── status → 'equipment_returned'
   └── Email sent to HR: completion confirmation
6. Once checklist is 100% complete + all fields filled → "Archive" button unlocks
7. POST /api/terminations/[id]/archive → status → 'archived'
   └── Moves to Archived Terminations view
8. (Optional) Admin/IT can Restore to Active → PUT /api/terminations/[id] { status: 'equipment_returned' }
9. (Optional) Admin/IT can Delete → DELETE /api/terminations/[id] (permanent)
```

### Equipment Disposition Values
| Value | Display |
|---|---|
| `pending_assessment` | Pending Assessment (default) |
| `return_to_pool` | Return to Available Pool (adds +1 to IT staff inventory) |
| `retire` | Retire Equipment |
| `malicious_damage` | Malicious Damage by Employee (shown in red/bold in completion email) |

---

## 11. Role Permissions

| Role | Initiate | Mark Returned | Archive | Restore from Archive | Delete | View |
|---|---|---|---|---|---|---|
| Admin | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| I.T. | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| HR | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ |

---

## 12. Recent Changes (March 2026)

### Email Notifications Added
- **Initiation email** to HR when a new termination is created (`terminations/route.ts`)
- **Completion email** to HR when equipment is marked returned (`[id]/return/route.ts`)
- Fixed stray `git pull` text embedded in the overdue HR alert HTML (`check-overdue/route.ts`)

### Equipment Disposition
- Added `malicious_damage` as a selectable disposition option
- Completion email renders "Malicious Damage by Employee" in red bold when selected
- Fixed nested template literal bug in the completion email that caused raw ternary syntax to render as visible text

### Computer Serial # / Computer Model Fields
- Added `computerSerial` and `computerModel` to the PUT route `fieldMappings` in `[id]/route.ts`
- **Database migration still pending** — see Section 8

### Code Refactoring (2026-03-09)
- Extracted all data-fetching + mutation logic into `hooks/useTerminationData.ts`
- Extracted checklist operations into `hooks/useChecklist.ts`
- Moved `ChecklistSection` to a module-level component in `components/terminations/` — fixes a React remount bug that was resetting checklist input state on every parent re-render
- Created `types/termination.ts` with all shared types and utility functions (`isTerminationOverdue`, `daysRemainingUntilOverdue`, `getChecklistCompletion`, `canArchive`)
- Created `lib/terminationConstants.ts` — single source of truth for `HR_EMAILS` and `DEFAULT_CHECKLIST`, eliminating duplication across 4 files
- Created `lib/apiResponse.ts` — standardized API response helpers used across all termination routes
- `TerminationsContent.tsx` reduced by ~400 lines

### Auth System Fixes (2026-03-11)
- **Middleware `publicPaths` fix** — added missing login-flow routes (`/api/auth/verify-credentials`, `/api/auth/send-2fa`, `/api/auth/verify-2fa`, `/api/auth/forgot-password`, `/api/auth/reset-password`). These were being blocked as unauthenticated requests, causing `alert("Unauthorized")` on signin.
- **Session cookie format normalized** — all `cookieStore.set("auth-user", ...)` calls now write `JSON.stringify({ id, email, name, role, timestamp })`. Previously the `signin` server action was writing a plain email string while the middleware was calling `JSON.parse()` on it, causing a `SyntaxError` that deleted the cookie and bounced users back to signin immediately after 2FA.
- **`getCurrentUser()` and `/api/auth/user` updated** — both now parse the JSON cookie and extract `.email` before the DB query. Added `try/catch` fallback for any old plain-email cookies still in browsers.
- **`middleware.ts` confirmed at project root** — `issuetracker/middleware.ts` is the correct location and is active.

### Checklist Runtime Error Fix (2026-03-11)
- **`checklist.filter is not a function`** — SQL Server returns the `checklist` column as a raw `NVARCHAR` string. `markEquipmentReturned` and `updateTermination` were spreading the raw API response into state without parsing it. Added `normalizeTermination()` helper to `useTerminationData.ts` that parses the JSON string → array, falls back to `DEFAULT_CHECKLIST`, and recalculates derived fields. All state-update paths now call this helper.

### Computer Serial / Model Input Fix (2026-03-11)
- **Typing lag and character replacement fixed** — inputs were controlled by hook state with a 1-second debounce, causing React to reset the displayed value on every re-render before the debounce fired. Fixed in `ChecklistSection.tsx` by adding `localSerial` / `localModel` local state that updates immediately on keystroke, with `useRef` focus guards that prevent a `useEffect` sync from overwriting in-progress typing.

### Archived Terminations — Restore & Delete (2026-03-11)
- Added **Restore to Active** button on each archived record — calls `PUT /api/terminations/[id]` with `{ status: "equipment_returned" }`, returning the record to the active terminations page. Requires Admin or I.T. role.
- Added **Delete** button — calls `DELETE /api/terminations/[id]` (permanent, requires confirmation). Requires Admin or I.T. role.
- HR role can view and print archived records but cannot restore or delete.

---

## 13. Known Issues / Watch Points

### 🔴 Security — Action Required
- **Hardcoded `TEMP_PASSWORD`** in `app/api/auth/signin/route.ts` — remove before treating this as a production-grade auth system.
- **No server-side role enforcement on API routes** — role checks are UI-only. Any authenticated user can call sensitive endpoints directly (e.g. `DELETE /api/terminations/[id]`). Add server-side `requireRole()` guards.
- **Session cookies are not HMAC-signed** — the `auth-user` cookie value is plain JSON. A user who can write cookies could forge a session. Add HMAC signing (e.g. with the `iron-session` or `jose` library).
- **`verify-credentials` route bypasses password checking** — `app/api/auth/verify-credentials/route.ts` uses a hardcoded `allowedUsers` list and does no password verification. This is a significant security gap.

### 🟡 Reliability
- **Overdue check only runs client-side** — if no browser has the Terminations page open, overdue records won't be detected or emailed. Add an Azure Function or a GitHub Actions scheduled workflow calling `POST /api/terminations/check-overdue` daily.
- **PII in logs** — employee names/emails are logged to `console.log` in several API routes. On Azure these appear in Application Insights log streams.

### 🟢 Resolved (previously listed)
- ~~`hrEmails` duplicated across 3 route files~~ — consolidated into `lib/terminationConstants.ts`
- ~~`ccRecipients` identical duplicate of `hrEmails`~~ — removed, now uses `HR_EMAILS`
- ~~`ChecklistSection` defined inside parent component~~ — moved to module-level file, remount bug fixed
- ~~Middleware in wrong location~~ — `issuetracker/middleware.ts` is at the project root and active
- ~~Session cookie format mismatch~~ — all writers set JSON, all readers parse JSON
- ~~`/api/auth/user` JSON parse bug~~ — fixed with try/catch and JSON parse
- ~~Login-flow API routes blocked by middleware~~ — all auth routes added to `publicPaths`
- ~~`checklist.filter is not a function`~~ — `normalizeTermination()` helper parses JSON string on all state-update paths
- ~~Computer serial/model inputs lag and replace characters~~ — local state buffer with focus guards fixes the controlled input + debounce conflict

### ℹ️ General
- `typescript.ignoreBuildErrors: true` means TypeScript errors won't break CI — check IDE diagnostics panel periodically.
- The `/api/auth/signin` route (older route) and `/api/auth/verify-credentials` route (newer route) both attempt authentication. The signin page uses `verify-credentials`. The older `signin` route is unused by the UI but still exists — consider removing it to reduce confusion.
