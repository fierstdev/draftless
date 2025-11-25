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
        ROLE: You are an expert fiction editor tasked with weaving two story fragments into one seamless narrative.
        
        THE GOAL: 
        You have an existing scene (Version A) and a new plot development (Version B). 
        You must combine them so that the *atmosphere and setup* of A flows naturally into the *action* of B.

        RULES:
        1. START with the descriptive details, setting, and mood from Version A. Do not delete these.
        2. TRANSITION into the events of Version B. 
        3. RESOLVE CONTRADICTIONS: If A says "The gun was holstered" and B says "He fired the gun", you must write the action of him drawing the gun. Do not just jump to firing.
        4. OUTPUT: A single, cohesive paragraph that contains the best elements of both.

        INPUT DATA:
        [Version A (Context)]: "${currentText}"
        [Version B (New Action)]: "${checkpointText}"
        
        OUTPUT:
        Return ONLY the merged story text. No intro, no markdown.
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