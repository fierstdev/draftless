import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { CodexManager, getEntityTerms, type CodexEntity } from '@/lib/codex'
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
								const candidates: Array<{ entity: CodexEntity; start: number; end: number }> = []

								entities.forEach((entity) => {
									getEntityTerms(entity).forEach((term) => {
										const safeTerm = escapeRegExp(term)
										const regex = new RegExp(`\\b${safeTerm}\\b`, 'gi')

										let match
										while ((match = regex.exec(text)) !== null) {
											candidates.push({
												entity,
												start: match.index,
												end: match.index + match[0].length,
											})
										}
									})
								})

								candidates
									.sort(
										(left, right) =>
											right.end - right.start - (left.end - left.start) || left.start - right.start,
									)
									.reduce<Array<{ start: number; end: number; entity: CodexEntity }>>((accepted, candidate) => {
										const overlapsExisting = accepted.some(
											(existing) =>
												candidate.start < existing.end && candidate.end > existing.start,
										)
										if (!overlapsExisting) {
											accepted.push(candidate)
										}
										return accepted
									}, [])
									.sort((left, right) => left.start - right.start)
									.forEach((match) => {
										decorations.push(
											Decoration.inline(pos + match.start, pos + match.end, {
												nodeName: 'span',
												class: 'entity-highlight cursor-pointer transition-colors',
												'data-entity-id': match.entity.id,
												style: `--entity-color: ${match.entity.color};`,
											}),
										)
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

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
