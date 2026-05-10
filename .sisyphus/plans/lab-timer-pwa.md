# Lab Timer PWA — Mobile-First Multi-Step Procedural Timer

## TL;DR

> **Quick Summary**: Build a mobile-first PWA that lets lab workers create, edit, and run multi-step procedures with per-step countdown timers. Steps auto-advance, support pause/resume (global + per-step), and display a full progress list. Recipes are saved locally with full offline support.
>
> **Deliverables**:
> - Installable PWA for mobile (and desktop)
> - Recipe editor with drag-to-reorder steps
> - Timer runner with progress list, transition prompts, sound/vibration
> - Import/export recipes as YAML/JSON
> - Experiment history logging
> - Multi-language (CN/EN) + Dark mode
>
> **Estimated Effort**: Medium-Large (~20-25 tasks)
> **Parallel Execution**: YES — 5 waves
> **Critical Path**: Scaffold → Types → Timer Engine → Recipe Service → Timer Run UI → Final Verification

---

## Context

### Original Request
User needs a lab timer application for procedures with multiple steps of different durations (e.g., mixing sand/cement at specific speeds for defined seconds). Existing app (Multi Timer) requires manual total time calculation — user wants per-step labeled timers with auto-advance.

### Interview Summary
**Key Decisions**:
- **Tech Stack**: Vue 3 + TypeScript + Vite + PWA
- **Timer Display**: Vertical list progress view — current step counts down, completed = checkmark, upcoming = waiting
- **Step Completion**: Auto-advance with brief transition prompt (3-5s visual cue)
- **Pause**: BOTH global pause (freezes entire procedure) AND per-step pause
- **Duration Range**: Mixed (seconds to hours)
- **Testing**: Basic unit tests for core timer logic (Vitest)
- **Storage**: Local-only (IndexedDB via Dexie.js), no backend/cloud
- **Import/Export**: YAML or JSON format with Zod validation

**Tech Stack**:
- Vue 3 + TypeScript + Vite 6
- vite-plugin-pwa (registerType: 'prompt')
- IndexedDB via Dexie.js (separate table for steps)
- vue-draggable-plus (drag reorder)
- Tailwind CSS (responsive, dark mode class strategy)
- js-yaml (safe parser, never eval) + zod (validation)
- Web Worker + wall-clock anchoring (accurate timer engine)
- Web Audio API (sound) + Vibration API (progressive enhancement)
- Vue I18n (multi-language)
- Vitest (unit testing)

### Metis Review
**Identified Critical Corrections** (all addressed in plan):
1. **Timer engine MUST use Web Worker + wall-clock anchoring** — naive setInterval drifts over long procedures (Task 4)
2. **Vibration API is Chrome Android only** — progressive enhancement, silent fallback (Task 11)
3. **iOS Safari pauses timers on lock** — accept as documented limitation (Task 4 note)
4. **Steps need separate IndexedDB table** — not embedded array, for reorder performance (Task 3)
5. **Import/Export needs 3-layer security**: safe YAML parser + Zod validation + file size limits (Task 10)
6. **Service worker must use registerType: 'prompt'** — never auto-update during active timer (Task 5)

---

## Work Objectives

### Core Objective
Build a mobile-first PWA that enables lab workers to define, save, and execute multi-step timed procedures with accurate countdown timing, auto-advance, full offline support, and experiment history logging.

### Concrete Deliverables
- Installable PWA (manifest + service worker + offline cache)
- Recipe management (CRUD + import/export YAML/JSON)
- Timer execution engine (Web Worker, wall-clock anchored, mm:ss display)
- Recipe editor with drag reorder + step notes
- Timer runner with: progress list, global/per-step pause, auto-advance transition, sound+vibration
- Experiment history viewer
- Multi-language (CN/EN) + Dark mode

### Definition of Done
- [ ] PWA installable on Chrome Android (Lighthouse PWA badge)
- [ ] Create recipe with 5+ steps, reorder via drag, save
- [ ] Run recipe: timers auto-advance, transition prompt visible, sound plays per step
- [ ] Pause globally and per-step, resume correctly
- [ ] Export recipe to YAML, delete recipe, import YAML back
- [ ] Complete run logged in history, re-run works
- [ ] Switch language CN↔EN without reload
- [ ] Toggle dark mode, verify on mobile viewport

### Must Have
- Accurate timer (Web Worker anchored, <200ms drift over 1h)
- All steps visible as a progress list during run
- Auto-advance with visual transition cue
- Global pause + per-step pause (both pause entire flow when one step pauses? No — per-step pause halts only that step, global pauses all)
- Import/Export with validation
- Fully offline capable

### Must NOT Have (Guardrails)
- ❌ No user authentication or multi-user
- ❌ No cloud sync or backend server
- ❌ No recipe sharing between devices
- ❌ No naive setInterval timer — must use wall-clock anchoring
- ❌ No eval/unsafe YAML parsing — safe parser + Zod validation
- ❌ No auto service worker update during active timer — defer to next run

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.
> Acceptance criteria requiring "user manually tests/confirms" are FORBIDDEN.

### Test Decision
- **Infrastructure**: YES (Vitest set up in Task 1)
- **Automated tests**: Basic unit tests for core timer logic + data services
- **Framework**: Vitest
- **UI testing**: Manual component verification via DevTools + Playwright for PWA install flow

### QA Policy
Every task includes agent-executed QA scenarios. Evidence saved to `.sisyphus/evidence/task-{N}-{scenario}.{ext}`.

- **Timer Engine**: Vitest unit tests — verify accuracy, pause/resume, edge cases
- **UI**: Playwright — navigate, interact, assert DOM, screenshot on mobile viewport (iPhone SE emulation)
- **PWA**: Lighthouse audit + Chrome DevTools → Application → Manifest/Service Workers
- **Import/Export**: Bash — write/read files, verify Zod validation

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — 7 tasks, MAX PARALLEL):
├── Task 1: Project scaffolding [quick]
├── Task 2: Type definitions [quick]
├── Task 3: IndexedDB schema + Dexie [quick]
├── Task 4: Timer Web Worker [deep]
├── Task 5: PWA manifest + SW setup [quick]
├── Task 6: i18n infrastructure [quick]
└── Task 7: Sound + Vibration utility [quick]

Wave 2 (Core Services — 5 tasks, MAX PARALLEL):
├── Task 8: Timer engine unit tests [quick]
├── Task 9: Recipe CRUD service [unspecified-high]
├── Task 10: Import/Export service [unspecified-high]
├── Task 11: Experiment history service [unspecified-high]
└── Task 12: Recipe List view [visual-engineering]

Wave 3 (Editor + Timer Runner — 6 tasks):
├── Task 13: Recipe Editor view [visual-engineering]
├── Task 14: Step Editor component [visual-engineering]
├── Task 15: Timer Run view [visual-engineering]
├── Task 16: Timer controls composable [visual-engineering]
├── Task 17: Transition overlay component [artistry]
└── Task 18: History view [visual-engineering]

Wave 4 (Polish — 5 tasks, MAX PARALLEL):
├── Task 19: Dark mode + responsive polish [visual-engineering]
├── Task 20: Import/Export UI integration [visual-engineering]
├── Task 21: Final PWA optimization [quick]
├── Task 22: Integration edge cases [unspecified-high]
└── Task 23: README + documentation [writing]

