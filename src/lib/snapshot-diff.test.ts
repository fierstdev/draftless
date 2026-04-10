import { describe, expect, it } from 'vitest'
import { buildSnapshotDiff } from './snapshot-diff'

describe('buildSnapshotDiff', () => {
	it('tracks changed rows and added words across drafts', () => {
		const result = buildSnapshotDiff(
			'Hansel dropped white pebbles on the path.\n\nGretel waited by the fire.',
			'Hansel dropped bright white pebbles on the moonlit path.\n\nGretel waited by the fire.\n\nA bird sang above them.',
		)

		expect(result.summary.changedRows).toBe(2)
		expect(result.summary.unchangedRows).toBe(1)
		expect(result.summary.addedWords).toBeGreaterThan(4)
		expect(result.rows[0]?.type).toBe('changed')
		expect(result.rows.at(-1)?.type).toBe('added')
	})
})
