import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export const jumpHighlightKey = new PluginKey<DecorationSet>('jump-highlight')

export interface JumpHighlightMeta {
	from?: number
	to?: number
	clear?: boolean
}

export const JumpHighlightExtension = Extension.create({
	name: 'jumpHighlight',

	addProseMirrorPlugins() {
		return [
			new Plugin({
				key: jumpHighlightKey,
				state: {
					init: () => DecorationSet.empty,
					apply: (transaction, decorations) => {
						const meta = transaction.getMeta(jumpHighlightKey) as JumpHighlightMeta | undefined
						const mappedDecorations = decorations.map(transaction.mapping, transaction.doc)

						if (meta?.clear) {
							return DecorationSet.empty
						}

						if (meta?.from !== undefined && meta?.to !== undefined) {
							return DecorationSet.create(transaction.doc, [
								Decoration.inline(meta.from, meta.to, {
									class:
										'jump-highlight rounded-sm bg-primary/20 ring-1 ring-primary/25 shadow-[0_0_0_2px_rgba(59,130,246,0.08)]',
								}),
							])
						}

						return mappedDecorations
					},
				},
				props: {
					decorations(state) {
						return jumpHighlightKey.getState(state) ?? DecorationSet.empty
					},
				},
			}),
		]
	},
})
