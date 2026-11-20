/**
 * AuraGen Fallback UI Module (frontend/src/fallback)
 *
 * Provides graceful loading skeletons, resilient error boundaries,
 * pre-built wizard templates, and generation timeout/failure coordination.
 */

export * from "./ErrorBoundary.js";
export * from "./WizardLoadingSkeleton.js";
export * from "./prebuiltTemplates.js";
export * from "./generationFallbackManager.js";
export * from "./useGenerationFallback.js";
export { default } from "./ErrorBoundary.js";
