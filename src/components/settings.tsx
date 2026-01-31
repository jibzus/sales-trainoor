"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Save, RotateCcw, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const DEFAULT_PROMPT = `You are an expert sales coach analyzing a sales call transcription.

Evaluate the call and provide feedback in the following JSON format:
{
  "overallScore": <1-10>,
  "summary": "<2-3 sentence overview>",
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "improvements": ["<improvement 1>", "<improvement 2>", ...],
  "keyMoments": [
    {"timestamp": "<if available>", "speaker": "<speaker>", "observation": "<what happened>"}
  ],
  "metrics": {
    "toneProfessionalism": <1-10>,
    "activeListening": <1-10>,
    "objectionHandling": <1-10>,
    "closingTechnique": <1-10>,
    "productKnowledge": <1-10>
  }
}

Focus on actionable feedback that helps the salesperson improve.`;

type SaveStatus = "idle" | "saving" | "success" | "error";

function SettingsForm({
  initialPrompt,
}: {
  initialPrompt: string;
}): React.ReactElement {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const updateSettings = useMutation(api.settings.updateUserSettings);

  const handleSave = async (): Promise<void> => {
    setSaveStatus("saving");
    setErrorMessage(null);

    try {
      await updateSettings({
        customPrompt: prompt.trim() || undefined,
      });
      setSaveStatus("success");

      // Reset status after 3 seconds
      setTimeout(() => {
        setSaveStatus("idle");
      }, 3000);
    } catch (err) {
      console.error("Failed to save settings:", err);
      setSaveStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Failed to save settings");
    }
  };

  const handleReset = (): void => {
    setPrompt("");
    setSaveStatus("idle");
    setErrorMessage(null);
  };

  const hasChanges = initialPrompt !== prompt;

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-2">Custom Feedback Prompt</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Customize the instructions given to the AI when analyzing your sales calls.
          Leave empty to use the default prompt.
        </p>

        <div className="space-y-4">
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={DEFAULT_PROMPT}
              rows={12}
              className={cn(
                "w-full rounded-lg border border-gray-300 dark:border-gray-600",
                "bg-white dark:bg-gray-800",
                "p-4 text-sm font-mono",
                "placeholder:text-gray-400 dark:placeholder:text-gray-500",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                "resize-y min-h-[200px]"
              )}
            />
            {prompt && (
              <div className="absolute top-2 right-2">
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {prompt.length} characters
                </span>
              </div>
            )}
          </div>

          {/* Status messages */}
          {saveStatus === "success" && (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>Settings saved successfully</span>
            </div>
          )}

          {saveStatus === "error" && (
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{errorMessage || "Failed to save settings"}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saveStatus === "saving" || !hasChanges}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm",
                "bg-blue-600 text-white",
                "hover:bg-blue-700",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "transition-colors"
              )}
            >
              {saveStatus === "saving" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saveStatus === "saving" ? "Saving..." : "Save Changes"}
            </button>

            <button
              onClick={handleReset}
              disabled={saveStatus === "saving" || !prompt}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm",
                "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
                "hover:bg-gray-200 dark:hover:bg-gray-700",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "transition-colors"
              )}
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Default
            </button>
          </div>
        </div>
      </div>

      {/* Default prompt preview */}
      <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Default Prompt (for reference)
        </h3>
        <pre className="text-xs text-gray-500 dark:text-gray-400 font-mono whitespace-pre-wrap overflow-x-auto">
          {DEFAULT_PROMPT}
        </pre>
      </div>
    </div>
  );
}

export function Settings(): React.ReactElement {
  const settings = useQuery(api.settings.getUserSettings);

  // Show loading state while fetching settings
  if (settings === undefined) {
    return (
      <div className="w-full max-w-3xl mx-auto">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Loading settings...</span>
          </div>
        </div>
      </div>
    );
  }

  // Render form with initial data (key forces remount when settings change externally)
  return (
    <SettingsForm
      key={settings?._id ?? "new"}
      initialPrompt={settings?.customPrompt ?? ""}
    />
  );
}
