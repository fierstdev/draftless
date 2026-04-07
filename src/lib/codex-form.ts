import type { EntityType } from './codex'

export interface CodexEntityFormState {
	name: string
	type: EntityType
	description: string
	aliasesText: string
}

export const EMPTY_ENTITY_FORM: CodexEntityFormState = {
	name: '',
	type: 'character',
	description: '',
	aliasesText: '',
}
