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
import {
	SCENE_STATUS_LABELS,
	type EditableFileType,
	type ProjectFileMetadata,
	type SceneStatus,
} from '@/lib/project'

const EMPTY_STATUS = 'none'

export interface FileDetailsFormValue {
	title: string
	type: EditableFileType
	metadata: ProjectFileMetadata
}

interface FileDetailsDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	mode: 'create' | 'edit'
	initialValue: FileDetailsFormValue
	onSave: (value: FileDetailsFormValue) => void
}

export function FileDetailsDialog({
	open,
	onOpenChange,
	mode,
	initialValue,
	onSave,
}: FileDetailsDialogProps) {
	const [formValue, setFormValue] = useState<FileDetailsFormValue>(initialValue)

	const handleSave = () => {
		const trimmedTitle = formValue.title.trim()
		if (!trimmedTitle) return

		onSave({
			title: trimmedTitle,
			type: formValue.type,
			metadata: {
				status: formValue.metadata.status,
				pov: formValue.metadata.pov ?? '',
				location: formValue.metadata.location ?? '',
				timeline: formValue.metadata.timeline ?? '',
				goal: formValue.metadata.goal ?? '',
			},
		})
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="sm:max-w-[520px] bg-card border-border text-card-foreground">
					<DialogHeader>
						<DialogTitle>{mode === 'create' ? 'Add Chapter or Note' : 'Edit Chapter or Note'}</DialogTitle>
						<DialogDescription>
							{mode === 'create'
								? 'Create a chapter or note, then add optional scene details like point of view, place, and draft stage.'
								: 'Update the title and scene details so this piece is easier to find and keep organized.'}
						</DialogDescription>
					</DialogHeader>
				<div className="grid gap-4 py-4">
					<div className="grid gap-2">
						<Label htmlFor="file-title">Title</Label>
						<Input
							id="file-title"
							value={formValue.title}
							onChange={(event) =>
								setFormValue((current) => ({ ...current, title: event.target.value }))
							}
							className="bg-background"
							autoFocus
						/>
					</div>
					<div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
						<div className="grid gap-2">
							<Label>Type</Label>
							<Select
								value={formValue.type}
								onValueChange={(value) =>
									setFormValue((current) => ({
										...current,
										type: value as EditableFileType,
									}))
								}
							>
								<SelectTrigger className="w-full bg-background">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="chapter">Chapter</SelectItem>
									<SelectItem value="note">Note</SelectItem>
								</SelectContent>
							</Select>
						</div>
							<div className="grid gap-2">
								<Label>Draft Stage</Label>
							<Select
								value={formValue.metadata.status ?? EMPTY_STATUS}
								onValueChange={(value) =>
									setFormValue((current) => ({
										...current,
										metadata: {
											...current.metadata,
											status: value === EMPTY_STATUS ? undefined : (value as SceneStatus),
										},
									}))
								}
								>
									<SelectTrigger className="w-full bg-background">
										<SelectValue placeholder="No draft stage" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value={EMPTY_STATUS}>No draft stage</SelectItem>
									{Object.entries(SCENE_STATUS_LABELS).map(([value, label]) => (
										<SelectItem key={value} value={value}>
											{label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
						<div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
							<div className="grid gap-2">
								<Label htmlFor="file-pov">POV</Label>
							<Input
								id="file-pov"
								value={formValue.metadata.pov ?? ''}
								onChange={(event) =>
									setFormValue((current) => ({
										...current,
										metadata: { ...current.metadata, pov: event.target.value },
									}))
								}
								placeholder="Rook"
								className="bg-background"
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="file-location">Location</Label>
							<Input
								id="file-location"
								value={formValue.metadata.location ?? ''}
								onChange={(event) =>
									setFormValue((current) => ({
										...current,
										metadata: { ...current.metadata, location: event.target.value },
									}))
								}
								placeholder="Sector 4"
								className="bg-background"
							/>
						</div>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="file-timeline">Story Time</Label>
						<Input
							id="file-timeline"
							value={formValue.metadata.timeline ?? ''}
							onChange={(event) =>
								setFormValue((current) => ({
									...current,
									metadata: { ...current.metadata, timeline: event.target.value },
								}))
							}
							placeholder="Night one"
							className="bg-background"
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="file-goal-notes">Scene Goal</Label>
						<Textarea
							id="file-goal-notes"
							value={formValue.metadata.goal ?? ''}
							onChange={(event) =>
								setFormValue((current) => ({
									...current,
									metadata: { ...current.metadata, goal: event.target.value },
								}))
							}
							placeholder="What should this scene accomplish emotionally or plot-wise?"
							className="min-h-24 bg-background"
						/>
					</div>
				</div>
					<DialogFooter>
						<Button
							onClick={handleSave}
							disabled={!formValue.title.trim()}
							className="bg-primary text-primary-foreground"
						>
							{mode === 'create'
								? formValue.type === 'note'
									? 'Add Note'
									: 'Add Chapter'
								: 'Save Changes'}
						</Button>
					</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
