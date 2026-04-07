import { Editor, type JSONContent } from '@tiptap/core'
import Collaboration from '@tiptap/extension-collaboration'
import StarterKit from '@tiptap/starter-kit'
import { IndexeddbPersistence } from 'y-indexeddb'
import * as Y from 'yjs'
import { CodexManager, getEntityColor, type EntityType } from './codex'
import { getFileDbName, getProjectDbName, waitForProviderSync } from './persistence'
import {
	ProjectManager,
	type EditableFileType,
	type ProjectFileMetadata,
} from './project'
import { openSnapshotsDb } from './snapshots'
import { getPlainTextFromContent } from './tiptap-text'

export const DEMO_PROJECT_TITLE = 'The Neon Protocol (Showcase Demo)'

interface DemoCodexSeed {
	name: string
	type: EntityType
	description: string
	aliases?: string[]
}

interface DemoSnapshotSeed {
	key: string
	description: string
	content: JSONContent
	parentKey?: string | null
	minutesAgo: number
}

interface DemoFileSeed {
	title: string
	type: EditableFileType
	metadata?: ProjectFileMetadata
	content: JSONContent
	snapshots?: DemoSnapshotSeed[]
}

const DEMO_CODEX: DemoCodexSeed[] = [
	{
		name: 'Rook',
		type: 'character',
		description: 'A burned-out intrusion specialist whose chrome arm jitters whenever he lies to himself.',
		aliases: ['Elias Rook', 'Ghostline'],
	},
	{
		name: 'Mara Voss',
		type: 'character',
		description: 'Broker, fixer, and professional manipulator. She never asks for loyalty, only leverage.',
		aliases: ['Mara', 'The Broker'],
	},
	{
		name: 'Director Vale',
		type: 'character',
		description: 'The public face of Helix Security and the private architect of the Quiet Choir surveillance net.',
		aliases: ['Vale'],
	},
	{
		name: 'Sector 4',
		type: 'location',
		description: 'An industrial labyrinth of coolant towers, freight lines, and permanent warm rain.',
		aliases: ['The Boiler District'],
	},
	{
		name: 'Helix Tower',
		type: 'location',
		description: 'A glass needle above the district where Helix stores its clean lies and dirty prototypes.',
		aliases: ['The Glass Needle'],
	},
	{
		name: 'Ghostkey',
		type: 'item',
		description: 'A crystalline access token that can wake dormant systems without tripping modern alarms.',
		aliases: ['Keyglass'],
	},
	{
		name: 'Neon Protocol',
		type: 'lore',
		description: 'A classified Helix initiative rumored to bind predictive AI, biometric archives, and live city telemetry.',
		aliases: ['Protocol'],
	},
	{
		name: 'Quiet Choir',
		type: 'lore',
		description: 'A citywide sensor web that turns idle infrastructure into one enormous listening device.',
		aliases: ['Choir'],
	},
]

