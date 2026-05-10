# Lab Timer PWA

A mobile-first Progressive Web App for lab workers to create, edit, and run multi-step procedures with per-step countdown timers. Steps auto-advance, support pause/resume (global + per-step), and display a full progress list. Recipes are saved locally with full offline support.

Built with Vue 3, TypeScript, and Vite 8. Runs entirely in the browser with IndexedDB storage, no server required.

---

## Features

- **Recipe Management** -- Create, edit, delete, and duplicate multi-step procedures. Each recipe has a name, description, and an ordered list of timed steps.
- **Step Editor** -- Add, remove, and reorder steps with drag-and-drop. Each step has a label, duration, and optional notes.
- **Timer Execution** -- Run any recipe with wall-clock anchored countdown timers. Each step displays its remaining time, progress bar, and the overall progress through the recipe.
- **Per-Step and Global Pause/Resume** -- Pause the entire procedure or pause individual steps independently.
- **Auto-Advance** -- When a step's timer reaches zero, the app automatically advances to the next step with a transition overlay showing the completed and upcoming steps.
- **Sound and Vibration Notifications** -- Audible beep and haptic feedback when a step completes on supported devices.
- **Experiment History** -- Every completed run is saved with a step-by-step breakdown including planned vs actual duration, pause time, and final status.
- **Import/Export** -- Share recipes between devices by exporting as JSON or YAML files and importing them back with schema validation.
- **Multi-Language** -- Full English and Chinese (Simplified) translations, switchable at runtime.
- **Dark Mode** -- Toggle between light and dark themes. Preference is persisted locally.
- **Offline PWA** -- Install on your device and use without internet access. Fully functional offline after the first load.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Vue 3 + TypeScript + Vite 8 |
| **State** | Pinia |
| **Routing** | Vue Router 4 |
| **Styling** | Tailwind CSS v4 |
| **Database** | IndexedDB via Dexie.js |
| **Timer** | Web Worker with wall-clock anchoring |
| **PWA** | vite-plugin-pwa (registerType: `'prompt'`) |
| **I18n** | vue-i18n (EN / zh-CN) |
| **Import/Export** | js-yaml (safe) + Zod validation |
| **Drag and Drop** | vue-draggable-plus |
| **Testing** | Vitest |

---

## Development Setup

```bash
# Clone the repo
git clone <repo-url>
cd lab-timer

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test

# Preview production build
npm run preview
```

---

## PWA Installation

Lab Timer can be installed on any device that supports Progressive Web Apps.

1. Open the app in Chrome Android or desktop Chrome.
2. Tap the **Install** button in the app header (shown when the install prompt is available).
3. Alternatively, use the browser menu and select **Install Lab Timer** (or **Add to Home Screen** on iOS Safari).
4. After installation, the app launches in its own window and works fully offline.

> **Note:** On iOS Safari, the install option is available through the Share menu under "Add to Home Screen". Timer behavior may differ on iOS due to Safari suspending JavaScript timers when the device is locked (see Known Limitations).

---

## Usage Guide

### Create a Recipe

1. Tap the **+** button on the recipe list page.
2. Enter a recipe name and optional description.
3. Add steps. For each step, set a label and duration. You can also add notes.
4. Drag steps to reorder them as needed.
5. Tap **Save** to store the recipe locally.

### Edit a Recipe

1. Tap a recipe card on the list page.
2. Edit the label, duration, or notes for any step.
3. Drag to reorder steps, add new steps, or delete existing ones.
4. Tap **Save** to persist changes.

### Run a Procedure

1. Open a recipe and tap **Start**.
2. The timer begins counting down from the first step's duration.
3. Each step shows a progress bar, remaining time, and its position in the sequence.
4. Steps auto-advance when the timer reaches zero. A transition overlay appears between steps.
5. Use the **Pause** button to freeze all timers. Use the per-step pause icon to pause only one step.

### Complete a Run

1. When all steps finish, the app shows a completion summary.
2. Save the experiment record with a single tap.
3. The record is stored in the experiment history with full step-by-step timing data.

### View History

1. Navigate to the **History** view from the navigation bar.
2. Each entry shows the recipe name, start time, total duration, and overall status.
3. Tap an entry to view its step-by-step breakdown: planned vs actual duration, pause time, and status per step.

### Export and Import Recipes

1. On the recipe list, tap the export icon on any recipe card to download it as a file.
2. To import, use the import button and select a `.json` or `.yaml` file from your device.
3. The app validates the file format before importing. Invalid files are rejected with a clear error message.

---

## Import/Export Format Specification

Recipes are exported in a versioned interchange format. Both JSON and YAML are supported.

### JSON Example

```json
{
  "formatVersion": 1,
  "exportedAt": "2026-05-09T14:30:00.000Z",
  "recipe": {
    "name": "Concrete Mix",
    "description": "Standard concrete mixing procedure",
    "steps": [
      { "label": "Mix dry ingredients", "durationSec": 30, "notes": "Use slow speed" },
      { "label": "Add water gradually", "durationSec": 90, "notes": "Medium speed" },
      { "label": "Mix until uniform",     "durationSec": 60, "notes": "" }
    ]
  }
}
```

