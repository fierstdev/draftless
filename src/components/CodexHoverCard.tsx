import { useEffect, useState } from 'react'
import { type CodexEntity, CodexManager } from '@/lib/codex'
import * as Y from 'yjs'
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@/components/ui/hover-card"
import { Badge } from "@/components/ui/badge"
import { MapPin, User, Box, Book, Sparkles } from 'lucide-react'

const TypeIcon = {
	character: User,
	location: MapPin,
	item: Box,
	lore: Book
}

export function CodexOverlay({ ydoc }: { ydoc: Y.Doc }) {
	const [entity, setEntity] = useState<CodexEntity | null>(null)
	const [position, setPosition] = useState<{ x: number, y: number } | null>(null)
	const [isOpen, setIsOpen] = useState(false)

	useEffect(() => {
		const codex = new CodexManager(ydoc)

		// FIX: Explicitly type the event as MouseEvent
		const handleMouseOver = (e: MouseEvent) => {
			const target = e.target as HTMLElement

			if (target.classList.contains('entity-highlight')) {
				const id = target.getAttribute('data-entity-id')
				if (id) {
					const data = codex.getAll().find(e => e.id === id)
					if (data) {
						const rect = target.getBoundingClientRect()
						setEntity(data)
						setPosition({
							x: rect.left + (rect.width / 2),
							y: rect.bottom
						})
						setIsOpen(true)
						return
					}
				}
			}
			setIsOpen(false)
		}

		// Cast the selector result to HTMLElement to satisfy TypeScript event map
		const editorDom = document.querySelector('.ProseMirror') as HTMLElement | null

		if (editorDom) {
			// Now TypeScript knows this element supports 'mouseover' with MouseEvent
			editorDom.addEventListener('mouseover', handleMouseOver)
		}

		return () => {
			if (editorDom) editorDom.removeEventListener('mouseover', handleMouseOver)
		}
	}, [ydoc])

	if (!entity || !position) return null

	const Icon = TypeIcon[entity.type] || Sparkles

	return (
		<HoverCard open={isOpen} onOpenChange={setIsOpen} openDelay={0} closeDelay={0}>
			{/* VIRTUAL TRIGGER: An invisible point we move to the hover location */}
			<HoverCardTrigger asChild>
				<div
					style={{
						position: 'fixed',
						left: position.x,
						top: position.y,
						width: 1,
						height: 1,
						pointerEvents: 'none'
					}}
				/>
			</HoverCardTrigger>

			<HoverCardContent
				className="w-72 p-0 overflow-hidden border-border shadow-xl"
				side="bottom"
				align="center"
				sideOffset={5}
			>
				{/* Colored Header Banner */}
				<div className="h-2 w-full" style={{ backgroundColor: entity.color }} />

				<div className="p-4 bg-card">
					<div className="flex justify-between items-start mb-3">
						<div className="flex items-center gap-2">
							<div className="p-1.5 rounded-md bg-muted text-foreground">
								<Icon className="w-4 h-4" />
							</div>
							<h4 className="text-sm font-bold text-foreground">{entity.name}</h4>
						</div>
						<Badge variant="outline" className="capitalize text-[10px]" style={{ borderColor: entity.color, color: entity.color }}>
							{entity.type}
						</Badge>
					</div>

					<p className="text-xs text-muted-foreground leading-relaxed">
						{entity.description}
					</p>
				</div>
			</HoverCardContent>
		</HoverCard>
	)
}