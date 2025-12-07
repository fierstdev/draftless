import { openDB } from 'idb'

export interface DocumentMeta {
	id: string
	title: string
	createdAt: number
	updatedAt: number
	wordCount?: number
}

const DB_NAME = 'draftless-library'
const STORE_NAME = 'documents'

// Initialize the Library Database
const initDB = async () => {
	return openDB(DB_NAME, 1, {
		upgrade(db) {
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
				store.createIndex('updatedAt', 'updatedAt')
			}
		},
	})
}

export const library = {
	async list(): Promise<DocumentMeta[]> {
		const db = await initDB()
		const docs = await db.getAllFromIndex(STORE_NAME, 'updatedAt')
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
		await db.add(STORE_NAME, doc)
		return doc
	},

	async update(id: string, updates: Partial<DocumentMeta>) {
		const db = await initDB()
		const tx = db.transaction(STORE_NAME, 'readwrite')
		const store = tx.objectStore(STORE_NAME)
		const doc = await store.get(id)
		if (doc) {
			await store.put({ ...doc, ...updates, updatedAt: Date.now() })
		}
		await tx.done
	},

	async delete(id: string) {
		const db = await initDB()
		await db.delete(STORE_NAME, id)

		indexedDB.deleteDatabase(`draftless-doc-${id}`)
		indexedDB.deleteDatabase(`draftless-snapshots-${id}`)
	}
}
