import { Editor, type JSONContent } from '@tiptap/core'
import Collaboration from '@tiptap/extension-collaboration'
import StarterKit from '@tiptap/starter-kit'
import { IndexeddbPersistence } from 'y-indexeddb'
import * as Y from 'yjs'
import { CodexManager, getEntityColor, type EntityType } from './codex'
import { getFileDbName, getProjectDbName, waitForProviderSync } from './persistence'
import {
	ProjectManager,
	ProjectFileViewManager,
	type EditableFileType,
	type ProjectFileFilters,
	type ProjectFileMetadata,
} from './project'
import { openSnapshotsDb } from './snapshots'
import { getPlainTextFromContent } from './tiptap-text'

export const DEMO_PROJECT_TITLE = 'Hansel and Gretel (Grimm Showcase Demo)'

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

interface DemoViewSeed {
	title: string
	filters: Partial<ProjectFileFilters>
}

export interface ShowcaseDemoStats {
	chapterCount: number
	noteCount: number
	snapshotCount: number
	savedViewCount: number
	codexEntryCount: number
}

const DEMO_CODEX: DemoCodexSeed[] = [
	{
		name: 'Hansel',
		type: 'character',
		description: 'The wood-cutter’s son, clever enough to mark a path by moonlight and stubborn enough to keep hope alive in the forest.',
		aliases: ['the boy'],
	},
	{
		name: 'Gretel',
		type: 'character',
		description: 'Hansel’s sister, first the child who shares her bread and then the one who saves them both at the oven.',
		aliases: ['the girl', 'little sister'],
	},
	{
		name: 'The Wood-cutter',
		type: 'character',
		description: 'A poor father driven by famine and fear, too weak to resist cruelty but never free of grief for his children.',
		aliases: ['poor wood-cutter', 'father', 'the man'],
	},
	{
		name: 'Stepmother',
		type: 'character',
		description: 'The hard-hearted wife who insists the children must be abandoned in the forest so the household might survive.',
		aliases: ['wife', 'stepmother', 'the woman'],
	},
	{
		name: 'Witch',
		type: 'character',
		description: 'The old woman in the house of bread who feeds hungry children only to fatten and eat them.',
		aliases: ['old woman', 'wicked witch'],
	},
	{
		name: 'Great Forest',
		type: 'location',
		description: 'The vast wood beside the family’s home, first a place of abandonment, then of enchantment, hunger, and danger.',
		aliases: ['forest', 'wood', 'witch’s forest'],
	},
	{
		name: 'Wood-cutter’s House',
		type: 'location',
		description: 'The poor home at the edge of the forest where hunger begins and where the children finally return.',
		aliases: ['father’s house', 'their father’s house'],
	},
	{
		name: 'House of Bread and Cake',
		type: 'location',
		description: 'The little house built of bread, cakes, and sugar that lures starving children into the witch’s trap.',
		aliases: ['little house', 'house of bread', 'bread house'],
	},
	{
		name: 'Little Stable',
		type: 'location',
		description: 'The grated stable where the witch locks Hansel away while she waits for him to grow fat.',
		aliases: ['stable'],
	},
	{
		name: 'White Pebbles',
		type: 'item',
		description: 'Moon-bright stones Hansel gathers to mark the first path home through the forest.',
		aliases: ['pebbles', 'white pebble-stones'],
	},
	{
		name: 'Bread Crumbs',
		type: 'item',
		description: 'The second trail Hansel makes when the door is locked, fragile enough to be eaten by the birds.',
		aliases: ['crumbs', 'crumbs of bread'],
	},
	{
		name: 'Snow-White Bird',
		type: 'character',
		description: 'A beautiful white bird whose song leads Hansel and Gretel to the house of bread and sugar.',
		aliases: ['beautiful snow-white bird'],
	},
	{
		name: 'White Duck',
		type: 'character',
		description: 'The gentle duck who ferries the children across the water one by one on their way home.',
		aliases: ['little duck'],
	},
	{
		name: 'Oven',
		type: 'item',
		description: 'The heated oven the witch prepares for Gretel and the place where Gretel turns the witch’s plan against her.',
		aliases: ['the oven'],
	},
	{
		name: 'Cauldron',
		type: 'item',
		description: 'The water pot Gretel is forced to hang over the fire on the morning the witch means to cook Hansel.',
		aliases: ['cauldron with the water'],
	},
	{
		name: 'Sugar Window',
		type: 'item',
		description: 'The sweet clear window-pane Gretel nibbles when the children first reach the enchanted house.',
		aliases: ['window-pane', 'clear sugar window'],
	},
	{
		name: 'Pearls and Jewels',
		type: 'item',
		description: 'The treasure packed into pockets and pinafores after the witch dies, ending the family’s hunger.',
		aliases: ['pearls', 'jewels', 'precious stones'],
	},
	{
		name: 'Moonlit Path',
		type: 'lore',
		description: 'The remembered way home revealed by moonlight on Hansel’s white pebbles.',
		aliases: ['moonlight', 'the way home'],
	},
	{
		name: 'Great Dearth',
		type: 'lore',
		description: 'The famine that empties the house, shapes every desperate choice, and sends the children into the forest.',
		aliases: ['dearth', 'hunger'],
	},
]

