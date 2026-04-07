import { README_PERSONAS } from "readme-gen-analyzer";

export { README_PERSONAS };

export const DEFAULT_PERSONA = "Senior Developer" as const;

export const PERSONA_CLI_CHOICES = [...README_PERSONAS] as string[];
