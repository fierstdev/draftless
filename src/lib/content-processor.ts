import { generateHTML } from '@tiptap/html'
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

/**
 * CLEANING RULES:
 * - FINAL: Accepts additions, removes deletions, hides comments.
 * - ORIGINAL: Rejects additions, keeps deletions (as normal text), hides comments.
 * - REVIEW: Keeps everything visible.
 */
export function processContent(json: any, mode: ExportMode): string {
	if (!json) return ''

	// Deep clone
	const cleanContent = JSON.parse(JSON.stringify(json))

	// 1. SANITIZE & FILTER TRAVERSAL
	const traverse = (node: any) => {
		// Handle Arrays (e.g. the root content list)
		if (Array.isArray(node)) {
			return node.map(traverse).filter(Boolean)
		}

		// Fix Yjs Text Node Weirdness:
		// Sometimes Yjs returns { text: "foo" } without type: "text"
		if (!node.type && node.text) {
			node.type = 'text'
		}

		// If still no type, it's invalid garbage. Kill it.
		if (!node.type) return null

		// Filter Children
		if (node.content) {
			node.content = node.content.map((child: any) => {
				// Handle Marks (Track Changes)
				if (child.marks) {
					const hasDel = child.marks.find((m: any) => m.type === 'suggestionDel')
					const hasAdd = child.marks.find((m: any) => m.type === 'suggestionAdd')
					// const hasComment = child.marks.find((m: any) => m.type === 'comment')

					// DELETIONS
					if (hasDel) {
						if (mode === 'final') return null // Remove
						if (mode === 'original') {
							// Strip mark, keep text
							child.marks = child.marks.filter((m: any) => m.type !== 'suggestionDel')
						}
					}

					// ADDITIONS
					if (hasAdd) {
						if (mode === 'original') return null // Remove
						if (mode === 'final') {
							// Strip mark, keep text
							child.marks = child.marks.filter((m: any) => m.type !== 'suggestionAdd')
						}
					}

					// COMMENTS
					if (mode !== 'review') {
						child.marks = child.marks.filter((m: any) => m.type !== 'comment')
					}
				}

				// Recurse
				return traverse(child)
			}).filter(Boolean)
		}

		return node
	}

	// 2. PREPARE DOC STRUCTURE
	// If input is an array (Yjs fragment), wrap it in a Doc
	const root = Array.isArray(cleanContent)
		? { type: 'doc', content: cleanContent }
		: cleanContent

	// 3. RUN TRAVERSAL
	if (root.content) {
		root.content = traverse(root.content)
	}

	// 4. GENERATE HTML
	try {
		return generateHTML(root, extensions)
	} catch (e) {
		console.error("Compile Error on Node:", root)
		console.error(e)
		return "<p>[Error processing chapter content]</p>"
	}
}