const DEMO_FILES: DemoFileSeed[] = [
	{
		title: 'The Infiltration',
		type: 'chapter',
		metadata: {
			status: 'revising',
			pov: 'Rook',
			location: 'Sector 4',
			timeline: 'Night One, 23:10',
			goal: 'Steal the Ghostkey without exposing Mara Voss.',
		},
		content: doc(
			heading(1, 'Chapter 1'),
			paragraph('The rain in Sector 4 never really touched the ground; it turned to steam halfway down and wrapped the freight pylons in a feverish haze. Rook moved through it with one hand in his coat pocket and the other flexing chrome fingers around a stolen passcard that would not survive a real inspection.'),
			paragraph('Mara Voss had sold him the job in twelve words and a smile: take the Ghostkey, leave no cameras alive, and do not improvise. That last instruction was already dead. The courier changed routes, Helix doubled patrols near the boiler doors, and somewhere above the district Helix Tower glittered like a threat pretending to be architecture.'),
			blockquote('If the Glass Needle starts listening, burn the plan and trust your legs. — Mara Voss'),
			paragraph('A transmission hissed against his comm bead. Not Mara. Not Vale either. The voice was flattened, prayerful, almost kind. The Quiet Choir is awake, Ghostline. Go gentle. Rook killed the channel, but the phrase lodged under his ribs. No one should have used that alias except people he buried years ago.'),
			paragraph('He slipped through a maintenance breach beside the condenser stacks and found the courier already dying against a hot pipe, palm fused around a translucent shard the size of a prayer token. The Ghostkey pulsed once when Rook touched it. Deep in the district, alarms stayed silent. That was worse than hearing them.'),
		),
		snapshots: [
			{
				key: 'arrival',
				description: 'Saved Version: Rainy Arrival',
				parentKey: null,
				minutesAgo: 135,
				content: doc(
					paragraph('Rain steamed off the ducts in Sector 4 while Rook counted patrol lights and reminded himself the job was still simple. Get in. Take the Ghostkey. Get out before Helix noticed a missing breath.'),
					paragraph('Mara Voss had called the district sleepy at this hour. She was wrong, or lying, or both.'),
				),
			},
			{
				key: 'boiler-door',
				description: 'Saved Version: Boiler Door',
				parentKey: 'arrival',
				minutesAgo: 118,
				content: doc(
					paragraph('The boiler door recognized the stolen passcard, thought about it, then opened with a sigh that sounded too much like a witness.'),
					paragraph('Rook kept low and followed the sound of coolant pumps toward the courier route Mara marked in red.'),
				),
			},
			{
				key: 'service-lift',
				description: 'What If: Service Lift Route',
				parentKey: 'arrival',
				minutesAgo: 102,
				content: doc(
					paragraph('Instead of the boiler corridor, Rook took the service lift and rose straight into Helix traffic. It was faster, brighter, and immediately wrong.'),
					paragraph('When the lift doors opened, a camera pivoted toward him like it had been waiting all night.'),
				),
			},
			{
				key: 'ghostkey-contact',
				description: 'Saved Version: Ghostkey Contact',
				parentKey: 'boiler-door',
				minutesAgo: 80,
				content: doc(
					paragraph('The courier was already dead when Rook found him, folded into the hot pipework like someone had tried to hide a confession inside the machinery.'),
					paragraph('The Ghostkey warmed his chrome palm the instant he touched it. Somewhere overhead, the Quiet Choir changed key.'),
				),
			},
		],
	},
	{
		title: 'A Voice in the Glass',
		type: 'chapter',
		metadata: {
			status: 'draft',
			pov: 'Mara Voss',
			location: 'Helix Tower',
			timeline: 'Night One, 23:44',
			goal: 'Decide whether to save Rook or sell him to Director Vale.',
		},
		content: doc(
			heading(1, 'Chapter 2'),
			paragraph('Mara Voss watched Sector 4 through Helix Tower glass that cost more than most families made in a year. Down below, steam moved through the alleys like restless ghosts, and somewhere inside it Rook was either proving she had bet correctly or confirming every warning she had ever ignored.'),
			paragraph('Director Vale stood beside the projection wall with his hands folded behind his back, posture perfect, expression surgically mild. He kept talking about risk models and managed outcomes while the city map lit with Choir pings around the courier route. Mara heard the real message underneath: tell me where your thief will run, and I might let him keep breathing.'),
			paragraph('She smiled like a woman in control and fed Vale a partial truth. Rook never ran where he was expected. He ran toward the one secret in the room no one else thought he deserved.'),
			paragraph('Then the wall flashed a phrase that should not have existed in Helix systems at all: NEON PROTOCOL HANDSHAKE ACCEPTED. Mara stopped smiling. Whatever the Ghostkey had opened, it had not been built for a simple theft.'),
		),
		snapshots: [
			{
				key: 'tower-observation',
				description: 'Saved Version: Tower Observation',
				parentKey: null,
				minutesAgo: 74,
				content: doc(
					paragraph('From Helix Tower, Sector 4 looked manageable. That was why rich people liked height: it turned suffering into geometry.'),
					paragraph('Mara kept her eyes on the courier route and refused to imagine Rook failing in public.'),
				),
			},
			{
				key: 'vale-pressure',
				description: 'Saved Version: Vale Applies Pressure',
				parentKey: 'tower-observation',
				minutesAgo: 61,
				content: doc(
					paragraph('Director Vale asked only one question, which meant it was the one that mattered: If your thief survives, who does he belong to next?'),
					paragraph('Mara answered with a laugh sharp enough to sound like strategy.'),
				),
			},
			{
				key: 'mara-betrays',
				description: 'What If: Mara Sells Rook Out',
				parentKey: 'tower-observation',
				minutesAgo: 52,
				content: doc(
					paragraph('She gave Vale the lift path, the condenser blind spot, and the timing of the patrol rotation.'),
					paragraph('The moment the words left her mouth, she knew betrayal felt less like power than paperwork.'),
				),
			},
		],
	},
	{
		title: 'The Protocol Room',
		type: 'chapter',
		metadata: {
			status: 'draft',
			pov: 'Rook',
			location: 'Protocol Vault',
			timeline: 'Night Two, 00:15',
			goal: 'Learn whether the Neon Protocol is a machine, a memory archive, or a weapon.',
		},
		content: doc(
			heading(1, 'Chapter 3'),
			paragraph('The vault under Helix Tower did not look like a weapon room. It looked like a chapel. White light fell through concentric rings of glass and onto a console grown around the Ghostkey’s shape like the city had been waiting for the shard to come home.'),
			paragraph('When Rook seated the Ghostkey, the room answered in Mara’s voice first, then Vale’s, then a hundred strangers filed into the same sentence. The Neon Protocol was not a device. It was a predictive memory engine trained on everyone Helix had ever been allowed to watch.'),
			paragraph('At the center of the projection, the Quiet Choir rendered the district as a breathing nervous system. Sector 4 glowed brightest around the places people still lied to survive. Rook stared until he saw his own alias tagged inside the model: Ghostline, anomaly vector, unresolved.'),
			paragraph('He finally understood why Mara wanted the key and why Vale wanted him alive. Both of them needed someone who still knew how to choose chaos on purpose.'),
		),
		snapshots: [
			{
				key: 'vault-entry',
				description: 'Saved Version: Enter the Vault',
				parentKey: null,
				minutesAgo: 38,
				content: doc(
					paragraph('The protocol vault opened like a held breath. Rook stepped inside and immediately regretted every plan that brought him there.'),
				),
			},
		],
	},
	{
		title: 'Ops Brief',
		type: 'note',
		metadata: {
			status: 'final',
			location: 'Sector 4',
			timeline: 'Prep',
			goal: 'Track mission objectives, leverage, and open risks.',
		},
		content: doc(
			heading(2, 'Primary Objectives'),
			bulletList([
				'Recover the Ghostkey before Director Vale can fold it back into Helix custody.',
				'Verify whether the Neon Protocol is a system, a person, or a blackmail archive.',
				'Keep Mara Voss uncertain enough to stay useful.',
			]),
			heading(2, 'Operational Risks'),
			bulletList([
				'The Quiet Choir can turn pipes, streetlights, and lift shafts into live sensors.',
				'Rook\'s alias "Ghostline" may already be circulating inside Helix Tower.',
				'Sector 4 patrol density spikes whenever Helix moves prototype hardware.',
			]),
			heading(2, 'Open Questions'),
			bulletList([
				'Who killed the courier before Rook arrived?',
				'Why did the Ghostkey accept Rook without challenge?',
				'What does Mara know about Vale that she still refuses to say aloud?',
			]),
		),
	},
	{
		title: 'Codex Threads',
		type: 'note',
		metadata: {
			status: 'revising',
			goal: 'Track aliases, trust shifts, and search hooks for the codex.',
		},
		content: doc(
			heading(2, 'Alias Cross-References'),
			bulletList([
				'Rook = Elias Rook = Ghostline',
				'Mara Voss = Mara = The Broker',
				'Helix Tower = The Glass Needle',
				'Ghostkey = Keyglass',
			]),
			heading(2, 'Relationship Pressure'),
			paragraph('Mara needs Rook competent but dependent. Vale needs Rook frightened but alive. The Quiet Choir treats him like an old missing thread in a pattern someone forgot to erase.'),
			heading(2, 'Search Prompts'),
			bulletList([
				'Find every reference to Ghostline to see where the alias surfaces before Rook admits it.',
				'Search for Protocol or Neon Protocol to compare rumor versus reveal.',
				'Filter chapters by POV and timeline to keep the Night One sequence aligned.',
			]),
		),
	},
]

