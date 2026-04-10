import { afterEach, describe, expect, it } from 'vitest'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { findAllTextOccurrenceRanges, findTextOccurrenceRange } from './editor-jump'

const editors: Editor[] = []

afterEach(() => {
	for (const editor of editors.splice(0)) {
		editor.destroy()
	}
})

describe('editor jump helpers', () => {
	it('finds every occurrence in manuscript order', () => {
		const editor = new Editor({
			extensions: [StarterKit],
			content: '<p>Hansel followed the pebbles.</p><p>Gretel trusted Hansel.</p>',
		})
		editors.push(editor)

		const matches = findAllTextOccurrenceRanges(editor.state.doc, 'Hansel')

		expect(matches).toHaveLength(2)
		expect(matches[0]).toEqual(
			findTextOccurrenceRange(editor.state.doc, {
				text: 'Hansel',
				occurrenceInFile: 0,
			}),
		)
		expect(matches[1]).toEqual(
			findTextOccurrenceRange(editor.state.doc, {
				text: 'Hansel',
				occurrenceInFile: 1,
			}),
		)
	})

	it('returns an empty list for blank queries', () => {
		const editor = new Editor({
			extensions: [StarterKit],
			content: '<p>Gretel waited by the fire.</p>',
		})
		editors.push(editor)

		expect(findAllTextOccurrenceRanges(editor.state.doc, '   ')).toEqual([])
		expect(
			findTextOccurrenceRange(editor.state.doc, {
				text: '   ',
				occurrenceInFile: 0,
			}),
		).toBeNull()
	})
})
