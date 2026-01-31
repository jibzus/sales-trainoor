"use client";

import { useState } from "react";
import { CallUpload } from "./call-upload";
import { FeedbackDisplay } from "./feedback-display";
import { Id } from "../../convex/_generated/dataModel";
import type { SalesFeedback } from "@/lib/types";

export function Dashboard(): React.ReactElement {
  const [currentFeedback, setCurrentFeedback] = useState<SalesFeedback | null>(null);
  // Store transcriptionId for potential future use (e.g., saving feedback, navigation)
  const [, setCurrentTranscriptionId] = useState<Id<"transcriptions"> | null>(null);

  const handleFeedbackReceived = (
    feedback: SalesFeedback,
    transcriptionId: Id<"transcriptions">
  ): void => {
    setCurrentFeedback(feedback);
    setCurrentTranscriptionId(transcriptionId);
  };

  return (
    <div className="space-y-12">
      <section>
        <h2 className="text-2xl font-semibold mb-4">Upload Audio</h2>
        <CallUpload onFeedbackReceived={handleFeedbackReceived} />
      </section>

      {currentFeedback && (
        <section>
          <h2 className="text-2xl font-semibold mb-4">Feedback Results</h2>
          <FeedbackDisplay feedback={currentFeedback} />
        </section>
      )}

      {/* Placeholder for feedback history - to be implemented */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Previous Calls</h2>
        <div className="text-gray-500 dark:text-gray-400 text-center py-8 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
          <p>Your previous call analyses will appear here.</p>
        </div>
      </section>
    </div>
  );
}
