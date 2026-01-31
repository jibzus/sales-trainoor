import {
  TranscriptionProvider,
  TranscriptionResult,
  PROVIDER_CONFIG,
} from "./types";
import { transcribeWithDeepgram } from "./deepgram";
import { transcribeWithAssemblyAI } from "./assemblyai";

export interface TranscribeOptions {
  provider: TranscriptionProvider;
  language?: string;
  diarization?: boolean;
}

export async function transcribe(
  fileBuffer: Buffer,
  fileName: string,
  options: TranscribeOptions
): Promise<TranscriptionResult> {
  const { provider, language, diarization } = options;
  const config = PROVIDER_CONFIG[provider];

  // Validate file size
  if (fileBuffer.length > config.maxFileSize) {
    throw new Error(
      `File size exceeds maximum for ${provider}: ${(config.maxFileSize / 1024 / 1024).toFixed(0)}MB`
    );
  }

  // Validate file format
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext && !config.supportedFormats.includes(ext)) {
    throw new Error(
      `File format .${ext} not supported by ${provider}. Supported: ${config.supportedFormats.join(", ")}`
    );
  }

  switch (provider) {
    case "deepgram":
      return transcribeWithDeepgram(fileBuffer, fileName, language, diarization);
    case "assemblyai":
      return transcribeWithAssemblyAI(fileBuffer, fileName, language, diarization);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

export function formatTranscriptionText(result: TranscriptionResult): string {
  // If we have segments with speakers, format with speaker labels
  if (result.segments?.some((s) => s.speaker)) {
    return result.segments
      .map((seg) => {
        const speaker = seg.speaker || "Unknown";
        return `[${speaker}]: ${seg.text}`;
      })
      .join("\n\n");
  }

  // Otherwise return plain text
  return result.text;
}
