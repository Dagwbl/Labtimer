# Recipe List View - Learnings

## Design System Observations
- **CSS**: Tailwind CSS v4 with `@import "tailwindcss"` + `@variant dark (&:where(.dark, .dark *))` for dark mode
- **Colors**: `bg-gray-50`/`dark:bg-gray-950` body, `bg-white`/`dark:bg-gray-900` cards, `bg-blue-600` primary actions
- **Typography**: `text-xl font-bold` for page headings, `text-sm` for secondary text, `text-xs` for metadata
- **Border radius**: `rounded-xl` (12px) for cards, `rounded-lg` (8px) for buttons, `rounded-full` for circular elements
- **Shadows**: `shadow-sm` for cards, `shadow-lg`/`shadow-xl` for elevated elements (FAB, dropdowns)
- **Touch targets**: Global `min-h-[44px]` on all interactive elements
- **Layout**: `flex flex-col min-h-screen` with `flex-1 overflow-y-auto` main content + fixed bottom nav
- **Transitions**: `transition-colors` standard, `active:scale-95` or `active:scale-[0.98]` for press feedback

## Key Decisions
- Step counts loaded in RecipeList via batch `db.steps.toArray()` and passed as prop to RecipeCard (avoids N+1 queries)
- Context menu uses absolute positioning within card (not Teleport) for simplicity
- Three-dot button overlaid on card via `absolute top-2 right-2`, content padded with `pr-14` to avoid overlap
- Delete uses `window.confirm()` for confirmation before calling `recipeService.deleteRecipe()`
- Import button in header triggers hidden `<input type="file">` — actual import parsing is a TODO placeholder

## Patterns Used
- `onMounted` async/await for data loading
- `ref<T>()` with TypeScript generics for typed reactive state
- `useRouter` for programmatic navigation
- Sticky header with `backdrop-blur-sm` for frosted glass effect
- Spinner icon (animated SVG ring) for loading state
- SVG illustrations using Heroicons outline style (stroke-based)