Wave FINAL (Verification — 4 parallel reviews):
├── F1: Plan compliance (oracle)
├── F2: Code quality + tests (unspecified-high)
├── F3: Real manual QA (unspecified-high + playwright)
└── F4: Scope fidelity (deep)
```

### Critical Path
Task 1 → Task 4 → Task 8 → Task 15 → Task 16 → Task 22 → F1-F4 → user okay

---

## TODOs

- [x] 1. **Project Scaffolding**

  **What to do**:
  - Initialize Vite 6 + Vue 3 + TypeScript project
  - Install dependencies: tailwindcss, postcss, autoprefixer, vue-router, pinia, dexie, vue-draggable-plus, vue-i18n, js-yaml, zod, vite-plugin-pwa, vitest
  - Configure: `vite.config.ts` (PWA plugin), `tailwind.config.ts` (dark mode class strategy), `tsconfig.json`, `postcss.config.js`
  - Create directory structure: `src/types/`, `src/db/`, `src/services/`, `src/composables/`, `src/views/`, `src/components/`, `src/i18n/`, `src/styles/`, `tests/`
  - Set up basic `App.vue` shell with `<router-view>` + `<nav>` placeholder
  - Configure `src/router/index.ts` with 4 routes: `/` (RecipeList), `/recipe/new` (Editor), `/recipe/:id/edit`, `/recipe/:id/run`, `/history`
  - Set up `src/main.ts` with Vue app, router, i18n, Pinia
  - Verify: `npm run dev` starts, `npm run build` succeeds, `npm run test` works (empty Vitest)

  **Must NOT do**:
  - Don't add unnecessary dependencies
  - Don't over-configure — use sensible defaults

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 1, with Tasks 2-7)

  **Acceptance Criteria**:
  - [ ] `npm run dev` starts at localhost:5173
  - [ ] `npm run build` produces `dist/` without errors
  - [ ] `npm run test` runs Vitest (0 tests, passes)
  - [ ] All directories exist
  - [ ] Router has 4 routes configured

  **QA Scenarios**:
  ```
  Scenario: Project boots successfully
    Tool: Bash
    Preconditions: Clean install (node_modules exists)
    Steps:
      1. Run 'npm run dev &' (background)
      2. Wait 3s, then curl http://localhost:5173
      3. Assert response contains '<div id="app">'
    Expected Result: Dev server responds with Vue app HTML
    Evidence: .sisyphus/evidence/task-1-dev-server.txt

  Scenario: Production build succeeds
    Tool: Bash
    Preconditions: Clean state
    Steps:
      1. Run 'npm run build'
      2. Assert exit code is 0
      3. Assert dist/index.html exists
    Expected Result: Build completes, dist/ generated
    Evidence: .sisyphus/evidence/task-1-build.txt
  ```

  **Commit**: YES (group with 2-3)
  - Message: `chore: scaffold project with Vue 3 + Vite + PWA setup`
  - Files: All new project files

- [x] 2. **Type Definitions**

  **What to do**:
  - Create `src/types/index.ts` with:
    ```typescript
    // Recipe — a named procedure with ordered steps
    interface Recipe {
      id: string;          // nanoid or crypto.randomUUID()
      name: string;        // user-given name
      description: string; // optional notes about the procedure
      createdAt: number;   // Date.now()
      updatedAt: number;   // Date.now()
    }

    // Step — a single timed step within a recipe
    interface Step {
      id: string;
      recipeId: string;    // FK to Recipe
      order: number;       // sort index (for drag reorder)
      label: string;       // e.g. "Mix at slow speed"
      durationMs: number;   // total duration in milliseconds
      notes: string;       // optional operation instructions
    }

    // TimerState — runtime state of the timer engine
    type TimerPhase = 'idle' | 'running' | 'paused' | 'stepTransition' | 'completed';
    interface TimerState {
      phase: TimerPhase;
      currentStepIndex: number;
      stepPaused: boolean;     // per-step pause flag
      elapsedMs: number;       // ms elapsed in current step
      stepEndTime: number;     // wall clock target end (performance.now() based)
      startedAt: number;       // Date.now() when procedure started
      pausedAt: number | null; // Date.now() when last paused
    }

    // ExperimentRecord — saved history of a completed run
    interface ExperimentRecord {
      id: string;
      recipeId: string;
      recipeName: string;     // denormalized for display
      startedAt: number;
      completedAt: number;
      totalDurationMs: number;
      steps: Array<{
        stepId: string;
        label: string;
        plannedDurationMs: number;
        actualDurationMs: number;
        pausedDurationMs: number;
        status: 'completed' | 'skipped' | 'interrupted';
      }>;
      status: 'completed' | 'interrupted' | 'cancelled';
    }

    // Import/Export format
    interface RecipeExport {
      formatVersion: number;   // 1
      exportedAt: string;      // ISO date
      recipe: {
        name: string;
        description: string;
        steps: Array<{
          label: string;
          durationSec: number;   // seconds for readability in export
          notes: string;
        }>;
      };
    }
    ```
  - Add Zod schemas for import validation

  **Must NOT do**:
  - Don't over-abstract — keep types flat and simple
  - Don't use enums (use union string types)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 1, with Tasks 1,3-7)

  **Acceptance Criteria**:
  - [ ] `npm run build` succeeds with all types defined
  - [ ] Types are exported from `src/types/index.ts`

  **QA Scenarios**:
  ```
  Scenario: Types compile without errors
    Tool: Bash
    Preconditions: Task 1 complete
    Steps:
      1. Create a temp test file that instantiates each type
      2. Run 'npx vue-tsc --noEmit'
      3. Assert exit code is 0
    Expected Result: All types are valid TypeScript
    Evidence: .sisyphus/evidence/task-2-types.txt
  ```

  **Commit**: YES (group with 1, 3)

- [x] 3. **IndexedDB Schema + Dexie Database**

  **What to do**:
  - Create `src/db/index.ts` with Dexie database class `LabTimerDB`
  - Two tables: `recipes` and `steps` (separate tables per Metis feedback)
  ```typescript
  import Dexie, { type Table } from 'dexie';
  import type { Recipe, Step, ExperimentRecord } from '@/types';

  class LabTimerDB extends Dexie {
    recipes!: Table<Recipe, string>;
    steps!: Table<Step, string>;
    experiments!: Table<ExperimentRecord, string>;

    constructor() {
      super('LabTimerDB');
      this.version(1).stores({
        recipes: 'id, name, updatedAt',
        steps: 'id, recipeId, order',
        experiments: 'id, recipeId, startedAt',
      });
    }
  }
  export const db = new LabTimerDB();
  ```
  - Add indexes: steps by recipeId+order for ordered query
  - Export `db` singleton instance

  **Must NOT do**:
  - Don't add schema versioning complexity (version 1 is enough)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 1)

  **Acceptance Criteria**:
  - [ ] `npm run build` succeeds
  - [ ] Database opens without errors in browser console

  **QA Scenarios**:
  ```
  Scenario: Database initializes in browser
    Tool: Bash (Playwright)
    Preconditions: App running on localhost:5173
    Steps:
      1. Open page and evaluate 'new (await import("@/db")).db'
      2. Assert database instance exists and is open
    Expected Result: Dexie DB opens successfully
    Evidence: .sisyphus/evidence/task-3-db-init.txt
  ```

  **Commit**: YES (group with 1, 2)

- [x] 4. **Timer Web Worker (Wall-Clock Anchored)**

  **What to do**:
  - Create `src/services/timer-worker.ts` as a Web Worker entry
  - Architecture: Worker maintains a `currentStep` state based on wall clock anchoring
  - Worker receives messages via `postMessage`:
    - `{ type: 'start', steps: Step[], startTime: number }` — begin procedure
    - `{ type: 'pause' }` — pause current step
    - `{ type: 'resume' }` — resume current step
    - `{ type: 'stop' }` — terminate procedure
    - `{ type: 'skipTo', stepIndex: number }` — jump to specific step
  - Worker sends messages to main thread:
    - `{ type: 'tick', stepIndex: number, remainingMs: number, elapsedMs: number }` — every ~200ms check
    - `{ type: 'stepComplete', stepIndex: number }` — step finished
    - `{ type: 'procedureComplete' }` — all steps done
    - `{ type: 'paused', stepIndex: number, remainingMs: number }`
    - `{ type: 'resumed', stepIndex: number, remainingMs: number }`
  - Timer logic:
    - Use wall clock anchoring: store `stepEndTime = performance.now() + durationMs`
    - On each check cycle: `remaining = stepEndTime - performance.now()`
    - Correct for drift automatically (wall clock vs. interval)
    - On pause: store `pausedRemainingMs`, clear interval
    - On resume: set new `stepEndTime = performance.now() + pausedRemainingMs`
  - Use `setInterval` at 200ms inside the worker (workers don't throttle as aggressively)
  - Use `self.onmessage` for receiving commands
  - IMPORTANT: Timer worker is a separate file that Vite bundles via `?worker` import or `new Worker(new URL('./timer-worker.ts', import.meta.url), { type: 'module' })`

  **Must NOT do**:
  - Don't use `setTimeout` chaining — use `setInterval` with wall clock correction
  - Don't send messages more than 5 times/second (200ms interval is enough)
  - Don't block the worker thread with heavy computation

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Reason**: Timer accuracy is the **core reliability feature** of this app. Wall clock anchoring with Web Worker requires careful implementation of time math, drift correction, pause/resume state restoration, and edge case handling (rapid pause/resume, very long steps, browser throttling).

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 1, standalone module)

  **Acceptance Criteria**:
  - [ ] Worker file exists at `src/services/timer-worker.ts`
  - [ ] Vite builds worker correctly (test via `npm run build`)
  - [ ] Worker responds to start/pause/resume/stop commands
  - [ ] Wall clock anchoring maintains <200ms accuracy over 5 min test

  **QA Scenarios**:
  ```
  Scenario: Timer accuracy over 60 seconds
    Tool: Bash (Node.js test harness)
    Preconditions: Worker file built
    Steps:
      1. Create test that starts worker with a 60s step
      2. Record elapsed time with performance.now()
      3. Wait for stepComplete message
      4. Assert elapsed is within 200ms of 60000
    Expected Result: Timer fires within 60s ± 200ms
    Evidence: .sisyphus/evidence/task-4-accuracy.txt

  Scenario: Pause and resume preserves remaining time
    Tool: Bash (Node.js test harness)
    Preconditions: Worker ready
    Steps:
      1. Start 30s timer
      2. After 5s, send pause
      3. Wait 3s, send resume
      4. Assert remaining time after resume ≈ 25s
      5. Assert total elapsed ≈ 30s from first start
    Expected Result: Paused time is excluded from countdown
    Evidence: .sisyphus/evidence/task-4-pause-resume.txt

  Scenario: iOS background limitation documented
    Note: Safari suspends JS timers (even workers) when phone locks.
    Add a comment in timer-worker.ts and a note in the app UI:
    "Timer may pause when device is locked (iOS Safari limitation)."
    No automated test for this — just verify the note exists.
  ```

  **Commit**: YES
  - Message: `feat: add wall-clock anchored timer Web Worker`
  - Files: `src/services/timer-worker.ts`

- [x] 5. **PWA Manifest + Service Worker Setup**

  **What to do**:
  - Configure `vite-plugin-pwa` in `vite.config.ts`:
    - `registerType: 'prompt'` (critical — never auto-update during active timer)
    - `workbox.mode: 'generateSW'` for automatic service worker generation
    - Add manifest fields: `name: 'Lab Timer'`, `short_name: 'LabTimer'`, `description`, `start_url: '/'`, `display: 'standalone'`, `background_color`, `theme_color`, `icons`
    - Generate PWA icons: need at least 192x192 and 512x512 PNGs (create placeholder SVG and convert, or download free icons)
    - Add `offline.html` fallback page
    - Cache strategy: CacheFirst for app shell (index.html, JS, CSS), NetworkFirst for data
    - Add `beforeinstallprompt` listener in main.ts (capture and defer event)
    - Add install button UI component (shown when `beforeinstallprompt` is available, hidden after install)
  - Test: Chrome DevTools → Application → Manifest, Service Workers

  **Must NOT do**:
  - DON'T use `registerType: 'autoUpdate'` — must be `prompt` to avoid refreshing during a running timer
  - Don't over-cache — app shell only (no data caching via SW, data is IndexedDB)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 1)

  **Acceptance Criteria**:
  - [ ] `npm run build` generates `dist/manifest.webmanifest`
  - [ ] Chrome DevTools → Application → Manifest: all fields present
  - [ ] Service worker registered and active

  **QA Scenarios**:
  ```
  Scenario: Manifest is valid
    Tool: Bash (Playwright)
    Preconditions: Production build exists, served via `npm run preview`
    Steps:
      1. Open page at localhost:4173
      2. Check document.querySelector('link[rel="manifest"]') exists
      3. Fetch manifest file, verify JSON has all required fields
    Expected Result: Valid manifest with name, icons, display: standalone
    Evidence: .sisyphus/evidence/task-5-manifest.txt
  ```

  **Commit**: YES (group with 6, 7)
  - Message: `feat: add PWA manifest and service worker with prompt registration`

- [x] 6. **i18n Infrastructure**

  **What to do**:
  - Set up Vue I18n with `src/i18n/index.ts`
  - Create locale files:
    - `src/i18n/en.ts` — English translations
    - `src/i18n/zh-CN.ts` — Chinese translations
  - Initial translation keys (can be extended later):
    ```typescript
    export default {
      nav: { recipes: 'Recipes', history: 'History', settings: 'Settings' },
      recipeList: { title: 'My Recipes', newRecipe: 'New Recipe', noRecipes: 'No recipes yet', import: 'Import' },
      editor: { title: 'Edit Recipe', save: 'Save', cancel: 'Cancel', addStep: 'Add Step', stepLabel: 'Label', duration: 'Duration', notes: 'Notes', deleteStep: 'Delete Step' },
      timerRun: { start: 'Start', pause: 'Pause', resume: 'Resume', stop: 'Stop', reRun: 'Re-run', stepComplete: 'Step Complete!', procedureComplete: 'Procedure Complete!', nextStep: 'Next: {label}' },
      history: { title: 'Experiment History', empty: 'No experiments yet' },
      common: { save: 'Save', cancel: 'Cancel', delete: 'Delete', confirm: 'Confirm', yes: 'Yes', no: 'No', darkMode: 'Dark Mode', language: 'Language' },
      io: { exportYAML: 'Export YAML', exportJSON: 'Export JSON', import: 'Import', importSuccess: 'Imported successfully!', importError: 'Invalid file format' },
    };
    ```
  - Create a composable `src/composables/useI18n.ts` (or just use Vue I18n's `useI18n` directly)
  - Add language switcher component `src/components/LanguageSwitcher.vue`
  - Detect browser language on load (navigator.language), default to matching locale

  **Must NOT do**:
  - Don't load all translations eagerly — they're small enough for this app
  - Don't use `vue-i18n` legacy mode (use v9+ composition API)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 1)

  **Acceptance Criteria**:
  - [ ] Language switch works without page reload
  - [ ] All UI text is translated in both languages

  **QA Scenarios**:
  ```
  Scenario: Language switches from CN to EN
    Tool: Playwright
    Preconditions: App running
    Steps:
      1. Set localStorage language to 'en'
      2. Reload page
      3. Assert navigation shows 'Recipes' (not '配方')
      4. Switch to 'zh-CN'
      5. Assert navigation shows '配方'
    Expected Result: Language switches without reload
    Evidence: .sisyphus/evidence/task-6-i18n.txt
  ```

  **Commit**: YES (group with 5, 7)

- [x] 7. **Sound + Vibration Utility**

  **What to do**:
  - Create `src/services/sound-service.ts`:
    ```typescript
    class SoundService {
      private audioCtx: AudioContext | null = null;

      async playStepComplete(): Promise<void> {
        if (!this.audioCtx) this.audioCtx = new AudioContext();
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.frequency.value = 800;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.3);
        osc.connect(gain).connect(this.audioCtx.destination);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.3);
      }

      async vibrate(): Promise<void> {
        if (navigator.vibrate) navigator.vibrate(200);
      }

      async notify(): Promise<void> {
        await Promise.allSettled([this.playStepComplete(), this.vibrate()]);
      }
    }
    export const soundService = new SoundService();
    ```
  - Handle AudioContext autoplay restrictions (must be created after user gesture)
  - Add `src/composables/useSound.ts` composable
  - Document: Vibration only works on Chrome Android; silent fallback elsewhere

  **Must NOT do**:
  - Don't use HTML `<audio>` elements — Web Audio API is more reliable
  - Don't add external sound files

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 1)

  **Acceptance Criteria**:
  - [ ] Sound plays on step complete (verify via AudioContext state)
  - [ ] Vibration attempted (check via `navigator.vibrate` call)
  - [ ] No errors on platforms without vibration support

  **QA Scenarios**:
  ```
  Scenario: Sound service initializes without error
    Tool: Playwright
    Preconditions: App running
    Steps:
      1. Click a button to grant user gesture
      2. Call soundService.notify()
      3. Assert no errors thrown
    Expected Result: Sound service works without exceptions
    Evidence: .sisyphus/evidence/task-7-sound.txt
  ```

  **Commit**: YES (group with 5, 6)

- [x] 8. **Timer Engine Unit Tests**

  **What to do**:
  - Create `tests/timer-worker.test.ts` with Vitest
  - Test cases:
    1. Single step of 1s completes within tolerance
    2. Multi-step procedure auto-advances through all steps
    3. Pause and resume preserves remaining time
    4. Rapid pause/resume doesn't break timer
    5. Stop during step terminates procedure
    6. Zero-duration step is skipped
    7. Skip to specific step
  - Use `vi.useFakeTimers()` for some tests, `vi.useRealTimers()` for integration
  - If Web Worker testing is complex, test timer logic as pure functions

  **Must NOT do**:
  - Don't test browser-specific behavior (AudioContext, vibration)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2)

  **Acceptance Criteria**:
  - [ ] All timer test cases pass (minimum 6 tests)
  - [ ] `npx vitest run` exits with code 0

  **QA Scenarios**:
  ```
  Scenario: All timer tests pass
    Tool: Bash
    Preconditions: Vitest configured
    Steps:
      1. Run 'npx vitest run tests/timer-worker.test.ts'
      2. Assert exit code is 0
      3. Assert output shows all tests passed
    Expected Result: Timer engine verified
    Evidence: .sisyphus/evidence/task-8-tests.txt
  ```

  **Commit**: YES (group with 9, 10, 11)
  - Message: `test: add timer engine unit tests with Vitest`

- [x] 9. **Recipe CRUD Service**

  **What to do**:
  - Create `src/services/recipe-service.ts` with:
    - `listRecipes(): Promise<Recipe[]>` — all recipes, ordered by updatedAt desc
    - `getRecipe(id: string): Promise<{recipe: Recipe, steps: Step[]}>` — recipe + its steps
    - `createRecipe(data: {name: string, description?: string}): Promise<Recipe>` — new recipe
    - `updateRecipe(id: string, data: Partial<Recipe>): Promise<void>`
    - `deleteRecipe(id: string): Promise<void>` — cascades to steps
    - `saveSteps(recipeId: string, steps: Step[]): Promise<void>` — batch replace all steps
    - `reorderSteps(recipeId: string, stepIds: string[]): Promise<void>` — update order field
  - Use Dexie transactions for atomic operations
  - Use `crypto.randomUUID()` for ID generation

  **Must NOT do**:
  - Don't add soft-delete complexity

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2, with 8, 10, 11)
  - **Blocked By**: Task 3 (DB schema), Task 2 (types)

  **Acceptance Criteria**:
  - [ ] Can create, read, update, delete recipes
  - [ ] Cascade delete removes steps
  - [ ] Batch save/reorder steps works

  **QA Scenarios**:
  ```
  Scenario: Full CRUD lifecycle
    Tool: Bash (Playwright — run JS in browser context)
    Preconditions: DB initialized
    Steps:
      1. Import recipeService
      2. Create recipe 'Test Procedure'
      3. Add 3 steps via saveSteps
      4. List recipes — assert 1 returned
      5. Get recipe — assert 3 steps
      6. Update recipe name
      7. Reorder steps (reverse)
      8. Delete recipe — verify steps also deleted
    Expected Result: All CRUD operations succeed
    Evidence: .sisyphus/evidence/task-9-crud.txt
  ```

  **Commit**: YES (group with 8, 10, 11)
  - Message: `feat: add recipe CRUD service with Dexie`

- [x] 10. **Import/Export Service**

  **What to do**:
  - Create `src/services/import-export-service.ts`:
  - Import function:
    - Accept `File` object (from file input)
    - Validate file size < 1MB (limit)
    - Detect format: YAML (ends .yaml/.yml) or JSON (ends .json)
    - Parse: `js-yaml` for YAML, `JSON.parse` for JSON
    - Validate parsed data against Zod schema (`RecipeExportSchema`)
    - On success: create recipe + steps via recipeService
    - On failure: throw descriptive error (which field failed)
  - Export function:
    - `exportRecipeAsJSON(recipeId: string): Blob` — generate Blob for download
    - `exportRecipeAsYAML(recipeId: string): Blob` — generate YAML string blob
    - Use `js-yaml.dump()` for YAML serialization
    - Format: RecipeExport interface (formatVersion, recipe name, steps with label/durationSec/notes)
  - Add `downloadBlob(blob: Blob, filename: string)` utility function
  - Add file input component for import

  **Must NOT do**:
  - ❌ Never use `eval()` or `new Function()` for parsing
  - ❌ Never use `js-yaml` load() with default schema (use safe schema only)
  - Don't allow import of files > 1MB
  - Don't overwrite existing recipes with same name without confirmation

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2)
  - **Blocked By**: Task 9 (recipe service), Task 2 (types/Zod schemas)

  **Acceptance Criteria**:
  - [ ] Export recipe to YAML file
  - [ ] Import YAML file back creates identical recipe
  - [ ] Invalid YAML/JSON throws descriptive validation error
  - [ ] Files > 1MB rejected
  - [ ] YAML injection (e.g., `constructor` prototype pollution) is blocked

  **QA Scenarios**:
  ```
  Scenario: Export → Delete → Import round-trip
    Tool: Bash (Playwright)
    Preconditions: Recipe exists
    Steps:
      1. Export recipe as YAML
      2. Assert Blob is valid YAML string
      3. Delete the recipe from DB
      4. Import the YAML file back
      5. Assert recipe name and steps match original
    Expected Result: Round-trip preserves all data
    Evidence: .sisyphus/evidence/task-10-roundtrip.txt

  Scenario: Invalid YAML is rejected
    Tool: Bash (Playwright)
    Preconditions: App running
    Steps:
      1. Create file with invalid content: "foo: !!js/function 'evil()'"
      2. Attempt to import
      3. Assert error is thrown (safe parser blocks)
    Expected Result: Malicious YAML is rejected
    Evidence: .sisyphus/evidence/task-10-security.txt
  ```

  **Commit**: YES (group with 8, 9, 11)

- [x] 11. **Experiment History Service**

  **What to do**:
  - Create `src/services/history-service.ts`:
  ```typescript
  class HistoryService {
    async listRecords(): Promise<ExperimentRecord[]>;
    async getRecord(id: string): Promise<ExperimentRecord>;
    async saveRecord(record: ExperimentRecord): Promise<void>;
    async deleteRecord(id: string): Promise<void>;
    async clearAll(): Promise<void>;
    async exportHistoryJSON(): Promise<Blob>;  // Full history export
  }
  ```
  - Record save happens when procedure completes or is stopped/interrupted
  - Store the full step-by-step breakdown (planned vs actual duration, pauses)
  - Integrate with recipe run flow (called from timer runner when procedure ends)
  - Add history export (full JSON dump)

  **Must NOT do**:
  - Don't auto-delete old records (user should manually clear if needed)
  - Don't store circular references

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2)
  - **Blocked By**: Task 3 (DB schema), Task 2 (types)

  **Acceptance Criteria**:
  - [ ] History record saved on procedure completion
  - [ ] Record contains step-by-step actual durations
  - [ ] Interrupted procedure records correctly (partial data)
  - [ ] Export history as JSON

  **QA Scenarios**:
  ```
  Scenario: History saved after procedure
    Tool: Playwright
    Preconditions: Recipe exists with 3 steps
    Steps:
      1. Run the recipe to completion
      2. Navigate to History view
      3. Assert 1 record exists
      4. Assert record has 3 step entries
    Expected Result: Complete run is logged
    Evidence: .sisyphus/evidence/task-11-history.txt
  ```

  **Commit**: YES (group with 8, 9, 10)

- [x] 12. **Recipe List View**

  **What to do**:
  - Create `src/views/RecipeList.vue`:
    - Display all saved recipes as a vertical card list
    - Each card shows: recipe name, description preview, step count, last modified date
    - Tap a card → navigate to `/recipe/:id/edit`
    - Long press a card → show context menu (Edit / Run / Export / Delete)
    - "New Recipe" FAB button (floating action button, bottom-right)
    - "Import" button in header
    - Empty state: illustration + "No recipes yet. Tap + to create one."
    - Pull-to-refresh (re-read from IndexedDB)
    - Search/filter by name (optional for MVP, can be basic)
  - Create `src/components/RecipeCard.vue` as a reusable card component
  - Use Pinia store for recipe list state (optional, or direct service calls)

  **Must NOT do**:
  - Don't add pagination unless there are 50+ recipes (unlikely)
  - Don't add recipe image/thumbnail

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2)
  - **Blocked By**: Task 9 (recipe service)

  **Acceptance Criteria**:
  - [ ] Recipe list shows all saved recipes
  - [ ] Tapping a recipe navigates to editor
  - [ ] New Recipe button creates and navigates to empty editor
  - [ ] Empty state shown when no recipes
  - [ ] Import button is visible

  **QA Scenarios**:
  ```
  Scenario: Recipe list shows recipes
    Tool: Playwright (mobile viewport 375x667)
    Preconditions: At least 2 recipes exist
    Steps:
      1. Navigate to /
      2. Assert 2 recipe cards visible
      3. Assert each card shows name and step count
      4. Tap a card → URL changes to /recipe/:id/edit
    Expected Result: List renders correctly
    Evidence: .sisyphus/evidence/task-12-recipe-list.png

  Scenario: Empty state
    Tool: Playwright
    Preconditions: No recipes in DB
    Steps:
      1. Navigate to /
      2. Assert empty state message visible
      3. Assert '+' FAB button visible
    Expected Result: Empty state guides user
    Evidence: .sisyphus/evidence/task-12-empty.png
  ```

  **Commit**: YES
  - Message: `feat: add recipe list view with card grid`

- [x] 13. **Recipe Editor View**

  **What to do**:
  - Create `src/views/RecipeEditor.vue` for creating/editing recipes
  - Route: `/recipe/new` (create) and `/recipe/:id/edit` (edit)
  - Layout (mobile-first):
    - Top: Recipe name input field + Save/Cancel buttons in header
    - Middle: Scrollable list of steps (using Task 14 StepEditor component)
    - Bottom: "Add Step" button
  - Step list uses `vue-draggable-plus` for drag-to-reorder with drag handles
  - On save: call recipeService to persist recipe + all steps
  - On cancel: navigate back to recipe list, unsaved changes are lost
  - Load existing recipe data for edit mode (pre-fill form + steps)
  - Show step count badge in header ("3 steps")
  - Delete recipe button in header (with confirmation dialog)

  **Must NOT do**:
  - Don't add undo/redo for step changes (MVP)
  - Don't add step copy/paste

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: NO (Wave 3, sequential with 14)
  - **Blocked By**: Task 9 (recipe service), Task 12 (list navigation)

  **Acceptance Criteria**:
  - [ ] Can create new recipe with name
  - [ ] Can add/remove steps
  - [ ] Can drag to reorder steps
  - [ ] Save persists to IndexedDB
  - [ ] Edit loads existing recipe data

  **QA Scenarios**:
  ```
  Scenario: Create recipe with drag reorder
    Tool: Playwright (mobile viewport)
    Preconditions: App open at /recipe/new
    Steps:
      1. Enter recipe name "Test Mix"
      2. Click "Add Step" 3 times
      3. Fill step 1: "Mix slow" 30s
      4. Fill step 2: "Add sand" 30s
      5. Fill step 3: "Mix medium" 30s
      6. Drag step 3 above step 1
      7. Click Save
      8. Assert navigated to recipe list
      9. Assert "Test Mix" appears in list
    Expected Result: Recipe created with reordered steps
    Evidence: .sisyphus/evidence/task-13-create-recipe.png
  ```

  **Commit**: YES (group with 14)
  - Message: `feat: add recipe editor with drag-reorder`

- [x] 14. **Step Editor Component**

  **What to do**:
  - Create `src/components/StepEditor.vue` — reusable step editing row
  - Props: `step: Step` (model), `index: number`, `isDraggable: boolean`
  - Emits: `update:step`, `delete`, `drag-start`, `drag-end`
  - Fields:
    - Drag handle (≡ icon, left side) — only shown when `isDraggable`
    - Step number badge
    - Label input (text, placeholder: "e.g. Mix at slow speed")
    - Duration picker: MM:SS input with up/down arrows (or tap-to-edit)
      - Support hours: if duration > 3600s, show HH:MM:SS
      - Quick presets: 15s, 30s, 60s, 90s, 2min, 5min, 10min buttons
    - Notes textarea (expandable, placeholder: "e.g. Scrape down mortar during first 15s")
    - Delete step button (X icon, red)
  - Mobile-friendly: large touch targets (48px+), proper spacing
  - Validation: label required, duration > 0

  **Must NOT do**:
  - Don't add rich text editing — plain text notes are sufficient
  - Don't add sound selection per step (MVP)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: NO (Wave 3, with Task 13)

  **Acceptance Criteria**:
  - [ ] Duration input accepts MM:SS and HH:MM:SS formats
  - [ ] Preset duration buttons work
  - [ ] Notes textarea expands for long text
  - [ ] Delete step works

  **QA Scenarios**:
  ```
  Scenario: Step editor field interactions
    Tool: Playwright (mobile viewport)
    Preconditions: Recipe editor open with one step
    Steps:
      1. Type label "Mix at slow speed"
      2. Tap 30s preset → duration shows "00:30"
      3. Type notes "Add cement first"
      4. Assert fields show entered values
      5. Tap delete → step removed
    Expected Result: All fields work correctly
    Evidence: .sisyphus/evidence/task-14-step-editor.png
  ```

  **Commit**: YES (group with 13)

- [x] 15. **Timer Run View**

  **What to do**:
  - Create `src/views/TimerRun.vue` — the main timer execution screen
  - Route: `/recipe/:id/run`
  - Layout (mobile-first, single column):
    - **Header**: Recipe name, Elapsed total time
    - **Progress list**: All steps visible vertically
      - Current step: highlighted background, animated MM:SS countdown, progress bar
      - Completed steps: green checkmark + "Done" label, grayed label
      - Upcoming steps: "Waiting" indicator, dimmed text
    - **Step details panel**: Current step's notes displayed prominently
    - **Controls bar** (fixed bottom):
      - ⏸️ Global Pause/▶️ Resume button (center, large)
      - ⏹️ Stop button (left)
      - Per-step pause: small ⏸️ button on current step card
    - **Transition overlay**: When step completes, show 3-5s overlay:
      - "Step Complete! ✓" animation
      - Next step name shown
      - Auto-dismiss after 3s and start next step
  - Use `useTimer` composable (Task 16) to manage state
  - Load recipe + steps on mount from recipeService
  - On start: postMessage to Web Worker
  - On step complete: receive worker message → update UI → show transition → advance
  - On all steps complete: show celebration state → "Re-run" / "Back to list" buttons
  - On stop: save partial history record (interrupted status)

  **Must NOT do**:
  - Don't add full-screen mode (MVP)
  - Don't add sound configuration per step

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: NO (Wave 3, depends on 4, 9, 16)
  - **Blocked By**: Task 4 (timer worker), Task 9 (recipe service), Task 16 (timer composable)

  **Acceptance Criteria**:
  - [ ] Progress list shows all steps with correct status
  - [ ] Current step counts down in real-time
  - [ ] Completed steps show checkmark
  - [ ] Transition overlay appears on step completion
  - [ ] All steps complete → celebration screen

  **QA Scenarios**:
  ```
  Scenario: Run 3-step procedure to completion
    Tool: Playwright (mobile viewport)
    Preconditions: Recipe "Test" exists with 3 steps (5s, 3s, 5s)
    Steps:
      1. Navigate to /recipe/:id/run
      2. Tap Start
      3. Observe step 1 counting down (5,4,3,2,1...)
      4. After 5s, observe step 1 shows "Done" with checkmark
      5. Observe transition overlay shows "Step 1 Complete! → Step 2"
      6. After 3s, step 2 done → overlay for step 3
      7. After 5s, procedure complete message shown
      8. "Re-run" button visible
    Expected Result: Full procedure runs correctly
    Evidence: .sisyphus/evidence/task-15-run-complete.png
  ```

  **Commit**: YES (group with 16, 17)
  - Message: `feat: add timer runner with progress list and controls`

- [x] 16. **Timer Controls Composable**

  **What to do**:
  - Create `src/composables/useTimer.ts` — the bridge between Timer Run view and Web Worker
  - State managed via composable (not Pinia — timer is view-local):
    ```typescript
    function useTimer(recipe: Recipe, steps: Step[]) {
      // Reactive state
      const phase = ref<TimerPhase>('idle');
      const currentStepIndex = ref(0);
      const stepRemainingMs = ref(0);
      const stepElapsedMs = ref(0);
      const totalElapsedMs = ref(0);
      const isStepPaused = ref(false);
      const stepTimings = ref<StepTiming[]>([]);  // per-step actual durations

      // Methods
      function start(): void
      function pause(): void      // global pause
      function resume(): void     // global resume
      function stop(): void       // stop entire procedure
      function pauseStep(): void  // per-step pause
      function resumeStep(): void // per-step resume
      function skipTo(index: number): void  // skip to specific step
      function onStepComplete(index: number): void
      function onProcedureComplete(): void

      // Returns state for UI binding
      return { phase, currentStepIndex, stepRemainingMs, stepElapsedMs,
               totalElapsedMs, isStepPaused, stepTimings,
               start, pause, resume, stop, pauseStep, resumeStep, skipTo }
    }
    ```
  - `start()`: Send steps data to Web Worker, start listening for messages
  - Handle worker messages: `tick`, `stepComplete`, `procedureComplete`, `paused`, `resumed`
  - `pause()`: Send pause to worker, set phase='paused'
  - `pauseStep()`: Set per-step pause flag (worker handles this)
  - On `stepComplete`: push timing to stepTimings array, increment currentStepIndex
  - On `procedureComplete`: calculate total elapsed, return summary data for HistoryService
  - Handle edge cases:
    - Stop during pause
    - Pause during step transition (should not be possible — UI disables)
    - Rapid pause/resume
    - Worker crash (unlikely but handle)

  **Must NOT do**:
  - Don't put timer state in Pinia (timer is view-scoped)
  - Don't create circular refs

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering` (needs both logic + UI state integration)
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 3, with 13, 14)
  - **Blocked By**: Task 4 (Web Worker)

  **Acceptance Criteria**:
  - [ ] Start sends correct data to worker
  - [ ] Pause/Resume correctly toggles worker state
  - [ ] Stop terminates worker session
  - [ ] Step timings accumulate correctly
  - [ ] Procedure complete returns summary data

  **QA Scenarios**:
  ```
  Scenario: Timer composable lifecycle
    Tool: Bash (Vitest integration test)
    Preconditions: useTimer composable imported
    Steps:
      1. Create mock recipe with 3 steps (1s each)
      2. Call start()
      3. After 1.5s, call pause()
      4. Assert phase === 'paused'
      5. After 0.5s, call resume()
      6. Wait for procedure complete
      7. Assert phase === 'completed'
      8. Assert stepTimings has 3 entries
    Expected Result: Composable manages full lifecycle
    Evidence: .sisyphus/evidence/task-16-composable.txt
  ```

  **Commit**: YES (group with 15, 17)

