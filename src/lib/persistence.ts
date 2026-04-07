import * as Y from 'yjs'
import { IndexeddbPersistence } from 'y-indexeddb'

export const LIBRARY_DB_NAME = 'draftless-library'
export const LIBRARY_STORE_NAME = 'documents'

export const getProjectDbName = (storyId: string) => `draftless-project-${storyId}`
export const getFileDbName = (fileId: string) => `draftless-doc-${fileId}`
export const getSnapshotsDbName = (fileId: string) => `draftless-snapshots-${fileId}`

export async function waitForProviderSync(provider: IndexeddbPersistence): Promise<void> {
	if (provider.synced) {
		return
	}

	await new Promise<void>((resolve) => {
		const handleSync = () => {
			provider.off('synced', handleSync)
			resolve()
		}

		provider.on('synced', handleSync)
	})
}

export async function hydrateIndexedDbDoc(name: string): Promise<Y.Doc> {
	const doc = new Y.Doc()
	const provider = new IndexeddbPersistence(name, doc)

	try {
		await waitForProviderSync(provider)
		return doc
	} finally {
		await provider.destroy()
	}
}

export async function deleteIndexedDbDatabase(name: string): Promise<void> {
	await deleteIndexedDbDatabaseWithRetry(name, 3)
}

async function deleteIndexedDbDatabaseWithRetry(name: string, attemptsRemaining: number): Promise<void> {
	try {
		await new Promise<void>((resolve, reject) => {
			const request = indexedDB.deleteDatabase(name)

			request.onsuccess = () => resolve()
			request.onerror = () => reject(request.error ?? new Error(`Failed to delete database "${name}"`))
			request.onblocked = () => reject(new Error(`Deletion blocked for database "${name}"`))
		})
	} catch (error) {
		if (attemptsRemaining > 1 && error instanceof Error && error.message.includes('Deletion blocked')) {
			await new Promise((resolve) => window.setTimeout(resolve, 75))
			return deleteIndexedDbDatabaseWithRetry(name, attemptsRemaining - 1)
		}

		throw error
	}
}

export async function deleteFileArtifacts(fileId: string): Promise<void> {
	await Promise.all([
		deleteIndexedDbDatabase(getFileDbName(fileId)),
		deleteIndexedDbDatabase(getSnapshotsDbName(fileId)),
	])
}
