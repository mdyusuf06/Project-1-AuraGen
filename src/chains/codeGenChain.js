import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { createCodeGenPrompt } from "../prompts/codeGenPrompt.js";
import { CodeBlockOutputParser } from "../parsers/codeBlockParser.js";

/**
 * Factory function to create the LangChain Code-Gen Chain.
 *
 * Architecture:
 *   PromptTemplate (System Prompt + Dynamic Context)
 *         ↓
 *   ChatOpenAI (GPT-4o)
 *         ↓
 *   CodeBlockOutputParser (Clean JSX/React code extraction)
 *
 * @param {object} [options={}] - Override configuration options
 * @param {string} [options.modelName] - OpenAI model name (default: "gpt-4o")
 * @param {number} [options.temperature] - Generation temperature (default: 0.2)
 * @param {string} [options.apiKey] - OpenAI API key (default: process.env.OPENAI_API_KEY)
 * @param {number} [options.timeout] - Request timeout in ms (default: 45000)
 * @returns {object} Configured LangChain Runnable chain
 */
export function createCodeGenChain(options = {}) {
  const apiKey = options.apiKey || process.env.OPENAI_API_KEY;
  const modelName = options.modelName || process.env.OPENAI_MODEL_NAME || "gpt-4o";
  const temperature = options.temperature ?? Number(process.env.OPENAI_TEMPERATURE ?? 0.2);
  const timeout = options.timeout ?? Number(process.env.REQUEST_TIMEOUT_MS ?? 45000);

  const model = new ChatOpenAI({
    model: modelName,
    apiKey: apiKey || "placeholder-key-for-initialization",
    temperature,
    timeout,
    maxRetries: 1 // Internal HTTP retries; agent-level validation retries handled in agent.js
  });

  const prompt = createCodeGenPrompt();
  const parser = new CodeBlockOutputParser();

  // LangChain Expression Language (LCEL) chain
  const chain = prompt.pipe(model).pipe(parser);

  return {
    chain,
    model,
    prompt,
    parser
  };
}

// Pre-configured default chain
export const defaultCodeGen = createCodeGenChain();
