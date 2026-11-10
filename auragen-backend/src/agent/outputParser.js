// ============================================================
// OUTPUT PARSER
// ============================================================

export class CodeGenOutputParser {

    /**
     * Parse LLM response string into structured output.
     * Handles cases where LLM wraps JSON in markdown or adds commentary.
     */
    parse(llmResponseText) {
        let cleanText = llmResponseText.trim();

        // Strategy 1: Remove markdown code fences if present
        // LLMs sometimes wrap in ```json ... ``` despite instructions
        cleanText = cleanText
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();

        // Strategy 2: Extract JSON object using regex if there's surrounding text
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error(
                `OutputParser: Could not find JSON object in LLM response.\nRaw: ${llmResponseText.substring(0, 200)}`
            );
        }

        // Strategy 3: Parse the extracted JSON
        let parsed;
        try {
            parsed = JSON.parse(jsonMatch[0]);
        } catch (e) {
            throw new Error(
                `OutputParser: JSON.parse failed — ${e.message}\nRaw JSON: ${jsonMatch[0].substring(0, 300)}`
            );
        }

        // Strategy 4: Validate required fields exist
        this.validateStructure(parsed);

        return {
            componentName: parsed.componentName,
            reasoning: parsed.reasoning,
            code: parsed.code,
        };
    }

    validateStructure(parsed) {
        const required = ["componentName", "reasoning", "code"];
        for (const field of required) {
            if (!parsed[field]) {
                throw new Error(`OutputParser: Missing required field "${field}" in LLM output.`);
            }
        }

        // Validate code starts correctly
        if (!parsed.code.includes("GeneratedComponent")) {
            throw new Error(
                "OutputParser: Generated code does not contain 'GeneratedComponent'. Invalid output."
            );
        }

        // Validate code has export
        if (!parsed.code.includes("export default")) {
            throw new Error(
                "OutputParser: Generated code missing 'export default'. Invalid output."
            );
        }
    }
}
