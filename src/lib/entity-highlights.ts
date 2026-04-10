export type EntityHighlightVisibility = 'visible' | 'hidden'
export type EntityHighlightPresetId = 'hidden' | 'subtle' | 'balanced' | 'strong'
export interface EntityHighlightPreset {
	id: EntityHighlightPresetId
	label: string
	description: string
	visibility: EntityHighlightVisibility
	opacity: number
}

const ENTITY_HIGHLIGHT_VISIBILITY_KEY = 'entity_highlight_visibility'
const ENTITY_HIGHLIGHT_OPACITY_KEY = 'entity_highlight_opacity'

export const DEFAULT_ENTITY_HIGHLIGHT_VISIBILITY: EntityHighlightVisibility = 'visible'
export const DEFAULT_ENTITY_HIGHLIGHT_OPACITY = 58
export const ENTITY_HIGHLIGHT_PRESETS: EntityHighlightPreset[] = [
	{
		id: 'hidden',
		label: 'Hidden',
		description: 'No codex color in the draft',
		visibility: 'hidden',
		opacity: DEFAULT_ENTITY_HIGHLIGHT_OPACITY,
	},
	{
		id: 'subtle',
		label: 'Subtle',
		description: 'A very quiet reference cue',
		visibility: 'visible',
		opacity: 28,
	},
	{
		id: 'balanced',
		label: 'Balanced',
		description: 'Easy to notice without taking over',
		visibility: 'visible',
		opacity: DEFAULT_ENTITY_HIGHLIGHT_OPACITY,
	},
	{
		id: 'strong',
		label: 'Strong',
		description: 'Bold enough to spot at a glance',
		visibility: 'visible',
		opacity: 100,
	},
]

export function getInitialEntityHighlightVisibility(): EntityHighlightVisibility {
	const storedVisibility = localStorage.getItem(ENTITY_HIGHLIGHT_VISIBILITY_KEY)
	return storedVisibility === 'hidden' ? 'hidden' : DEFAULT_ENTITY_HIGHLIGHT_VISIBILITY
}

export function getInitialEntityHighlightOpacity(): number {
	const storedOpacity = Number(localStorage.getItem(ENTITY_HIGHLIGHT_OPACITY_KEY))
	if (!Number.isFinite(storedOpacity)) return DEFAULT_ENTITY_HIGHLIGHT_OPACITY
	return clampEntityHighlightOpacity(storedOpacity)
}

export function applyEntityHighlightPreferences(preferences: {
	visibility: EntityHighlightVisibility
	opacity: number
}) {
	const root = window.document.documentElement
	const opacity = clampEntityHighlightOpacity(preferences.opacity)
	const lineOpacity = Math.min(100, Math.round(24 + opacity * 0.76))
	const hoverLineOpacity = Math.min(100, lineOpacity + 16)
	const textOpacity = Math.min(30, Math.round(opacity * 0.26))
	const hoverTextOpacity = Math.min(42, textOpacity + 12)
	const bandOpacity = Math.min(18, Math.round(opacity * 0.16))
	const hoverBandOpacity = Math.min(26, bandOpacity + 8)
	const lineSize = opacity >= 80 ? '2px' : opacity >= 45 ? '1.5px' : '1px'

	root.dataset.entityHighlights = preferences.visibility
	root.style.setProperty('--entity-highlight-line-opacity', `${lineOpacity}%`)
	root.style.setProperty('--entity-highlight-hover-line-opacity', `${hoverLineOpacity}%`)
	root.style.setProperty('--entity-highlight-text-opacity', `${textOpacity}%`)
	root.style.setProperty('--entity-highlight-hover-text-opacity', `${hoverTextOpacity}%`)
	root.style.setProperty('--entity-highlight-band-opacity', `${bandOpacity}%`)
	root.style.setProperty('--entity-highlight-hover-band-opacity', `${hoverBandOpacity}%`)
	root.style.setProperty('--entity-highlight-line-size', lineSize)
}

export function persistEntityHighlightPreferences(preferences: {
	visibility: EntityHighlightVisibility
	opacity: number
}) {
	const opacity = clampEntityHighlightOpacity(preferences.opacity)
	localStorage.setItem(ENTITY_HIGHLIGHT_VISIBILITY_KEY, preferences.visibility)
	localStorage.setItem(ENTITY_HIGHLIGHT_OPACITY_KEY, String(opacity))
	applyEntityHighlightPreferences({
		visibility: preferences.visibility,
		opacity,
	})
}

export function getEntityHighlightPresetId(preferences: {
	visibility: EntityHighlightVisibility
	opacity: number
}): EntityHighlightPresetId | null {
	if (preferences.visibility === 'hidden') return 'hidden'

	const opacity = clampEntityHighlightOpacity(preferences.opacity)
	const preset = ENTITY_HIGHLIGHT_PRESETS.find(
		(candidate) => candidate.visibility === 'visible' && candidate.opacity === opacity,
	)

	return preset?.id ?? null
}

function clampEntityHighlightOpacity(value: number): number {
	return Math.min(100, Math.max(0, Math.round(value)))
}