export async function seedShowcaseDemoProject(storyId: string): Promise<number> {
	const projectDoc = new Y.Doc()
	const projectProvider = new IndexeddbPersistence(getProjectDbName(storyId), projectDoc)

	try {
		await waitForProviderSync(projectProvider)

		const codex = new CodexManager(projectDoc)
		for (const entity of DEMO_CODEX) {
			codex.add({
				name: entity.name,
				type: entity.type,
				description: entity.description,
				aliases: entity.aliases ?? [],
				color: getEntityColor(entity.type),
			})
		}

		const projectManager = new ProjectManager(projectDoc)
		let totalWordCount = 0

		for (const fileSeed of DEMO_FILES) {
			const fileId = projectManager.create(fileSeed.title, fileSeed.type, fileSeed.metadata)
			await writeDemoFile(fileId, fileSeed.content)
			totalWordCount += countWords(fileSeed.content)

			if (fileSeed.snapshots && fileSeed.snapshots.length > 0) {
				await writeDemoSnapshots(fileId, fileSeed.snapshots)
			}
		}

		return totalWordCount
	} finally {
		await projectProvider.destroy()
		projectDoc.destroy()
	}
}

async function writeDemoFile(fileId: string, content: JSONContent): Promise<void> {
	const ydoc = new Y.Doc()
	const provider = new IndexeddbPersistence(getFileDbName(fileId), ydoc)

	try {
		await waitForProviderSync(provider)
		const editor = new Editor({
			extensions: [
				StarterKit,
				Collaboration.configure({ document: ydoc }),
			],
		})

		try {
			editor.commands.setContent(content)
			await new Promise((resolve) => window.setTimeout(resolve, 0))
		} finally {
			editor.destroy()
		}
	} finally {
		await provider.destroy()
		ydoc.destroy()
	}
}

