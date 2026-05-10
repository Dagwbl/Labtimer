import type { ExperimentRecord } from '@/types'
import { db } from '@/db'

class HistoryService {
  async listRecords(): Promise<ExperimentRecord[]> {
    return db.experiments.orderBy('startedAt').reverse().toArray()
  }

  async getRecord(id: string): Promise<ExperimentRecord | undefined> {
    return db.experiments.get(id)
  }

  async saveRecord(record: ExperimentRecord): Promise<void> {
    await db.experiments.add(record)
  }

  async deleteRecord(id: string): Promise<void> {
    await db.experiments.delete(id)
  }

  async clearAll(): Promise<void> {
    await db.experiments.clear()
  }

  async exportHistoryJSON(): Promise<Blob> {
    const records = await this.listRecords()
    const json = JSON.stringify(records, null, 2)
    return new Blob([json], { type: 'application/json' })
  }
}

export const historyService = new HistoryService()
