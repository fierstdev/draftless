import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { JSONContent } from '@tiptap/core'
import { getSnapshotsDbName } from './persistence'

export interface Snapshot {
	id: string
	timestamp: number
	description: string
	content: JSONContent
	parentId: string | null
}

interface SnapshotsDB extends DBSchema {
	snapshots: {
		key: string
		value: Snapshot
	}
}

const SNAPSHOTS_DB_VERSION = 4

export async function openSnapshotsDb(fileId: string): Promise<IDBPDatabase<SnapshotsDB>> {
	return openDB<SnapshotsDB>(getSnapshotsDbName(fileId), SNAPSHOTS_DB_VERSION, {
		upgrade(db) {
			if (!db.objectStoreNames.contains('snapshots')) {
				db.createObjectStore('snapshots', { keyPath: 'id' })
			}
		},
	})
}

export async function listSnapshots(fileId: string): Promise<Snapshot[]> {
	const db = await openSnapshotsDb(fileId)
	return (await db.getAll('snapshots')).sort((a, b) => b.timestamp - a.timestamp)
}