- [x] 17. **Transition Overlay Component**

  **What to do**:
  - Create `src/components/TransitionOverlay.vue`
  - Props: `visible: boolean`, `completedLabel: string`, `nextLabel: string | null`, `durationMs: number`
  - Emits: `dismiss`
  - Design (mobile-first):
    - Full-screen semi-transparent overlay
    - Animated checkmark (CSS scale + fade animation)
    - "✓ Step Complete!" text in large font
    - "Next: {nextLabel}" shown below (or "Procedure Complete!" if last step)
    - Auto-dismiss after `durationMs` (default 3000ms)
    - Also dismissable by tapping anywhere
    - Use `v-if` + CSS transitions for mount/unmount animation
  - Use `requestAnimationFrame` or CSS `@keyframes` for smooth animations
  - Integration: TimerRun view shows this overlay when step completes

  **Must NOT do**:
  - Don't block the timer — overlay is purely visual, timer continues in background
  - Don't add complex animation libraries — CSS is sufficient

  **Recommended Agent Profile**:
  - **Category**: `artistry`
  - **Reason**: Transition overlay needs to feel polished and satisfying — smooth CSS animations, proper timing, good visual design. This is the moment the user sees most feedback from the app.

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 3, with 15, 16)
  - **Blocked By**: None (standalone component)

  **Acceptance Criteria**:
  - [ ] Overlay appears on step completion
  - [ ] Shows completed step name and next step name
  - [ ] Auto-dismisses after 3 seconds
  - [ ] Tapping overlay dismisses immediately
  - [ ] Smooth CSS animation (scale + fade)

  **QA Scenarios**:
  ```
  Scenario: Transition overlay displays and auto-dismisses
    Tool: Playwright
    Preconditions: Recipe with 2 steps (10s each), timer running
    Steps:
      1. Wait for step 1 to complete (~10s)
      2. Assert overlay is visible with "Step Complete!" text
      3. Assert "Next: {step 2 label}" is shown
      4. Wait 3s
      5. Assert overlay is gone
      6. Assert step 2 countdown has started
    Expected Result: Overlay shows then auto-dismisses
    Evidence: .sisyphus/evidence/task-17-overlay.png
  ```

  **Commit**: YES (group with 15, 16)

