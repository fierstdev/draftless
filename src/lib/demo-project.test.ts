import { describe, expect, it } from 'vitest'
import { getShowcaseDemoSnapshotText, getShowcaseDemoStats } from './demo-project'

describe('showcase demo blueprint', () => {
	it('stays rich enough to showcase Draftless features', () => {
		expect(getShowcaseDemoStats()).toEqual({
			chapterCount: 4,
			noteCount: 4,
			snapshotCount: 35,
			savedViewCount: 5,
			codexEntryCount: 19,
		})
	})

	it('stores full draft states for seeded chapter snapshots', () => {
		const pebblesSnapshot = getShowcaseDemoSnapshotText('pebbles')

		expect(pebblesSnapshot).toContain('Hard by a great forest dwelt a poor wood-cutter')
		expect(pebblesSnapshot).toContain('The moon shone brightly, and the white pebbles')
		expect(pebblesSnapshot).toContain('When day dawned, but before the sun had risen')
	})

	it('preserves alternate branch writing for what-if versions', () => {
		const branchSnapshot = getShowcaseDemoSnapshotText('what-if-father-turns-back')

		expect(branchSnapshot).toContain('Before the children slept, the father returned')
		expect(branchSnapshot).toContain('Hansel still kept the white pebbles in his pocket')
	})
})
