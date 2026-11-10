// ============================================================
// USER PROMPT BUILDER
// ============================================================

export function buildUserPrompt(frictionContext) {
    const {
        cognitiveLoadScore,    // number 0-100
        frictionPoint,         // { fieldId, fieldLabel, fieldType }
        userBehavior,          // { rageClicks, hesitationMs, cursorErraticness }
        currentFormSchema,     // JSON description of the current form fields
        sessionContext,        // { taskGoal, completedFields, remainingFields }
    } = frictionContext;

    return `## CURRENT SITUATION
A user on the Infotact financial portal is experiencing HIGH cognitive friction.

**Cognitive Load Score:** ${cognitiveLoadScore}/100 (threshold: 70)

## USER BEHAVIOR SIGNALS
- Rage Clicks Detected: ${userBehavior.rageClicks} clicks on the same element
- Hesitation Time on Current Field: ${userBehavior.hesitationMs}ms (normal: <3000ms)
- Cursor Erraticness Score: ${userBehavior.cursorErraticness}/100

## FRICTION POINT (WHERE the user is stuck)
- Field ID: "${frictionPoint.fieldId}"
- Field Label: "${frictionPoint.fieldLabel}"
- Field Type: "${frictionPoint.fieldType}"

## TASK CONTEXT
- User Goal: "${sessionContext.taskGoal}"
- Already Completed Fields: ${JSON.stringify(sessionContext.completedFields)}
- Remaining Fields to Complete: ${JSON.stringify(sessionContext.remainingFields)}

## CURRENT FORM SCHEMA (the complex form causing friction)
${JSON.stringify(currentFormSchema, null, 2)}

## YOUR TASK
Generate a React component that:
1. Converts the REMAINING fields into a simplified, conversational step-by-step wizard
2. Starts at the FRICTION POINT field ("${frictionPoint.fieldLabel}") with extra clarity
3. Shows progress (e.g., "Step 2 of 5")
4. Uses simple, plain-English labels replacing any financial jargon
5. Pre-populates already completed fields: ${JSON.stringify(sessionContext.completedFields)}
6. Calls onUpdate({ fieldId, value }) when any field changes
7. Calls onComplete(allFormData) when the user finishes all steps

Generate the component now.`;
}
