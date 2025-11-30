import { Mark, mergeAttributes } from '@tiptap/core'

export const SuggestionAdd = Mark.create({
	name: 'suggestionAdd',

	addOptions() {
		return {
			HTMLAttributes: {
				class: 'suggestion-add bg-green-100 text-green-800 decoration-clone px-0.5 rounded-sm border-b-2 border-green-200',
			},
		}
	},

	parseHTML() {
		return [
			{
				tag: 'span',
				getAttrs: element => (element as HTMLElement).classList.contains('suggestion-add') && null,
			},
		]
	},

	renderHTML({ HTMLAttributes }) {
		return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
	},
})

export const SuggestionDel = Mark.create({
	name: 'suggestionDel',

	addOptions() {
		return {
			HTMLAttributes: {
				class: 'suggestion-del bg-red-100 text-red-800 line-through decoration-clone px-0.5 rounded-sm opacity-70',
			},
		}
	},

	parseHTML() {
		return [
			{
				tag: 'span',
				getAttrs: element => (element as HTMLElement).classList.contains('suggestion-del') && null,
			},
		]
	},

	renderHTML({ HTMLAttributes }) {
		return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
	},
})

export const CommentMark = Mark.create({
	name: 'comment',

	addAttributes() {
		return {
			id: { default: null },
			text: { default: '' }
		}
	},

	parseHTML() {
		return [{ tag: 'span[data-comment-id]' }]
	},

	renderHTML({ HTMLAttributes }) {
		return ['span', mergeAttributes({ class: 'comment-mark bg-yellow-100 border-b-2 border-yellow-300 cursor-pointer' }, HTMLAttributes), 0]
	},
})