import { TranscriptionProvider, TranscriptionResult } from "./types";
import { transcribe, TranscribeOptions } from "./transcription";

const PROVIDERS: TranscriptionProvider[] = ["deepgram", "assemblyai"];

// Module-level variable for round-robin state
let currentProviderIndex = 0;

/**
 * Gets the next provider in the round-robin sequence.
 * Alternates between providers on each call.
 */
export function getNextProvider(): TranscriptionProvider {
  const provider = PROVIDERS[currentProviderIndex];
  currentProviderIndex = (currentProviderIndex + 1) % PROVIDERS.length;
  return provider;
}

/**
 * Gets the alternate provider (for fallback scenarios).
 */
function getAlternateProvider(
  currentProvider: TranscriptionProvider
): TranscriptionProvider {
  return currentProvider === "deepgram" ? "assemblyai" : "deepgram";
}

export interface TranscribeWithDistributionOptions {
  language?: string;
}

export interface TranscribeWithDistributionResult {
  result: TranscriptionResult;
  provider: TranscriptionProvider;
  usedFallback: boolean;
}

/**
 * Transcribes audio using round-robin provider distribution with fallback.
 * Always enables diarization.
 *
 * @param buffer - The audio file buffer
 * @param fileName - Name of the audio file (for format detection)
 * @param options - Additional transcription options
 * @returns The transcription result with provider info
 */
export async function transcribeWithDistribution(
  buffer: Buffer,
  fileName: string,
  options?: TranscribeWithDistributionOptions
): Promise<TranscribeWithDistributionResult> {
  const primaryProvider = getNextProvider();
  const fallbackProvider = getAlternateProvider(primaryProvider);

  const baseOptions: Omit<TranscribeOptions, "provider"> = {
    language: options?.language,
    diarization: true, // Always enable diarization
  };

  // Try primary provider first
  try {
    const result = await transcribe(buffer, fileName, {
      ...baseOptions,
      provider: primaryProvider,
    });

    return {
      result,
      provider: primaryProvider,
      usedFallback: false,
    };
  } catch (primaryError) {
    console.error(
      `Primary provider ${primaryProvider} failed:`,
      primaryError instanceof Error ? primaryError.message : primaryError
    );

    // Try fallback provider
    try {
      const result = await transcribe(buffer, fileName, {
        ...baseOptions,
        provider: fallbackProvider,
      });

      return {
        result,
        provider: fallbackProvider,
        usedFallback: true,
      };
    } catch (fallbackError) {
      console.error(
        `Fallback provider ${fallbackProvider} also failed:`,
        fallbackError instanceof Error ? fallbackError.message : fallbackError
      );

      // Both providers failed, throw a combined error
      throw new Error(
        `All transcription providers failed. ` +
          `Primary (${primaryProvider}): ${primaryError instanceof Error ? primaryError.message : "Unknown error"}. ` +
          `Fallback (${fallbackProvider}): ${fallbackError instanceof Error ? fallbackError.message : "Unknown error"}.`
      );
    }
  }
}

/**
 * Resets the provider index (useful for testing).
 */
export function resetProviderIndex(): void {
  currentProviderIndex = 0;
}

/**
 * Gets the current provider index (useful for testing/debugging).
 */
export function getCurrentProviderIndex(): number {
  return currentProviderIndex;
}
