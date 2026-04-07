export function sanitizeFilename(value: string, fallback = 'document') {
	return value
		.trim()
		.replace(/[<>:"/\\|?*]/g, '')
		.split('')
		.filter((character) => character.charCodeAt(0) >= 32)
		.join('')
		.replace(/\s+/g, '_')
		.slice(0, 80) || fallback
}

export function downloadBlob(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob)
	const anchor = document.createElement('a')
	anchor.href = url
	anchor.download = filename
	document.body.appendChild(anchor)
	anchor.click()
	document.body.removeChild(anchor)
	URL.revokeObjectURL(url)
}
