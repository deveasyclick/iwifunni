/**
 * Frontend configuration.
 *
 * All env-var reads are centralized here so the rest of the codebase
 * imports typed values instead of scattering `process.env.*` checks.
 *
 * NOTE: these are evaluated at module-load time (once per server process).
 * If you need runtime-reloadable config, wrap in a function instead.
 */

function env(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const config = {
  /** Backend API base URL (protocol + host + port). */
  apiUrl: env('API_URL', `http://localhost:${env('API_PORT', '8080')}`),

  /** Backend port override (only used when API_URL is not set). */
  apiPort: env('API_PORT', '8080'),

  /** Current environment name. */
  environment: env('ENVIRONMENT', 'development'),
} as const;

export type Config = typeof config;
