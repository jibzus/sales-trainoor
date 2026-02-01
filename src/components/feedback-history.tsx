"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { FeedbackDisplay } from "./feedback-display";
import { cn } from "@/lib/utils";
import { FileAudio, Calendar, ChevronRight, X } from "lucide-react";
import type { SalesFeedback } from "@/lib/types";
import type { Id, Doc } from "../../convex/_generated/dataModel";

interface FeedbackWithTranscription {
  feedback: Doc<"callFeedback">;
  transcription: Doc<"transcriptions"> | null;
}

function ScoreBadge({ score }: { score: number }): React.ReactElement {
  const getColor = (s: number): string => {
    if (s >= 8) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    if (s >= 6) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    if (s >= 4) return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  };

  return (
    <span className={cn("px-2 py-1 rounded-full text-sm font-medium", getColor(score))}>
      {score}/10
    </span>
  );
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Today";
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  }
}

export function FeedbackHistory(): React.ReactElement {
  const feedbackList = useQuery(api.feedback.listUserFeedback);
  const [selectedFeedbackId, setSelectedFeedbackId] = useState<Id<"callFeedback"> | null>(null);

  // Get all unique transcription IDs
  const transcriptionIds = feedbackList
    ?.map((f) => f.transcriptionId)
    .filter((id): id is Id<"transcriptions"> => id !== undefined) ?? [];

  // Fetch transcriptions for the feedback items
  const transcriptions = useQuery(
    api.transcriptions.getTranscriptionsByIds,
    transcriptionIds.length > 0 ? { ids: transcriptionIds } : "skip"
  );

  // Combine feedback with transcription data
  const feedbackWithTranscriptions: FeedbackWithTranscription[] = (feedbackList ?? []).map((feedback) => {
    const transcription = transcriptions?.find(
      (t) => t && t._id === feedback.transcriptionId
    ) ?? null;
    return { feedback, transcription };
  });

  const selectedItem = feedbackWithTranscriptions.find(
    (item) => item.feedback._id === selectedFeedbackId
  );

  // Loading state
  if (feedbackList === undefined) {
    return (
      <div className="text-center py-8">
        <div className="animate-pulse space-y-3">
          <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        </div>
      </div>
    );
  }

  // Empty state
  if (feedbackList.length === 0) {
    return (
      <div className="text-gray-500 dark:text-gray-400 text-center py-8 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
        <FileAudio className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No call analyses yet.</p>
        <p className="text-sm mt-1">Upload a recording above to get started.</p>
      </div>
    );
  }

  // Show full feedback view
  if (selectedItem) {
    let parsedFeedback: SalesFeedback;
    try {
      parsedFeedback = JSON.parse(selectedItem.feedback.feedback) as SalesFeedback;
    } catch {
      return (
        <div className="text-red-500 text-center py-8">
          Error loading feedback data.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelectedFeedbackId(null)}
          className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
        >
          <X className="w-4 h-4" />
          Back to history
        </button>
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
          {selectedItem.transcription?.fileName ?? "Unknown file"} &middot;{" "}
          {formatDate(selectedItem.feedback.createdAt)}
        </div>
        <FeedbackDisplay feedback={parsedFeedback} />
      </div>
    );
  }

  // Show list view
  return (
    <div className="space-y-3">
      {feedbackWithTranscriptions.map(({ feedback, transcription }) => (
        <button
          key={feedback._id}
          onClick={() => setSelectedFeedbackId(feedback._id)}
          className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm transition-all text-left"
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <FileAudio className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div className="min-w-0">
              <div className="font-medium truncate">
                {transcription?.fileName ?? "Untitled Recording"}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(feedback.createdAt)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ScoreBadge score={feedback.overallScore} />
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
        </button>
      ))}
    </div>
  );
}
