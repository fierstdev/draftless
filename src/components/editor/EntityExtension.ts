import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { CodexManager } from '@/lib/codex'
import * as Y from 'yjs'

export const EntityHighlighter = (ydoc: Y.Doc) => {
	const codex = new CodexManager(ydoc)

	return Extension.create({
		name: 'entityHighlighter',

		addProseMirrorPlugins() {
			return [
				new Plugin({
					key: new PluginKey('entity-highlighter'),
					props: {
						decorations: (state) => {
							const { doc } = state
							const decorations: Decoration[] = []
							const entities = codex.getAll()

							if (entities.length === 0) return DecorationSet.empty

							doc.descendants((node, pos) => {
								if (!node.isText) return

								const text = node.text || ''

								entities.forEach(entity => {
									// Simple regex to find the name (case insensitive)
									const regex = new RegExp(`\\b${entity.name}\\b`, 'gi')
									let match
									while ((match = regex.exec(text)) !== null) {
										const from = pos + match.index
										const to = from + match[0].length

										// Create a decoration that adds a class and data attributes
										decorations.push(
											Decoration.inline(from, to, {
												nodeName: 'span',
												class: `entity-highlight border-b-2 border-${entity.color}-400/50 cursor-help hover:bg-${entity.color}-50`,
												'data-entity-id': entity.id,
												style: `border-bottom-color: ${entity.color};`
											})
										)
									}
								})
							})

							return DecorationSet.create(doc, decorations)
						},
					},
				}),
			]
		},
	})
}