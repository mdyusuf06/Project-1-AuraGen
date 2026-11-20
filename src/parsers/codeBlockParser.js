import { BaseOutputParser } from "@langchain/core/output_parsers";

/**
 * Extracts raw JavaScript / JSX code from LLM responses,
 * stripping markdown code fences and conversational preamble/postamble.
 *
 * @param {string} text - Raw text from the LLM
 * @returns {string} - Clean, unescaped raw code string
 */
export function extractCodeBlock(text) {
  if (!text || typeof text !== "string") {
    return "";
  }

  const normalized = text.replace(/\r\n/g, "\n").trim();

  // Pattern 1: Match code fences like ```jsx ... ``` or ```javascript ... ```
  const codeBlockRegex = /```(?:jsx|javascript|js|tsx|react)?\s*\n?([\s\S]*?)```/gi;
  const matches = [...normalized.matchAll(codeBlockRegex)];

  if (matches.length > 0) {
    // If multiple blocks exist, prefer the one that contains 'export default'
    const targetBlock = matches.find((m) => m[1].includes("export default")) || matches[0];
    return targetBlock[1].trim();
  }

  // Pattern 2: If no backtick fences exist, check if code starts with import or export
  const exportIndex = normalized.indexOf("export default");
  const importIndex = normalized.indexOf("import ");

  if (importIndex !== -1 || exportIndex !== -1) {
    let startIndex = 0;
    if (importIndex !== -1 && exportIndex !== -1) {
      startIndex = Math.min(importIndex, exportIndex);
    } else if (importIndex !== -1) {
      startIndex = importIndex;
    } else {
      startIndex = exportIndex;
    }

    return normalized.slice(startIndex).trim();
  }

  // Fallback: return trimmed text
  return normalized;
}

/**
 * LangChain Output Parser that extracts pure React code string.
 */
export class CodeBlockOutputParser extends BaseOutputParser {
  lc_namespace = ["auragen", "parsers"];

  getFormatInstructions() {
    return "Return only the executable React component code enclosed in a ```jsx ... ``` code block.";
  }

  /**
   * Parse the model output into clean React code.
   * @param {string|object} output - Model output (string or AIMessage)
   * @returns {Promise<string>}
   */
  async parse(output) {
    const text = typeof output === "string" ? output : output?.content || "";
    return extractCodeBlock(text);
  }
}

