export interface DiffSegment {
	text: string
	type: 'same' | 'added' | 'removed'
}

export interface SnapshotDiffRow {
	id: string
	type: 'same' | 'changed' | 'added' | 'removed'
	leftSegments: DiffSegment[]
	rightSegments: DiffSegment[]
}

export interface SnapshotDiffSummary {
	addedWords: number
	removedWords: number
	changedRows: number
	unchangedRows: number
}

export interface SnapshotDiffResult {
	rows: SnapshotDiffRow[]
	summary: SnapshotDiffSummary
}

interface ParagraphOp {
	type: 'same' | 'added' | 'removed'
	text: string
}

export function buildSnapshotDiff(beforeText: string, afterText: string): SnapshotDiffResult {
	const beforeParagraphs = splitParagraphs(beforeText)
	const afterParagraphs = splitParagraphs(afterText)
	const paragraphOps = buildDiffOperations(beforeParagraphs, afterParagraphs)
	const rows: SnapshotDiffRow[] = []

	let rowIndex = 0
	for (let index = 0; index < paragraphOps.length; index += 1) {
		const operation = paragraphOps[index]

		if (operation.type === 'same') {
			rows.push({
				id: `row-${rowIndex}`,
				type: 'same',
				leftSegments: [{ text: operation.text, type: 'same' }],
				rightSegments: [{ text: operation.text, type: 'same' }],
			})
			rowIndex += 1
			continue
		}

		const beforeGroup: string[] = []
		const afterGroup: string[] = []

		while (index < paragraphOps.length && paragraphOps[index].type !== 'same') {
			const nextOperation = paragraphOps[index]
			if (nextOperation.type === 'removed') {
				beforeGroup.push(nextOperation.text)
			} else {
				afterGroup.push(nextOperation.text)
			}
			index += 1
		}
		index -= 1

		if (beforeGroup.length === 1 && afterGroup.length === 1) {
			const wordDiff = buildWordDiff(beforeGroup[0], afterGroup[0])
			rows.push({
				id: `row-${rowIndex}`,
				type: 'changed',
				leftSegments: wordDiff.leftSegments,
				rightSegments: wordDiff.rightSegments,
			})
			rowIndex += 1
			continue
		}

		rows.push({
			id: `row-${rowIndex}`,
			type: beforeGroup.length > 0 && afterGroup.length > 0 ? 'changed' : beforeGroup.length > 0 ? 'removed' : 'added',
			leftSegments:
				beforeGroup.length > 0
					? [{ text: beforeGroup.join('\n\n'), type: 'removed' }]
					: [],
			rightSegments:
				afterGroup.length > 0
					? [{ text: afterGroup.join('\n\n'), type: 'added' }]
					: [],
		})
		rowIndex += 1
	}

	return {
		rows,
		summary: {
			addedWords: rows.reduce((count, row) => count + countWordsForType(row.rightSegments, 'added'), 0),
			removedWords: rows.reduce((count, row) => count + countWordsForType(row.leftSegments, 'removed'), 0),
			changedRows: rows.filter((row) => row.type !== 'same').length,
			unchangedRows: rows.filter((row) => row.type === 'same').length,
		},
	}
}

function splitParagraphs(value: string): string[] {
	return value
		.trim()
		.split(/\n{2,}/)
		.map((paragraph) => paragraph.trim())
		.filter(Boolean)
}

function buildWordDiff(beforeText: string, afterText: string): { leftSegments: DiffSegment[]; rightSegments: DiffSegment[] } {
	const beforeTokens = tokenize(beforeText)
	const afterTokens = tokenize(afterText)
	const tokenOps = buildDiffOperations(beforeTokens, afterTokens)

	const leftSegments = mergeSegments(
		tokenOps
			.filter((operation) => operation.type !== 'added')
			.map((operation) => ({
				text: operation.text,
				type: operation.type === 'removed' ? 'removed' : 'same',
			})),
	)
	const rightSegments = mergeSegments(
		tokenOps
			.filter((operation) => operation.type !== 'removed')
			.map((operation) => ({
				text: operation.text,
				type: operation.type === 'added' ? 'added' : 'same',
			})),
	)

	return { leftSegments, rightSegments }
}

function tokenize(value: string): string[] {
	return value.match(/\s+|[^\s]+/g) ?? []
}

function buildDiffOperations(valuesA: string[], valuesB: string[]): ParagraphOp[] {
	const lcsTable = buildLcsTable(valuesA, valuesB)
	const operations: ParagraphOp[] = []

	let indexA = 0
	let indexB = 0

	while (indexA < valuesA.length && indexB < valuesB.length) {
		if (valuesA[indexA] === valuesB[indexB]) {
			operations.push({ type: 'same', text: valuesA[indexA] })
			indexA += 1
			indexB += 1
			continue
		}

		if (lcsTable[indexA + 1][indexB] >= lcsTable[indexA][indexB + 1]) {
			operations.push({ type: 'removed', text: valuesA[indexA] })
			indexA += 1
		} else {
			operations.push({ type: 'added', text: valuesB[indexB] })
			indexB += 1
		}
	}

	while (indexA < valuesA.length) {
		operations.push({ type: 'removed', text: valuesA[indexA] })
		indexA += 1
	}

	while (indexB < valuesB.length) {
		operations.push({ type: 'added', text: valuesB[indexB] })
		indexB += 1
	}

	return operations
}

function buildLcsTable(valuesA: string[], valuesB: string[]): number[][] {
	const table = Array.from({ length: valuesA.length + 1 }, () => Array(valuesB.length + 1).fill(0))

	for (let indexA = valuesA.length - 1; indexA >= 0; indexA -= 1) {
		for (let indexB = valuesB.length - 1; indexB >= 0; indexB -= 1) {
			table[indexA][indexB] =
				valuesA[indexA] === valuesB[indexB]
					? table[indexA + 1][indexB + 1] + 1
					: Math.max(table[indexA + 1][indexB], table[indexA][indexB + 1])
		}
	}

	return table
}

function mergeSegments(segments: DiffSegment[]): DiffSegment[] {
	return segments.reduce<DiffSegment[]>((mergedSegments, segment) => {
		if (!segment.text) return mergedSegments

		const lastSegment = mergedSegments[mergedSegments.length - 1]
		if (lastSegment && lastSegment.type === segment.type) {
			lastSegment.text += segment.text
			return mergedSegments
		}

		mergedSegments.push({ ...segment })
		return mergedSegments
	}, [])
}

function countWordsForType(segments: DiffSegment[], targetType: DiffSegment['type']): number {
	return segments.reduce((count, segment) => {
		if (segment.type !== targetType) return count
		return count + (segment.text.match(/\S+/g)?.length ?? 0)
	}, 0)
}
