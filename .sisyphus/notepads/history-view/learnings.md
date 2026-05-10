# HistoryView Implementation - Learnings

## Design System Conventions (from RecipeList.vue, RecipeCard.vue, App.vue)

- **Layout**: `flex flex-col min-h-full` wrapper with sticky header (`h-14`, `sticky top-0 z-10`, backdrop-blur)
- **Cards**: `bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800`
- **Page title**: `text-xl font-bold text-gray-900 dark:text-gray-100`
- **Empty state**: centered icon (`w-20 h-20 text-gray-300 dark:text-gray-600`) + `text-sm` description
- **Loading state**: `animate-spin` SVG + `text-sm` label
- **Badge/pill**: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium`
- **Status colors**: completed = green-100/800 (dark: green-900/200), interrupted = orange-100/800 (dark: orange-900/200)
- **Primary action**: `text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg`
- **Danger action**: `text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20`
- **Spacing**: `p-4` content padding, `pb-6` bottom padding, `space-y-3` between cards
- **Icon style**: Heroicons v2 outline, `fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"`
- **Body background**: `bg-gray-50` light / `bg-gray-950` dark
- **Touch targets**: min 44px enforced globally via CSS
- **Expand animation**: max-height + opacity transition on `expand-enter-active`/`expand-leave-active` (0.3s)

## Implementation Details

- `ExperimentRecord.steps` is an array of `{ stepId, label, plannedDurationMs, actualDurationMs, pausedDurationMs, status }`
- `ExperimentRecord.status` is `ExperimentStatus` = `'completed' | 'interrupted' | 'cancelled'`
- History records are already sorted most-recent-first via Dexie `.reverse()` on `startedAt` index
- `historyService.exportHistoryJSON()` returns a `Blob` — download via `URL.createObjectURL`