- [x] 18. **Experiment History View**

  **What to do**:
  - Create `src/views/HistoryView.vue`
  - Route: `/history`
  - Layout (mobile-first):
    - Header: "Experiment History", "Export All" button
    - List of experiment records, most recent first
    - Each record card shows:
      - Recipe name
      - Date/time of run (formatted: "May 9, 2026 14:30")
      - Total duration (formatted: "5m 30s")
      - Status badge: "Completed" (green) / "Interrupted" (orange)
      - Step count ("3 steps")
    - Tap a record → expand to show step-by-step breakdown:
      - Each step: label, planned duration, actual duration, status icon
      - Comparison: green if actual ≈ planned, orange if significantly different
    - Swipe to delete (or delete button with confirmation)
    - "Clear All" button in header (with confirmation dialog)
    - Empty state: "No experiments recorded yet."

  **Must NOT do**:
  - Don't add charts/analytics (MVP)
  - Don't add duration comparison statistics

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 3, with 13-17)
  - **Blocked By**: Task 11 (history service)

  **Acceptance Criteria**:
  - [ ] History list shows all completed experiments
  - [ ] Tap to expand shows step-level breakdown
  - [ ] "Export All" downloads JSON
  - [ ] Delete individual record works
  - [ ] Clear All works (with confirmation)
  - [ ] Empty state shown when no records

  **QA Scenarios**:
  ```
  Scenario: History shows completed experiment
    Tool: Playwright
    Preconditions: At least one completed experiment in DB
    Steps:
      1. Navigate to /history
      2. Assert 1 record visible
      3. Assert record shows recipe name, date, duration
      4. Assert status badge shows "Completed"
      5. Tap record → step breakdown expands
      6. Assert each step label and actual duration shown
    Expected Result: History displays correctly
    Evidence: .sisyphus/evidence/task-18-history.png

  Scenario: Empty state
    Tool: Playwright
    Preconditions: No experiments in DB
    Steps:
      1. Navigate to /history
      2. Assert empty state message visible
    Expected Result: Empty state guides user
    Evidence: .sisyphus/evidence/task-18-empty.png
  ```

  **Commit**: YES
  - Message: `feat: add experiment history view with step breakdown`

