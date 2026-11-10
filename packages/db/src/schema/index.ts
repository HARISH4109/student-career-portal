// Barrel export — Drizzle Kit and the Drizzle client both import from here.
// Grouped by bounded context to mirror the application's module map (see docs/ARCHITECTURE.md).

export * from './_shared';

export * from './identity.schema';
export * from './student.schema';
export * from './opportunities.schema';
export * from './preparation.schema';
export * from './engagement.schema';
export * from './intelligence.schema';
export * from './audit.schema';
export * from './career.schema';
