/**
 * AuraGen Code Generation Validator
 * 
 * Reusable validator for prompt outputs, generated React code,
 * output contracts, and security constraints.
 */

export const PROHIBITED_CODE_PATTERNS = [
  /\beval\s*\(/i,
  /\bnew\s+Function\s*\(/i,
  /dangerouslySetInnerHTML/i,
  /<script\b/i,
  /\bprocess\.env\b/i,
  /\bfetch\s*\(/i,
  /\bXMLHttpRequest\b/i,
  /\blocalStorage\b/i,
  /\bsessionStorage\b/i,
  /\bdocument\.cookie\b/i
];

export const REQUIRED_OUTPUT_KEYS = [
  'componentName',
  'componentCode',
  'steps',
  'fieldMapping',
  'validationSummary'
];

/**
 * Validates the raw JSON output structure from LLM against the AuraGen contract
 * 
 * @param {Object} output
 * @returns {{isValid: boolean, errors: string[]}}
 */
export function validateOutputContract(output) {
  const errors = [];

  if (!output || typeof output !== 'object') {
    return { isValid: false, errors: ['Output must be a non-null object'] };
  }

  for (const key of REQUIRED_OUTPUT_KEYS) {
    if (!(key in output)) {
      errors.push(`Missing required output key: "${key}"`);
    }
  }

  if (typeof output.componentName !== 'string' || !output.componentName.trim()) {
    errors.push('componentName must be a non-empty string');
  }

  if (typeof output.componentCode !== 'string') {
    errors.push('componentCode must be a string');
  }

  if (!Array.isArray(output.steps)) {
    errors.push('steps must be an array');
  }

  if (!output.fieldMapping || typeof output.fieldMapping !== 'object') {
    errors.push('fieldMapping must be an object');
  }

  if (!output.validationSummary || typeof output.validationSummary !== 'object') {
    errors.push('validationSummary must be an object');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates that an input schema is well-formed
 * 
 * @param {Object} schema
 * @returns {{isValid: boolean, errors: string[]}}
 */
export function validateInputSchema(schema) {
  const errors = [];

  if (!schema || typeof schema !== 'object') {
    return { isValid: false, errors: ['Input schema must be a non-null object'] };
  }

  if (!Array.isArray(schema.fields) || schema.fields.length === 0) {
    errors.push('Input schema must contain a non-empty "fields" array');
  } else {
    const seenNames = new Set();
    schema.fields.forEach((field, index) => {
      if (!field.name) {
        errors.push(`Field at index ${index} is missing "name" property`);
      } else {
        if (seenNames.has(field.name)) {
          errors.push(`Duplicate field name detected: "${field.name}"`);
        }
        seenNames.add(field.name);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Scans generated component code for security violations and forbidden patterns
 * 
 * @param {string} code
 * @returns {{isSecure: boolean, violations: string[]}}
 */
export function scanSecurityPatterns(code) {
  const violations = [];
  if (!code || typeof code !== 'string') return { isSecure: true, violations };

  for (const pattern of PROHIBITED_CODE_PATTERNS) {
    if (pattern.test(code)) {
      violations.push(`Security violation detected: code matches prohibited pattern "${pattern.toString()}"`);
    }
  }

  return {
    isSecure: violations.length === 0,
    violations
  };
}

/**
 * Validates that all fields from original schema are preserved in the generated steps
 * 
 * @param {Object} originalSchema
 * @param {Object} generatedOutput
 * @returns {{isPreserved: boolean, missingFields: string[]}}
 */
export function validateFieldPreservation(originalSchema, generatedOutput) {
  if (!originalSchema?.fields || !Array.isArray(originalSchema.fields)) {
    return { isPreserved: true, missingFields: [] };
  }

  const expectedFieldNames = originalSchema.fields.map(f => f.name);
  const code = generatedOutput?.componentCode || '';
  const missingFields = [];

  // Check in code or in steps
  const stepsFields = (generatedOutput?.steps || []).flatMap(s => s.fields || []);

  for (const fieldName of expectedFieldNames) {
    const inCode = code.includes(fieldName);
    const inSteps = stepsFields.includes(fieldName);
    if (!inCode && !inSteps) {
      missingFields.push(fieldName);
    }
  }

  return {
    isPreserved: missingFields.length === 0,
    missingFields
  };
}

/**
 * Comprehensive validation function covering contract, security, and field preservation
 * 
 * @param {Object} originalSchema
 * @param {Object} generatedOutput
 * @returns {{passed: boolean, errors: string[]}}
 */
export function validateGenerationResult(originalSchema, generatedOutput) {
  const allErrors = [];

  const contractCheck = validateOutputContract(generatedOutput);
  if (!contractCheck.isValid) {
    allErrors.push(...contractCheck.errors);
  }

  const securityCheck = scanSecurityPatterns(generatedOutput?.componentCode);
  if (!securityCheck.isSecure) {
    allErrors.push(...securityCheck.violations);
  }

  if (originalSchema && generatedOutput?.validationSummary?.isValid !== false) {
    const preservationCheck = validateFieldPreservation(originalSchema, generatedOutput);
    if (!preservationCheck.isPreserved) {
      allErrors.push(`Fields missing from generated output: ${preservationCheck.missingFields.join(', ')}`);
    }
  }

  return {
    passed: allErrors.length === 0,
    errors: allErrors
  };
}
