import type { JSONContent } from '@tiptap/core'

const BLOCK_NODES = new Set([
	'paragraph',
	'heading',
	'blockquote',
	'codeBlock',
])

const LIST_NODES = new Set(['bulletList', 'orderedList'])

function normalizeTextNode(node: JSONContent): JSONContent | null {
	const normalizedNode = { ...node }

	if (!normalizedNode.type && typeof normalizedNode.text === 'string') {
		normalizedNode.type = 'text'
	}

	if (!normalizedNode.type && !normalizedNode.text) {
		return null
	}

	return normalizedNode
}

export function getPlainTextFromContent(json: JSONContent | null | undefined): string {
	if (!json) return ''

	const text = extractTextFromNode(json)
	return text
		.replace(/\n{3,}/g, '\n\n')
		.replace(/[ \t]+\n/g, '\n')
		.trim()
}

function extractTextFromNode(node: JSONContent | null | undefined): string {
	if (!node) return ''

	const normalizedNode = normalizeTextNode(node)
	if (!normalizedNode) return ''

	if (normalizedNode.type === 'text' && typeof normalizedNode.text === 'string') {
		return normalizedNode.text
	}

	if (normalizedNode.type === 'hardBreak') {
		return '\n'
	}

	const childText = (normalizedNode.content ?? []).map((child) => extractTextFromNode(child)).join('')

	if (BLOCK_NODES.has(normalizedNode.type ?? '')) {
		return `${childText}\n\n`
	}

	if (normalizedNode.type === 'listItem') {
		return `• ${childText.trim()}\n`
	}

	if (LIST_NODES.has(normalizedNode.type ?? '')) {
		return `${childText}\n`
	}

	return childText
}
