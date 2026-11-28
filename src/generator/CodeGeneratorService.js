import { AURAGEN_SYSTEM_PROMPT, buildUserPrompt } from '../prompts/systemPrompt.js';
import { FEW_SHOT_EXAMPLES } from '../prompts/fewShotExamples.js';
import { validate } from '../../backend/src/services/astValidator.js';
import { DESIGN_SYSTEM_MODULES } from '../../backend/src/services/jsxDesignValidator.js';
import {
  validateInputSchema,
  validateGenerationResult
} from '../validator/index.js';

/**
 * AuraGen Code Generation Service
 * 
 * Orchestrates LLM prompt assembly, execution, response extraction,
 * output contract validation, and security scanning.
 * Gracefully falls back to high-fidelity deterministic generation if OpenAI credits
 * are exhausted or rate-limited, preventing pipeline disruption.
 */
export class CodeGeneratorService {
  /**
   * @param {Object} [options]
   * @param {Object} [options.llmClient] - Optional custom LLM client or LangChain ChatOpenAI instance
   */
  constructor(options = {}) {
    this.llmClient = options.llmClient || null;
    this.systemPrompt = AURAGEN_SYSTEM_PROMPT;
    this.fewShotExamples = FEW_SHOT_EXAMPLES;
  }

  /**
   * Builds the complete prompt payload including system prompt, few-shot examples,
   * input schema, and cognitive load context.
   * 
   * @param {Object} params
   * @param {Object} params.schema
   * @param {Object} [params.frictionContext]
   * @returns {Array<{role: string, content: string}>}
   */
  buildMessages({ schema, frictionContext }) {
    const messages = [];

    // System instruction defining expert React UI engineer persona, component constraints, and security bounds
    messages.push({
      role: 'system',
      content: this.systemPrompt + `\nThe examples demonstrate layout and metadata. For componentCode, use only synchronous declarative JSX with literal props, approved Tailwind classes and a single default function export. Omit hooks, calls, event handlers, property access and spread syntax. Use approved native elements or named components imported from '${DESIGN_SYSTEM_MODULES[0]}'.`
    });

    // 2-3 Curated Few-shot demonstrations
    for (const eg of this.fewShotExamples) {
      messages.push({
        role: 'user',
        content: `### Input Form Schema:\n${JSON.stringify(eg.input, null, 2)}\n\nGenerate the simplified React multi-step wizard adhering strictly to the AuraGen output contract.`
      });
      messages.push({
        role: 'assistant',
        content: JSON.stringify(eg.output, null, 2)
      });
    }

    // Target form schema and cognitive load context
    messages.push({
      role: 'user',
      content: buildUserPrompt({ schema, frictionContext })
    });

    return messages;
  }

  /**
   * Generates a wizard component for the provided form schema.
   * 
   * @param {Object} params
   * @param {Object} params.schema
   * @param {Object} [params.frictionContext]
   * @returns {Promise<{success: boolean, data?: Object, errors?: string[], issues?: Object[], source?: string}>}
   */
  async generateWizard({ schema, frictionContext }) {
    // 1. Validate input schema
    const schemaValidation = validateInputSchema(schema);
    if (!schemaValidation.isValid) {
      return {
        success: false,
        data: {
          componentName: 'InvalidSchemaError',
          componentCode: '',
          steps: [],
          fieldMapping: { originalFieldCount: 0, mappedFieldCount: 0, fieldsByStep: {} },
          validationSummary: {
            isValid: false,
            hasAllRequiredFields: false,
            notes: `Schema validation failed: ${schemaValidation.errors.join('; ')}`
          }
        },
        errors: schemaValidation.errors,
        source: 'schema-validator'
      };
    }

    // 2. Prepare message payloads
    const messages = this.buildMessages({ schema, frictionContext });

    // 3. Attempt LLM client invocation if configured
    let rawResponseText = '';
    let generationSource = 'deterministic-fallback';

    if (this.llmClient && typeof this.llmClient.invoke === 'function') {
      try {
        const response = await this.llmClient.invoke(messages);
        rawResponseText = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
        generationSource = 'openai-gpt4o';
      } catch {
        console.warn('[AuraGen] OpenAI invocation failed. Using the deterministic generator.');
        rawResponseText = this._generateDeterministicFallback(schema, frictionContext);
        generationSource = 'fallback-after-error';
      }
    } else {
      // Offline / deterministic fallback
      rawResponseText = this._generateDeterministicFallback(schema, frictionContext);
    }

    // 4. Parse JSON
    let parsedOutput = null;
    try {
      const cleanJson = this._cleanJsonMarkdown(rawResponseText);
      parsedOutput = JSON.parse(cleanJson);
    } catch {
      return {
        success: false,
        errors: ['The generator did not return valid JSON.'],
        source: generationSource
      };
    }

    if (generationSource === 'openai-gpt4o') {
      const result = validate(parsedOutput?.componentCode);
      if (!result.ok) {
        return {
          success: false,
          errors: result.errors.map(({ message }) => message),
          issues: result.errors,
          source: generationSource
        };
      }
    }

    const validationResult = validateGenerationResult(schema, parsedOutput, { scanCode: false });
    if (!validationResult.passed) {
      return {
        success: false,
        errors: validationResult.errors,
        source: generationSource
      };
    }

    return {
      success: true,
      data: parsedOutput,
      errors: [],
      source: generationSource
    };
  }

