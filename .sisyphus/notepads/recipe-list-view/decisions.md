# Recipe List View - Decisions

## Step Count Loading Strategy
- **Decision**: Load all steps from Dexie in RecipeList, count by recipeId in JS, pass as prop to RecipeCard
- **Rationale**: Avoids N+1 queries for each recipe card while keeping RecipeCard self-contained and reactive
- **Trade-off**: For very large datasets (>1000 steps), this could be slow — but for MVP recipe app, negligible

## Context Menu Implementation
- **Decision**: Absolute positioning within card (not Teleport to body)
- **Rationale**: Simpler positioning, no need to track trigger button coordinates, avoids Teleport circular-reference bug
- **Trade-off**: Menu may clip at viewport edges — acceptable for MVP

## Card Click Handling
- **Decision**: Card body is a `<div role="button">` with keyboard handlers, three-dot menu is separate absolutely-positioned button
- **Rationale**: Avoids nested `<button>` elements (invalid HTML), clean separation of concerns
- **Alternative considered**: Nested `<button>` with `@click.stop` — works but is semantically incorrect

## FAB Positioning
- **Decision**: `fixed bottom-24 right-6` relative to viewport
- **Rationale**: Clears the ~56px bottom navigation bar with adequate padding
- **Note**: Consistent with existing `InstallButton` using `fixed bottom-20`

## Import Button Placeholder
- **Decision**: Hidden file input triggered by Import button, parsing logic as TODO
- **Rationale**: Import implementation is a separate concern; UI skeleton is ready for integration
