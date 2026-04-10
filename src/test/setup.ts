import 'fake-indexeddb/auto'
import { afterEach } from 'vitest'

afterEach(async () => {
	document.body.innerHTML = ''
	localStorage.clear()
	sessionStorage.clear()
})
