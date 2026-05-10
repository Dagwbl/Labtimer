# Lab Timer PWA — AGENTS.md

## Quick Start

```bash
npm install
npm run dev        # dev server with HMR (Vite 8)
npm run build      # vue-tsc -b && vite build (type-check → build)
npm run test       # vitest run (config via vite.config.ts)
npm run preview    # vite preview
```

## Architecture

```
src/
├── main.ts                 → createApp, Pinia, Router, i18n, registerSW
├── App.vue                 → layout shell + bottom nav + toast container
├── style.css               → Tailwind v4 entry + dark mode variant + safe-area
├── types/index.ts          → Recipe, Step, TimerState, ExperimentRecord, RecipeExport + Zod schemas
├── db/index.ts             → Dexie.js class with 3 tables: recipes, steps, experiments
├── services/               → Business logic (singletons)
│   ├── recipe-service.ts   → Recipe CRUD + builtin seeding
│   ├── timer-worker.ts     → Web Worker (200ms interval, wall-clock anchored)
│   ├── history-service.ts  → Experiment record CRUD + JSON export
│   ├── import-export-service.ts → JSON/YAML import (Zod validated) + export
│   ├── sound-service.ts    → Web Audio API beep + navigator.vibrate
│   └── active-timer.ts     → Module-level reactive flag (isTimerActive)
├── composables/            → Vue composables + module-level singletons
│   ├── useTimer.ts         → Orchestrates Worker, exposes reactive timer state
│   ├── useDarkMode.ts      → Module-level isDark ref + localStorage persistence
│   ├── useSound.ts         → Wraps sound-service with AudioContext resume
│   ├── useToast.ts         → Module-level reactive toast queue
│   └── useInstallPrompt.ts → Module-level deferredPrompt + appinstalled listener
├── views/                  → Route-level page components
│   ├── RecipeList.vue      → / (home)
│   ├── RecipeEditor.vue    → /recipe/new and /recipe/:id/edit
│   ├── TimerRun.vue        → /recipe/:id/run
│   └── HistoryView.vue     → /history
├── components/             → Reusable UI components
│   ├── HeaderMenu.vue      → Kebab menu: Import (contextual) + Dark Mode toggle
│   ├── RecipeCard.vue      → Recipe summary with quick-run, edit, export, delete
│   ├── StepEditor.vue      → Label, duration (MM:SS input + presets), notes, validation
│   ├── Toast.vue           → Auto-dismissing toast (success/error/info)
│   ├── TransitionOverlay.vue → Step-complete overlay with auto-dismiss
│   ├── LanguageSwitcher.vue → EN / 中文 toggle
│   └── InstallButton.vue   → PWA install prompt button
├── router/index.ts         → 5 routes (lazy-loaded views)
├── i18n/                   → vue-i18n (Composition API mode, legacy: false)
│   ├── en.ts               → English strings
│   ├── zh-CN.ts            → Chinese (Simplified) strings
│   └── index.ts            → createI18n with navigator.language detection
├── data/builtin-recipes/   → Ship-with-app recipe JSON files (RecipeExport format)
└── assets/                 → Static assets
```

## Key Conventions

### Code Style
- **Imports**: `@/` alias → `./src/`. Use path alias for all project-internal imports.
- **Types**: Prefer `interface` over `type`. No `enum` — use string union types (`type TimerPhase = 'idle' | 'running' | ...`).
- **IDs**: Use `crypto.randomUUID()` (available in modern browsers/Workers).
- **Durations**: Store in **milliseconds** internally. Convert from seconds only at import/export boundaries (`durationSec * 1000`).
- **Format**: Display as `MM:SS` or `HH:MM:SS`. Input also accepts `MM:SS` or `HH:MM:SS`.

### State Management
- **App-level singletons**: Dark mode, toasts, install prompt, active-timer flag — all use module-level reactive refs, NOT Pinia.
- **Pinia**: Imported but no stores defined yet. Use only when per-component Pinia stores are actually needed.
- **Timer state**: `useTimer()` composable creates a Worker. Each call spawns a new Worker — use with `shallowRef` to avoid reactive wrapping of the worker object.