const DEMO_FILES: DemoFileSeed[] = [
	{
		title: 'White Pebbles in the Moonlight',
		type: 'chapter',
		metadata: {
			status: 'revising',
			pov: 'Hansel',
			location: 'Wood-cutter’s House',
			timeline: 'Night of the first leaving',
			goal: 'Find a path home before the forest swallows the children.',
		},
		content: doc(
			heading(1, 'Hansel and Gretel'),
			paragraph('Hard by a great forest dwelt a poor wood-cutter with his wife and his two children. The boy was called Hansel and the girl Gretel. He had little to bite and to break, and once when great dearth fell on the land, he could no longer procure even daily bread.'),
			paragraph('Now when he thought over this by night in his bed, and tossed about in his anxiety, he groaned and said to his wife: ‘What is to become of us? How are we to feed our poor children, when we no longer have anything even for ourselves?’ ‘I’ll tell you what, husband,’ answered the woman, ‘early tomorrow morning we will take the children out into the forest to where it is the thickest; there we will light a fire for them, and give each of them one more piece of bread, and then we will go to our work and leave them alone. They will not find the way home again, and we shall be rid of them.’'),
			paragraph('‘No, wife,’ said the man, ‘I will not do that; how can I bear to leave my children alone in the forest?—the wild animals would soon come and tear them to pieces.’ ‘O, you fool!’ said she, ‘then we must all four die of hunger, you may as well plane the planks for our coffins,’ and she left him no peace until he consented. ‘But I feel very sorry for the poor children, all the same,’ said the man.'),
			paragraph('The two children had also not been able to sleep for hunger, and had heard what their stepmother had said to their father. Gretel wept bitter tears, and said to Hansel: ‘Now all is over with us.’ ‘Be quiet, Gretel,’ said Hansel, ‘do not distress yourself, I will soon find a way to help us.’ And when the old folks had fallen asleep, he got up, put on his little coat, opened the door below, and crept outside.'),
			paragraph('The moon shone brightly, and the white pebbles which lay in front of the house glittered like real silver pennies. Hansel stooped and stuffed the little pocket of his coat with as many as he could get in. Then he went back and said to Gretel: ‘Be comforted, dear little sister, and sleep in peace, God will not forsake us,’ and he lay down again in his bed.'),
			paragraph('When day dawned, but before the sun had risen, the woman came and awoke the two children, saying: ‘Get up, you sluggards! we are going into the forest to fetch wood.’ She gave each a little piece of bread, and said: ‘There is something for your dinner, but do not eat it up before then, for you will get nothing else.’ Gretel took the bread under her apron, as Hansel had the pebbles in his pocket. Then they all set out together on the way to the forest.'),
			paragraph('When they had walked a short time, Hansel stood still and peeped back at the house, and did so again and again. His father said: ‘Hansel, what are you looking at there and staying behind for? Pay attention, and do not forget how to use your legs.’ ‘Ah, father,’ said Hansel, ‘I am looking at my little white cat, which is sitting up on the roof, and wants to say goodbye to me.’ The wife said: ‘Fool, that is not your little cat, that is the morning sun which is shining on the chimneys.’ Hansel, however, had not been looking back at the cat, but had been constantly throwing one of the white pebble-stones out of his pocket on the road.'),
			paragraph('When they had reached the middle of the forest, the father said: ‘Now, children, pile up some wood, and I will light a fire that you may not be cold.’ Hansel and Gretel gathered brushwood together, as high as a little hill. The brushwood was lighted, and when the flames were burning very high, the woman said: ‘Now, children, lay yourselves down by the fire and rest, we will go into the forest and cut some wood. When we have done, we will come back and fetch you away.’ Hansel and Gretel sat by the fire, and when noon came, each ate a little piece of bread, and as they heard the strokes of the wood-axe they believed that their father was near. It was not the axe, however, but a branch which he had fastened to a withered tree which the wind was blowing backwards and forwards. And as they had been sitting such a long time, their eyes closed with fatigue, and they fell fast asleep.'),
			paragraph('When at last they awoke, it was already dark night. Gretel began to cry and said: ‘How are we to get out of the forest now?’ But Hansel comforted her and said: ‘Just wait a little, until the moon has risen, and then we will soon find the way.’ And when the full moon had risen, Hansel took his little sister by the hand, and followed the pebbles which shone like newly-coined silver pieces, and showed them the way.'),
			paragraph('They walked the whole night long, and by break of day came once more to their father’s house. They knocked at the door, and when the woman opened it and saw that it was Hansel and Gretel, she said: ‘You naughty children, why have you slept so long in the forest?—we thought you were never coming back at all!’ The father, however, rejoiced, for it had cut him to the heart to leave them behind alone.'),
		),
		snapshots: [
			{
				key: 'dearth',
				description: 'Saved Version: The Dearth at Home',
				parentKey: null,
				minutesAgo: 220,
				content: doc(
					paragraph('Hard by a great forest dwelt a poor wood-cutter with his wife and his two children. The boy was called Hansel and the girl Gretel. He had little to bite and to break, and once when great dearth fell on the land, he could no longer procure even daily bread.'),
					paragraph('Now when he thought over this by night in his bed, and tossed about in his anxiety, he groaned and said to his wife: ‘What is to become of us? How are we to feed our poor children, when we no longer have anything even for ourselves?’'),
				),
			},
			{
				key: 'stepmother-plan',
				description: 'Saved Version: The Stepmother’s Plan',
				parentKey: 'dearth',
				minutesAgo: 204,
				content: doc(
					paragraph('‘I’ll tell you what, husband,’ answered the woman, ‘early tomorrow morning we will take the children out into the forest to where it is the thickest.’'),
					paragraph('‘No, wife,’ said the man, ‘I will not do that; how can I bear to leave my children alone in the forest?’'),
				),
			},
			{
				key: 'pebbles',
				description: 'Saved Version: Hansel’s Pebbles',
				parentKey: 'stepmother-plan',
				minutesAgo: 186,
				content: doc(
					paragraph('The moon shone brightly, and the white pebbles which lay in front of the house glittered like real silver pennies. Hansel stooped and stuffed the little pocket of his coat with as many as he could get in.'),
					paragraph('Hansel, however, had not been looking back at the cat, but had been constantly throwing one of the white pebble-stones out of his pocket on the road.'),
				),
			},
			{
				key: 'fire-clearing',
				description: 'Saved Version: The Fire in the Clearing',
				parentKey: 'pebbles',
				minutesAgo: 171,
				content: doc(
					paragraph('When they had reached the middle of the forest, the father said: ‘Now, children, pile up some wood, and I will light a fire that you may not be cold.’'),
					paragraph('Hansel and Gretel sat by the fire, and as they heard the strokes of the wood-axe they believed that their father was near.'),
				),
			},
			{
				key: 'moonlit-return',
				description: 'Saved Version: The Moonlit Return',
				parentKey: 'fire-clearing',
				minutesAgo: 154,
				content: doc(
					paragraph('When at last they awoke, it was already dark night. Gretel began to cry and said: ‘How are we to get out of the forest now?’ But Hansel comforted her and said: ‘Just wait a little, until the moon has risen, and then we will soon find the way.’'),
					paragraph('And when the full moon had risen, Hansel took his little sister by the hand, and followed the pebbles which shone like newly-coined silver pieces, and showed them the way.'),
				),
			},
			{
				key: 'what-if-father-turns-back',
				description: 'What If: Father Turns Back',
				parentKey: 'fire-clearing',
				minutesAgo: 149,
				content: doc(
					paragraph('Before the children slept, the father returned through the brushwood and confessed the stepmother’s plan at the fire.'),
					paragraph('Hansel still kept the white pebbles in his pocket, but this time he followed his father home while Gretel cried from relief instead of fear.'),
				),
			},
		],
	},
	{
		title: 'Crumbs in the Deep Forest',
		type: 'chapter',
		metadata: {
			status: 'draft',
			pov: 'Hansel',
			location: 'Great Forest',
			timeline: 'Second leaving',
			goal: 'Survive the second abandonment after the bread trail fails.',
		},
		content: doc(
			heading(1, 'Hansel and Gretel'),
			paragraph('Not long afterwards, there was once more great dearth throughout the land, and the children heard their mother saying at night to their father: ‘Everything is eaten again, we have one half loaf left, and that is the end.'),
			paragraph('The children must go, we will take them farther into the wood, so that they will not find their way out again; there is no other means of saving ourselves!’ The man’s heart was heavy, and he thought: ‘It would be better for you to share the last mouthful with your children.’ The woman, however, would listen to nothing that he had to say, but scolded and reproached him. He who says A must say B, likewise, and as he had yielded the first time, he had to do so a second time also.'),
			paragraph('The children, however, were still awake and had heard the conversation. When the old folks were asleep, Hansel again got up, and wanted to go out and pick up pebbles as he had done before, but the woman had locked the door, and Hansel could not get out. Nevertheless he comforted his little sister, and said: ‘Do not cry, Gretel, go to sleep quietly, the good God will help us.’'),
			paragraph('Early in the morning came the woman, and took the children out of their beds. Their piece of bread was given to them, but it was still smaller than the time before. On the way into the forest Hansel crumbled his in his pocket, and often stood still and threw a morsel on the ground. ‘Hansel, why do you stop and look round?’ said the father, ‘go on.’ ‘I am looking back at my little pigeon which is sitting on the roof, and wants to say goodbye to me,’ answered Hansel.'),
			paragraph('‘Fool!’ said the woman, ‘that is not your little pigeon, that is the morning sun that is shining on the chimney.’ Hansel, however little by little, threw all the crumbs on the path.'),
			paragraph('The woman led the children still deeper into the forest, where they had never in their lives been before. Then a great fire was again made, and the mother said: ‘Just sit there, you children, and when you are tired you may sleep a little; we are going into the forest to cut wood, and in the evening when we are done, we will come and fetch you away.’ When it was noon, Gretel shared her piece of bread with Hansel, who had scattered his by the way. Then they fell asleep and evening passed, but no one came to the poor children.'),
			paragraph('They did not awake until it was dark night, and Hansel comforted his little sister and said: ‘Just wait, Gretel, until the moon rises, and then we shall see the crumbs of bread which I have strewn about, they will show us our way home again.’ When the moon came they set out, but they found no crumbs, for the many thousands of birds which fly about in the woods and fields had picked them all up.'),
			paragraph('Hansel said to Gretel: ‘We shall soon find the way,’ but they did not find it. They walked the whole night and all the next day too from morning till evening, but they did not get out of the forest, and were very hungry, for they had nothing to eat but two or three berries, which grew on the ground. And as they were so weary that their legs would carry them no longer, they lay down beneath a tree and fell asleep.'),
			paragraph('It was now three mornings since they had left their father’s house. They began to walk again, but they always came deeper into the forest, and if help did not come soon, they must die of hunger and weariness. When it was mid-day, they saw a beautiful snow-white bird sitting on a bough, which sang so delightfully that they stood still and listened to it.'),
			paragraph('And when its song was over, it spread its wings and flew away before them, and they followed it until they reached a little house, on the roof of which it alighted; and when they approached the little house they saw that it was built of bread and covered with cakes, but that the windows were of clear sugar. ‘We will set to work on that,’ said Hansel, ‘and have a good meal. I will eat a bit of the roof, and you Gretel, can eat some of the window, it will taste sweet.’'),
			paragraph('Hansel reached up above, and broke off a little of the roof to try how it tasted, and Gretel leant against the window and nibbled at the panes. Then a soft voice cried from the parlour:'),
			blockquote('‘Nibble, nibble, gnaw,\nWho is nibbling at my little house?’'),
			paragraph('The children answered:'),
			blockquote('‘The wind, the wind,\nThe heaven-born wind,’'),
			paragraph('and went on eating without disturbing themselves. Hansel, who liked the taste of the roof, tore down a great piece of it, and Gretel pushed out the whole of one round window-pane, sat down, and enjoyed herself with it. Suddenly the door opened, and a woman as old as the hills, who supported herself on crutches, came creeping out. Hansel and Gretel were so terribly frightened that they let fall what they had in their hands.'),
			paragraph('The old woman, however, nodded her head, and said: ‘Oh, you dear children, who has brought you here? do come in, and stay with me. No harm shall happen to you.’ She took them both by the hand, and led them into her little house. Then good food was set before them, milk and pancakes, with sugar, apples, and nuts. Afterwards two pretty little beds were covered with clean white linen, and Hansel and Gretel lay down in them, and thought they were in heaven.'),
		),
		snapshots: [
			{
				key: 'half-loaf',
				description: 'Saved Version: The Half Loaf',
				parentKey: null,
				minutesAgo: 142,
				content: doc(
					paragraph('Not long afterwards, there was once more great dearth throughout the land, and the children heard their mother saying at night to their father: ‘Everything is eaten again, we have one half loaf left, and that is the end.'),
					paragraph('The children, however, were still awake and had heard the conversation.'),
				),
			},
			{
				key: 'crumbs',
				description: 'Saved Version: The Crumb Trail',
				parentKey: 'half-loaf',
				minutesAgo: 128,
				content: doc(
					paragraph('On the way into the forest Hansel crumbled his in his pocket, and often stood still and threw a morsel on the ground.'),
					paragraph('When the moon came they set out, but they found no crumbs, for the many thousands of birds which fly about in the woods and fields had picked them all up.'),
				),
			},
			{
				key: 'lost-berries',
				description: 'Saved Version: Lost Among the Berries',
				parentKey: 'crumbs',
				minutesAgo: 113,
				content: doc(
					paragraph('They walked the whole night and all the next day too from morning till evening, but they did not get out of the forest.'),
					paragraph('They had nothing to eat but two or three berries, which grew on the ground, and at last they lay down beneath a tree and fell asleep.'),
				),
			},
			{
				key: 'bird-house',
				description: 'Saved Version: The Bird and the House',
				parentKey: 'lost-berries',
				minutesAgo: 98,
				content: doc(
					paragraph('When it was mid-day, they saw a beautiful snow-white bird sitting on a bough, which sang so delightfully that they stood still and listened to it.'),
					paragraph('And when they approached the little house they saw that it was built of bread and covered with cakes, but that the windows were of clear sugar.'),
				),
			},
			{
				key: 'nibble-song',
				description: 'Saved Version: Nibble, Nibble, Gnaw',
				parentKey: 'bird-house',
				minutesAgo: 85,
				content: doc(
					blockquote('‘Nibble, nibble, gnaw,\nWho is nibbling at my little house?’'),
					blockquote('‘The wind, the wind,\nThe heaven-born wind,’'),
				),
			},
			{
				key: 'what-if-crumbs-survive',
				description: 'What If: The Crumbs Survive',
				parentKey: 'crumbs',
				minutesAgo: 79,
				content: doc(
					paragraph('When the moon came they set out, and this time the crumbs still lay upon the ground untouched.'),
					paragraph('Hansel and Gretel reached the wood-cutter’s house before dawn, and the little house of bread was never found at all.'),
				),
			},
		],
	},
	{
		title: 'The House of Bread and the Oven',
		type: 'chapter',
		metadata: {
			status: 'draft',
			pov: 'Gretel',
			location: 'House of Bread and Cake',
			timeline: 'At the witch’s house',
			goal: 'Keep Hansel alive long enough to turn the witch’s hunger against her.',
		},
		content: doc(
			heading(1, 'Hansel and Gretel'),
			paragraph('The old woman had only pretended to be so kind; she was in reality a wicked witch, who lay in wait for children, and had only built the little house of bread in order to entice them there. When a child fell into her power, she killed it, cooked and ate it, and that was a feast day with her. Witches have red eyes, and cannot see far, but they have a keen scent like the beasts, and are aware when human beings draw near.'),
			paragraph('When Hansel and Gretel came into her neighbourhood, she laughed with malice, and said mockingly: ‘I have them, they shall not escape me again!’ Early in the morning before the children were awake, she was already up, and when she saw both of them sleeping and looking so pretty, with their plump and rosy cheeks she muttered to herself: ‘That will be a dainty mouthful!’ Then she seized Hansel with her shrivelled hand, carried him into a little stable, and locked him in behind a grated door.'),
			paragraph('Scream as he might, it would not help him. Then she went to Gretel, shook her till she awoke, and cried: ‘Get up, lazy thing, fetch some water, and cook something good for your brother, he is in the stable outside, and is to be made fat. When he is fat, I will eat him.’ Gretel began to weep bitterly, but it was all in vain, for she was forced to do what the wicked witch commanded.'),
			paragraph('And now the best food was cooked for poor Hansel, but Gretel got nothing but crab-shells. Every morning the woman crept to the little stable, and cried: ‘Hansel, stretch out your finger that I may feel if you will soon be fat.’ Hansel, however, stretched out a little bone to her, and the old woman, who had dim eyes, could not see it, and thought it was Hansel’s finger, and was astonished that there was no way of fattening him.'),
			paragraph('When four weeks had gone by, and Hansel still remained thin, she was seized with impatience and would not wait any longer. ‘Now, then, Gretel,’ she cried to the girl, ‘stir yourself, and bring some water. Let Hansel be fat or lean, tomorrow I will kill him, and cook him.’ Ah, how the poor little sister did lament when she had to fetch the water, and how her tears did flow down her cheeks! ‘Dear God, do help us,’ she cried. ‘If the wild beasts in the forest had but devoured us, we should at any rate have died together.’ ‘Just keep your noise to yourself,’ said the old woman, ‘it won’t help you at all.’'),
			paragraph('Early in the morning, Gretel had to go out and hang up the cauldron with the water, and light the fire. ‘We will bake first,’ said the old woman, ‘I have already heated the oven, and kneaded the dough.’ She pushed poor Gretel out to the oven, from which flames of fire were already darting. ‘Creep in,’ said the witch, ‘and see if it is properly heated, so that we can put the bread in.’ And once Gretel was inside, she intended to shut the oven and let her bake in it, and then she would eat her, too.'),
			paragraph('But Gretel saw what she had in mind, and said: ‘I do not know how I am to do it; how do I get in?’ ‘Silly goose,’ said the old woman. ‘The door is big enough; just look, I can get in myself!’ and she crept up and thrust her head into the oven. Then Gretel gave her a push that drove her far into it, and shut the iron door, and fastened the bolt. Oh! then she began to howl quite horribly, but Gretel ran away and the godless witch was miserably burnt to death.'),
			paragraph('Gretel, however, ran like lightning to Hansel, opened his little stable, and cried: ‘Hansel, we are saved! The old witch is dead!’ Then Hansel sprang like a bird from its cage when the door is opened. How they did rejoice and embrace each other, and dance about and kiss each other!'),
			paragraph('And as they had no longer any need to fear her, they went into the witch’s house, and in every corner there stood chests full of pearls and jewels. ‘These are far better than pebbles!’ said Hansel, and thrust into his pockets whatever could be got in, and Gretel said: ‘I, too, will take something home with me,’ and filled her pinafore full. ‘But now we must be off,’ said Hansel, ‘that we may get out of the witch’s forest.’'),
		),
		snapshots: [
			{
				key: 'stable',
				description: 'Saved Version: Hansel in the Stable',
				parentKey: null,
				minutesAgo: 74,
				content: doc(
					paragraph('Then she seized Hansel with her shrivelled hand, carried him into a little stable, and locked him in behind a grated door.'),
					paragraph('Every morning the woman crept to the little stable, and cried: ‘Hansel, stretch out your finger that I may feel if you will soon be fat.’'),
				),
			},
			{
				key: 'bone-trick',
				description: 'Saved Version: The Bone Trick',
				parentKey: 'stable',
				minutesAgo: 66,
				content: doc(
					paragraph('Hansel, however, stretched out a little bone to her, and the old woman, who had dim eyes, could not see it, and thought it was Hansel’s finger.'),
					paragraph('She was astonished that there was no way of fattening him.'),
				),
			},
			{
				key: 'gretel-lament',
				description: 'Saved Version: Gretel’s Lament',
				parentKey: 'bone-trick',
				minutesAgo: 58,
				content: doc(
					paragraph('‘Dear God, do help us,’ she cried. ‘If the wild beasts in the forest had but devoured us, we should at any rate have died together.’'),
					paragraph('‘Just keep your noise to yourself,’ said the old woman, ‘it won’t help you at all.’'),
				),
			},
			{
				key: 'oven',
				description: 'Saved Version: The Oven',
				parentKey: 'gretel-lament',
				minutesAgo: 47,
				content: doc(
					paragraph('‘We will bake first,’ said the old woman, ‘I have already heated the oven, and kneaded the dough.’'),
					paragraph('Then Gretel gave her a push that drove her far into it, and shut the iron door, and fastened the bolt.'),
				),
			},
			{
				key: 'jewels',
				description: 'Saved Version: Pearls and Jewels',
				parentKey: 'oven',
				minutesAgo: 35,
				content: doc(
					paragraph('They went into the witch’s house, and in every corner there stood chests full of pearls and jewels.'),
					paragraph('‘These are far better than pebbles!’ said Hansel.'),
				),
			},
			{
				key: 'what-if-gretel-freezes',
				description: 'What If: Gretel Freezes at the Oven',
				parentKey: 'gretel-lament',
				minutesAgo: 31,
				content: doc(
					paragraph('Gretel stepped toward the oven, but fear rooted her in place and the witch kept laughing at the doorway.'),
					paragraph('Hansel could hear the fire from the little stable and knew, before he could see it, that the moment to save them was slipping away.'),
				),
			},
		],
	},
	{
		title: 'Across the Water Home',
		type: 'chapter',
		metadata: {
			status: 'final',
			pov: 'Hansel & Gretel',
			location: 'Great Forest',
			timeline: 'Homecoming',
			goal: 'Cross back out of the forest and return the children to their father.',
		},
		content: doc(
			heading(1, 'Hansel and Gretel'),
			paragraph('When they had walked for two hours, they came to a great stretch of water. ‘We cannot cross,’ said Hansel, ‘I see no foot-plank, and no bridge.’ ‘And there is also no ferry,’ answered Gretel, ‘but a white duck is swimming there: if I ask her, she will help us over.’ Then she cried:'),
			blockquote('‘Little duck, little duck, dost thou see,\nHansel and Gretel are waiting for thee?\nThere’s never a plank, or bridge in sight,\nTake us across on thy back so white.’'),
			paragraph('The duck came to them, and Hansel seated himself on its back, and told his sister to sit by him. ‘No,’ replied Gretel, ‘that will be too heavy for the little duck; she shall take us across, one after the other.’ The good little duck did so, and when they were once safely across and had walked for a short time, the forest seemed to be more and more familiar to them, and at length they saw from afar their father’s house.'),
			paragraph('Then they began to run, rushed into the parlour, and threw themselves round their father’s neck. The man had not known one happy hour since he had left the children in the forest; the woman, however, was dead. Gretel emptied her pinafore until pearls and precious stones ran about the room, and Hansel threw one handful after another out of his pocket to add to them.'),
			paragraph('Then all anxiety was at an end, and they lived together in perfect happiness.'),
			paragraph('My tale is done, there runs a mouse; whosoever catches it, may make himself a big fur cap out of it.'),
		),
		snapshots: [
			{
				key: 'duck',
				description: 'Saved Version: The White Duck',
				parentKey: null,
				minutesAgo: 28,
				content: doc(
					paragraph('‘And there is also no ferry,’ answered Gretel, ‘but a white duck is swimming there: if I ask her, she will help us over.’'),
					blockquote('‘Little duck, little duck, dost thou see,\nHansel and Gretel are waiting for thee?\nThere’s never a plank, or bridge in sight,\nTake us across on thy back so white.’'),
				),
			},
			{
				key: 'one-by-one',
				description: 'Saved Version: One by One Across',
				parentKey: 'duck',
				minutesAgo: 20,
				content: doc(
					paragraph('‘No,’ replied Gretel, ‘that will be too heavy for the little duck; she shall take us across, one after the other.’'),
					paragraph('The good little duck did so.'),
				),
			},
			{
				key: 'home',
				description: 'Saved Version: Home Again',
				parentKey: 'one-by-one',
				minutesAgo: 10,
				content: doc(
					paragraph('Then they began to run, rushed into the parlour, and threw themselves round their father’s neck.'),
					paragraph('Then all anxiety was at an end, and they lived together in perfect happiness.'),
				),
			},
			{
				key: 'what-if-stepmother-lives',
				description: 'What If: The Stepmother Still Lives',
				parentKey: 'one-by-one',
				minutesAgo: 7,
				content: doc(
					paragraph('They reached the wood-cutter’s house to find the stepmother waiting at the door with the same hard face she had worn on the path into the forest.'),
					paragraph('Hansel still spilled pearls from his pocket, but this time the homecoming had to be fought for before it could become happiness.'),
				),
			},
		],
	},
	{
		title: 'Story Outline and Scene Order',
		type: 'note',
		metadata: {
			status: 'final',
			goal: 'Capture the story’s full arc the way a writer might plan the draft before and during composition.',
		},
		content: doc(
			heading(2, 'Scene Spine'),
			orderedList([
				'The Great Dearth empties the Wood-cutter’s House and the Stepmother proposes abandoning Hansel and Gretel.',
				'Hansel gathers White Pebbles, the children are left in the Great Forest, and the Moonlit Path brings them home.',
				'A second leaving follows; Hansel uses Bread Crumbs, but the birds erase the trail.',
				'A Snow-White Bird leads the children to the House of Bread and Cake.',
				'The Witch traps Hansel in the Little Stable and forces Gretel to work.',
				'Gretel uses the Oven against the Witch.',
				'The children escape with Pearls and Jewels, cross the water by way of the White Duck, and return to their father.',
			]),
			heading(2, 'Draft Shape'),
			bulletList([
				'Chapter 1: Hunger, the plan, pebbles, and return.',
				'Chapter 2: Half loaf, crumbs, wandering, bird, and bread house.',
				'Chapter 3: Captivity, bone trick, oven, and treasure.',
				'Chapter 4: Water crossing, homecoming, and release.',
			]),
		),
		snapshots: [
			{
				key: 'outline-rough',
				description: 'Saved Version: Rough Outline',
				parentKey: null,
				minutesAgo: 250,
				content: doc(
					bulletList([
						'Hunger at home.',
						'Forest abandonment.',
						'Witch house.',
						'Oven reversal.',
						'Return home with treasure.',
					]),
				),
			},
			{
				key: 'outline-structured',
				description: 'Saved Version: Structured Scene Order',
				parentKey: 'outline-rough',
				minutesAgo: 232,
				content: doc(
					heading(2, 'Scene Spine'),
					orderedList([
						'The Great Dearth and the Stepmother’s plan.',
						'Hansel’s White Pebbles and the first return.',
						'The Bread Crumbs fail.',
						'The Snow-White Bird and the House of Bread.',
						'The Witch, the Oven, and the escape.',
						'The White Duck and the return to the Wood-cutter’s House.',
					]),
				),
			},
			{
				key: 'outline-final',
				description: 'Saved Version: Chapter Plan Finalized',
				parentKey: 'outline-structured',
				minutesAgo: 216,
				content: doc(
					heading(2, 'Draft Shape'),
					bulletList([
						'Chapter 1: Hunger, the plan, pebbles, and return.',
						'Chapter 2: Half loaf, crumbs, wandering, bird, and bread house.',
						'Chapter 3: Captivity, bone trick, oven, and treasure.',
						'Chapter 4: Water crossing, homecoming, and release.',
					]),
				),
			},
		],
	},
	{
		title: 'Codex Map',
		type: 'note',
		metadata: {
			status: 'revising',
			goal: 'Map the story’s recurring people, places, objects, and motifs into the codex.',
		},
		content: doc(
			heading(2, 'Characters'),
			bulletList([
				'Hansel: the boy who plans with white pebbles, then bread crumbs, and keeps Gretel from despair.',
				'Gretel: the girl who shares her bread, outwits the witch, and carries treasure home in her pinafore.',
				'The Wood-cutter: father, poor wood-cutter, the man who cannot forget the children.',
				'Stepmother: wife, stepmother, the woman who presses the family toward abandonment.',
				'Witch: old woman, wicked witch, owner of the little house of bread and cakes.',
			]),
			heading(2, 'Places and Objects'),
			bulletList([
				'Great Forest: the wood of abandonment, wandering, enchantment, and return.',
				'Wood-cutter’s House: the hungry home at the edge of the forest.',
				'House of Bread and Cake: little house, bread house, sugar-window trap.',
				'White Pebbles and Bread Crumbs: one path endures, the other is eaten away.',
				'Oven, White Duck, and Pearls and Jewels: danger, rescue, and the visible end of hunger.',
			]),
			heading(2, 'Search Prompts'),
			bulletList([
				'Search for Hansel to follow planning, reassurance, and escape.',
				'Search for Gretel to trace the shift from helplessness to action.',
				'Search for forest, little house, or oven to move through the story’s strongest settings.',
				'Search for pebbles, crumbs, duck, and jewels to follow how objects change the children’s fate.',
			]),
		),
		snapshots: [
			{
				key: 'codex-cast',
				description: 'Saved Version: Core Cast Only',
				parentKey: null,
				minutesAgo: 205,
				content: doc(
					heading(2, 'Characters'),
					bulletList([
						'Hansel',
						'Gretel',
						'The Wood-cutter',
						'Stepmother',
						'Witch',
					]),
				),
			},
			{
				key: 'codex-places',
				description: 'Saved Version: Places and Objects Added',
				parentKey: 'codex-cast',
				minutesAgo: 186,
				content: doc(
					heading(2, 'Places and Objects'),
					bulletList([
						'Great Forest',
						'Wood-cutter’s House',
						'House of Bread and Cake',
						'White Pebbles',
						'Bread Crumbs',
						'Oven',
					]),
				),
			},
			{
				key: 'codex-prompts',
				description: 'Saved Version: Search Prompts Added',
				parentKey: 'codex-places',
				minutesAgo: 167,
				content: doc(
					heading(2, 'Search Prompts'),
					bulletList([
						'Search for Hansel to follow planning, reassurance, and escape.',
						'Search for Gretel to trace the shift from helplessness to action.',
						'Search for forest, little house, or oven to move through the story’s strongest settings.',
					]),
				),
			},
			{
				key: 'codex-final',
				description: 'Saved Version: Full Codex Map',
				parentKey: 'codex-prompts',
				minutesAgo: 149,
				content: doc(
					heading(2, 'Characters'),
					bulletList([
						'Hansel: the boy who plans with White Pebbles, then Bread Crumbs, and keeps Gretel from despair.',
						'Gretel: the girl who outwits the Witch and rides the White Duck toward home.',
					]),
					heading(2, 'Places and Objects'),
					bulletList([
						'Great Forest, House of Bread and Cake, Little Stable, Oven, White Pebbles, Bread Crumbs, Pearls and Jewels.',
					]),
				),
			},
		],
	},
	{
		title: 'Motifs and Fairy-Tale Mechanics',
		type: 'note',
		metadata: {
			status: 'revising',
			goal: 'Track recurring patterns, reversals, and object logic across the whole story.',
		},
		content: doc(
			heading(2, 'Repeating Patterns'),
			bulletList([
				'Two departures into the Great Forest: one path survives, one path vanishes.',
				'Two food systems: starvation at the Wood-cutter’s House, abundance in the House of Bread and Cake, then predation in the Witch’s kitchen.',
				'Two rescues: Hansel’s planning first, Gretel’s action second.',
			]),
			heading(2, 'Object Logic'),
			bulletList([
				'White Pebbles endure and can be followed.',
				'Bread Crumbs fail because birds consume them.',
				'The Oven shifts from a tool of threat into the engine of escape.',
				'Pearls and Jewels become visible proof that the family’s hunger has ended.',
			]),
			heading(2, 'Mood Notes'),
			bulletList([
				'The moonlight scenes should feel silver, cold, and precise.',
				'The bread house should arrive as relief first, then wrongness, then terror.',
				'The homecoming should feel sudden and physically warm after the water crossing.',
			]),
		),
		snapshots: [
			{
				key: 'motifs-rough',
				description: 'Saved Version: Pattern Notes',
				parentKey: null,
				minutesAgo: 176,
				content: doc(
					bulletList([
						'Two journeys into the forest.',
						'One trail works, one trail fails.',
						'The same hunger causes every decision.',
					]),
				),
			},
			{
				key: 'motifs-objects',
				description: 'Saved Version: Object Logic',
				parentKey: 'motifs-rough',
				minutesAgo: 160,
				content: doc(
					bulletList([
						'White Pebbles = durable path.',
						'Bread Crumbs = erased path.',
						'Oven = threat reversed into rescue.',
						'Pearls and Jewels = ending of scarcity.',
					]),
				),
			},
			{
				key: 'motifs-final',
				description: 'Saved Version: Mood and Mechanics',
				parentKey: 'motifs-objects',
				minutesAgo: 142,
				content: doc(
					heading(2, 'Mood Notes'),
					bulletList([
						'The moonlight scenes should feel silver, cold, and precise.',
						'The bread house should arrive as relief first, then wrongness, then terror.',
						'The homecoming should feel sudden and physically warm after the water crossing.',
					]),
				),
			},
		],
	},
	{
		title: 'Source and Story Notes',
		type: 'note',
		metadata: {
			status: 'final',
			goal: 'Keep the demo tied to its public-domain source while showing how Draftless can organize a classic tale.',
		},
		content: doc(
			heading(2, 'Source'),
			paragraph('Primary text: “Hansel and Gretel” from Grimms’ Fairy Tales by Jacob and Wilhelm Grimm, translated by Edgar Taylor and Marian Edwardes. Public-domain text via Project Gutenberg eBook #2591.'),
			heading(2, 'Story Movement'),
			bulletList([
				'The Great Dearth empties the house and drives the first abandonment.',
				'White Pebbles lead the children safely home, but Bread Crumbs fail them the second time.',
				'The Snow-White Bird leads them to the House of Bread and Cake, where the Witch traps them.',
				'Gretel turns the Oven against the Witch, and the White Duck carries the children back toward the Wood-cutter’s House.',
			]),
			heading(2, 'Why This Demo Works'),
			bulletList([
				'The chapters preserve the full tale while splitting it into searchable, navigable scenes.',
				'The codex can tag recurring characters, places, and objects even in an older public-domain story.',
				'The saved versions keep key scenes ready for version comparison and history mapping.',
			]),
		),
		snapshots: [
			{
				key: 'source-only',
				description: 'Saved Version: Source Citation',
				parentKey: null,
				minutesAgo: 191,
				content: doc(
					heading(2, 'Source'),
					paragraph('Primary text: “Hansel and Gretel” from Grimms’ Fairy Tales by Jacob and Wilhelm Grimm, translated by Edgar Taylor and Marian Edwardes. Public-domain text via Project Gutenberg eBook #2591.'),
				),
			},
			{
				key: 'movement-added',
				description: 'Saved Version: Story Movement Added',
				parentKey: 'source-only',
				minutesAgo: 174,
				content: doc(
					heading(2, 'Story Movement'),
					bulletList([
						'The Great Dearth empties the house and drives the first abandonment.',
						'White Pebbles lead the children home, but Bread Crumbs fail them the second time.',
						'The Snow-White Bird leads them to the House of Bread and Cake.',
					]),
				),
			},
			{
				key: 'source-final',
				description: 'Saved Version: Demo Framing Finalized',
				parentKey: 'movement-added',
				minutesAgo: 158,
				content: doc(
					heading(2, 'Why This Demo Works'),
					bulletList([
						'The chapters preserve the full tale while splitting it into searchable, navigable scenes.',
						'The codex can tag recurring characters, places, and objects even in an older public-domain story.',
						'The saved versions keep key scenes ready for version comparison and history mapping.',
					]),
				),
			},
		],
	},
]

