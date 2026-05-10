import type { Recipe, Step, RecipeExport } from '@/types'
import { db } from '@/db'
import mortarMixing from '@/data/builtin-recipes/mortar-mixing.json'
import flowDetermination from '@/data/builtin-recipes/flow-determination.json'

export const recipeService = {
  async listRecipes(): Promise<Recipe[]> {
    return db.recipes.orderBy('updatedAt').reverse().toArray()
  },

  async countRecipes(): Promise<number> {
    return db.recipes.count()
  },

  /** Seed any built-in recipes that are not already in the database. */
  async seedMissingBuiltins(): Promise<void> {
    const builtins: RecipeExport[] = [mortarMixing, flowDetermination]
    for (const data of builtins) {
      const exists = await db.recipes.where('name').equals(data.recipe.name).count()
      if (exists === 0) {
        await seedBuiltin(data)
      }
    }
  },

  async getRecipe(id: string): Promise<{ recipe: Recipe; steps: Step[] }> {
    const recipe = await db.recipes.get(id)
    if (!recipe) throw new Error(`Recipe ${id} not found`)
    const steps = await db.steps.where('recipeId').equals(id).sortBy('order')
    return { recipe, steps }
  },

  async createRecipe(data: { name: string; description?: string }): Promise<Recipe> {
    const now = Date.now()
    const recipe: Recipe = {
      id: crypto.randomUUID(),
      name: data.name,
      description: data.description ?? '',
      createdAt: now,
      updatedAt: now,
    }
    await db.recipes.add(recipe)
    return recipe
  },

  async updateRecipe(id: string, data: Partial<Recipe>): Promise<void> {
    await db.recipes.update(id, { ...data, updatedAt: Date.now() })
  },

  async deleteRecipe(id: string): Promise<void> {
    await db.transaction('rw', db.recipes, db.steps, async () => {
      await db.steps.where('recipeId').equals(id).delete()
      await db.recipes.delete(id)
    })
  },

  async saveSteps(recipeId: string, steps: Omit<Step, 'id' | 'recipeId'>[]): Promise<Step[]> {
    const newSteps: Step[] = steps.map((s, i) => ({
      ...s,
      id: crypto.randomUUID(),
      recipeId,
      order: i,
    }))
    await db.transaction('rw', db.steps, async () => {
      await db.steps.where('recipeId').equals(recipeId).delete()
      await db.steps.bulkAdd(newSteps)
    })
    return newSteps
  },

  async reorderSteps(_recipeId: string, stepIds: string[]): Promise<void> {
    await db.transaction('rw', db.steps, async () => {
      for (let i = 0; i < stepIds.length; i++) {
        await db.steps.update(stepIds[i], { order: i })
      }
    })
  },
}

/** Seed a single built-in recipe from a RecipeExport JSON object. */
async function seedBuiltin(data: RecipeExport): Promise<void> {
  const now = Date.now()
  const recipe: Recipe = {
    id: crypto.randomUUID(),
    name: data.recipe.name,
    description: data.recipe.description ?? '',
    createdAt: now,
    updatedAt: now,
  }
  await db.recipes.add(recipe)

  const steps: Omit<Step, 'id' | 'recipeId'>[] = data.recipe.steps.map((s, i) => ({
    order: i,
    label: s.label,
    durationMs: s.durationSec * 1000,
    notes: s.notes ?? '',
  }))

  const stepRecords: Step[] = steps.map(s => ({
    ...s,
    id: crypto.randomUUID(),
    recipeId: recipe.id,
  }))
  await db.steps.bulkAdd(stepRecords)
}
