import { useEffect, useState } from "react"
import {
	Settings, Moon, Sun, Check, Laptop
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
import { useTheme } from "@/lib/theme-provider"
import { Badge } from "@/components/ui/badge"

export function SettingsDialog() {
	const { setTheme, theme } = useTheme()
	const [apiKey, setApiKey] = useState("")
	const [isOpen, setIsOpen] = useState(false)

	useEffect(() => {
		const stored = localStorage.getItem("google_api_key")
		if (stored) setApiKey(stored)
	}, [])

	const handleSaveKey = () => {
		localStorage.setItem("google_api_key", apiKey)
		window.location.reload()
	}

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md">
					<Settings className="h-4 w-4" />
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px] p-0 gap-0 overflow-hidden bg-card border-border text-card-foreground">

				{/* Header */}
				<DialogHeader className="px-6 py-4 border-b border-border bg-muted/30">
					<DialogTitle className="flex items-center gap-2">
						<Settings className="w-4 h-4 text-primary" />
						Settings
					</DialogTitle>
					<DialogDescription className="text-muted-foreground">
						Customize appearance and configure AI connections.
					</DialogDescription>
				</DialogHeader>

				<div className="p-6">
					<Tabs defaultValue="appearance" className="w-full">
						<TabsList className="grid w-full grid-cols-2 mb-6 bg-muted text-muted-foreground">
							<TabsTrigger value="appearance" className="data-[state=active]:bg-card data-[state=active]:text-foreground">Appearance</TabsTrigger>
							<TabsTrigger value="intelligence" className="data-[state=active]:bg-card data-[state=active]:text-foreground">Intelligence</TabsTrigger>
						</TabsList>

						{/* APPEARANCE TAB */}
						<TabsContent value="appearance" className="space-y-4">
							<div className="grid grid-cols-3 gap-3">
								<ThemeCard
									label="Light"
									icon={<Sun className="w-5 h-5" />}
									active={theme === 'light'}
									onClick={() => setTheme('light')}
								/>
								<ThemeCard
									label="Dark"
									icon={<Moon className="w-5 h-5" />}
									active={theme === 'dark'}
									onClick={() => setTheme('dark')}
								/>
								<ThemeCard
									label="System"
									icon={<Laptop className="w-5 h-5" />}
									active={theme === 'system'}
									onClick={() => setTheme('system')}
								/>
							</div>
							{/* FIX: Use muted colors instead of blue to match monochrome theme */}
							<div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground border border-border">
								<span className="font-semibold text-foreground">Pro Tip:</span> DraftLess looks best in "Dark" mode for late-night writing sessions.
							</div>
						</TabsContent>

						{/* INTELLIGENCE TAB */}
						<TabsContent value="intelligence" className="space-y-4">
							<div className="space-y-2">
								<Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Google Gemini API Key</Label>
								<div className="flex gap-2">
									<Input
										type="password"
										value={apiKey}
										onChange={(e) => setApiKey(e.target.value)}
										placeholder="AIzaSy..."
										className="font-mono text-xs bg-background"
									/>
									<Button size="sm" onClick={handleSaveKey} className="shrink-0">
										Save
									</Button>
								</div>
								<p className="text-[10px] text-muted-foreground">
									Your key is stored locally in your browser. We never see it.
								</p>
							</div>

							<div className="rounded-lg border border-border p-3 bg-muted/30">
								<div className="flex items-center gap-2 mb-1">
									<Badge variant="outline" className="bg-card text-foreground border-border text-[10px]">Gemini 1.5 Flash</Badge>
									<span className="text-[10px] text-primary font-medium flex items-center gap-1">
                          <Check className="w-3 h-3" /> Active
                      </span>
								</div>
								<p className="text-[10px] text-muted-foreground leading-relaxed">
									This model is optimized for speed and creative writing tasks. It powers the Semantic Weaver and Auto-Complete features.
								</p>
							</div>
						</TabsContent>
					</Tabs>
				</div>
			</DialogContent>
		</Dialog>
	)
}

function ThemeCard({ label, icon, active, onClick }: any) {
	return (
		<button
			onClick={onClick}
			className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
				active
					/* FIX: Use primary color for active border, bg-muted for background */
					? 'border-primary bg-primary/5 text-primary'
					: 'border-border hover:border-muted-foreground/20 text-muted-foreground hover:text-foreground'
			}`}
		>
			{icon}
			<span className="text-xs font-medium">{label}</span>
		</button>
	)
}