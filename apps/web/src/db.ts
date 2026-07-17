import Dexie, { type EntityTable } from 'dexie'
import type { QueuedOperation, Snapshot } from './types'

type CacheItem = { key: string; value: unknown; updatedAt: string }

class BibleBawlDatabase extends Dexie {
  cache!: EntityTable<CacheItem, 'key'>
  operations!: EntityTable<QueuedOperation, 'id'>

  constructor() {
    super('bible_bawl_local_v1')
    this.version(1).stores({ cache: 'key', operations: 'id, createdAt' })
  }
}

export const localDb = new BibleBawlDatabase()

export async function readSnapshot() {
  return (await localDb.cache.get('snapshot'))?.value as Snapshot | undefined
}

export async function saveSnapshot(value: Snapshot) {
  // O Vue envolve os dados em objetos reativos, que o IndexedDB não consegue clonar.
  // A conversão abaixo preserva apenas os dados simples antes de salvar offline.
  const plainValue = JSON.parse(JSON.stringify(value)) as Snapshot
  await localDb.cache.put({ key: 'snapshot', value: plainValue, updatedAt: new Date().toISOString() })
}
