/**
 * Voice / perspective for README generation (aligned with web app personas).
 */
export function getPersonaGuidance(persona: string): string {
  switch (persona.toLowerCase()) {
    case 'senior developer':
      return 'Emphasize architecture, performance, and maintainability. Use precise technical terms. Focus on data flow and state management.';
    case 'startup founder':
      return 'Focus on the value proposition, high-level features, and speed of getting started. Keep it polished, visionary, and user-centric.';
    case 'educational/beginner':
      return 'Explain concepts simply, provide step-by-step guidance, and explain how things work under the hood in a clear way.';
    case 'open source contributor':
      return 'Emphasize community guidelines, contribution flows, testing, and issue reporting. Keep it welcoming but rigorous.';
    default:
      return 'Standard technical documentation persona.';
  }
}

/** Labels allowed by CLI and web (display value). */
export const README_PERSONAS = [
  'Senior Developer',
  'Startup Founder',
  'Educational/Beginner',
  'Open Source Contributor',
] as const;

export type ReadmePersona = (typeof README_PERSONAS)[number];
