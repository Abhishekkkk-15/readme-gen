import type { Model } from '@/types'

/** Very rough token estimate from characters (4 chars ≈ 1 token heuristic). */
export function estimateTokensFromText(chars: number) {
  return Math.max(200, Math.ceil(chars / 4))
}

export function estimateGenerationCostUsd(model: Model | undefined, inputChars: number, outputChars: number) {
  if (!model) return { inputTokens: 0, outputTokens: 0, inputUsd: 0, outputUsd: 0, totalUsd: 0 }
  const inputTokens = estimateTokensFromText(inputChars)
  const outputTokens = estimateTokensFromText(outputChars)
  const inM = inputTokens / 1_000_000
  const outM = outputTokens / 1_000_000
  const inputUsd = inM * model.pricing.input
  const outputUsd = outM * model.pricing.output
  return {
    inputTokens,
    outputTokens,
    inputUsd,
    outputUsd,
    totalUsd: inputUsd + outputUsd,
  }
}
