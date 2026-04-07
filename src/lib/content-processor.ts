import { generateHTML } from '@tiptap/html'
import type { JSONContent } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Typography from '@tiptap/extension-typography'
import { SuggestionAdd, SuggestionDel, CommentMark } from '@/components/editor/ReviewExtension'

// Extensions used for HTML generation
const extensions = [
	StarterKit,
	Typography,
	SuggestionAdd,
	SuggestionDel,
	CommentMark
]

export type ExportMode = 'final' | 'original' | 'review'
type JSONMark = NonNullable<JSONContent['marks']>[number]

function isJSONContent(value: JSONContent | null): value is JSONContent {
	return value !== null
}

function normalizeTextNode(node: JSONContent): JSONContent | null {
	const normalizedNode = { ...node }

	// Yjs can sometimes emit text nodes without a `type`.
	if (!normalizedNode.type && typeof normalizedNode.text === 'string') {
		normalizedNode.type = 'text'
	}

	if (!normalizedNode.type) {
		return null
	}

	return normalizedNode
}

function filterMarks(marks: JSONMark[] | undefined, mode: ExportMode): JSONMark[] | null {
	if (!marks || marks.length === 0) {
		return []
	}

	const hasDeletion = marks.some((mark) => mark.type === 'suggestionDel')
	const hasAddition = marks.some((mark) => mark.type === 'suggestionAdd')

	if (hasDeletion && mode === 'final') {
		return null
	}

	if (hasAddition && mode === 'original') {
		return null
	}

	let nextMarks = marks

	if (hasDeletion && mode === 'original') {
		nextMarks = nextMarks.filter((mark) => mark.type !== 'suggestionDel')
	}

	if (hasAddition && mode === 'final') {
		nextMarks = nextMarks.filter((mark) => mark.type !== 'suggestionAdd')
	}

	if (mode !== 'review') {
		nextMarks = nextMarks.filter((mark) => mark.type !== 'comment')
	}

	return nextMarks
}

function traverseNodes(nodes: JSONContent[], mode: ExportMode): JSONContent[] {
	return nodes
		.map((child) => traverseNode(child, mode))
		.filter(isJSONContent)
}

function traverseNode(node: JSONContent, mode: ExportMode): JSONContent | null {
	const normalizedNode = normalizeTextNode(node)
	if (!normalizedNode) {
		return null
	}

	const filteredMarks = filterMarks(normalizedNode.marks, mode)
	if (filteredMarks === null) {
		return null
	}

	const nextNode: JSONContent = {
		...normalizedNode,
		marks: filteredMarks.length > 0 ? filteredMarks : undefined,
	}

	if (normalizedNode.content) {
		nextNode.content = traverseNodes(normalizedNode.content, mode)
	}

	return nextNode
}

/**
 * CLEANING RULES:
 * - FINAL: Accepts additions, removes deletions, hides comments.
 * - ORIGINAL: Rejects additions, keeps deletions (as normal text), hides comments.
 * - REVIEW: Keeps everything visible.
 */
export function processContent(json: JSONContent | JSONContent[] | null | undefined, mode: ExportMode): string {
	if (!json) return ''

	// Deep clone before mutating content for export processing.
	const cleanContent = JSON.parse(JSON.stringify(json)) as JSONContent | JSONContent[]

	// 2. PREPARE DOC STRUCTURE
	// If input is an array (Yjs fragment), wrap it in a Doc
	const root: JSONContent = Array.isArray(cleanContent)
		? { type: 'doc', content: cleanContent }
		: cleanContent

	// 3. RUN TRAVERSAL
	if (root.content) {
		root.content = traverseNodes(root.content, mode)
	}

	// 4. GENERATE HTML
	try {
		return generateHTML(root, extensions)
	} catch (error) {
		console.error("Compile Error on Node:", root)
		console.error(error)
		return "<p>[Error processing chapter content]</p>"
	}
}