- [x] 19. **Dark Mode + Responsive Polish**

  **What to do**:
  - Configure Tailwind dark mode via CSS class strategy: `darkMode: 'class'` in `tailwind.config.ts`
  - Add `src/composables/useDarkMode.ts`:
    - Read initial preference from `localStorage('theme')` or `prefers-color-scheme: dark`
    - Toggle `document.documentElement.classList.toggle('dark')`
    - Persist choice to localStorage
    - Return `isDark: Ref<boolean>` and `toggleDark()`
  - Update all views/components to use Tailwind dark variants:
    - `dark:bg-gray-900`, `dark:text-white`, etc.
    - Ensure all components have both light and dark styles
  - Add dark mode toggle switch in settings/nav
  - Responsive polish:
    - Test at 375x667 (iPhone SE) — primary target
    - Test at 390x844 (iPhone 14 Pro)
    - Test at 430x932 (iPhone 15 Pro Max)
    - Test at desktop 1280x800 (for Chrome DevTools / desktop PWA)
    - Ensure touch targets are ≥ 44px
    - Ensure text is readable at mobile sizes (16px base minimum)
  - Add viewport meta: `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">`
  - Add safe-area-inset padding for notched phones: `env(safe-area-inset-top)` etc.
  - Add theme-color meta tag that changes with dark mode

  **Must NOT do**:
  - Don't add custom color picker — system dark/light is enough
  - Don't add animation-heavy transitions

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 4, with 20-23)

  **Acceptance Criteria**:
  - [ ] Dark mode toggle works and persists across reloads
  - [ ] All views look correct in dark mode
  - [ ] Responsive at iPhone SE (375x667)
  - [ ] Responsive at desktop (1280x800)
  - [ ] Touch targets ≥ 44px
  - [ ] Safe area insets applied

  **QA Scenarios**:
  ```
  Scenario: Dark mode toggle persists
    Tool: Playwright
    Preconditions: App open
    Steps:
      1. Toggle dark mode on
      2. Assert dark class on <html>
      3. Assert dark background color
      4. Reload page
      5. Assert dark mode persists
      6. Toggle off, reload, assert light mode
    Expected Result: Dark mode persists across reloads
    Evidence: .sisyphus/evidence/task-19-dark-mode.png

  Scenario: Responsive at mobile viewport
    Tool: Playwright (375x667)
    Preconditions: Recipe with 3 steps
    Steps:
      1. Set viewport to 375x667
      2. Navigate to recipe list
      3. Assert no horizontal scroll
      4. Assert all content visible within viewport
      5. Open recipe editor
      6. Assert edit form fills viewport correctly
    Expected Result: UI fits mobile screen
    Evidence: .sisyphus/evidence/task-19-responsive.png
  ```

  **Commit**: YES (group with 20, 21)
  - Message: `style: add dark mode and responsive polish`

