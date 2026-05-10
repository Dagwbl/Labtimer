# Import/Export UI - Learnings

## Design System
- Project uses Tailwind CSS v4 with `@import "tailwindcss"` and `@variant dark`
- Dark mode via class strategy (`.dark` class)
- Consistent color use: Tailwind's `gray` for neutrals, `blue` for primary actions, `red` for destructive, `green` for success
- Spacing uses Tailwind's 4px grid (e.g., `px-4`, `py-3`, `gap-2`)
- Components use scoped styles, no BEM
- Touch targets minimum 44px (enforced globally)

## Toast System
- Created `src/composables/useToast.ts` — module-level singleton with reactive array
- Uses module-level `showToast(message, type)` and `removeToast(id)` functions
- Components import `showToast` directly (no provide/inject needed for simplicity)
- Toast.vue placed at fixed top-right corner with slide-in animation from right
- Three types: success (green), error (red), info (blue)
- Auto-dismiss after 3s + 300ms fade-out

## Import Flow (RecipeList)
- File input already existed with `accept=".json,.yaml,.yml"`
- `onFileSelected` now calls `importExportService.importRecipe(file)`
- On success: toast + `loadRecipes()` refresh
- On error: error toast with reason
- File input always reset in `finally` block

## Export Flow
- **RecipeEditor**: Export dropdown button in header (edit mode only), options for JSON/YAML
- **RecipeCard**: Export sub-menu from the three-dot menu, with JSON/YAML options
- **HistoryView**: "Export All" already works, now shows success toast
- All exports use `importExportService.downloadBlob(blob, filename)` for download

## Build Fixes
- Added `src/env.d.ts` for `virtual:pwa-register` type declaration (vite-plugin-pwa)
- Added `onUnmounted` import to TimerRun.vue (was missing)
- Used `void` statements to suppress vue-tsc `noUnusedLocals` false positives for template-bound refs
