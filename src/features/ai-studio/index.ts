// =============================================
// ai-studio barrel export
// =============================================

// Core
export * from './core/types';
export { InspirationEngine } from './core/InspirationEngine';
export * from './core/DesignConceptService';
export { ExportService } from './core/ExportService';

// Prompts
export { buildInspirationPrompt } from './prompts/promptBuilder';

// Hooks
export { useInspirationEngine } from './hooks/useInspirationEngine';
export { useDesignConcepts } from './hooks/useDesignConcepts';

// Shared
export { createWatermarkedImage } from './shared/WatermarkEngine';