- [x] 20. **Import/Export UI Integration**

  **What to do**:
  - Create `src/components/ImportExportUI.vue` (or integrate directly into RecipeList and History views)
  - Import flow:
    - File input button (accept `.yaml,.yml,.json`) in RecipeList header
    - On file selected: validate via ImportExportService
    - Show success toast: "Recipe '{name}' imported successfully!"
    - Show error toast: "Invalid file: {reason}"
    - Refresh recipe list
  - Export flow:
    - In RecipeList: long-press or tap ⋯ on recipe card → "Export YAML" / "Export JSON"
    - In RecipeEditor: export buttons in header menu
    - Triggers `downloadBlob(blob, filename)` where filename = `{recipe-name}-{date}.yaml`
  - History export: "Export All" button in HistoryView → downloads full JSON
  - Toast notification system:
    - Create `src/components/Toast.vue` — transient notification
    - Auto-dismiss after 3s
    - Types: success (green), error (red), info (blue)
    - Use `provide/inject` or a simple reactive array for global toast state

  **Must NOT do**:
  - Don't add drag-and-drop file upload (MVP)
  - Don't add batch import (single file at a time)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 4)
  - **Blocked By**: Task 10 (import/export service), Task 12 (recipe list)

  **Acceptance Criteria**:
  - [ ] Import button in recipe list triggers file picker
  - [ ] Valid YAML import creates recipe and shows success toast
  - [ ] Invalid file shows error toast with reason
  - [ ] Export button(s) trigger download
  - [ ] History "Export All" downloads JSON
  - [ ] Toast system works globally

  **QA Scenarios**:
  ```
  Scenario: Import valid YAML recipe
    Tool: Playwright (with file input)
    Preconditions: Valid recipe.yaml file prepared
    Steps:
      1. Create valid YAML file: {formatVersion:1, recipe:{name:"Imported",steps:[{label:"Step1",durationSec:30,notes:""}]}}
      2. Click Import button
      3. Upload the file
      4. Assert success toast shown
      5. Assert recipe appears in list
    Expected Result: YAML import works
    Evidence: .sisyphus/evidence/task-20-import.png

  Scenario: Export recipe as YAML and JSON
    Tool: Playwright
    Preconditions: Recipe "MyRecipe" exists
    Steps:
      1. Export as YAML
      2. Assert downloaded file name contains "MyRecipe"
      3. Assert file content is valid YAML
      4. Export as JSON
      5. Assert downloaded JSON matches original recipe
    Expected Result: Export works for both formats
    Evidence: .sisyphus/evidence/task-20-export.png
  ```

  **Commit**: YES (group with 19, 21)

