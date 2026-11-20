# HospitalOS Frontend

HospitalOS frontend foundation built with Next.js App Router, TypeScript, Tailwind CSS, and shadcn/ui.

## Local development

From the repository root:

```powershell
Copy-Item frontend\.env.example frontend\.env.local
Set-Location frontend
npm install
npm run dev
```

The development server runs at http://localhost:3000 and uses `NEXT_PUBLIC_API_URL` for the backend base URL.

The development-only design system showcase is available at http://localhost:3000/design-system. It is isolated from the application route tree and returns not found in production.

## Application experience

- `/` is the public HospitalOS landing page and does not require authentication.
- `/login` is the authenticated workspace sign-in entry point.
- `/dashboard` and all module routes require an active session.
- Sidebar and route access use the effective permissions returned in the active tenant session.
- Navigation items and module actions remain dependent on backend authorization. Hiding a UI control is not a substitute for backend permission enforcement.
- The dashboard uses responsive desktop, tablet and mobile layouts, including a drawer-based mobile sidebar.

## Validation

```powershell
npm test
npm run lint
npm run typecheck
npm run build
```

Only browser-safe `NEXT_PUBLIC_*` values belong in frontend environment files. Backend credentials, database settings, and JWT signing secrets must remain server-side.
