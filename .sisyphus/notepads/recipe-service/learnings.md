# recipe-service learnings

- Created `src/services/recipe-service.ts` with full CRUD for recipes and steps
- Uses `crypto.randomUUID()` for ID generation (available in browser/modern runtime)
- Dexie transactions used in `deleteRecipe` (cascades to steps) and `saveSteps` (atomic replace)
- Type imports from `@/types`, db instance from `@/db`
- The `db/index.ts` has its own local interfaces mirroring `@/types` — structurally compatible via TS structural typing
- Build passes: `vue-tsc -b && vite build` both succeed
