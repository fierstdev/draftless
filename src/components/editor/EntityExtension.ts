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
								if (!node.isText || !node.text) return

								const text = node.text

								entities.forEach(entity => {
									// Escape regex special characters
									const safeName = entity.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

									// Match whole words only, case insensitive
									const regex = new RegExp(`\\b${safeName}\\b`, 'gi')

									let match
									while ((match = regex.exec(text)) !== null) {
										const from = pos + match.index
										const to = from + match[0].length

										decorations.push(
											Decoration.inline(from, to, {
												nodeName: 'span',
												// The class 'entity-highlight' is crucial for the HoverCard to find it
												class: `entity-highlight border-b-2 cursor-help transition-colors hover:bg-muted/50 rounded-sm px-0.5`,
												'data-entity-id': entity.id,
												// Inject the color variable for the border
												style: `border-color: ${entity.color};`
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