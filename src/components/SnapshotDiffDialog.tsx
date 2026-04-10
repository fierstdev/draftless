import { useMemo } from 'react'
import { ArrowRightLeft, Minus, Plus } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { buildSnapshotDiff, type DiffSegment } from '@/lib/snapshot-diff'
import { type Snapshot } from '@/lib/snapshots'
import { getPlainTextFromContent } from '@/lib/tiptap-text'
import { cn } from '@/lib/utils'

interface SnapshotDiffDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	snapshots: Snapshot[]
	leftSnapshotId: string | null
	rightSnapshotId: string | null
	onLeftSnapshotChange: (id: string) => void
	onRightSnapshotChange: (id: string) => void
}

export function SnapshotDiffDialog({
	open,
	onOpenChange,
	snapshots,
	leftSnapshotId,
	rightSnapshotId,
	onLeftSnapshotChange,
	onRightSnapshotChange,
}: SnapshotDiffDialogProps) {
	const leftSnapshot = snapshots.find((snapshot) => snapshot.id === leftSnapshotId) ?? null
	const rightSnapshot = snapshots.find((snapshot) => snapshot.id === rightSnapshotId) ?? null

	const leftText = useMemo(
		() => getPlainTextFromContent(leftSnapshot?.content ?? null),
		[leftSnapshot],
	)
	const rightText = useMemo(
		() => getPlainTextFromContent(rightSnapshot?.content ?? null),
		[rightSnapshot],
	)
	const diff = useMemo(() => buildSnapshotDiff(leftText, rightText), [leftText, rightText])

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex h-[88vh] w-[94vw] max-w-[1440px] flex-col gap-0 overflow-hidden border-border bg-card p-0 sm:max-w-[1440px]">
				<div className="border-b border-border px-4 py-4 md:px-5">
					<DialogHeader className="text-left">
						<DialogTitle className="flex items-center gap-2">
							<ArrowRightLeft className="h-4 w-4 text-primary" />
							Compare Saved Versions
						</DialogTitle>
						<DialogDescription>
							See what changed between two saved versions before you return to one or spin off a new draft.
						</DialogDescription>
					</DialogHeader>

					<div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
						<SnapshotSelect
							label="Earlier Draft"
							snapshots={snapshots}
							value={leftSnapshotId}
							onValueChange={onLeftSnapshotChange}
						/>
						<SnapshotSelect
							label="Later Draft"
							snapshots={snapshots}
							value={rightSnapshotId}
							onValueChange={onRightSnapshotChange}
						/>
						<div className="flex flex-wrap items-end gap-2 md:justify-end">
							<Badge variant="secondary" className="gap-1">
								<Plus className="h-3 w-3" />
								{diff.summary.addedWords} added
							</Badge>
							<Badge variant="secondary" className="gap-1">
								<Minus className="h-3 w-3" />
								{diff.summary.removedWords} removed
							</Badge>
							<Badge variant="outline">
								{diff.summary.changedRows} changed block{diff.summary.changedRows === 1 ? '' : 's'}
							</Badge>
						</div>
					</div>
				</div>

				<div className="grid min-h-0 flex-1 md:grid-cols-2">
					<SnapshotPanel
						title="Earlier Draft"
						snapshot={leftSnapshot}
						segmentsByRow={diff.rows.map((row) => row.leftSegments)}
						side="left"
					/>
					<SnapshotPanel
						title="Later Draft"
						snapshot={rightSnapshot}
						segmentsByRow={diff.rows.map((row) => row.rightSegments)}
						side="right"
					/>
				</div>
			</DialogContent>
		</Dialog>
	)
}

function SnapshotSelect({
	label,
	snapshots,
	value,
	onValueChange,
}: {
	label: string
	snapshots: Snapshot[]
	value: string | null
	onValueChange: (id: string) => void
}) {
	return (
		<div className="space-y-2">
			<div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
				{label}
			</div>
			<Select value={value ?? undefined} onValueChange={onValueChange}>
				<SelectTrigger className="bg-background">
					<SelectValue placeholder="Choose a saved version" />
				</SelectTrigger>
				<SelectContent>
					{snapshots.map((snapshot) => (
						<SelectItem key={snapshot.id} value={snapshot.id}>
							{snapshot.description}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	)
}

function SnapshotPanel({
	title,
	snapshot,
	segmentsByRow,
	side,
}: {
	title: string
	snapshot: Snapshot | null
	segmentsByRow: DiffSegment[][]
	side: 'left' | 'right'
}) {
	return (
		<div
			className={cn(
				'flex min-h-0 flex-col',
				side === 'left' ? 'border-b border-border md:border-b-0 md:border-r' : '',
			)}
		>
			<div className="border-b border-border bg-muted/20 px-4 py-3">
				<div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
					{title}
				</div>
				{snapshot ? (
					<>
						<div className="mt-2 text-sm font-semibold text-foreground">{snapshot.description}</div>
						<div className="mt-1 text-xs text-muted-foreground">
							{formatDistanceToNow(snapshot.timestamp, { addSuffix: true })}
						</div>
					</>
				) : (
					<div className="mt-2 text-sm text-muted-foreground">Choose a saved version to compare.</div>
				)}
			</div>

			<ScrollArea className="min-h-0 flex-1">
				<div className="space-y-3 p-3 pb-6 md:p-4 md:pb-8">
					{segmentsByRow.length === 0 && (
						<div className="rounded-2xl border border-dashed border-border bg-muted/10 px-4 py-12 text-center text-sm text-muted-foreground">
							No changes to show.
						</div>
					)}

					{segmentsByRow.map((segments, index) => (
						<div
							key={`${title}-${index}`}
							className="rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm leading-relaxed text-foreground shadow-sm"
						>
							{segments.length > 0 ? (
								<div className="whitespace-pre-wrap break-words">
									{segments.map((segment, segmentIndex) => (
										<span
											key={`${segment.type}-${segmentIndex}`}
											className={cn(
												segment.type === 'same' && '',
												segment.type === 'added' && 'rounded bg-emerald-500/15 text-emerald-900 dark:text-emerald-200',
												segment.type === 'removed' && 'rounded bg-red-500/15 text-red-900 line-through dark:text-red-200',
											)}
										>
											{segment.text}
										</span>
									))}
								</div>
							) : (
								<div className="text-muted-foreground">No content in this block.</div>
							)}
						</div>
					))}
				</div>
			</ScrollArea>
		</div>
	)
}
