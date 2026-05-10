# Integration Edge Cases - Learnings

## Changes Made

### TimerRun.vue
- `formatTime()` now shows `HH:MM:SS` when duration >= 1 hour (hrs > 0)
- `formatElapsed()` now shows `Xh Ym Zs` for long durations
- Integrated `active-timer` global state: sets flag on start, clears on stop/complete/unmount
- Added `onUnmounted` cleanup to clear active timer flag

### RecipeEditor.vue
- `formatDuration()` now supports `HH:MM:SS` display for durations >= 1 hour
- `parseDuration()` now parses `HH:MM:SS` format (3 parts) in addition to `MM:SS`
- Added validation: recipe name required, at least 1 step, all labels non-empty, all durations > 0
- Added visual validation error banner below header (dismissible)
- Added load error state for invalid recipe IDs in edit mode
- Imported `isTimerActive` for future use

### RecipeList.vue
- Imported `isTimerActive` reactive ref from active-timer
- Pass `:disabled` prop to RecipeCard when timer is active
- Disable Import button when timer active (grayed out, not clickable)
- Disable FAB "New Recipe" button when timer active

### RecipeCard.vue
- Added `disabled` prop
- Edit, Run, Export, Delete buttons disabled with visual feedback (grayed out, cursor-not-allowed)
- Card body click disabled (no navigation, no active scale effect)

### active-timer.ts (NEW)
- Simple global reactive ref + setter for timer activity state
- Ephemeral (in-memory) — intentional for MVP since timer worker is also in-memory
- No tab synchronization (beyond MVP scope)

### import-export-service.ts
- Added `truncate()` helper (100 char limit with ellipsis)
- Truncate recipe name and step labels on import to prevent UI overflow
- Existing Zod schema, file size validation, and format validation already sufficient
