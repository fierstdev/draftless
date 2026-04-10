import { useEffect, useState, type CSSProperties, type ReactNode } from "react"
import {
	Settings, Moon, Sun, Laptop, MonitorSmartphone, ShieldAlert, CheckCircle2, Eye, EyeOff, Palette, Sparkles
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
import {
	ENTITY_HIGHLIGHT_PRESETS,
	getEntityHighlightPresetId,
	getInitialEntityHighlightOpacity,
	getInitialEntityHighlightVisibility,
	persistEntityHighlightPreferences,
	type EntityHighlightVisibility,
} from "@/lib/entity-highlights"
import { useTheme } from "@/lib/theme-provider"
import { PWAInstall } from "./PWAInstall"

type AIProvider = 'google' | 'openai' | 'anthropic'

function getInitialProvider(): AIProvider {
	const storedProvider = localStorage.getItem("ai_provider")
	return storedProvider === 'openai' || storedProvider === 'anthropic' ? storedProvider : 'google'
}

function isAIProvider(value: string): value is AIProvider {
	return value === 'google' || value === 'openai' || value === 'anthropic'
}

function getInitialKeys() {
	return {
		google: localStorage.getItem("google_api_key") || '',
		openai: localStorage.getItem("openai_api_key") || '',
		anthropic: localStorage.getItem("anthropic_api_key") || '',
	}
}

export function SettingsDialog() {
	const { setTheme, theme } = useTheme()
	const [isOpen, setIsOpen] = useState(false)
	const [activeTab, setActiveTab] = useState<'appearance' | 'intelligence'>('appearance')

	// AI Settings
	const [provider, setProvider] = useState<AIProvider>(getInitialProvider)
	const [keys, setKeys] = useState(getInitialKeys)
	const [saved, setSaved] = useState(false)
	const [entityHighlightVisibility, setEntityHighlightVisibility] = useState<EntityHighlightVisibility>(
		getInitialEntityHighlightVisibility,
	)
	const [entityHighlightOpacity, setEntityHighlightOpacity] = useState(getInitialEntityHighlightOpacity)
	const activeEntityHighlightPreset = getEntityHighlightPresetId({
		visibility: entityHighlightVisibility,
		opacity: entityHighlightOpacity,
	})
	const activeEntityHighlightLabel =
		entityHighlightVisibility === 'hidden'
			? 'Hidden'
			: ENTITY_HIGHLIGHT_PRESETS.find((preset) => preset.id === activeEntityHighlightPreset)?.label ?? 'Custom'

	useEffect(() => {
		persistEntityHighlightPreferences({
			visibility: entityHighlightVisibility,
			opacity: entityHighlightOpacity,
		})
	}, [entityHighlightOpacity, entityHighlightVisibility])

	const handleSave = () => {
		localStorage.setItem("ai_provider", provider)
		localStorage.setItem("google_api_key", keys.google)
		localStorage.setItem("openai_api_key", keys.openai)
		localStorage.setItem("anthropic_api_key", keys.anthropic)
		setSaved(true)
		window.setTimeout(() => setSaved(false), 2000)
	}

	const handleOpenChange = (nextOpen: boolean) => {
		setIsOpen(nextOpen)
		if (nextOpen) {
			setActiveTab('appearance')
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md">
					<Settings className="h-4 w-4" />
				</Button>
			</DialogTrigger>
			<DialogContent className="w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] sm:w-[min(92vw,920px)] sm:!max-w-[920px] h-[min(88dvh,780px)] max-h-[calc(100dvh-2rem)] p-0 gap-0 overflow-hidden bg-card border-border text-card-foreground flex flex-col">

				<DialogHeader className="shrink-0 px-6 py-4 border-b border-border bg-muted/30">
					<DialogTitle className="flex items-center gap-2">
						<Settings className="w-4 h-4 text-primary" />
						Preferences
					</DialogTitle>
					<DialogDescription className="text-muted-foreground">
						Shape your writing space and connect your AI tools.
					</DialogDescription>
				</DialogHeader>

				<Tabs
					value={activeTab}
					onValueChange={(value) => setActiveTab(value as 'appearance' | 'intelligence')}
					className="min-h-0 flex-1 overflow-hidden md:flex-row md:gap-0"
				>
					<div className="border-b border-border px-4 py-4 md:hidden">
						<TabsList className="grid w-full grid-cols-2 bg-muted text-muted-foreground">
							<TabsTrigger value="appearance" className="data-[state=active]:bg-card data-[state=active]:text-foreground">
								Appearance
							</TabsTrigger>
							<TabsTrigger value="intelligence" className="data-[state=active]:bg-card data-[state=active]:text-foreground">
								Writing Assistant
							</TabsTrigger>
						</TabsList>
					</div>

					<div className="hidden border-r border-border bg-muted/15 md:flex md:w-56 md:shrink-0 md:flex-col">
						<TabsList className="flex h-auto w-full flex-col items-stretch justify-start gap-1 rounded-none bg-transparent p-3 text-left">
							<SettingsNavTrigger
								value="appearance"
								title="Appearance"
								description="Theme, codex references, and writing-space visuals"
								icon={<Palette className="h-4 w-4" />}
							/>
							<SettingsNavTrigger
								value="intelligence"
								title="Writing Assistant"
								description="AI provider, keys, and browser-side storage"
								icon={<Sparkles className="h-4 w-4" />}
							/>
						</TabsList>
					</div>

					<div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
						<div className="space-y-6 p-5 sm:p-6 md:p-8">
						{/* APPEARANCE */}
						<TabsContent value="appearance" className="mt-0 min-w-0 space-y-6">
							<SettingsSection
								title="Theme"
								description="Choose how Draftless looks across your writing sessions."
							>
							<div className="grid grid-cols-3 gap-3">
								<ThemeCard label="Light" icon={<Sun className="w-5 h-5" />} active={theme === 'light'} onClick={() => setTheme('light')} />
								<ThemeCard label="Dark" icon={<Moon className="w-5 h-5" />} active={theme === 'dark'} onClick={() => setTheme('dark')} />
								<ThemeCard label="System" icon={<Laptop className="w-5 h-5" />} active={theme === 'system'} onClick={() => setTheme('system')} />
							</div>
							</SettingsSection>

							<SettingsSection
								title="Codex References"
								description="Control how visible codex names, places, and lore references feel inside the draft."
							>
								<div className="space-y-5">
									<div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
										<div className="space-y-3">
											<div className="space-y-1">
												<Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
													Reference Visibility
												</Label>
												<p className="text-xs leading-relaxed text-muted-foreground">
													Choose whether codex references stay visible while you write.
												</p>
											</div>
											<div className="grid grid-cols-2 gap-2">
												<VisibilityChoice
													label="Show"
													icon={<Eye className="h-4 w-4" />}
													active={entityHighlightVisibility === 'visible'}
													onClick={() => setEntityHighlightVisibility('visible')}
												/>
												<VisibilityChoice
													label="Hide"
													icon={<EyeOff className="h-4 w-4" />}
													active={entityHighlightVisibility === 'hidden'}
													onClick={() => setEntityHighlightVisibility('hidden')}
												/>
											</div>
										</div>

										<div className="space-y-3">
											<div className="flex items-center justify-between gap-3">
												<div className="space-y-1">
													<Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
														Preset
													</Label>
													<p className="text-xs leading-relaxed text-muted-foreground">
														Start with a named look, then fine-tune only if you want something custom.
													</p>
												</div>
												<span className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
													{activeEntityHighlightLabel}
												</span>
											</div>

											<div className="grid gap-2 sm:grid-cols-3">
												{ENTITY_HIGHLIGHT_PRESETS.filter((preset) => preset.id !== 'hidden').map((preset) => (
													<HighlightPresetCard
														key={preset.id}
														label={preset.label}
														active={entityHighlightVisibility === 'visible' && activeEntityHighlightPreset === preset.id}
														onClick={() => {
															setEntityHighlightVisibility('visible')
															setEntityHighlightOpacity(preset.opacity)
														}}
													/>
												))}
											</div>
										</div>
									</div>

									<div className="rounded-xl border border-border bg-background/70 p-4">
										<div className="flex items-center justify-between gap-3">
											<div>
												<Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
													Color Strength
												</Label>
												<p className="mt-1 text-xs leading-relaxed text-muted-foreground">
													Lower feels quieter on the page. Higher makes references easier to spot.
												</p>
											</div>
											<span className="rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground">
												{entityHighlightOpacity}%
											</span>
										</div>

										<div className="mt-4 space-y-3">
											<input
												type="range"
												min={0}
												max={100}
												step={1}
												value={entityHighlightOpacity}
												disabled={entityHighlightVisibility === 'hidden'}
												onChange={(event) => {
													setEntityHighlightVisibility('visible')
													setEntityHighlightOpacity(Number(event.target.value))
												}}
												className="w-full accent-primary disabled:cursor-not-allowed disabled:opacity-40"
											/>
											<div className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground">
												<span style={getPresetPreviewStyle(entityHighlightOpacity)}>
													Hansel and Gretel crossed the forest trail.
												</span>
											</div>
										</div>
									</div>
								</div>
							</SettingsSection>
						</TabsContent>

						{/* INTELLIGENCE */}
						<TabsContent value="intelligence" className="mt-0 min-w-0 space-y-6">

							{/* Provider Selector */}
							<SettingsSection
								title="Writing Assistant"
								description="Connect the assistant you want Draftless to use for weaving and other AI-powered writing help."
							>
							<div className="space-y-3">
								<Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Choose an AI Assistant</Label>
								<Select
									value={provider}
									onValueChange={(value) => {
										if (isAIProvider(value)) {
											setProvider(value)
											setSaved(false)
										}
									}}
								>
									<SelectTrigger className="w-full min-w-0 bg-background border-border">
										<SelectValue placeholder="Choose an assistant" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="google">Google Gemini (easiest to get started)</SelectItem>
										<SelectItem value="openai">OpenAI (GPT-4o)</SelectItem>
										<SelectItem value="anthropic">Anthropic (Claude 3.5 Sonnet)</SelectItem>
									</SelectContent>
								</Select>
							</div>
							</SettingsSection>

							{/* API Keys */}
							<SettingsSection
								title="Connected Keys"
								description="These stay in this browser and apply to the next AI action without reloading Draftless."
							>
							<div className="space-y-4">
								<div className="space-y-2">
									<Label className="text-xs">Google Gemini Key</Label>
									<Input type="password" value={keys.google} onChange={(e) => {
										setSaved(false)
										setKeys({...keys, google: e.target.value})
									}} className="font-mono text-xs bg-background" placeholder="AIzaSy..." />
								</div>
								<div className="space-y-2">
									<Label className="text-xs">OpenAI Key</Label>
									<Input type="password" value={keys.openai} onChange={(e) => {
										setSaved(false)
										setKeys({...keys, openai: e.target.value})
									}} className="font-mono text-xs bg-background" placeholder="sk-..." />
								</div>
								<div className="space-y-2">
									<Label className="text-xs">Anthropic Key</Label>
									<Input type="password" value={keys.anthropic} onChange={(e) => {
										setSaved(false)
										setKeys({...keys, anthropic: e.target.value})
									}} className="font-mono text-xs bg-background" placeholder="sk-ant-..." />
								</div>

								<div className="flex items-center justify-between pt-2">
									<div className="text-[11px] text-muted-foreground">
										Changes apply to the next AI action. No reload needed.
									</div>
									<Button size="sm" onClick={handleSave} className="bg-primary text-primary-foreground hover:bg-primary/90">
										{saved ? <CheckCircle2 className="w-4 h-4 mr-2" /> : null}
										{saved ? 'Saved' : 'Save Preferences'}
									</Button>
								</div>
							</div>
							</SettingsSection>

							{/* Security Notice */}
							<div className="rounded-xl border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 p-4 flex gap-3">
								<ShieldAlert className="w-5 h-5 text-yellow-600 dark:text-yellow-400 shrink-0" />
								<div className="space-y-1">
									<p className="text-xs font-medium text-yellow-800 dark:text-yellow-300">Stored In This Browser</p>
									<p className="text-[10px] text-yellow-700 dark:text-yellow-400 leading-relaxed">
										Your keys stay in this browser and go directly to the AI service you choose.
										<strong> Note:</strong> Some services may block direct browser access. If that happens, use Gemini or connect through a proxy.
									</p>
								</div>
							</div>

						</TabsContent>
						</div>
					</div>
				</Tabs>

				{/* Footer */}
				<div className="shrink-0 px-6 py-4 bg-muted/10 border-t border-border flex items-center justify-between">
					<div className="flex flex-col gap-0.5">
						<span className="text-xs font-medium text-foreground">DraftLess for Writers</span>
						<div className="flex items-center gap-1.5 text-muted-foreground">
							<MonitorSmartphone className="w-3 h-3" />
							<span className="text-[10px] font-mono">v0.9.0-beta</span>
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
			type="button"
			onClick={onClick}
			className={`flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border px-3 py-4 text-center transition-all ${
				active
					? 'border-primary bg-primary/8 text-foreground shadow-sm'
					: 'border-border bg-background text-muted-foreground hover:border-primary/30 hover:bg-muted/30 hover:text-foreground'
			}`}
		>
			<div className={active ? 'text-primary' : 'text-muted-foreground'}>{icon}</div>
			<span className="text-xs font-medium">{label}</span>
		</button>
	)
}

function SettingsSection({
	title,
	description,
	children,
}: {
	title: string
	description: string
	children: ReactNode
}) {
	return (
		<section className="space-y-4 rounded-2xl border border-border bg-muted/15 p-4 sm:p-5">
			<div className="space-y-1">
				<h3 className="text-sm font-semibold text-foreground">{title}</h3>
				<p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
			</div>
			{children}
		</section>
	)
}

function SettingsNavTrigger({
	value,
	title,
	description,
	icon,
}: {
	value: 'appearance' | 'intelligence'
	title: string
	description: string
	icon: ReactNode
}) {
	return (
		<TabsTrigger
			value={value}
			className="h-auto items-start justify-start rounded-xl border border-transparent px-3 py-3 text-left data-[state=active]:border-border data-[state=active]:bg-card data-[state=active]:shadow-sm"
		>
			<span className="mt-0.5 text-muted-foreground">{icon}</span>
			<span className="min-w-0 space-y-1">
				<span className="block text-sm font-medium text-foreground">{title}</span>
				<span className="block whitespace-normal text-xs leading-relaxed text-muted-foreground">
					{description}
				</span>
			</span>
		</TabsTrigger>
	)
}

function VisibilityChoice({
	label,
	icon,
	active,
	onClick,
}: {
	label: string
	icon: ReactNode
	active: boolean
	onClick: () => void
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`rounded-xl border px-3 py-3 text-left transition-colors ${
				active
					? 'border-primary bg-primary/8 text-foreground shadow-sm'
					: 'border-border bg-background text-foreground hover:border-primary/30 hover:bg-muted/30'
			}`}
		>
			<div className="flex items-center gap-2 text-sm font-medium">
				<span className={active ? 'text-primary' : 'text-muted-foreground'}>{icon}</span>
				<span>{label}</span>
			</div>
		</button>
	)
}

function HighlightPresetCard({
	label,
	active,
	onClick,
}: {
	label: string
	active: boolean
	onClick: () => void
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`rounded-xl border px-3 py-3 text-left transition-colors ${
				active
					? 'border-primary bg-primary/8 text-foreground shadow-sm'
					: 'border-border bg-background text-foreground hover:border-primary/30 hover:bg-muted/30'
			}`}
		>
			<div className="text-sm font-medium">{label}</div>
		</button>
	)
}

function getPresetPreviewStyle(opacity: number): CSSProperties {
	const lineOpacity = Math.min(100, Math.round(24 + opacity * 0.76))
	const textOpacity = Math.min(30, Math.round(opacity * 0.26))
	const bandOpacity = Math.min(18, Math.round(opacity * 0.16))
	const lineSize = opacity >= 80 ? '2px' : opacity >= 45 ? '1.5px' : '1px'

	return {
		color: `color-mix(in srgb, var(--foreground) ${100 - textOpacity}%, var(--primary) ${textOpacity}%)`,
		textDecorationLine: 'underline',
		textDecorationStyle: 'solid',
		textDecorationThickness: lineSize,
		textUnderlineOffset: '0.14em',
		textDecorationColor: `color-mix(in srgb, var(--primary) ${lineOpacity}%, transparent)`,
		backgroundImage: `linear-gradient(to top, color-mix(in srgb, var(--primary) ${bandOpacity}%, transparent) 0, color-mix(in srgb, var(--primary) ${bandOpacity}%, transparent) 0.22em, transparent 0.22em)`,
		backgroundRepeat: 'no-repeat',
	}
}
