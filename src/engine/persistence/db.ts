import { openDB, type IDBPDatabase } from 'idb'
import type { SaveGame } from '@/game/save/types'
import { SAVE_VERSION } from '@/game/save/types'

const DB_NAME = 'fishing-sim-db'
const DB_VERSION = 1
const STORE_SAVES = 'saves'
const SLOT_KEY = 'main'

let dbPromise: Promise<IDBPDatabase> | null = null

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_SAVES)) {
          db.createObjectStore(STORE_SAVES)
        }
      },
    })
  }
  return dbPromise
}

export async function saveGame(save: SaveGame): Promise<void> {
  const db = await getDb()
  await db.put(STORE_SAVES, save, SLOT_KEY)
}

export async function loadGame(): Promise<SaveGame | null> {
  const db = await getDb()
  const raw = await db.get(STORE_SAVES, SLOT_KEY)
  if (!raw) return null
  return migrateSave(raw)
}

export async function deleteSave(): Promise<void> {
  const db = await getDb()
  await db.delete(STORE_SAVES, SLOT_KEY)
}

function migrateSave(raw: unknown): SaveGame | null {
  const candidate = raw as { version?: number }
  if (!candidate || typeof candidate.version !== 'number') return null
  if (candidate.version === SAVE_VERSION) return raw as SaveGame
  // Future migrations would chain here, e.g. v1 -> v2.
  return null
}
