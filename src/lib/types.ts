// Only Deepgram and AssemblyAI - both support diarization
export type TranscriptionProvider = "deepgram" | "assemblyai";

export interface TranscriptionResult {
  text: string;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
    speaker?: string;
  }>;
  words?: Array<{
    word: string;
    start: number;
    end: number;
    confidence?: number;
    speaker?: string;
  }>;
}

export interface TranscriptionError {
  provider: TranscriptionProvider;
  message: string;
  code?: string;
}

export interface ProviderConfig {
  maxFileSize: number;
  supportedFormats: string[];
  supportsDiarization: boolean;
}

export const PROVIDER_CONFIG: Record<TranscriptionProvider, ProviderConfig> = {
  deepgram: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    supportedFormats: ["mp3", "mp4", "wav", "flac", "ogg", "webm", "m4a"],
    supportsDiarization: true,
  },
  assemblyai: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    supportedFormats: ["mp3", "mp4", "wav", "flac", "ogg", "webm", "m4a"],
    supportsDiarization: true,
  },
};

// Sales call feedback types
export interface SalesFeedback {
  overallScore: number; // 1-10
  summary: string; // 2-3 sentence overview
  strengths: string[]; // What went well
  improvements: string[]; // Areas to work on
  keyMoments: Array<{
    timestamp?: string;
    speaker: string;
    observation: string;
  }>;
  metrics: {
    toneProfessionalism: number; // 1-10
    activeListening: number; // 1-10
    objectionHandling: number; // 1-10
    closingTechnique: number; // 1-10
    productKnowledge: number; // 1-10
  };
}
