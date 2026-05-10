import Dexie, { type Table } from 'dexie';

interface Recipe {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
}

interface Step {
  id: string;
  recipeId: string;
  order: number;
  label: string;
  durationMs: number;
  notes: string;
}

interface ExperimentRecord {
  id: string;
  recipeId: string;
  recipeName: string;
  startedAt: number;
  completedAt: number;
  totalDurationMs: number;
  steps: Array<{
    stepId: string;
    label: string;
    plannedDurationMs: number;
    actualDurationMs: number;
    pausedDurationMs: number;
    status: 'completed' | 'skipped' | 'interrupted';
  }>;
  status: 'completed' | 'interrupted' | 'cancelled';
}

class LabTimerDB extends Dexie {
  recipes!: Table<Recipe, string>;
  steps!: Table<Step, string>;
  experiments!: Table<ExperimentRecord, string>;

  constructor() {
    super('LabTimerDB');
    this.version(1).stores({
      recipes: 'id, name, updatedAt',
      steps: 'id, recipeId, order',
      experiments: 'id, recipeId, startedAt',
    });
  }
}

export const db = new LabTimerDB();
