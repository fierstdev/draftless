import { AlertCircle, Info, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface NoticeBannerProps {
	message: string
	variant?: 'error' | 'notice'
	onDismiss?: () => void
	className?: string
}

export function NoticeBanner({
	message,
	variant = 'notice',
	onDismiss,
	className,
}: NoticeBannerProps) {
	const Icon = variant === 'error' ? AlertCircle : Info

	return (
		<div
			className={cn(
				'flex items-start gap-3 rounded-xl border px-4 py-3.5 text-sm shadow-sm',
				variant === 'error'
					? 'border-destructive/20 bg-destructive/5 text-destructive'
					: 'border-primary/20 bg-primary/5 text-primary',
				className,
			)}
		>
			<div
				className={cn(
					'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
					variant === 'error' ? 'bg-destructive/10' : 'bg-primary/10',
				)}
			>
				<Icon className="h-4 w-4" />
			</div>
			<div className="flex-1 pt-0.5 leading-relaxed">{message}</div>
			{onDismiss ? (
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					onClick={onDismiss}
					className="mt-[-1px] h-6 w-6 rounded-md text-current hover:bg-black/5 dark:hover:bg-white/5"
				>
					<X className="h-3.5 w-3.5" />
				</Button>
			) : null}
		</div>
	)
}
