export type TutorFlags = { tutor: boolean; explanations: boolean; examples: boolean; practiceGeneration: boolean }

export const tutorFlags: TutorFlags = {
  tutor: import.meta.env.VITE_AI_TUTOR_ENABLED === 'true',
  explanations: import.meta.env.VITE_AI_EXPLANATIONS_ENABLED === 'true',
  examples: import.meta.env.VITE_AI_EXAMPLES_ENABLED === 'true',
  practiceGeneration: false,
}
