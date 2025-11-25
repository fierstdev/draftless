import { useEffect, useState } from "react"
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

export function PWAInstall() {
	const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
	const [isInstalled, setIsInstalled] = useState(false)
	const [isIOS, setIsIOS] = useState(false)

	useEffect(() => {
		// 1. Detect iOS / macOS Safari
		const userAgent = window.navigator.userAgent.toLowerCase()
		const isApple = /iphone|ipad|ipod|macintosh/.test(userAgent) && !/chrome|crios/i.test(userAgent)
		setIsIOS(isApple)

		// 2. Check if already installed
		if (window.matchMedia('(display-mode: standalone)').matches) {
			setIsInstalled(true)
		}

		// 3. Listen for Chrome/Edge prompt
		const handler = (e: any) => {
			e.preventDefault()
			setDeferredPrompt(e)
		}
		window.addEventListener('beforeinstallprompt', handler)

		return () => window.removeEventListener('beforeinstallprompt', handler)
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
				<Check className="w-4 h-4" /> App Installed
			</Button>
		)
	}

	// CHROMIUM: Show the real install button
	if (deferredPrompt) {
		return (
			<Button variant="outline" size="sm" className="gap-2 border-primary/20 hover:bg-primary/5 text-primary" onClick={handleInstallClick}>
				<Download className="w-4 h-4" />
				Install App
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
						Install App
					</Button>
				</DialogTrigger>
				<DialogContent className="bg-card border-border text-card-foreground">
					<DialogHeader>
						<DialogTitle>Install DraftLess</DialogTitle>
						<DialogDescription>
							To install this app on Safari, you need to add it manually.
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