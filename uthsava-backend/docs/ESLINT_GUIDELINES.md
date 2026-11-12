# ESLint Setup & Usage Guide

This is the minimal guide for using ESLint in this backend project.

## 1) One-time setup

Run these commands once after pulling latest changes:

```bash
npm install
```

ESLint is already configured in the project with:

- `.eslintrc.cjs`
- `.eslintignore`
- `package.json` scripts

## 2) Run lint checks

### Check code (no file changes)

```bash
npm run lint
```

### Auto-fix safe issues

```bash
npm run lint:fix
```

## 3) Team workflow

Use this flow before creating a PR:

1. Make code changes
2. Run `npm run lint:fix`
3. Run `npm run lint`
4. Commit only after there are no lint errors

## 4) How to read results

- **Error**: must be fixed before merge
- **Warning**: should be improved, but does not fail lint currently

## 5) Scope currently linted

ESLint currently checks TypeScript files in:

- `src/**/*.ts`
- `scripts/**/*.ts`

## 6) Notes

- Keep ESLint enabled in your editor for real-time feedback.
- Do not disable rules in files unless there is a valid technical reason.
- If a new rule causes many legacy issues, discuss in team before enforcing it as an error.
