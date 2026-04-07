import { useEffect, useMemo, useState } from "react"
import { Download, Check, Share, PlusSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog"

interface BeforeInstallPromptEvent extends Event {
	prompt: () => Promise<void>
	userChoice: Promise<{
		outcome: 'accepted' | 'dismissed'
		platform: string
	}>
}

function isAppleInstallFlow(): boolean {
	if (typeof window === 'undefined') {
		return false
	}

	const userAgent = window.navigator.userAgent.toLowerCase()
	return /iphone|ipad|ipod|macintosh/.test(userAgent) && !/chrome|crios/i.test(userAgent)
}

function isStandaloneDisplayMode(): boolean {
	if (typeof window === 'undefined') {
		return false
	}

	return window.matchMedia('(display-mode: standalone)').matches
}

export function PWAInstall() {
	const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
	const [isInstalled, setIsInstalled] = useState(isStandaloneDisplayMode)
	const isIOS = useMemo(() => isAppleInstallFlow(), [])

	useEffect(() => {
		const beforeInstallPromptHandler = (e: Event) => {
			e.preventDefault()
			setDeferredPrompt(e as BeforeInstallPromptEvent)
		}
		const appInstalledHandler = () => {
			setIsInstalled(true)
			setDeferredPrompt(null)
		}

		window.addEventListener('beforeinstallprompt', beforeInstallPromptHandler)
		window.addEventListener('appinstalled', appInstalledHandler)

		return () => {
			window.removeEventListener('beforeinstallprompt', beforeInstallPromptHandler)
			window.removeEventListener('appinstalled', appInstalledHandler)
		}
	}, [])

	const handleInstallClick = async () => {
		if (!deferredPrompt) return
		deferredPrompt.prompt()
		const { outcome } = await deferredPrompt.userChoice
		if (outcome === 'accepted') {
			setDeferredPrompt(null)
		}
	}

	if (isInstalled) {
		return (
			<Button variant="ghost" size="sm" disabled className="gap-2 text-green-600 opacity-100">
				<Check className="w-4 h-4" /> Installed
			</Button>
		)
	}

	// CHROMIUM: Show the real install button
	if (deferredPrompt) {
		return (
			<Button variant="outline" size="sm" className="gap-2 border-primary/20 hover:bg-primary/5 text-primary" onClick={handleInstallClick}>
				<Download className="w-4 h-4" />
				Install Draftless
			</Button>
		)
	}

	// SAFARI/iOS: Show instructions
	if (isIOS) {
		return (
			<Dialog>
				<DialogTrigger asChild>
					<Button variant="outline" size="sm" className="gap-2 border-primary/20 hover:bg-primary/5 text-primary">
						<Download className="w-4 h-4" />
						Install Draftless
					</Button>
				</DialogTrigger>
				<DialogContent className="bg-card border-border text-card-foreground">
					<DialogHeader>
						<DialogTitle>Install Draftless</DialogTitle>
						<DialogDescription>
							Add Draftless to this device for quicker access.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 text-sm text-muted-foreground">
						<div className="flex items-start gap-3">
							<Share className="w-5 h-5 text-primary shrink-0" />
							<p>1. Click the <strong>Share</strong> button (iOS) or <strong>File</strong> menu (macOS).</p>
						</div>
						<div className="flex items-start gap-3">
							<PlusSquare className="w-5 h-5 text-primary shrink-0" />
							<p>2. Select <strong>"Add to Home Screen"</strong> or <strong>"Add to Dock"</strong>.</p>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		)
	}

	return null
}
