import type { Node as ProseMirrorNode } from '@tiptap/pm/model'

export interface TextOccurrenceTarget {
	text: string
	occurrenceInFile: number
}

export interface TextOccurrenceRange {
	from: number
	to: number
}

export function findTextOccurrenceRange(
	doc: ProseMirrorNode,
	target: TextOccurrenceTarget,
): TextOccurrenceRange | null {
	const query = target.text.trim()
	if (!query) return null

	const indexedText = buildIndexedText(doc)
	const haystack = indexedText.text.toLocaleLowerCase()
	const needle = query.toLocaleLowerCase()

	let occurrence = 0
	let searchStart = 0

	while (searchStart <= haystack.length) {
		const matchIndex = haystack.indexOf(needle, searchStart)
		if (matchIndex === -1) return null

		if (occurrence === target.occurrenceInFile) {
			const startPosition = indexedText.positions
				.slice(matchIndex, matchIndex + needle.length)
				.find((position): position is number => position !== null)
			const endPosition = [...indexedText.positions.slice(matchIndex, matchIndex + needle.length)]
				.reverse()
				.find((position): position is number => position !== null)

			if (startPosition === undefined || endPosition === undefined) {
				return null
			}

			return {
				from: startPosition,
				to: endPosition + 1,
			}
		}

		occurrence += 1
		searchStart = matchIndex + Math.max(needle.length, 1)
	}

	return null
}

function buildIndexedText(doc: ProseMirrorNode): { text: string; positions: Array<number | null> } {
	const characters: string[] = []
	const positions: Array<number | null> = []
	let pendingLineBreak = false

	doc.descendants((node, pos) => {
		if (node.isTextblock && characters.length > 0) {
			pendingLineBreak = true
		}

		if (!node.isText || !node.text) return

		if (pendingLineBreak) {
			characters.push('\n')
			positions.push(null)
			pendingLineBreak = false
		}

		for (let index = 0; index < node.text.length; index += 1) {
			characters.push(node.text[index])
			positions.push(pos + index)
		}
	})

	return {
		text: characters.join(''),
		positions,
	}
}
