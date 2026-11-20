import dotenv from 'dotenv';
// Always load environment variables from .env before initializing any clients
dotenv.config();

import { CodeGeneratorService } from '../generator/CodeGeneratorService.js';

/**
 * Factory creating LangChain ChatOpenAI agent connected to AuraGen generator service.
 * Supports OpenAI GPT-4o integration, falling back to mock or offline generator if OPENAI_API_KEY is not set.
 * 
 * @param {Object} [options]
 * @param {string} [options.openAiApiKey] - Optional explicit OpenAI API Key override
 * @param {string} [options.modelName='gpt-4o'] - Targeted OpenAI model name
 * @param {number} [options.temperature=0.2] - Generation temperature
 * @returns {Promise<CodeGeneratorService>} Initialized generator service instance
 */
export async function createAuraGenPipeline(options = {}) {
  let llm = null;

  // Retrieve API key from options or loaded environment variables
  const apiKey = options.openAiApiKey || process.env.OPENAI_API_KEY;

  if (apiKey && typeof apiKey === 'string' && apiKey.trim().startsWith('sk-')) {
    try {
      const { ChatOpenAI } = await import('@langchain/openai');
      llm = new ChatOpenAI({
        openAIApiKey: apiKey.trim(),
        modelName: options.modelName || 'gpt-4o',
        temperature: options.temperature ?? 0.2
      });
    } catch (e) {
      console.warn('LangChain OpenAI module could not be initialized. Using deterministic generator fallback.', e.message);
    }
  }

  return new CodeGeneratorService({ llmClient: llm });
}

export { CodeGeneratorService };
export default createAuraGenPipeline;
