// ============================================================
// USER PROMPT BUILDER — UPDATED WEEK 3
// Now includes full DOM context (form data, errors, history)
// so the LLM can generate a component that:
//   1. PRE-FILLS already typed data
//   2. ADDRESSES specific field errors with better copy
//   3. STARTS at exactly the right step
// ============================================================

export function buildUserPrompt(frictionContext) {
    const {
        cognitiveLoadScore,
        frictionPoint,
        userBehavior,
        currentFormSchema,
        sessionContext,
        // ── NEW WEEK 3 ──────────────────────────
        domContext,          // Full DOM state from ContextManager
    } = frictionContext;

    // Build the data preservation section
    const dataPreservationSection = buildDataPreservationSection(domContext);

    // Build the error context section
    const errorContextSection = buildErrorContextSection(domContext);

    // Build friction history section
    const frictionHistorySection = buildFrictionHistorySection(domContext);

    return `## CURRENT SITUATION
A user on the Infotact financial portal is experiencing HIGH cognitive friction.

**Cognitive Load Score:** ${cognitiveLoadScore}/100 (threshold: 70)

## USER BEHAVIOR SIGNALS
- Rage Clicks Detected: ${userBehavior.rageClicks} clicks on the same element
- Hesitation Time: ${userBehavior.hesitationMs}ms (normal: <3000ms)
- Cursor Erraticness: ${userBehavior.cursorErraticness}/100

## FRICTION POINT (WHERE the user is stuck)
- Field ID: "${frictionPoint.fieldId}"
- Field Label: "${frictionPoint.fieldLabel}"
- Field Type: "${frictionPoint.fieldType}"

## TASK CONTEXT
- User Goal: "${sessionContext.taskGoal}"

## CURRENT FORM SCHEMA
${JSON.stringify(currentFormSchema, null, 2)}

${dataPreservationSection}

${errorContextSection}

${frictionHistorySection}

## YOUR TASK
Generate a React wizard component that:
1. Converts REMAINING fields into a friendly, conversational step-by-step wizard
2. Starts at the friction field: "${frictionPoint.fieldLabel}"
3. PRE-POPULATES all fields where the user has already typed data (see PRESERVED DATA above)
4. For fields with errors — rewrite the label and add helper text to fix the confusion
5. Shows progress: "Step X of Y"
6. Uses plain English — replace ALL financial jargon with simple language
7. Calls onUpdate({ fieldId, value }) on every field change
8. Calls onComplete(allFormData) when the user finishes

CRITICAL: The 'formData' prop will contain all previously entered values.
Pre-fill each input like this: defaultValue={formData['fieldId'] || ''}

Generate the component now.`;
}

// ── SECTION BUILDERS ─────────────────────────────────────────

function buildDataPreservationSection(domContext) {
    if (!domContext) {
        return "## PRESERVED USER DATA\nNo previous data captured.";
    }

    const { completedFields, formData } = domContext;
    const hasData = Object.keys(completedFields || {}).length > 0;

    if (!hasData) {
        return "## PRESERVED USER DATA\nUser has not entered any data yet.";
    }

    const dataLines = Object.entries(completedFields)
        .map(([fieldId, value]) => `  - "${fieldId}": ${JSON.stringify(value)}`)
        .join("\n");

    return `## PRESERVED USER DATA (MUST PRE-FILL THESE IN GENERATED COMPONENT)
The user has already entered the following data.
Your generated component MUST pre-populate these fields using the formData prop.
DO NOT make the user re-enter this information.

${dataLines}

TOTAL FIELDS WITH DATA: ${Object.keys(completedFields).length}
INCOMPLETE FIELDS: ${(domContext.incompleteFields || []).join(", ")}`;
}

function buildErrorContextSection(domContext) {
    if (!domContext?.fieldErrors) return "";

    const errors = Object.entries(domContext.fieldErrors);
    if (errors.length === 0) return "";

    const errorLines = errors
        .map(([fieldId, error]) => `  - "${fieldId}": ${error}`)
        .join("\n");

    return `## CURRENT VALIDATION ERRORS (Address these in your generated UI)
These fields currently show errors. Rewrite their labels and add helper text
to guide the user to enter the correct format.

${errorLines}

For each of these fields, add a 'helperText' element below the input explaining
what the correct format is in simple, friendly language.`;
}

function buildFrictionHistorySection(domContext) {
    if (!domContext?.frictionHistory?.length) return "";

    const history = domContext.frictionHistory.slice(-5); // Last 5 events
    const problematic = domContext.problematicFields || [];

    if (problematic.length === 0) return "";

    return `## FRICTION HISTORY (Recurring problem areas)
The user has repeatedly struggled with these fields this session:
${problematic.map((f) => `  - "${f}"`).join("\n")}

Pay extra attention to these fields in your generated component.
They need the most simplified labels and best helper text.`;
}