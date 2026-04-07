import { openDB } from 'idb'
import { ProjectManager } from './project'
import {
	LIBRARY_DB_NAME,
	LIBRARY_STORE_NAME,
	deleteFileArtifacts,
	deleteIndexedDbDatabase,
	getFileDbName,
	getProjectDbName,
	getSnapshotsDbName,
	hydrateIndexedDbDoc,
} from './persistence'

export interface DocumentMeta {
	id: string
	title: string
	createdAt: number
	updatedAt: number
	wordCount?: number
}

// Initialize the Library Database
const initDB = async () => {
	return openDB(LIBRARY_DB_NAME, 1, {
		upgrade(db) {
			if (!db.objectStoreNames.contains(LIBRARY_STORE_NAME)) {
				const store = db.createObjectStore(LIBRARY_STORE_NAME, { keyPath: 'id' })
				store.createIndex('updatedAt', 'updatedAt')
			}
		},
	})
}

export const library = {
	async list(): Promise<DocumentMeta[]> {
		const db = await initDB()
		const docs = await db.getAllFromIndex(LIBRARY_STORE_NAME, 'updatedAt')
		return docs.reverse() // Newest first
	},

	async create(title: string = "Untitled Story"): Promise<DocumentMeta> {
		const db = await initDB()
		const doc: DocumentMeta = {
			id: crypto.randomUUID(),
			title,
			createdAt: Date.now(),
			updatedAt: Date.now(),
			wordCount: 0
		}
		await db.add(LIBRARY_STORE_NAME, doc)
		return doc
	},

	async update(id: string, updates: Partial<DocumentMeta>) {
		const db = await initDB()
		const tx = db.transaction(LIBRARY_STORE_NAME, 'readwrite')
		const store = tx.objectStore(LIBRARY_STORE_NAME)
		const doc = await store.get(id)
		if (doc) {
			await store.put({ ...doc, ...updates, updatedAt: Date.now() })
		}
		await tx.done
	},

	async delete(id: string) {
		const db = await initDB()

		const projectDbName = getProjectDbName(id)
		let fileIds: string[] = []

		try {
			const projectDoc = await hydrateIndexedDbDoc(projectDbName)
			try {
				fileIds = new ProjectManager(projectDoc).getAll().map((file) => file.id)
			} finally {
				projectDoc.destroy()
			}
		} catch (error) {
			console.error('Failed to enumerate project files during story deletion', error)
		}

		const deletionResults = await Promise.allSettled([
			...fileIds.map((fileId) => deleteFileArtifacts(fileId)),
			deleteIndexedDbDatabase(projectDbName),
			deleteIndexedDbDatabase(getFileDbName(id)),
			// Clean up any legacy story-scoped snapshot DBs created by older bugs.
			deleteIndexedDbDatabase(getSnapshotsDbName(id)),
		])

		const failedDeletion = deletionResults.find((result) => result.status === 'rejected')
		if (failedDeletion?.status === 'rejected') {
			throw failedDeletion.reason
		}

		await db.delete(LIBRARY_STORE_NAME, id)
	}
}
