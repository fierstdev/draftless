import { generateText } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createOpenAI } from "@ai-sdk/openai"
import { createAnthropic } from "@ai-sdk/anthropic"
import type { LanguageModelV2CallOptions, LanguageModelV2Content, LanguageModelV2FinishReason, LanguageModelV2Usage, SharedV2ProviderMetadata, LanguageModelV2ResponseMetadata, SharedV2Headers, LanguageModelV2CallWarning, LanguageModelV2StreamPart } from "@ai-sdk/provider"

export type WeaveStrategy = 'mix' | 'action_b_tone_a' | 'append'

const getSystemInstruction = (strategy: WeaveStrategy, textA: string, textB: string) => {
	switch (strategy) {
		case 'mix':
			return `
                ROLE: You are an elite Developmental Editor with 20 years of experience at top publishing houses. You specialize in "Narrative Integration"—seamlessly merging conflicting plot threads without breaking immersion.

                TASK: 
                You are given two versions of the same scene. 
                - <current_draft>: The established narrative context, mood, and setting.
                - <incoming_change>: A specific new plot action or character decision that MUST happen.

                YOUR GOAL:
                Rewrite the scene to make the <incoming_change> happen, but maintain the *atmosphere, character voice, and setting details* established in <current_draft>.

                CRITICAL RULES FOR CONFLICT RESOLUTION:
                1. **State Consistency**: If <current_draft> says "The door is locked" and <incoming_change> says "He walked through the door", you must write the action of him unlocking or breaking it. Do not allow logical paradoxes.
                2. **Priority**: The *events* in <incoming_change> are the truth. The *style/context* in <current_draft> is the truth.
                3. **Seamlessness**: The reader should never know this was stitched together.

                INPUT DATA:
                <current_draft>
                ${textA}
                </current_draft>

                <incoming_change>
                ${textB}
                </incoming_change>

                OUTPUT FORMAT:
                Return ONLY the final merged prose. Do not include markdown, "Here is the text:", or any explanations. Just the story.
            `;

		case 'action_b_tone_a':
			return `
                ROLE: You are a literary "Ghostwriter". Your talent is perfect style mimicry.

                TASK: 
                Rewrite the content of <target_plot> so it sounds exactly like it was written by the author of <style_sample>.

                STEP-BY-STEP INSTRUCTIONS:
                1. **Analyze <style_sample>**:
                   - Look at sentence length (Short & punchy? Long & flowery?).
                   - Look at vocabulary (Simple? Archaic? Technical? Slang?).
                   - Look at sensory details (Visual focus? Internal monologue?).
                2. **Analyze <target_plot>**:
                   - Extract the core facts: Who did what? What happened?
                3. **Execute Rewrite**:
                   - Tell the facts of <target_plot> using the voice of <style_sample>.

                INPUT DATA:
                <style_sample>
                ${textA}
                </style_sample>

                <target_plot>
                ${textB}
                </target_plot>

                OUTPUT FORMAT:
                Return ONLY the rewritten text. Zero conversational filler.
            `;

		case 'append':
			return `
                ROLE: You are a "Continuity Editor". Your job is to smooth out rough transitions between scenes.

                TASK: 
                Connect <scene_start> to <scene_end> with a seamless narrative bridge.

                INSTRUCTIONS:
                1. Check the gap. Is there a jump in time? Location? Mood?
                2. If the gap is jarring, write 1-2 transitional sentences (e.g., "Later that evening...", "Meanwhile, back at the base...").
                3. If they fit perfectly, just join them.
                4. Ensure the tense (past/present) remains consistent with <scene_start>.

                INPUT DATA:
                <scene_start>
                ${textA}
                </scene_start>

                <scene_end>
                ${textB}
                </scene_end>

                OUTPUT FORMAT:
                Return the full combined text (<scene_start> + Bridge + <scene_end>).
            `;
	}
};

export const weaveText = async (currentText: string, checkpointText: string, strategy: WeaveStrategy) => {
	const providerId = localStorage.getItem('ai_provider') || 'google';
	let model: { specificationVersion: "v2"; provider: string; modelId: string; supportedUrls: Record<string, RegExp[]> | PromiseLike<Record<string, RegExp[]>>; doGenerate: (options: LanguageModelV2CallOptions) => PromiseLike<{ content: Array<LanguageModelV2Content>; finishReason: LanguageModelV2FinishReason; usage: LanguageModelV2Usage; providerMetadata?: SharedV2ProviderMetadata; request?: { body?: unknown }; response?: LanguageModelV2ResponseMetadata & { headers?: SharedV2Headers; body?: unknown }; warnings: Array<LanguageModelV2CallWarning> }>; doStream: (options: LanguageModelV2CallOptions) => PromiseLike<{ stream: ReadableStream<LanguageModelV2StreamPart>; request?: { body?: unknown }; response?: { headers?: SharedV2Headers } }> }

	if (providerId === 'google') {
		const apiKey = localStorage.getItem("google_api_key") || import.meta.env.VITE_GOOGLE_API_KEY
		if (!apiKey) throw new Error("Missing Google API Key")
		const google = createGoogleGenerativeAI({ apiKey })
		model = google("gemini-2.5-flash")
	}
	else if (providerId === 'openai') {
		const apiKey = localStorage.getItem("openai_api_key")
		if (!apiKey) throw new Error("Missing OpenAI API Key")
		const openai = createOpenAI({ apiKey })
		model = openai("gpt-4o")
	}
	else if (providerId === 'anthropic') {
		const apiKey = localStorage.getItem("anthropic_api_key")
		if (!apiKey) throw new Error("Missing Anthropic API Key")
		const anthropic = createAnthropic({ apiKey })
		model = anthropic("claude-3-5-sonnet-20240620")
	}
	else {
		throw new Error("Invalid Provider Selected")
	}

	try {
		// Anthropic browser check
		if (providerId === 'anthropic') {
			console.warn("Anthropic requests usually require a proxy due to CORS.")
		}

		const { text } = await generateText({
			model,
			prompt: getSystemInstruction(strategy, currentText, checkpointText),
			// Temperature 0.7 is the "Goldilocks" zone for creative writing
			// High enough for flair, low enough to follow instructions.
			temperature: 0.7,
		})

		return text.trim() // Clean up any accidental whitespace
	} catch (error) {
		console.error("AI SDK Error:", error)
		throw error
	}
}