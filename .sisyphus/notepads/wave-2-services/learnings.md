# Learnings

## history-service.ts
- Created `HistoryService` class with singleton export (`historyService`)
- Uses Dexie's `orderBy('startedAt').reverse()` for most-recent-first ordering
- All CRUD methods delegate directly to Dexie table operations
- `exportHistoryJSON` serializes full history as a downloadable JSON blob
- Build required fixing a pre-existing unused parameter in `recipe-service.ts` (`recipeId` → `_recipeId`)
