import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { CodexManager, getEntityColor, type CodexEntity, type EntityType } from '@/lib/codex'
import { EMPTY_ENTITY_FORM, type CodexEntityFormState } from '@/lib/codex-form'
import * as Y from 'yjs'

interface CodexEntityDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	projectDoc: Y.Doc
	entity?: CodexEntity | null
	initialValue?: CodexEntityFormState
	title?: string
	description?: string
	onSaved?: (entityId: string) => void
}

export function CodexEntityDialog({
	open,
	onOpenChange,
	projectDoc,
	entity = null,
	initialValue = EMPTY_ENTITY_FORM,
	title,
	description,
	onSaved,
}: CodexEntityDialogProps) {
	const [formState, setFormState] = useState<CodexEntityFormState>(initialValue)

	const handleSave = () => {
		const trimmedName = formState.name.trim()
		if (!trimmedName) return

		const codex = new CodexManager(projectDoc)
		const aliases = formState.aliasesText
			.split(',')
			.map((alias) => alias.trim())
			.filter(Boolean)

		if (entity) {
			codex.update(entity.id, {
				name: trimmedName,
				type: formState.type,
				description: formState.description.trim(),
				aliases,
				color: getEntityColor(formState.type),
			})
			onSaved?.(entity.id)
		} else {
			const entityId = codex.add({
				name: trimmedName,
				type: formState.type,
				description: formState.description.trim(),
				aliases,
				color: getEntityColor(formState.type),
			})
			onSaved?.(entityId)
		}

		onOpenChange(false)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px] bg-card border-border text-card-foreground">
				<DialogHeader>
					<DialogTitle>{title ?? (entity ? 'Edit Codex Entry' : 'New Codex Entry')}</DialogTitle>
					{description ? <DialogDescription>{description}</DialogDescription> : null}
				</DialogHeader>
				<div className="grid gap-4 py-4">
					<div className="grid gap-2">
						<Label>Name</Label>
						<Input
							value={formState.name}
							onChange={(event) => setFormState({ ...formState, name: event.target.value })}
							className="bg-background"
							autoFocus
						/>
					</div>
					<div className="grid gap-2">
						<Label>Type</Label>
						<Select
							value={formState.type}
							onValueChange={(value) =>
								setFormState({ ...formState, type: value as EntityType })
							}
						>
							<SelectTrigger className="bg-background">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="character">Character</SelectItem>
								<SelectItem value="location">Location</SelectItem>
								<SelectItem value="item">Item</SelectItem>
								<SelectItem value="lore">Lore</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="grid gap-2">
						<Label>Alternate Names</Label>
						<Input
							value={formState.aliasesText}
							onChange={(event) =>
								setFormState({ ...formState, aliasesText: event.target.value })
							}
							placeholder="Rook Tanner, The Broker"
							className="bg-background"
						/>
						<p className="text-xs text-muted-foreground">
							Separate alternate names with commas. Draftless will find them in your writing too.
						</p>
					</div>
					<div className="grid gap-2">
						<Label>Notes</Label>
						<Textarea
							value={formState.description}
							onChange={(event) =>
								setFormState({ ...formState, description: event.target.value })
							}
							className="bg-background"
						/>
					</div>
				</div>
				<DialogFooter>
					<Button
						onClick={handleSave}
						disabled={!formState.name.trim()}
						className="bg-primary text-primary-foreground"
					>
						{entity ? 'Save Entry' : 'Add Entry'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