const DEMO_SNAPSHOT_CONTENTS: Record<string, JSONContent> = (() => {
	const chapterOneBody = [
		paragraph('Hard by a great forest dwelt a poor wood-cutter with his wife and his two children. The boy was called Hansel and the girl Gretel. He had little to bite and to break, and once when great dearth fell on the land, he could no longer procure even daily bread.'),
		paragraph('Now when he thought over this by night in his bed, and tossed about in his anxiety, he groaned and said to his wife: ‘What is to become of us? How are we to feed our poor children, when we no longer have anything even for ourselves?’ ‘I’ll tell you what, husband,’ answered the woman, ‘early tomorrow morning we will take the children out into the forest to where it is the thickest; there we will light a fire for them, and give each of them one more piece of bread, and then we will go to our work and leave them alone. They will not find the way home again, and we shall be rid of them.’'),
		paragraph('‘No, wife,’ said the man, ‘I will not do that; how can I bear to leave my children alone in the forest?—the wild animals would soon come and tear them to pieces.’ ‘O, you fool!’ said she, ‘then we must all four die of hunger, you may as well plane the planks for our coffins,’ and she left him no peace until he consented. ‘But I feel very sorry for the poor children, all the same,’ said the man.'),
		paragraph('The two children had also not been able to sleep for hunger, and had heard what their stepmother had said to their father. Gretel wept bitter tears, and said to Hansel: ‘Now all is over with us.’ ‘Be quiet, Gretel,’ said Hansel, ‘do not distress yourself, I will soon find a way to help us.’ And when the old folks had fallen asleep, he got up, put on his little coat, opened the door below, and crept outside.'),
		paragraph('The moon shone brightly, and the white pebbles which lay in front of the house glittered like real silver pennies. Hansel stooped and stuffed the little pocket of his coat with as many as he could get in. Then he went back and said to Gretel: ‘Be comforted, dear little sister, and sleep in peace, God will not forsake us,’ and he lay down again in his bed.'),
		paragraph('When day dawned, but before the sun had risen, the woman came and awoke the two children, saying: ‘Get up, you sluggards! we are going into the forest to fetch wood.’ She gave each a little piece of bread, and said: ‘There is something for your dinner, but do not eat it up before then, for you will get nothing else.’ Gretel took the bread under her apron, as Hansel had the pebbles in his pocket. Then they all set out together on the way to the forest.'),
		paragraph('When they had walked a short time, Hansel stood still and peeped back at the house, and did so again and again. His father said: ‘Hansel, what are you looking at there and staying behind for? Pay attention, and do not forget how to use your legs.’ ‘Ah, father,’ said Hansel, ‘I am looking at my little white cat, which is sitting up on the roof, and wants to say goodbye to me.’ The wife said: ‘Fool, that is not your little cat, that is the morning sun which is shining on the chimneys.’ Hansel, however, had not been looking back at the cat, but had been constantly throwing one of the white pebble-stones out of his pocket on the road.'),
		paragraph('When they had reached the middle of the forest, the father said: ‘Now, children, pile up some wood, and I will light a fire that you may not be cold.’ Hansel and Gretel gathered brushwood together, as high as a little hill. The brushwood was lighted, and when the flames were burning very high, the woman said: ‘Now, children, lay yourselves down by the fire and rest, we will go into the forest and cut some wood. When we have done, we will come back and fetch you away.’ Hansel and Gretel sat by the fire, and when noon came, each ate a little piece of bread, and as they heard the strokes of the wood-axe they believed that their father was near. It was not the axe, however, but a branch which he had fastened to a withered tree which the wind was blowing backwards and forwards. And as they had been sitting such a long time, their eyes closed with fatigue, and they fell fast asleep.'),
		paragraph('When at last they awoke, it was already dark night. Gretel began to cry and said: ‘How are we to get out of the forest now?’ But Hansel comforted her and said: ‘Just wait a little, until the moon has risen, and then we will soon find the way.’ And when the full moon had risen, Hansel took his little sister by the hand, and followed the pebbles which shone like newly-coined silver pieces, and showed them the way.'),
		paragraph('They walked the whole night long, and by break of day came once more to their father’s house. They knocked at the door, and when the woman opened it and saw that it was Hansel and Gretel, she said: ‘You naughty children, why have you slept so long in the forest?—we thought you were never coming back at all!’ The father, however, rejoiced, for it had cut him to the heart to leave them behind alone.'),
	]

	const chapterTwoBody = [
		paragraph('Not long afterwards, there was once more great dearth throughout the land, and the children heard their mother saying at night to their father: ‘Everything is eaten again, we have one half loaf left, and that is the end.'),
		paragraph('The children must go, we will take them farther into the wood, so that they will not find their way out again; there is no other means of saving ourselves!’ The man’s heart was heavy, and he thought: ‘It would be better for you to share the last mouthful with your children.’ The woman, however, would listen to nothing that he had to say, but scolded and reproached him. He who says A must say B, likewise, and as he had yielded the first time, he had to do so a second time also.'),
		paragraph('The children, however, were still awake and had heard the conversation. When the old folks were asleep, Hansel again got up, and wanted to go out and pick up pebbles as he had done before, but the woman had locked the door, and Hansel could not get out. Nevertheless he comforted his little sister, and said: ‘Do not cry, Gretel, go to sleep quietly, the good God will help us.’'),
		paragraph('Early in the morning came the woman, and took the children out of their beds. Their piece of bread was given to them, but it was still smaller than the time before. On the way into the forest Hansel crumbled his in his pocket, and often stood still and threw a morsel on the ground. ‘Hansel, why do you stop and look round?’ said the father, ‘go on.’ ‘I am looking back at my little pigeon which is sitting on the roof, and wants to say goodbye to me,’ answered Hansel.'),
		paragraph('‘Fool!’ said the woman, ‘that is not your little pigeon, that is the morning sun that is shining on the chimney.’ Hansel, however little by little, threw all the crumbs on the path.'),
		paragraph('The woman led the children still deeper into the forest, where they had never in their lives been before. Then a great fire was again made, and the mother said: ‘Just sit there, you children, and when you are tired you may sleep a little; we are going into the forest to cut wood, and in the evening when we are done, we will come and fetch you away.’ When it was noon, Gretel shared her piece of bread with Hansel, who had scattered his by the way. Then they fell asleep and evening passed, but no one came to the poor children.'),
		paragraph('They did not awake until it was dark night, and Hansel comforted his little sister and said: ‘Just wait, Gretel, until the moon rises, and then we shall see the crumbs of bread which I have strewn about, they will show us our way home again.’ When the moon came they set out, but they found no crumbs, for the many thousands of birds which fly about in the woods and fields had picked them all up.'),
		paragraph('Hansel said to Gretel: ‘We shall soon find the way,’ but they did not find it. They walked the whole night and all the next day too from morning till evening, but they did not get out of the forest, and were very hungry, for they had nothing to eat but two or three berries, which grew on the ground. And as they were so weary that their legs would carry them no longer, they lay down beneath a tree and fell asleep.'),
		paragraph('It was now three mornings since they had left their father’s house. They began to walk again, but they always came deeper into the forest, and if help did not come soon, they must die of hunger and weariness. When it was mid-day, they saw a beautiful snow-white bird sitting on a bough, which sang so delightfully that they stood still and listened to it.'),
		paragraph('And when its song was over, it spread its wings and flew away before them, and they followed it until they reached a little house, on the roof of which it alighted; and when they approached the little house they saw that it was built of bread and covered with cakes, but that the windows were of clear sugar. ‘We will set to work on that,’ said Hansel, ‘and have a good meal. I will eat a bit of the roof, and you Gretel, can eat some of the window, it will taste sweet.’'),
		paragraph('Hansel reached up above, and broke off a little of the roof to try how it tasted, and Gretel leant against the window and nibbled at the panes. Then a soft voice cried from the parlour:'),
		blockquote('‘Nibble, nibble, gnaw,\nWho is nibbling at my little house?’'),
		paragraph('The children answered:'),
		blockquote('‘The wind, the wind,\nThe heaven-born wind,’'),
		paragraph('and went on eating without disturbing themselves. Hansel, who liked the taste of the roof, tore down a great piece of it, and Gretel pushed out the whole of one round window-pane, sat down, and enjoyed herself with it. Suddenly the door opened, and a woman as old as the hills, who supported herself on crutches, came creeping out. Hansel and Gretel were so terribly frightened that they let fall what they had in their hands.'),
		paragraph('The old woman, however, nodded her head, and said: ‘Oh, you dear children, who has brought you here? do come in, and stay with me. No harm shall happen to you.’ She took them both by the hand, and led them into her little house. Then good food was set before them, milk and pancakes, with sugar, apples, and nuts. Afterwards two pretty little beds were covered with clean white linen, and Hansel and Gretel lay down in them, and thought they were in heaven.'),
	]

	const chapterThreeBody = [
		paragraph('The old woman had only pretended to be so kind; she was in reality a wicked witch, who lay in wait for children, and had only built the little house of bread in order to entice them there. When a child fell into her power, she killed it, cooked and ate it, and that was a feast day with her. Witches have red eyes, and cannot see far, but they have a keen scent like the beasts, and are aware when human beings draw near.'),
		paragraph('When Hansel and Gretel came into her neighbourhood, she laughed with malice, and said mockingly: ‘I have them, they shall not escape me again!’ Early in the morning before the children were awake, she was already up, and when she saw both of them sleeping and looking so pretty, with their plump and rosy cheeks she muttered to herself: ‘That will be a dainty mouthful!’ Then she seized Hansel with her shrivelled hand, carried him into a little stable, and locked him in behind a grated door.'),
		paragraph('Scream as he might, it would not help him. Then she went to Gretel, shook her till she awoke, and cried: ‘Get up, lazy thing, fetch some water, and cook something good for your brother, he is in the stable outside, and is to be made fat. When he is fat, I will eat him.’ Gretel began to weep bitterly, but it was all in vain, for she was forced to do what the wicked witch commanded.'),
		paragraph('And now the best food was cooked for poor Hansel, but Gretel got nothing but crab-shells. Every morning the woman crept to the little stable, and cried: ‘Hansel, stretch out your finger that I may feel if you will soon be fat.’ Hansel, however, stretched out a little bone to her, and the old woman, who had dim eyes, could not see it, and thought it was Hansel’s finger, and was astonished that there was no way of fattening him.'),
		paragraph('When four weeks had gone by, and Hansel still remained thin, she was seized with impatience and would not wait any longer. ‘Now, then, Gretel,’ she cried to the girl, ‘stir yourself, and bring some water. Let Hansel be fat or lean, tomorrow I will kill him, and cook him.’ Ah, how the poor little sister did lament when she had to fetch the water, and how her tears did flow down her cheeks! ‘Dear God, do help us,’ she cried. ‘If the wild beasts in the forest had but devoured us, we should at any rate have died together.’ ‘Just keep your noise to yourself,’ said the old woman, ‘it won’t help you at all.’'),
		paragraph('Early in the morning, Gretel had to go out and hang up the cauldron with the water, and light the fire. ‘We will bake first,’ said the old woman, ‘I have already heated the oven, and kneaded the dough.’ She pushed poor Gretel out to the oven, from which flames of fire were already darting. ‘Creep in,’ said the witch, ‘and see if it is properly heated, so that we can put the bread in.’ And once Gretel was inside, she intended to shut the oven and let her bake in it, and then she would eat her, too.'),
		paragraph('But Gretel saw what she had in mind, and said: ‘I do not know how I am to do it; how do I get in?’ ‘Silly goose,’ said the old woman. ‘The door is big enough; just look, I can get in myself!’ and she crept up and thrust her head into the oven. Then Gretel gave her a push that drove her far into it, and shut the iron door, and fastened the bolt. Oh! then she began to howl quite horribly, but Gretel ran away and the godless witch was miserably burnt to death.'),
		paragraph('Gretel, however, ran like lightning to Hansel, opened his little stable, and cried: ‘Hansel, we are saved! The old witch is dead!’ Then Hansel sprang like a bird from its cage when the door is opened. How they did rejoice and embrace each other, and dance about and kiss each other!'),
		paragraph('And as they had no longer any need to fear her, they went into the witch’s house, and in every corner there stood chests full of pearls and jewels. ‘These are far better than pebbles!’ said Hansel, and thrust into his pockets whatever could be got in, and Gretel said: ‘I, too, will take something home with me,’ and filled her pinafore full. ‘But now we must be off,’ said Hansel, ‘that we may get out of the witch’s forest.’'),
	]

	const chapterFourBody = [
		paragraph('When they had walked for two hours, they came to a great stretch of water. ‘We cannot cross,’ said Hansel, ‘I see no foot-plank, and no bridge.’ ‘And there is also no ferry,’ answered Gretel, ‘but a white duck is swimming there: if I ask her, she will help us over.’ Then she cried:'),
		blockquote('‘Little duck, little duck, dost thou see,\nHansel and Gretel are waiting for thee?\nThere’s never a plank, or bridge in sight,\nTake us across on thy back so white.’'),
		paragraph('The duck came to them, and Hansel seated himself on its back, and told his sister to sit by him. ‘No,’ replied Gretel, ‘that will be too heavy for the little duck; she shall take us across, one after the other.’ The good little duck did so, and when they were once safely across and had walked for a short time, the forest seemed to be more and more familiar to them, and at length they saw from afar their father’s house.'),
		paragraph('Then they began to run, rushed into the parlour, and threw themselves round their father’s neck. The man had not known one happy hour since he had left the children in the forest; the woman, however, was dead. Gretel emptied her pinafore until pearls and precious stones ran about the room, and Hansel threw one handful after another out of his pocket to add to them.'),
		paragraph('Then all anxiety was at an end, and they lived together in perfect happiness.'),
		paragraph('My tale is done, there runs a mouse; whosoever catches it, may make himself a big fur cap out of it.'),
	]

	return {
		dearth: chapterDoc(chapterOneBody.slice(0, 2)),
		'stepmother-plan': chapterDoc(chapterOneBody.slice(0, 3)),
		pebbles: chapterDoc(chapterOneBody.slice(0, 6)),
		'fire-clearing': chapterDoc(chapterOneBody.slice(0, 8)),
		'moonlit-return': chapterDoc(chapterOneBody),
		'what-if-father-turns-back': chapterDoc([
			...chapterOneBody.slice(0, 8),
			paragraph('Before the children slept, the father returned through the brushwood and confessed the stepmother’s plan at the fire.'),
			paragraph('Hansel still kept the white pebbles in his pocket, but this time he followed his father home while Gretel cried from relief instead of fear.'),
		]),
		'half-loaf': chapterDoc(chapterTwoBody.slice(0, 2)),
		crumbs: chapterDoc(chapterTwoBody.slice(0, 7)),
		'lost-berries': chapterDoc(chapterTwoBody.slice(0, 9)),
		'bird-house': chapterDoc(chapterTwoBody.slice(0, 11)),
		'nibble-song': chapterDoc(chapterTwoBody.slice(0, 15)),
		'what-if-crumbs-survive': chapterDoc([
			...chapterTwoBody.slice(0, 7),
			paragraph('When the moon came they set out, and this time the crumbs still lay upon the ground untouched.'),
			paragraph('Hansel and Gretel reached the wood-cutter’s house before dawn, and the little house of bread was never found at all.'),
		]),
		stable: chapterDoc(chapterThreeBody.slice(0, 3)),
		'bone-trick': chapterDoc(chapterThreeBody.slice(0, 4)),
		'gretel-lament': chapterDoc(chapterThreeBody.slice(0, 5)),
		oven: chapterDoc(chapterThreeBody.slice(0, 7)),
		jewels: chapterDoc(chapterThreeBody),
		'what-if-gretel-freezes': chapterDoc([
			...chapterThreeBody.slice(0, 6),
			paragraph('Gretel stepped toward the oven, but fear rooted her in place and the witch kept laughing at the doorway.'),
			paragraph('Hansel could hear the fire from the little stable and knew, before he could see it, that the moment to save them was slipping away.'),
		]),
		duck: chapterDoc(chapterFourBody.slice(0, 2)),
		'one-by-one': chapterDoc(chapterFourBody.slice(0, 3)),
		home: chapterDoc(chapterFourBody),
		'what-if-stepmother-lives': chapterDoc([
			...chapterFourBody.slice(0, 3),
			paragraph('They reached the wood-cutter’s house to find the stepmother waiting at the door with the same hard face she had worn on the path into the forest.'),
			paragraph('Hansel still spilled pearls from his pocket, but this time the homecoming had to be fought for before it could become happiness.'),
		]),
	}
})()