async function writeDemoSnapshots(fileId: string, snapshots: DemoSnapshotSeed[]): Promise<void> {
	const db = await openSnapshotsDb(fileId)

	try {
		const snapshotIds = new Map<string, string>()
		const now = Date.now()

		for (const snapshot of snapshots) {
			const id = crypto.randomUUID()
			snapshotIds.set(snapshot.key, id)
			await db.put('snapshots', {
				id,
				timestamp: now - snapshot.minutesAgo * 60_000,
				description: snapshot.description,
				content: snapshot.content,
				parentId: snapshot.parentKey ? snapshotIds.get(snapshot.parentKey) ?? null : null,
			})
		}
	} finally {
		db.close()
	}
}

function countWords(content: JSONContent): number {
	const text = getPlainTextFromContent(content).trim()
	if (!text) return 0
	return text.split(/\s+/).filter(Boolean).length
}

function doc(...content: JSONContent[]): JSONContent {
	return { type: 'doc', content }
}

function heading(level: number, text: string): JSONContent {
	return {
		type: 'heading',
		attrs: { level },
		content: [textNode(text)],
	}
}

function paragraph(text: string): JSONContent {
	return {
		type: 'paragraph',
		content: [textNode(text)],
	}
}

function blockquote(text: string): JSONContent {
	return {
		type: 'blockquote',
		content: [paragraph(text)],
	}
}

function bulletList(items: string[]): JSONContent {
	return {
		type: 'bulletList',
		content: items.map((item) => ({
			type: 'listItem',
			content: [paragraph(item)],
		})),
	}
}

function textNode(text: string): JSONContent {
	return { type: 'text', text }
}
