import { createClient } from "@deepgram/sdk";
import { TranscriptionResult } from "./types";

export async function transcribeWithDeepgram(
  fileBuffer: Buffer,
  fileName: string,
  language?: string,
  diarization?: boolean
): Promise<TranscriptionResult> {
  const deepgram = createClient(process.env.DEEPGRAM_API_KEY!);

  const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
    fileBuffer,
    {
      model: "nova-3",
      language: language || "en",
      smart_format: true,
      diarize: diarization || false,
      punctuate: true,
      utterances: true,
    }
  );

  if (error) {
    throw new Error(`Deepgram error: ${error.message}`);
  }

  const channel = result.results?.channels[0];
  const alternatives = channel?.alternatives[0];

  if (!alternatives) {
    throw new Error("No transcription results from Deepgram");
  }

  return {
    text: alternatives.transcript,
    words: alternatives.words?.map((word) => ({
      word: word.word,
      start: word.start,
      end: word.end,
      confidence: word.confidence,
      speaker: word.speaker !== undefined ? `Speaker ${word.speaker}` : undefined,
    })),
    segments: result.results?.utterances?.map((utterance) => ({
      start: utterance.start,
      end: utterance.end,
      text: utterance.transcript,
      speaker: utterance.speaker !== undefined ? `Speaker ${utterance.speaker}` : undefined,
    })),
  };
}