const DEMO_VIEWS: DemoViewSeed[] = [
	{
		title: 'Revising Chapters',
		filters: {
			type: 'chapter',
			status: 'revising',
		},
	},
	{
		title: 'Final Pages',
		filters: {
			status: 'final',
		},
	},
	{
		title: 'Gretel Scenes',
		filters: {
			type: 'chapter',
			pov: 'Gretel',
		},
	},
	{
		title: 'Great Forest',
		filters: {
			location: 'Great Forest',
		},
	},
	{
		title: 'Planning Notes',
		filters: {
			type: 'note',
		},
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
		const viewManager = new ProjectFileViewManager(projectDoc)
		let totalWordCount = 0

		for (const fileSeed of DEMO_FILES) {
			const fileId = projectManager.create(fileSeed.title, fileSeed.type, fileSeed.metadata)
			await writeDemoFile(fileId, fileSeed.content)
			totalWordCount += countWords(fileSeed.content)

			if (fileSeed.snapshots && fileSeed.snapshots.length > 0) {
				await writeDemoSnapshots(fileId, fileSeed.snapshots.map(resolveDemoSnapshot))
			}
		}

		for (const view of DEMO_VIEWS) {
			viewManager.create(view.title, view.filters)
		}

		return totalWordCount
	} finally {
		await projectProvider.destroy()
		projectDoc.destroy()
	}
}

