import { GoogleGenerativeAI } from "@google/generative-ai";

const getApiKey = () => {
	const stored = localStorage.getItem("google_api_key");
	if (stored) return stored;
	return import.meta.env.VITE_GOOGLE_API_KEY;
}

const API_KEY = getApiKey();

if (!API_KEY) {
	console.warn("Missing Google API Key. Please add it in Settings.");
}

// Only initialize if key exists to prevent crash
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;
const model = genAI ? genAI.getGenerativeModel({ model: "gemini-2.5-flash" }) : null;

export type WeaveStrategy = 'mix' | 'action_b_tone_a' | 'append';

export const weaveText = async (currentText: string, checkpointText: string, strategy: WeaveStrategy) => {
	if (!model) {
		throw new Error("AI not configured. Please add your API Key in Settings.");
	}

	let systemInstruction = "";

	switch (strategy) {
		case 'mix':
			systemInstruction = `
        ROLE: You are an expert developmental editor tasked with merging two drafts of the same text into a single, superior version.
        
        OBJECTIVE: 
        Integrate the *Plot/Action* updates from the Incoming Version (B) into the *Narrative Flow* of the Current Version (A).

        UNIVERSAL MERGE RULES:
        1. RESOLVE STATE CONTRADICTIONS: If Version A describes an object/person in State X (e.g., alive, whole, happy) and Version B describes them in State Y (e.g., dead, broken, angry), you must rewrite the timeline so the transition from X to Y happens logically. Do not allow two mutually exclusive realities to exist simultaneously.
        2. PRIORITIZE RECENT ACTION: The Incoming Version (B) represents the user's latest intent. If actions conflict, Version B wins.
        3. PRESERVE VOICE: Keep the vocabulary, sentence structure, and tone of Version A.
        4. SEAMLESS BLEND: Do not just paste paragraph B after paragraph A. Rewrite the sentences so they interlock.

        INPUT DATA:
        [Version A (Current Draft)]: "${currentText}"
        [Version B (Incoming Checkpoint)]: "${checkpointText}"
        
        OUTPUT:
        Return ONLY the merged text. No markdown, no comments.
      `;
			break;

		case 'action_b_tone_a':
			systemInstruction = `
        ROLE: You are a Ghostwriter.
        
        TASK: Rewrite the content of Version B, but force it to match the exact writing style of Version A.
        
        INSTRUCTIONS:
        1. Analyze Version A for: Sentence length, vocabulary complexity, and emotional tone (e.g., formal, witty, dark, technical).
        2. Analyze Version B for: Core facts, plot points, and data.
        3. GENERATE: A new text that conveys the *facts* of B using the *voice* of A.
        
        INPUT DATA:
        [Style Reference (Version A)]: "${currentText}"
        [Content Source (Version B)]: "${checkpointText}"
        
        OUTPUT:
        Return ONLY the rewritten text.
      `;
			break;

		case 'append':
			systemInstruction = `
        ROLE: You are a Continuity Editor.
        
        TASK: Append Version B to the end of Version A, but write a "Bridge" to make the transition invisible.
        
        INSTRUCTIONS:
        1. Identify the ending state of A and the starting state of B.
        2. If there is a jarring jump in time, location, or logic, insert 1-2 bridging sentences to smooth the gap.
        3. If they fit perfectly, just concatenate them.
        
        INPUT DATA:
        [Part 1]: "${currentText}"
        [Part 2]: "${checkpointText}"
        
        OUTPUT:
        Return the full combined text (Part 1 + Bridge + Part 2).
      `;
			break;
	}

	try {
		const result = await model.generateContent(systemInstruction);
		const response = await result.response;
		return response.text();
	} catch (error) {
		console.error("Weave failed:", error);
		throw error;
	}
};