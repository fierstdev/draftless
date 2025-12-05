import { useEffect, useState } from "react"
import {
	Settings, Moon, Sun, Laptop, MonitorSmartphone, ShieldAlert
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTheme } from "@/lib/theme-provider"
import { PWAInstall } from "./PWAInstall"

export function SettingsDialog() {
	const { setTheme, theme } = useTheme()
	const [isOpen, setIsOpen] = useState(false)

	// AI Settings
	const [provider, setProvider] = useState('google')
	const [keys, setKeys] = useState({
		google: '',
		openai: '',
		anthropic: ''
	})

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setProvider(localStorage.getItem("ai_provider") || 'google')
		setKeys({
			google: localStorage.getItem("google_api_key") || '',
			openai: localStorage.getItem("openai_api_key") || '',
			anthropic: localStorage.getItem("anthropic_api_key") || '',
		})
	}, [])

	const handleSave = () => {
		localStorage.setItem("ai_provider", provider)
		localStorage.setItem("google_api_key", keys.google)
		localStorage.setItem("openai_api_key", keys.openai)
		localStorage.setItem("anthropic_api_key", keys.anthropic)

		// Force reload to ensure AI client picks up new config
		window.location.reload()
	}

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md">
					<Settings className="h-4 w-4" />
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden bg-card border-border text-card-foreground flex flex-col">

				<DialogHeader className="px-6 py-4 border-b border-border bg-muted/30">
					<DialogTitle className="flex items-center gap-2">
						<Settings className="w-4 h-4 text-primary" />
						Settings
					</DialogTitle>
					<DialogDescription className="text-muted-foreground">
						Configure your writing environment.
					</DialogDescription>
				</DialogHeader>

				<div className="p-6 flex-1 overflow-y-auto max-h-[60vh]">
					<Tabs defaultValue="intelligence" className="w-full">
						<TabsList className="grid w-full grid-cols-2 mb-6 bg-muted text-muted-foreground">
							<TabsTrigger value="appearance" className="data-[state=active]:bg-card data-[state=active]:text-foreground">Appearance</TabsTrigger>
							<TabsTrigger value="intelligence" className="data-[state=active]:bg-card data-[state=active]:text-foreground">Intelligence</TabsTrigger>
						</TabsList>

						{/* APPEARANCE */}
						<TabsContent value="appearance" className="space-y-4">
							<div className="grid grid-cols-3 gap-3">
								<ThemeCard label="Light" icon={<Sun className="w-5 h-5" />} active={theme === 'light'} onClick={() => setTheme('light')} />
								<ThemeCard label="Dark" icon={<Moon className="w-5 h-5" />} active={theme === 'dark'} onClick={() => setTheme('dark')} />
								<ThemeCard label="System" icon={<Laptop className="w-5 h-5" />} active={theme === 'system'} onClick={() => setTheme('system')} />
							</div>
						</TabsContent>

						{/* INTELLIGENCE */}
						<TabsContent value="intelligence" className="space-y-6">

							{/* Provider Selector */}
							<div className="space-y-3">
								<Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Model Provider</Label>
								<Select value={provider} onValueChange={setProvider}>
									<SelectTrigger className="bg-background border-border">
										<SelectValue placeholder="Select Provider" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="google">Google Gemini (Best for Free Tier)</SelectItem>
										<SelectItem value="openai">OpenAI (GPT-4o)</SelectItem>
										<SelectItem value="anthropic">Anthropic (Claude 3.5 Sonnet)</SelectItem>
									</SelectContent>
								</Select>
							</div>

							{/* API Keys */}
							<div className="space-y-4 border-t border-border pt-4">
								<div className="space-y-2">
									<Label className="text-xs">Google Gemini API Key</Label>
									<Input type="password" value={keys.google} onChange={(e) => setKeys({...keys, google: e.target.value})} className="font-mono text-xs bg-background" placeholder="AIzaSy..." />
								</div>
								<div className="space-y-2">
									<Label className="text-xs">OpenAI API Key</Label>
									<Input type="password" value={keys.openai} onChange={(e) => setKeys({...keys, openai: e.target.value})} className="font-mono text-xs bg-background" placeholder="sk-..." />
								</div>
								<div className="space-y-2">
									<Label className="text-xs">Anthropic API Key</Label>
									<Input type="password" value={keys.anthropic} onChange={(e) => setKeys({...keys, anthropic: e.target.value})} className="font-mono text-xs bg-background" placeholder="sk-ant-..." />
								</div>

								<div className="flex justify-end pt-2">
									<Button size="sm" onClick={handleSave} className="bg-primary text-primary-foreground hover:bg-primary/90">Save & Reload</Button>
								</div>
							</div>

							{/* Security Notice */}
							<div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 p-3 flex gap-3">
								<ShieldAlert className="w-5 h-5 text-yellow-600 dark:text-yellow-400 shrink-0" />
								<div className="space-y-1">
									<p className="text-xs font-medium text-yellow-800 dark:text-yellow-300">Client-Side Security</p>
									<p className="text-[10px] text-yellow-700 dark:text-yellow-400 leading-relaxed">
										Keys are stored in your browser's LocalStorage. They are never sent to our servers, only directly to the AI provider.
										<strong> Note:</strong> Anthropic/OpenAI may block browser requests due to CORS unless you use a proxy.
									</p>
								</div>
							</div>

						</TabsContent>
					</Tabs>
				</div>

				{/* Footer */}
				<div className="px-6 py-4 bg-muted/10 border-t border-border flex items-center justify-between">
					<div className="flex flex-col gap-0.5">
						<span className="text-xs font-medium text-foreground">DraftLess System</span>
						<div className="flex items-center gap-1.5 text-muted-foreground">
							<MonitorSmartphone className="w-3 h-3" />
							<span className="text-[10px] font-mono">v1.0.0</span>
						</div>
					</div>
					<PWAInstall />
				</div>

			</DialogContent>
		</Dialog>
	)
}

function ThemeCard({ label, icon, active, onClick }) {
	return (
		<button
			onClick={onClick}
			className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
				active
					? 'border-primary bg-primary/5 text-primary'
					: 'border-border hover:border-muted-foreground/20 text-muted-foreground hover:text-foreground'
			}`}
		>
			{icon}
			<span className="text-xs font-medium">{label}</span>
		</button>
	)
}