### YAML Example

```yaml
formatVersion: 1
exportedAt: "2026-05-09T14:30:00.000Z"
recipe:
  name: Concrete Mix
  description: Standard concrete mixing procedure
  steps:
    - label: Mix dry ingredients
      durationSec: 30
      notes: Use slow speed
    - label: Add water gradually
      durationSec: 90
      notes: Medium speed
    - label: Mix until uniform
      durationSec: 60
      notes: ""
```

### Schema

| Field | Type | Required | Description |
|---|---|---|---|
| `formatVersion` | integer | yes | Format version number (currently `1`) |
| `exportedAt` | string (ISO 8601) | yes | Timestamp of when the file was exported |
| `recipe.name` | string | yes | Name of the recipe |
| `recipe.description` | string | no | Optional description of the recipe |
| `recipe.steps[]` | array | yes | Must contain at least one step |
| `steps[].label` | string | yes | Step name or instruction |
| `steps[].durationSec` | number (positive) | yes | Duration in seconds |
| `steps[].notes` | string | no | Optional notes for the step |

> Import is validated against the same schema using Zod. Files with missing required fields, invalid types, or empty step lists are rejected.

---

## Known Limitations

- **iOS Safari:** Timers may pause when the device is locked. Safari suspends JavaScript timers in background tabs, which affects the countdown accuracy. Keep the app open and unlocked during a run.
- **Vibration:** Haptic feedback is only supported on Chrome Android. The vibration API is silently ignored on unsupported browsers.
- **Audio:** Sound notifications require a user gesture (tap/click) before they can play, due to browser autoplay policies. The first tap on the app enables audio.
- **Multiple Tabs:** Data is shared across tabs via IndexedDB, but the active timer UI does not synchronize between tabs. Avoid running the same recipe in two tabs simultaneously.
- **Timer Drift Correction:** The timer uses wall-clock anchoring via a Web Worker to maintain accuracy over long runs, but extreme system clock changes during a run may affect timing.

---

## Architecture

```
src/
├── types/              # TypeScript type definitions and Zod schemas
│   └── index.ts        #   Recipe, Step, TimerState, ExperimentRecord, RecipeExport
├── db/                 # IndexedDB schema and data access (Dexie.js)
│   └── index.ts
├── services/           # Business logic layer
│   ├── recipe-service.ts      # Recipe CRUD operations
│   ├── timer-worker.ts        # Web Worker for wall-clock anchored timing
│   ├── history-service.ts     # Experiment record persistence
│   ├── import-export-service.ts # JSON/YAML import with Zod validation
│   └── sound-service.ts       # Audio and vibration notifications
├── composables/        # Vue composables (reusable stateful logic)
│   ├── useTimer.ts           # Timer engine composable
│   ├── useDarkMode.ts        # Dark mode toggle with persistence
│   ├── useSound.ts           # Sound play composable
│   ├── useToast.ts           # Toast notification composable
│   └── useInstallPrompt.ts   # PWA install prompt handling
├── views/              # Page-level components (routes)
│   ├── RecipeList.vue        # Home page: list all recipes
│   ├── RecipeEditor.vue      # Create/edit recipe with step editor
│   ├── TimerRun.vue          # Active timer execution view
│   └── HistoryView.vue       # Experiment history browser
├── components/         # Reusable UI components
│   ├── RecipeCard.vue        # Recipe summary card
│   ├── StepEditor.vue        # Drag-to-reorder step list editor
│   ├── TransitionOverlay.vue # Step transition animation
│   ├── LanguageSwitcher.vue  # Language toggle control
│   └── InstallButton.vue     # PWA install prompt button
├── i18n/               # Internationalization
│   ├── en.ts                # English translations
│   ├── zh-CN.ts             # Chinese (Simplified) translations
│   └── index.ts             # vue-i18n setup
├── router/             # Vue Router configuration
│   └── index.ts
└── styles/             # Global CSS and Tailwind configuration
    └── style.css
```

### Data Flow

1. **Recipes** are stored in IndexedDB via Dexie.js. The recipe list view reads from Dexie and renders cards.
2. When a user taps **Start**, the `useTimer` composable launches a **Web Worker** (`timer-worker.ts`) that broadcasts wall-clock anchored ticks.
3. The timer composable tracks per-step elapsed time, handles pause/resume, and triggers auto-advance.
4. On step completion, `sound-service` plays a beep and triggers device vibration.
5. When all steps finish, the experiment is saved to IndexedDB via `history-service.ts`.
6. **Import/Export** converts between the internal Recipe format and the interchange `RecipeExport` format, validated by Zod.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite development server with HMR |
| `npm run build` | Type-check with vue-tsc and build for production |
| `npm run preview` | Preview the production build locally |
| `npm run test` | Run all tests with Vitest |
