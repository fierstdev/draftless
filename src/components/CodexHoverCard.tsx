import { useEffect, useState } from 'react'
import { type CodexEntity, CodexManager } from '@/lib/codex'
import { Editor } from '@tiptap/react'
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@/components/ui/hover-card"
import { Badge } from "@/components/ui/badge"
import { MapPin, User, Box, Book, Sparkles } from 'lucide-react'
import * as Y from 'yjs'

const TypeIcon = {
	character: User,
	location: MapPin,
	item: Box,
	lore: Book
}

// FIX 1: Accept projectDoc prop
export function CodexOverlay({ editor, projectDoc }: { editor: Editor | null, projectDoc: Y.Doc }) {
	const [entity, setEntity] = useState<CodexEntity | null>(null)
	const [position, setPosition] = useState<{ x: number, y: number } | null>(null)
	const [isOpen, setIsOpen] = useState(false)

	useEffect(() => {
		// 1. Safety Check: Ensure editor exists and isn't destroyed
		if (!editor || editor.isDestroyed) return

		let dom: HTMLElement

		// 2. Defensive Access: Tiptap throws if 'view' is accessed too early
		try {
			if (!editor.view || !editor.view.dom) return
			dom = editor.view.dom as HTMLElement
		} catch (e) {
			return
		}

		// FIX 2: Use the Project Doc to find entities (The "Library" Database)
		// instead of the Chapter Doc (The "Editor" Database)
		const codex = new CodexManager(projectDoc)

		const handleMouseOver = (e: MouseEvent) => {
			const target = e.target as HTMLElement

			if (target.classList.contains('entity-highlight')) {
				const id = target.getAttribute('data-entity-id')
				if (id) {
					const data = codex.getAll().find(item => item.id === id)
					if (data) {
						const rect = target.getBoundingClientRect()
						setEntity(data)
						// Center the tooltip above the text
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

		// 3. Safe Attachment
		dom.addEventListener('mouseover', handleMouseOver)

		return () => {
			dom.removeEventListener('mouseover', handleMouseOver)
		}
	}, [editor, projectDoc]) // Re-run if projectDoc changes

	if (!entity || !position) return null

	const Icon = TypeIcon[entity.type as keyof typeof TypeIcon] || Sparkles

	return (
		<HoverCard open={isOpen} onOpenChange={setIsOpen} openDelay={0} closeDelay={0}>
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
				className="w-72 p-0 overflow-hidden border-border shadow-xl z-50"
				side="bottom"
				align="center"
				sideOffset={5}
			>
				<div className="h-2 w-full" style={{ backgroundColor: entity.color }} />

				<div className="p-4 bg-card text-card-foreground">
					<div className="flex justify-between items-start mb-3">
						<div className="flex items-center gap-2">
							<div className="p-1.5 rounded-md bg-muted text-foreground">
								<Icon className="w-4 h-4" />
							</div>
							<h4 className="text-sm font-bold">{entity.name}</h4>
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