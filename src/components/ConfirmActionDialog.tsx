import { useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'

interface ConfirmActionDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	title: string
	description: string
	confirmLabel?: string
	cancelLabel?: string
	onConfirm: () => void | Promise<void>
}

export function ConfirmActionDialog({
	open,
	onOpenChange,
	title,
	description,
	confirmLabel = 'Confirm',
	cancelLabel = 'Cancel',
	onConfirm,
}: ConfirmActionDialogProps) {
	const [isSubmitting, setIsSubmitting] = useState(false)

	const handleConfirm = async () => {
		setIsSubmitting(true)
		try {
			await onConfirm()
			onOpenChange(false)
		} catch (error) {
			console.error(error)
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				if (isSubmitting) return
				onOpenChange(nextOpen)
			}}
		>
			<DialogContent className="overflow-hidden border-border bg-card p-0 sm:max-w-[460px]">
				<DialogHeader className="gap-3 px-6 py-5 text-left">
					<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/8 text-destructive">
						<AlertTriangle className="h-5 w-5" />
					</div>
					<div className="space-y-1.5">
						<DialogTitle className="text-base">{title}</DialogTitle>
						<DialogDescription className="leading-relaxed">{description}</DialogDescription>
					</div>
				</DialogHeader>
				<DialogFooter className="border-t border-border bg-muted/10 px-6 py-4 sm:justify-end">
					<Button
						type="button"
						variant="ghost"
						onClick={() => onOpenChange(false)}
						disabled={isSubmitting}
						className="min-w-[96px]"
					>
						{cancelLabel}
					</Button>
					<Button
						type="button"
						variant="destructive"
						onClick={() => void handleConfirm()}
						disabled={isSubmitting}
						className="min-w-[120px]"
					>
						{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
						{confirmLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
