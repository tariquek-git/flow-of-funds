import { FlowOfFundsSchema, type FlowOfFunds } from "./flow";

export type ValidationResult =
  | { ok: true; flow: FlowOfFunds }
  | { ok: false; errors: string[] };

export function validateFlow(candidate: unknown): ValidationResult {
  const result = FlowOfFundsSchema.safeParse(candidate);
  if (result.success) return { ok: true, flow: result.data };
  return {
    ok: false,
    errors: result.error.issues.map(
      (issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`,
    ),
  };
}