export function getShowcaseDemoStats(): ShowcaseDemoStats {
	return {
		chapterCount: DEMO_FILES.filter((file) => file.type === 'chapter').length,
		noteCount: DEMO_FILES.filter((file) => file.type === 'note').length,
		snapshotCount: DEMO_FILES.reduce((count, file) => count + (file.snapshots?.length ?? 0), 0),
		savedViewCount: DEMO_VIEWS.length,
		codexEntryCount: DEMO_CODEX.length,
	}
}

export function getShowcaseDemoSnapshotText(snapshotKey: string): string {
	const content = DEMO_SNAPSHOT_CONTENTS[snapshotKey]
	return content ? getPlainTextFromContent(content) : ''
}

async function writeDemoFile(fileId: string, content: JSONContent): Promise<void> {
	const ydoc = new Y.Doc()
	const provider = new IndexeddbPersistence(getFileDbName(fileId), ydoc)

	try {
		await waitForProviderSync(provider)
		const editor = new Editor({
			extensions: [
				StarterKit.configure({ undoRedo: false }),
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

function resolveDemoSnapshot(snapshot: DemoSnapshotSeed): DemoSnapshotSeed {
	return {
		...snapshot,
		content: DEMO_SNAPSHOT_CONTENTS[snapshot.key] ?? snapshot.content,
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

function orderedList(items: string[]): JSONContent {
	return {
		type: 'orderedList',
		content: items.map((item) => ({
			type: 'listItem',
			content: [paragraph(item)],
		})),
	}
}

function chapterDoc(body: JSONContent[]): JSONContent {
	return doc(heading(1, 'Hansel and Gretel'), ...cloneContentArray(body))
}

function cloneContentArray(content: JSONContent[]): JSONContent[] {
	return content.map(cloneContent)
}

function cloneContent(content: JSONContent): JSONContent {
	return JSON.parse(JSON.stringify(content)) as JSONContent
}

function textNode(text: string): JSONContent {
	return { type: 'text', text }
}
