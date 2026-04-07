import { useEffect, useMemo, useRef, useState } from 'react'
import { Book, Box, MapPin, Sparkles, User } from 'lucide-react'
import { Editor } from '@tiptap/react'
import { EntityMentionsDialog } from '@/components/EntityMentionsDialog'
import { Badge } from '@/components/ui/badge'
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from '@/components/ui/hover-card'
import { type CodexEntity, CodexManager } from '@/lib/codex'
import * as Y from 'yjs'

const TypeIcon = {
	character: User,
	location: MapPin,
	item: Box,
	lore: Book,
}

const LONG_PRESS_MS = 450

export function CodexOverlay({ editor, projectDoc }: { editor: Editor | null; projectDoc: Y.Doc }) {
	const [entity, setEntity] = useState<CodexEntity | null>(null)
	const [position, setPosition] = useState<{ x: number; y: number } | null>(null)
	const [isOpen, setIsOpen] = useState(false)
	const [mentionsEntity, setMentionsEntity] = useState<CodexEntity | null>(null)
	const longPressTimeoutRef = useRef<number | null>(null)

	const entitiesById = useMemo(() => {
		const map = new Map<string, CodexEntity>()
		for (const item of new CodexManager(projectDoc).getAll()) {
			map.set(item.id, item)
		}
		return map
	}, [projectDoc])

	useEffect(() => {
		if (!editor || editor.isDestroyed) return

		let dom: HTMLElement

		try {
			if (!editor.view?.dom) return
			dom = editor.view.dom as HTMLElement
		} catch {
			return
		}

		const resolveEntity = (target: EventTarget | null) => {
			const sourceElement =
				target instanceof HTMLElement
					? target
					: target instanceof Node
						? target.parentElement
						: null
			if (!sourceElement) return null

			const element = sourceElement.closest('.entity-highlight')
			if (!(element instanceof HTMLElement)) return null
			const entityId = element.getAttribute('data-entity-id')
			if (!entityId) return null

			const data = entitiesById.get(entityId)
			if (!data) return null

			return { element, data }
		}

		const handleMouseOver = (event: MouseEvent) => {
			const resolved = resolveEntity(event.target)
			if (!resolved) {
				setIsOpen(false)
				return
			}

			const rect = resolved.element.getBoundingClientRect()
			setEntity(resolved.data)
			setPosition({
				x: rect.left + rect.width / 2,
				y: rect.bottom,
			})
			setIsOpen(true)
		}

		const clearLongPress = () => {
			if (longPressTimeoutRef.current !== null) {
				window.clearTimeout(longPressTimeoutRef.current)
				longPressTimeoutRef.current = null
			}
		}

		const openMentions = (resolved: { element: HTMLElement; data: CodexEntity }) => {
			clearLongPress()
			setIsOpen(false)
			setMentionsEntity(resolved.data)
		}

		const handleDoubleClick = (event: MouseEvent) => {
			const resolved = resolveEntity(event.target)
			if (!resolved) return

			event.preventDefault()
			event.stopPropagation()
			openMentions(resolved)
		}

		const handlePointerDown = (event: PointerEvent) => {
			const resolved = resolveEntity(event.target)
			if (!resolved) {
				clearLongPress()
				return
			}

			if (event.pointerType === 'mouse' && event.button !== 0) {
				return
			}

			clearLongPress()
			longPressTimeoutRef.current = window.setTimeout(() => {
				openMentions(resolved)
			}, LONG_PRESS_MS)
		}

		const handlePointerEnd = () => {
			clearLongPress()
		}

		dom.addEventListener('mouseover', handleMouseOver)
		dom.addEventListener('dblclick', handleDoubleClick)
		dom.addEventListener('pointerdown', handlePointerDown)
		dom.addEventListener('pointerup', handlePointerEnd)
		dom.addEventListener('pointercancel', handlePointerEnd)
		dom.addEventListener('pointerleave', handlePointerEnd)

		return () => {
			clearLongPress()
			dom.removeEventListener('mouseover', handleMouseOver)
			dom.removeEventListener('dblclick', handleDoubleClick)
			dom.removeEventListener('pointerdown', handlePointerDown)
			dom.removeEventListener('pointerup', handlePointerEnd)
			dom.removeEventListener('pointercancel', handlePointerEnd)
			dom.removeEventListener('pointerleave', handlePointerEnd)
		}
	}, [editor, entitiesById])

	if (!entity || !position) {
		return (
			<EntityMentionsDialog
				key={mentionsEntity?.id ?? 'mentions-closed'}
				entity={mentionsEntity}
				projectDoc={projectDoc}
				open={!!mentionsEntity}
				onOpenChange={(open) => {
					if (!open) {
						setMentionsEntity(null)
					}
				}}
			/>
		)
	}

	const Icon = TypeIcon[entity.type] || Sparkles

	return (
		<>
			<HoverCard open={isOpen} onOpenChange={setIsOpen} openDelay={0} closeDelay={0}>
				<HoverCardTrigger asChild>
					<div
						style={{
							position: 'fixed',
							left: position.x,
							top: position.y,
							width: 1,
							height: 1,
							pointerEvents: 'none',
						}}
					/>
				</HoverCardTrigger>

				<HoverCardContent
					className="z-50 w-[19rem] overflow-hidden border-border p-0 shadow-xl"
					side="bottom"
					align="center"
					sideOffset={5}
				>
					<div className="h-2 w-full" style={{ backgroundColor: entity.color }} />

					<div className="bg-card px-4 py-4 text-card-foreground">
						<div className="mb-3.5 flex items-start justify-between gap-3">
							<div className="flex items-center gap-2">
								<div className="rounded-lg bg-muted p-2 text-foreground">
									<Icon className="h-4 w-4" />
								</div>
								<div>
									<h4 className="text-sm font-bold">{entity.name}</h4>
								</div>
							</div>
							<Badge
								variant="outline"
								className="text-[10px] capitalize"
								style={{ borderColor: entity.color, color: entity.color }}
							>
								{entity.type}
							</Badge>
						</div>

						<p className="text-xs leading-relaxed text-muted-foreground">
							{entity.description}
						</p>
						{entity.aliases.length > 0 && (
							<div className="mt-3.5">
								<div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
									Also appears as
								</div>
								<div className="flex flex-wrap gap-1.5">
									{entity.aliases.map((alias) => (
										<Badge key={alias} variant="secondary" className="max-w-full truncate text-[10px]">
											{alias}
										</Badge>
									))}
								</div>
							</div>
						)}
						<div className="mt-3.5 border-t border-border/70 pt-3">
							<p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/85">
								Double-click or press and hold to open all references
							</p>
						</div>
					</div>
				</HoverCardContent>
			</HoverCard>

			<EntityMentionsDialog
				key={mentionsEntity?.id ?? 'mentions-closed'}
				entity={mentionsEntity}
				projectDoc={projectDoc}
				open={!!mentionsEntity}
				onOpenChange={(open) => {
					if (!open) {
						setMentionsEntity(null)
					}
				}}
			/>
		</>
	)
}
