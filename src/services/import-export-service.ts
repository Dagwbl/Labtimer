import * as yaml from 'js-yaml'
import type { RecipeExport } from '@/types'
import { RecipeExportSchema } from '@/types'
import { recipeService } from './recipe-service'

const MAX_FILE_SIZE = 1_000_000 // 1MB
const MAX_NAME_LENGTH = 100

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '\u2026' : str
}

export const importExportService = {
  /** Import recipe from a File object (JSON or YAML) */
  async importRecipe(file: File): Promise<{ name: string }> {
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('File too large (max 1MB)')
    }

    const content = await file.text()

    let parsed: unknown
    if (file.name.endsWith('.yaml') || file.name.endsWith('.yml')) {
      parsed = yaml.load(content) // safe parser (default is safe)
    } else if (file.name.endsWith('.json')) {
      parsed = JSON.parse(content)
    } else {
      throw new Error('Unsupported file format. Use .yaml, .yml, or .json')
    }

    const result = RecipeExportSchema.safeParse(parsed)
    if (!result.success) {
      const errors = result.error.issues
        .map(i => `${i.path.join('.')}: ${i.message}`)
        .join('; ')
      throw new Error(`Invalid file: ${errors}`)
    }

    const data = result.data

    // Truncate long names to prevent UI overflow
    const recipeName = truncate(data.recipe.name, MAX_NAME_LENGTH)

    const recipe = await recipeService.createRecipe({
      name: recipeName,
      description: data.recipe.description,
    })

    await recipeService.saveSteps(
      recipe.id,
      data.recipe.steps.map(s => ({
        label: truncate(s.label, MAX_NAME_LENGTH),
        durationMs: s.durationSec * 1000,
        notes: s.notes,
        order: 0, // placeholder — saveSteps overwrites order by index
      })),
    )

    return { name: recipe.name }
  },

  /** Export recipe as a JSON Blob */
  async exportRecipeAsJSON(recipeId: string): Promise<Blob> {
    const { recipe, steps } = await recipeService.getRecipe(recipeId)
    const exportData: RecipeExport = {
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      recipe: {
        name: recipe.name,
        description: recipe.description,
        steps: steps.map(s => ({
          label: s.label,
          durationSec: Math.round(s.durationMs / 1000),
          notes: s.notes,
        })),
      },
    }
    return new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
  },

  /** Export recipe as a YAML Blob */
  async exportRecipeAsYAML(recipeId: string): Promise<Blob> {
    const { recipe, steps } = await recipeService.getRecipe(recipeId)
    const exportData: RecipeExport = {
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      recipe: {
        name: recipe.name,
        description: recipe.description,
        steps: steps.map(s => ({
          label: s.label,
          durationSec: Math.round(s.durationMs / 1000),
          notes: s.notes,
        })),
      },
    }
    const yamlStr = yaml.dump(exportData, { indent: 2 })
    return new Blob([yamlStr], { type: 'application/x-yaml' })
  },

  /** Export all recipes as a single JSON Blob */
  async exportAllRecipes(): Promise<Blob> {
    const { recipeService } = await import('./recipe-service')
    const recipes = await recipeService.listRecipes()
    const exports: RecipeExport[] = []
    for (const recipe of recipes) {
      const { recipe: full, steps } = await recipeService.getRecipe(recipe.id)
      exports.push({
        formatVersion: 1,
        exportedAt: new Date().toISOString(),
        recipe: {
          name: full.name,
          description: full.description,
          steps: steps.map(s => ({
            label: s.label,
            durationSec: Math.round(s.durationMs / 1000),
            notes: s.notes,
          })),
        },
      })
    }
    return new Blob([JSON.stringify(exports, null, 2)], { type: 'application/json' })
  },

  /** Trigger a browser file download from a Blob */
  downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  },
}