- [x] 21. **Final PWA Optimization**

  **What to do**:
  - Create proper PWA icons:
    - Generate 192x192 and 512x512 PNG icons
    - Add them to `public/` directory
    - Reference in manifest
  - Generate favicon (SVG or multi-size ICO)
  - Configure PWA screenshots for install prompt (optional improvement)
  - Test PWA install flow:
    - Chrome DevTools → Application → Manifest → "Installability" passes
    - Chrome DevTools → Lighthouse → PWA audit passes (90+)
  - Service worker update handling:
    - When SW update detected (during app reload), show "Update available" toast
    - Only prompt user to update when NO timer is running
    - Use `registerType: 'prompt'` and handle update logic manually
  - Add offline experience:
    - Service worker caches app shell (index.html, JS, CSS)
    - Offline fallback: cached version still works (data from IndexedDB)
    - Add online/offline detection with visual indicator (optional)
  - Add splash screen configuration (theme_color, background_color in manifest)
  - Meta tags for SEO/Social (Open Graph)

  **Must NOT do**:
  - Don't add push notifications (not needed for local-only timer app)
  - Don't add background sync (data is local only)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 4, independent)
  - **Blocked By**: Task 5 (PWA manifest)

  **Acceptance Criteria**:
  - [ ] Lighthouse PWA audit passes (all badges)
  - [ ] App can be installed on Chrome Android
  - [ ] App works offline (after initial load)
  - [ ] SW update prompts user (doesn't auto-reload)
  - [ ] Icons display correctly in home screen

  **QA Scenarios**:
  ```
  Scenario: PWA installable and offline
    Tool: Playwright + Chrome DevTools
    Preconditions: Production build at localhost:4173
    Steps:
      1. Run Lighthouse PWA audit
      2. Assert all installability criteria pass
      3. Assert service worker is registered
      4. Go offline in DevTools (Network → Offline)
      5. Reload page
      6. Assert app loads from cache (shows UI, not browser error)
    Expected Result: PWA fully functional offline
    Evidence: .sisyphus/evidence/task-21-pwa.txt
  ```

  **Commit**: YES (group with 19, 20)

- [x] 22. **Integration Edge Cases**

  **What to do**:
  - Test and fix edge cases:
    1. **Empty recipe**: Try to run a recipe with 0 steps → show error "Recipe has no steps"
    2. **Single step**: Run recipe with 1 step → should work correctly, step completes → procedure complete
    3. **Zero-duration step**: Step with 0s → should be skipped automatically (treat as completed)
    4. **Very long step**: 1 hour+ → timer display shows HH:MM:SS, worker handles long durations
    5. **Rapid pause/resume**: Pause and resume 10+ times in quick succession → timer should stay accurate
    6. **Stop during transition**: User stops during the 3s transition overlay → procedure stops cleanly
    7. **Delete recipe while running**: Should not be possible (UI disables recipe management during active timer)
    8. **Edit recipe while running**: Same — disable editing during active timer
    9. **PWA update during timer**: SW update prompt deferred (registerType: 'prompt')
    10. **Browser tab hidden**: Timer continues in Web Worker (accurate), but may slow down slightly → acceptable
    11. **Multiple tabs**: Same DB accessed from multiple tabs → Dexie handles this, but UI may be stale. Acceptable for MVP.
    12. **Import with very long name**: Names > 100 chars should be truncated on display
    13. **Import with special characters**: Chinese characters, symbols in step names → should work (Unicode)
    14. **Duration overflow**: 999:99:99 → should display reasonably
  - Add validation guards where not already present (mainly in recipe service + timer UI)

  **Must NOT do**:
  - Don't add tab synchronization (MVP)
  - Don't add crash recovery (MVP — timer state is in-memory)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 4, independent)

  **Acceptance Criteria**:
  - [ ] All 14 edge cases handled without crashes
  - [ ] Appropriate error messages shown for invalid states
  - [ ] Empty recipe: graceful error, not blank screen
  - [ ] Rapid pause/resume: timer stays accurate

  **QA Scenarios**:
  ```
  Scenario: Rapid pause/resume
    Tool: Bash (integration test)
    Preconditions: Timer worker ready
    Steps:
      1. Start 30s timer
      2. Loop 10x: pause(100ms) → resume(100ms)
      3. After loop, let timer continue
      4. Assert step completes within 30s ± 500ms
    Expected Result: Rapid pause/resume doesn't break timer
    Evidence: .sisyphus/evidence/task-22-rapid-pause.txt

  Scenario: Empty recipe protection
    Tool: Playwright
    Preconditions: Recipe with 0 steps exists
    Steps:
      1. Navigate to /recipe/:id/run for empty recipe
      2. Assert error message "Recipe has no steps"
      3. Assert Start button is disabled
    Expected Result: Graceful error handling
    Evidence: .sisyphus/evidence/task-22-empty-recipe.png
  ```

  **Commit**: YES (group with 23)
  - Message: `fix: handle edge cases and add validation guards`

- [x] 23. **README + Documentation**

  **What to do**:
  - Create `README.md` with:
    - Project overview
    - Features list
    - Tech stack
    - Development setup: `npm install`, `npm run dev`, `npm run build`
    - PWA installation guide
    - Usage guide (create recipe → run → history)
    - Import/Export format specification
    - Known limitations (iOS background timer, vibration Chrome-only)
  - Add JSDoc comments to public APIs (services, composables)
  - Add inline comments for non-obvious logic (Web Worker timer math, etc.)

  **Must NOT do**:
  - Don't add API documentation generation
  - Don't add contributing guidelines (single-user project)

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 4)

  **Acceptance Criteria**:
  - [ ] README.md exists with setup instructions
  - [ ] README includes feature list and usage guide
  - [ ] Import/Export format documented
  - [ ] Known limitations documented

  **QA Scenarios**:
  ```
  Scenario: README is complete
    Tool: Bash
    Preconditions: README.md exists
    Steps:
      1. Read README.md
      2. Assert it contains: project name, setup instructions, features list
      3. Assert it contains import/export format description
      4. Assert it contains known limitations section
    Expected Result: README is informative and complete
    Evidence: .sisyphus/evidence/task-23-readme.txt
  ```

  **Commit**: YES (group with 22)
  - Message: `docs: add README with setup and usage guide`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, run vitest, curl/pw for UI). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files in `.sisyphus/evidence/`. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + linter + `vitest run`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, `console.log` in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start from clean state (fresh PWA install). Execute EVERY QA scenario from EVERY task. Test cross-task integration (create recipe → run → history → export → import → re-run). Test edge cases: zero steps, 1-hour step, rapid pause/resume, YAML injection attempt.
  Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no scope creep). Check "Must NOT do" compliance. Detect cross-task contamination.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