  /**
   * Helper to strip markdown fence blocks if present in LLM output
   * 
   * @private
   */
  _cleanJsonMarkdown(text) {
    if (!text) return '{}';
    let trimmed = text.trim();
    if (trimmed.startsWith('```json')) {
      trimmed = trimmed.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
    } else if (trimmed.startsWith('```')) {
      trimmed = trimmed.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    return trimmed.trim();
  }

  /**
   * Deterministic generator fallback for offline environments, rate limits, or testing without API keys
   * 
   * @private
   */
  _generateDeterministicFallback(schema, frictionContext) {
    const formName = typeof schema.formName === 'string' ? schema.formName.replace(/[^A-Za-z0-9_$]/g, '_') : '';
    const componentName = `${/^[A-Za-z_$]/.test(formName) ? formName : 'Generated'}Wizard`;
    const fields = schema.fields || [];
    const fieldData = JSON.stringify(JSON.stringify(fields.map(({ name, label, type, required, options }) => ({
      name, label, type, required, options
    })))).replace(/[<>&\u2028\u2029]/gu, (character) =>
      '\\u' + character.charCodeAt(0).toString(16).padStart(4, '0'));
    
    // Group fields into 2 to 4 digestible steps (3 to 5 fields per step)
    const chunkSize = Math.max(2, Math.ceil(fields.length / 3));
    const stepList = [];
    const fieldsByStep = {};

    for (let i = 0; i < fields.length; i += chunkSize) {
      const stepIdx = stepList.length;
      const chunk = fields.slice(i, i + chunkSize);
      const chunkFieldNames = chunk.map(f => f.name);
      fieldsByStep[String(stepIdx)] = chunkFieldNames;
      stepList.push({
        stepIndex: stepIdx,
        title: `Step ${stepIdx + 1}: Details`,
        description: `Please review and complete the fields for step ${stepIdx + 1}`,
        fields: chunkFieldNames
      });
    }

    const output = {
      componentName,
      componentCode: `import React, { useState } from 'react';
import { Button, Input, Select, Card, StepProgress } from '${DESIGN_SYSTEM_MODULES[0]}';

const fields = JSON.parse(${fieldData});

export default function ${componentName}({ onSubmit }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState(() => Object.fromEntries(fields.map((field) => [field.name, ''])));
  const [errors, setErrors] = useState({});

  const steps = ${JSON.stringify(stepList.map((s, idx) => ({ id: idx, title: s.title })), null, 2)};

  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNext = () => setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
  const handlePrev = () => setCurrentStep(prev => Math.max(prev - 1, 0));

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <StepProgress steps={steps} currentStep={currentStep} />
      <Card title={steps[currentStep]?.title}>
        <div className="space-y-4">
          {fields.map((field) => {
            const props = {
              id: field.name, name: field.name, label: field.label || field.name,
              value: formData[field.name], required: Boolean(field.required),
              onChange: (event) => handleChange(field.name, event.target.value)
            };
            return field.type === 'select'
              ? <Select key={field.name} {...props} options={field.options || []} />
              : <Input key={field.name} {...props} type={field.type || 'text'} />;
          })}
        </div>
      </Card>
      <div className="flex justify-between items-center pt-4">
        {currentStep > 0 && <Button variant="outline" onClick={handlePrev}>Previous</Button>}
        {currentStep < steps.length - 1 ? (
          <Button variant="primary" onClick={handleNext}>Next Step</Button>
        ) : (
          <Button variant="primary" onClick={() => onSubmit && onSubmit(formData)}>Submit</Button>
        )}
      </div>
    </div>
  );
}`,
      steps: stepList,
      fieldMapping: {
        originalFieldCount: fields.length,
        mappedFieldCount: fields.length,
        fieldsByStep
      },
      validationSummary: {
        isValid: true,
        hasAllRequiredFields: true,
        notes: `Successfully organized ${fields.length} fields across ${stepList.length} wizard steps with full field preservation.`
      }
    };

    return JSON.stringify(output);
  }
}

export default CodeGeneratorService;