### Naming & Files
- `.vue` files: PascalCase components, kebab-case filenames.
- `.ts` service files: camelCase.
- Service instances: Singleton objects (`recipeService`) or `new Class()` exported as const (`historyService`, `soundService`).
- Composables: `useXxx` functions. Return plain objects, not reactive wrappers.

### Styling
- **Tailwind v4**: CSS-first (no `tailwind.config.js`). Entrypoint: `@import "tailwindcss"` in `src/style.css`.
- **Dark mode**: Class-based via `@variant dark (&:where(.dark, .dark *));`. Toggle by adding/removing `dark` class on `<html>`.
- **Touch targets**: Minimum 44px (enforced globally in `style.css`).
- **Safe areas**: `env(safe-area-inset-*)` variables applied to `<body>`. Component-level `safe-area-bottom` class for bottom nav.
- **Vue scoped styles**: Always use `<style scoped>`. Only global styles go in `src/style.css`.

### TypeScript
- Strict: `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, `noFallthroughCasesInSwitch`.
- `verbatimModuleSyntax` enabled in node config (config files).
- `resolveJsonModule` enabled — JSON files can be imported directly.

## Framework / Toolchain Quirks

### Build
- **`npm run build` = `vue-tsc -b && vite build`**. Type-checking happens BEFORE bundling. If `vue-tsc` fails, `vite build` never runs.
- **Do NOT run `vite build` alone** — it skips type checking, which CI will catch.

### Tests (Vitest)
- Config is inherited from `vite.config.ts` (no separate vitest config).
- **Timer Worker tests** (`tests/timer-worker.test.ts`) mock Worker globals using a specific pattern:
  1. `vi.stubGlobal('self', { postMessage })` — mock the Worker's `self`
  2. `vi.stubGlobal('performance', { now: () => fakeTime })` — manual clock
  3. `vi.stubGlobal('setInterval', vi.fn((cb, _ms) => { tickHandler = cb; return 42 }))` — capture the tick callback
  4. `vi.stubGlobal('clearInterval', vi.fn())`
  5. **After** all mocks are set, `await import('../src/services/timer-worker')` — the Worker's top-level `self.onmessage = ...` assignment runs against the mocked globals.
- Always call `send('stop')` in `beforeEach` to reset the module-level worker state, then `postMessage.mockClear()`.

### PWA
- `registerType: 'prompt'` — app doesn't auto-update silently. User sees "New version available" confirm dialog.
- Install prompt event captured in `initInstallPrompt()` (called once in `main.ts`), stored as module-level ref.
- Service worker glob patterns: `**/*.{js,css,html,ico,png,svg}`, excluding `node_modules`, `sw.js`, `workbox-*.js`.

### i18n
- vue-i18n in Composition API mode (`legacy: false`). Use `useI18n()` composable, NOT `this.$t()`.
- Locale auto-detected from `navigator.language`. Falls back to `'en'`.
- Currently 2 locales: `en` and `zh-CN`. Keys are flat namespaced objects.

### Import/Export
- Zod schema (`RecipeExportSchema`) validates import files. Rejects missing fields, invalid types, empty step lists.
- Supported formats: `.json`, `.yaml`, `.yml`. Max file size 1MB.
- js-yaml used in safe mode (default) — no custom schemas.

### Builtin Recipes
- JSON files in `src/data/builtin-recipes/` follow the `RecipeExport` interchange format.
- Seeded into IndexedDB on first load via `recipeService.seedMissingBuiltins()` in `App.vue` `onMounted`.
- Deduplication by recipe name — if a recipe with the same name already exists, it's not re-seeded.

## What NOT To Do

- Do NOT add `tailwind.config.js` — Tailwind v4 is CSS-first and configured via `@import "tailwindcss"` + `@variant` directives.
- Do NOT use `as any` or `@ts-ignore` to suppress type errors — the build will fail in CI.
- Do NOT use Pinia stores for app-level singletons (toast, dark mode, etc.) — module-level refs pattern is already established.
- Do NOT import `timer-worker.ts` directly from the main thread — always use `new Worker(new URL('...', import.meta.url), { type: 'module' })`.
- Do NOT assume `StepEditor.vue` is used in `RecipeEditor.vue` — it's NOT. RecipeEditor has inline step editing. StepEditor exists separately but is unused. Be aware of both.