Based on task groupings (10 commits total):

| # | Tasks | Message |
|---|-------|---------|
| 1 | 1-3 | `chore: scaffold project with Vue 3 + Vite + PWA setup` |
| 2 | 4 | `feat: add wall-clock anchored timer Web Worker` |
| 3 | 5-7 | `feat: add PWA manifest, i18n setup, and sound utility` |
| 4 | 8-11 | `feat: add core services (recipe, history, import/export)` |
| 5 | 12 | `feat: add recipe list view` |
| 6 | 13-14 | `feat: add recipe editor with drag-reorder` |
| 7 | 15-17 | `feat: add timer runner with controls and transition overlay` |
| 8 | 18 | `feat: add experiment history view` |
| 9 | 19-21 | `style: add dark mode, responsive polish, and PWA optimization` |
| 10 | 22-23 | `fix: handle edge cases and add documentation` |

---

## Success Criteria

### Verification Commands
```bash
# After each commit
npm run dev          # App runs at localhost:5173
npm run build        # Builds without errors
npm run test         # All timer/recipe unit tests pass
npx vitest run       # Test runner

# PWA verification (Chrome DevTools)
# → Application → Manifest: all fields present
# → Service Workers: registered, offline mode works
# → Lighthouse: PWA badge passes

# Mobile verification
# → Responsive at 375x667px (iPhone SE)
# → Touch drag works in editor
# → Timer countdown + auto-advance works
# → Sound plays on step completion
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All unit tests pass
- [ ] PWA installable from Chrome Android
- [ ] Recipe: create → drag reorder → save → run → complete → history
- [ ] Import/Export YAML round-trip: export → delete → import → verify
- [ ] Language switch CN↔EN works
- [ ] Dark mode toggle persists
