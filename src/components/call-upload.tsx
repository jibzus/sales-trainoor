"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Upload, Loader2, CheckCircle2, AlertCircle, FileAudio } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SalesFeedback } from "@/lib/types";

interface AnalyzeCallResponse {
  success: boolean;
  transcriptionText: string;
  provider: string;
  usedFallback: boolean;
  audioFileId: string;
  fileName: string;
  feedback: SalesFeedback;
  model: string;
  error?: string;
}

type UploadState = "idle" | "uploading" | "transcribing" | "analyzing" | "complete" | "error";

interface CallUploadProps {
  onFeedbackReceived?: (feedback: SalesFeedback, transcriptionId: Id<"transcriptions">) => void;
}

const ACCEPTED_FORMATS = {
  "audio/mpeg": [".mp3"],
  "audio/mp4": [".mp4", ".m4a"],
  "audio/wav": [".wav"],
  "audio/webm": [".webm"],
  "audio/ogg": [".ogg"],
  "audio/flac": [".flac"],
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const STATE_MESSAGES: Record<UploadState, string> = {
  idle: "Drop your sales call audio here",
  uploading: "Uploading audio file...",
  transcribing: "Transcribing your call...",
  analyzing: "Analyzing sales performance...",
  complete: "Analysis complete!",
  error: "Something went wrong",
};

export function CallUpload({ onFeedbackReceived }: CallUploadProps): React.ReactElement {
  const [state, setState] = useState<UploadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const generateUploadUrl = useMutation(api.audiofiles.generateUploadUrl);
  const createAudioFile = useMutation(api.audiofiles.createAudioFile);
  const createTranscription = useMutation(api.transcriptions.createTranscription);
  const createFeedback = useMutation(api.feedback.createFeedback);

  // Get user's custom prompt from settings
  const userSettings = useQuery(api.settings.getUserSettings);

  const processFile = useCallback(
    async (file: File) => {
      setFileName(file.name);
      setError(null);

      try {
        // Step 1: Upload to Convex storage
        setState("uploading");
        const uploadUrl = await generateUploadUrl();

        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload file");
        }

        const { storageId } = (await uploadResponse.json()) as { storageId: Id<"_storage"> };

        // Create audio file record
        const { id: audioFileId, fileUrl } = await createAudioFile({
          storageId,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        });

        // Step 2: Call analyze-call endpoint (handles transcription + feedback)
        setState("transcribing");
        const analyzeResponse = await fetch("/api/analyze-call", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audioFileId,
            fileUrl,
            fileName: file.name,
            customPrompt: userSettings?.customPrompt,
          }),
        });

        if (!analyzeResponse.ok) {
          const errorData = (await analyzeResponse.json()) as { error?: string };
          throw new Error(errorData.error || "Failed to analyze call");
        }

        setState("analyzing");

        const result = (await analyzeResponse.json()) as AnalyzeCallResponse;

        if (!result.success) {
          throw new Error(result.error || "Analysis failed");
        }

        // Step 3: Save transcription to Convex
        const transcriptionId = await createTranscription({
          audioFileId: audioFileId as Id<"audiofiles">,
          transcriptionText: result.transcriptionText,
          provider: result.provider,
          diarizationEnabled: true,
          status: "completed",
          fileName: result.fileName,
          language: "en",
        });

        // Step 4: Save feedback to Convex
        await createFeedback({
          transcriptionId,
          feedback: JSON.stringify(result.feedback),
          overallScore: result.feedback.overallScore,
          model: result.model,
        });

        setState("complete");

        if (onFeedbackReceived && result.feedback) {
          onFeedbackReceived(result.feedback, transcriptionId);
        }
      } catch (err) {
        console.error("Upload error:", err);
        setState("error");
        setError(err instanceof Error ? err.message : "An unexpected error occurred");
      }
    },
    [generateUploadUrl, createAudioFile, createTranscription, createFeedback, userSettings, onFeedbackReceived]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        processFile(file);
      }
    },
    [processFile]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: ACCEPTED_FORMATS,
    maxSize: MAX_FILE_SIZE,
    maxFiles: 1,
    disabled: state !== "idle" && state !== "complete" && state !== "error",
  });

  const reset = (): void => {
    setState("idle");
    setError(null);
    setFileName(null);
  };

  const isProcessing = state === "uploading" || state === "transcribing" || state === "analyzing";

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer",
          isDragActive && "border-blue-500 bg-blue-50 dark:bg-blue-950/20",
          state === "idle" && "border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600",
          state === "complete" && "border-green-500 bg-green-50 dark:bg-green-950/20",
          state === "error" && "border-red-500 bg-red-50 dark:bg-red-950/20",
          isProcessing && "border-blue-400 bg-blue-50 dark:bg-blue-950/20 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-4">
          {/* Icon */}
          <div
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center",
              state === "idle" && "bg-gray-100 dark:bg-gray-800",
              isProcessing && "bg-blue-100 dark:bg-blue-900",
              state === "complete" && "bg-green-100 dark:bg-green-900",
              state === "error" && "bg-red-100 dark:bg-red-900"
            )}
          >
            {state === "idle" && <Upload className="w-8 h-8 text-gray-500 dark:text-gray-400" />}
            {isProcessing && <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />}
            {state === "complete" && <CheckCircle2 className="w-8 h-8 text-green-500" />}
            {state === "error" && <AlertCircle className="w-8 h-8 text-red-500" />}
          </div>

          {/* Status message */}
          <div className="space-y-2">
            <p
              className={cn(
                "text-lg font-medium",
                state === "error" && "text-red-600 dark:text-red-400",
                state === "complete" && "text-green-600 dark:text-green-400"
              )}
            >
              {STATE_MESSAGES[state]}
            </p>

            {fileName && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <FileAudio className="w-4 h-4" />
                <span>{fileName}</span>
              </div>
            )}

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            {fileRejections.length > 0 && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {fileRejections[0]?.errors[0]?.message || "File not accepted"}
              </p>
            )}
          </div>

          {/* Progress indicator */}
          {isProcessing && (
            <div className="w-full max-w-xs">
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span className={state === "uploading" ? "font-semibold text-blue-600" : ""}>Upload</span>
                <span className={state === "transcribing" ? "font-semibold text-blue-600" : ""}>Transcribe</span>
                <span className={state === "analyzing" ? "font-semibold text-blue-600" : ""}>Analyze</span>
              </div>
              <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-500"
                  style={{
                    width: state === "uploading" ? "33%" : state === "transcribing" ? "66%" : "100%",
                  }}
                />
              </div>
            </div>
          )}

          {/* Instructions */}
          {state === "idle" && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Drag and drop an audio file, or click to browse
              <br />
              <span className="text-xs">Supports MP3, M4A, WAV, WebM, OGG, FLAC (max 50MB)</span>
            </p>
          )}

          {/* Reset button */}
          {(state === "complete" || state === "error") && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                reset();
              }}
              className="mt-2 px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Upload another call
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
