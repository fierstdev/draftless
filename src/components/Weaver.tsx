import { useState, useEffect } from 'react';
import { Check, RefreshCw, ArrowRight, Sparkles, X, Columns, CircuitBoard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerTitle, DrawerFooter, DrawerClose } from '@/components/ui/drawer';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { weaveText, type WeaveStrategy } from '@/lib/ai-client';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';

interface WeaverProps {
	isOpen: boolean;
	onClose: () => void;
	currentText: string;
	checkpointText: string;
	onConfirm: (text: string) => void;
}

export function Weaver({ isOpen, onClose, currentText, checkpointText, onConfirm }: WeaverProps) {
	const [strategy, setStrategy] = useState<WeaveStrategy>('mix');
	const [result, setResult] = useState<string>('');
	const [loading, setLoading] = useState(false);
	const isDesktop = useMediaQuery("(min-width: 768px)");

	useEffect(() => {
		if (isOpen) {
			setResult('');
			setStrategy('mix');
			setLoading(false);
		}
	}, [isOpen]);

	const handleTabChange = (val: string) => {
		setStrategy(val as WeaveStrategy);
		setResult('');
	};

	const handleWeave = async () => {
		setLoading(true);
		try {
			const merged = await weaveText(currentText, checkpointText, strategy);
			setResult(merged);
		} catch (e) {
			setResult("Error: Could not generate weave.");
		}
		setLoading(false);
	};

	return (
		<Drawer open={isOpen} onOpenChange={(open) => !open && onClose()} fadeFromIndex={1} snapPoints={[1]}>
			<DrawerContent className="h-[92vh] max-w-[95vw] mx-auto flex flex-col bg-background outline-none border-t border-border shadow-2xl rounded-t-xl overflow-hidden text-foreground">

				{/* HEADER */}
				<div className="bg-background border-b border-border px-6 py-4 flex items-center justify-between shrink-0 z-20">
					<div className="flex items-center gap-4">
						<DrawerTitle className="flex items-center gap-3 text-lg font-semibold text-foreground">
							<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
								<Sparkles className="h-4 w-4" />
							</div>
							<div className="flex flex-col text-left">
								<span className="leading-none tracking-tight">Semantic Weaver</span>
								<span className="text-[10px] font-bold text-primary uppercase tracking-wider mt-1.5">Merge Studio</span>
							</div>
						</DrawerTitle>
					</div>

					<div className="flex items-center gap-6">
						<Tabs value={strategy} onValueChange={handleTabChange}>
							<TabsList className="bg-muted p-1 h-9 border border-border">
								<TabsTrigger value="mix" className="text-xs px-4 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">Smart Mix</TabsTrigger>
								<TabsTrigger value="action_b_tone_a" className="text-xs px-4 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">Restyle</TabsTrigger>
								<TabsTrigger value="append" className="text-xs px-4 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">Connect</TabsTrigger>
							</TabsList>
						</Tabs>

						<DrawerClose asChild>
							<Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground rounded-full hover:bg-muted">
								<X className="h-5 w-5" />
							</Button>
						</DrawerClose>
					</div>
				</div>

				{/* WORKSPACE */}
				<div className="flex-1 min-h-0 bg-muted/30">
					<ResizablePanelGroup direction={isDesktop ? "horizontal" : "vertical"} className="h-full items-stretch">

						{/* LEFT PANEL */}
						<ResizablePanel defaultSize={35} minSize={20} maxSize={50} className={cn("flex flex-col border-r border-border bg-background", !isDesktop && "hidden")}>
							<div className="flex-1 flex flex-col min-h-0">
								<div className="flex-1 flex flex-col min-h-0 border-b border-border">
									<div className="px-5 py-3 bg-muted/20 border-b border-border flex items-center justify-between shrink-0">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" /> Current Draft
                      </span>
										<Badge variant="secondary" className="text-[10px] h-5">Locked</Badge>
									</div>
									<ScrollArea className="flex-1 overflow-y-auto">
										<div className="p-6 text-sm text-foreground/80 font-serif leading-relaxed whitespace-pre-wrap selection:bg-muted selection:text-foreground">
											{currentText}
										</div>
									</ScrollArea>
								</div>

								<div className="flex-1 flex flex-col min-h-0 bg-primary/5">
									<div className="px-5 py-3 bg-background border-b border-border flex items-center justify-between shrink-0">
                      <span className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" /> Checkpoint
                      </span>
										<Badge variant="outline" className="text-[10px] h-5 bg-background text-primary border-primary/30 font-medium shadow-sm">Source</Badge>
									</div>
									<ScrollArea className="flex-1 overflow-y-auto">
										<div className="p-6 text-sm text-foreground/80 font-serif leading-relaxed whitespace-pre-wrap selection:bg-primary/20">
											{checkpointText}
										</div>
									</ScrollArea>
								</div>
							</div>
						</ResizablePanel>

						<ResizableHandle withHandle className="bg-border hover:bg-primary transition-colors w-1" />

						{/* RIGHT PANEL (RESULT) */}
						<ResizablePanel defaultSize={65}>
							<div className="h-full flex flex-col bg-muted/10">
								<div className="px-6 py-3 border-b border-border bg-background/80 backdrop-blur flex items-center justify-between shrink-0 h-14">
									<div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                             <Columns className="h-3 w-3" />
                          </span>
										<span className="text-xs font-bold text-foreground/80 uppercase tracking-wide">Merged Output</span>
									</div>

									{result && (
										<Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5" onClick={handleWeave}>
											<RefreshCw className="w-3 h-3 mr-1" /> Re-roll
										</Button>
									)}
								</div>

								<div className="flex-1 relative overflow-hidden">
									<ScrollArea className="h-full w-full">
										{loading ? (
											<div className="p-12 max-w-2xl mx-auto space-y-6 opacity-60">
												<div className="space-y-3">
													<Skeleton className="h-4 w-3/4" />
													<Skeleton className="h-4 w-full" />
													<Skeleton className="h-4 w-5/6" />
												</div>
												<div className="space-y-3 pt-4">
													<Skeleton className="h-4 w-full" />
													<Skeleton className="h-4 w-4/5" />
												</div>
												<div className="flex items-center gap-2 justify-center pt-8 text-primary text-xs font-bold uppercase tracking-widest animate-pulse">
													<CircuitBoard className="w-4 h-4" /> Processing...
												</div>
											</div>
										) : result ? (
											<div className="p-10 md:p-16 max-w-4xl mx-auto">
												<div className="prose prose-lg prose-gray dark:prose-invert max-w-none font-serif leading-loose">
													{result}
												</div>
											</div>
										) : (
											<div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-6 p-12 text-center">
												<div className="w-20 h-20 rounded-2xl bg-card shadow-sm border border-border flex items-center justify-center mb-2">
													<ArrowRight className="w-8 h-8 opacity-50" />
												</div>
												<div className="space-y-2 max-w-sm">
													<h3 className="text-base font-semibold text-foreground">Ready to Merge</h3>
													<p className="text-sm">
														Select a strategy from the top bar to begin the AI merge process.
													</p>
												</div>
												<Button onClick={handleWeave} className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground px-8 h-10 rounded-lg shadow-lg transition-all">
													<Sparkles className="w-4 h-4 mr-2" />
													Generate Preview
												</Button>
											</div>
										)}
									</ScrollArea>
								</div>
							</div>
						</ResizablePanel>
					</ResizablePanelGroup>
				</div>

				{/* FOOTER */}
				<DrawerFooter className="bg-background border-t border-border p-4 flex flex-row items-center justify-end gap-3 shrink-0 h-20 z-20">
					<DrawerClose asChild>
						<Button variant="ghost" className="px-6 text-muted-foreground hover:text-foreground">Cancel</Button>
					</DrawerClose>
					{result && (
						<Button onClick={() => onConfirm(result)} className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 h-11 shadow-lg text-sm font-medium">
							<Check className="w-4 h-4 mr-2" />
							Confirm & Merge
						</Button>
					)}
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}