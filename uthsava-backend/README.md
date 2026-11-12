# Node.js Backend Template - Production Grade

## Scope

- **Roles:** `admin`, `user`, `admin_sub_user` — see `src/common/types/auth.types.ts`.
- **HTTP API:** Mount points are defined in `src/api/routes/v1/index.ts` (e.g. `/api/v1/auth`, `/api/v1/admin`, `/api/v1/profile`, `/api/v1/chat`, …).

## Docs

- [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) — patterns and examples
- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) — layout
- [ARCHITECTURE_REFERENCE.md](./ARCHITECTURE_REFERENCE.md) — quick reference
- [README_NEW_STRUCTURE.md](./README_NEW_STRUCTURE.md) — modular layout notes

## ESLint

- [docs/ESLINT_GUIDELINES.md](docs/ESLINT_GUIDELINES.md)

## Build

- `npm run build` compiles TypeScript, runs `tsc-alias`, and copies `src/locales` and `src/templates` into `dist`.
