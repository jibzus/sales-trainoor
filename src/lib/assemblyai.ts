import { AssemblyAI } from "assemblyai";
import { TranscriptionResult } from "./types";

export async function transcribeWithAssemblyAI(
  fileBuffer: Buffer,
  fileName: string,
  language?: string,
  diarization?: boolean
): Promise<TranscriptionResult> {
  const client = new AssemblyAI({
    apiKey: process.env.ASSEMBLYAI_API_KEY!,
  });

  // Upload the file first
  const uploadUrl = await client.files.upload(fileBuffer);

  // Transcribe
  const transcript = await client.transcripts.transcribe({
    audio: uploadUrl,
    language_code: language || "en",
    speaker_labels: diarization || false,
  });

  if (transcript.status === "error") {
    throw new Error(`AssemblyAI error: ${transcript.error}`);
  }

  return {
    text: transcript.text || "",
    words: transcript.words?.map((word) => ({
      word: word.text,
      start: word.start / 1000, // Convert ms to seconds
      end: word.end / 1000,
      confidence: word.confidence,
      speaker: word.speaker ? `Speaker ${word.speaker}` : undefined,
    })),
    segments: transcript.utterances?.map((utterance) => ({
      start: utterance.start / 1000,
      end: utterance.end / 1000,
      text: utterance.text,
      speaker: utterance.speaker ? `Speaker ${utterance.speaker}` : undefined,
    })),
  };
}
