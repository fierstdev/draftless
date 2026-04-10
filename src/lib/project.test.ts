import { describe, expect, it } from 'vitest'
import {
	DEFAULT_PROJECT_FILE_FILTERS,
	areProjectFileFiltersEqual,
	getProjectFileFilterSummary,
	normalizeProjectFileFilters,
	projectFileMatchesFilters,
	type ProjectFile,
} from './project'

describe('project file filters', () => {
	const chapter: ProjectFile = {
		id: 'chapter-1',
		title: 'White Pebbles in the Moonlight',
		type: 'chapter',
		order: 1,
		updatedAt: Date.now(),
		metadata: {
			status: 'revising',
			pov: 'Hansel',
			location: 'Great Forest',
			timeline: 'Night of the first leaving',
			goal: 'Lead Gretel home.',
		},
	}

	it('normalizes partial filter input into safe defaults', () => {
		expect(
			normalizeProjectFileFilters({
				query: '  moonlight  ',
				type: 'chapter',
				status: 'revising',
				pov: ' Hansel ',
			}),
		).toEqual({
			query: 'moonlight',
			type: 'chapter',
			status: 'revising',
			pov: 'Hansel',
			location: '',
		})
	})

	it('matches files against writer-first metadata filters', () => {
		expect(
			projectFileMatchesFilters(chapter, {
				...DEFAULT_PROJECT_FILE_FILTERS,
				status: 'revising',
				pov: 'hansel',
				location: 'great forest',
			}),
		).toBe(true)

		expect(
			projectFileMatchesFilters(chapter, {
				...DEFAULT_PROJECT_FILE_FILTERS,
				status: 'final',
			}),
		).toBe(false)
	})

	it('builds readable summaries for saved filters', () => {
		expect(
			getProjectFileFilterSummary({
				query: 'forest',
				type: 'chapter',
				status: 'revising',
				pov: 'Hansel',
				location: 'Great Forest',
			}),
		).toBe('Chapters • Revising • POV Hansel • Great Forest • Search "forest"')
	})

	it('compares filter sets exactly', () => {
		const left = {
			query: '',
			type: 'all',
			status: 'all',
			pov: '',
			location: '',
		} as const

		expect(areProjectFileFiltersEqual(left, DEFAULT_PROJECT_FILE_FILTERS)).toBe(true)
		expect(
			areProjectFileFiltersEqual(left, {
				...DEFAULT_PROJECT_FILE_FILTERS,
				query: 'hansel',
			}),
		).toBe(false)
	})
})
