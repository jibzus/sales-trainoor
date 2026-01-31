import Groq from "groq-sdk";
import { SalesFeedback } from "./types";

const DEFAULT_SYSTEM_PROMPT = `You are an expert sales coach analyzing a sales call transcript. Provide actionable feedback on the salesperson's performance.

Analyze the conversation and respond with a JSON object containing:
- overallScore: A score from 1-10
- summary: A 2-3 sentence overview of the call
- strengths: An array of 3-5 things the salesperson did well
- improvements: An array of 3-5 areas for improvement
- keyMoments: An array of notable moments with { timestamp (optional), speaker, observation }
- metrics: An object with scores (1-10) for:
  - toneProfessionalism
  - activeListening
  - objectionHandling
  - closingTechnique
  - productKnowledge

Focus on specific, actionable feedback with examples from the call.
Respond ONLY with the JSON object, no additional text.`;

const DEFAULT_METRICS: SalesFeedback["metrics"] = {
  toneProfessionalism: 5,
  activeListening: 5,
  objectionHandling: 5,
  closingTechnique: 5,
  productKnowledge: 5,
};

function clampScore(value: unknown, defaultValue: number = 5): number {
  if (typeof value !== "number" || isNaN(value)) {
    return defaultValue;
  }
  return Math.max(1, Math.min(10, Math.round(value)));
}

function validateAndNormalizeFeedback(parsed: unknown): SalesFeedback {
  if (!parsed || typeof parsed !== "object") {
    throw new Error("LLM response is not a valid object");
  }

  const data = parsed as Record<string, unknown>;

  // Validate and normalize overallScore
  const overallScore = clampScore(data.overallScore);
  if (data.overallScore !== overallScore) {
    console.warn(
      `Normalized overallScore from ${data.overallScore} to ${overallScore}`
    );
  }

  // Validate summary
  let summary: string;
  if (typeof data.summary === "string" && data.summary.trim()) {
    summary = data.summary.trim();
  } else {
    console.warn("Missing or invalid summary, using default");
    summary = "Unable to generate summary for this call.";
  }

  // Validate strengths array
  let strengths: string[];
  if (Array.isArray(data.strengths)) {
    strengths = data.strengths
      .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
      .map((s) => s.trim());
    if (strengths.length === 0) {
      console.warn("No valid strengths found, using default");
      strengths = ["Unable to identify specific strengths from the transcript."];
    }
  } else {
    console.warn("Missing strengths array, using default");
    strengths = ["Unable to identify specific strengths from the transcript."];
  }

  // Validate improvements array
  let improvements: string[];
  if (Array.isArray(data.improvements)) {
    improvements = data.improvements
      .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
      .map((s) => s.trim());
    if (improvements.length === 0) {
      console.warn("No valid improvements found, using default");
      improvements = ["Unable to identify specific improvements from the transcript."];
    }
  } else {
    console.warn("Missing improvements array, using default");
    improvements = ["Unable to identify specific improvements from the transcript."];
  }

  // Validate keyMoments array
  let keyMoments: SalesFeedback["keyMoments"];
  if (Array.isArray(data.keyMoments)) {
    keyMoments = data.keyMoments
      .filter(
        (m): m is Record<string, unknown> =>
          m !== null && typeof m === "object"
      )
      .map((m) => ({
        timestamp:
          typeof m.timestamp === "string" ? m.timestamp : undefined,
        speaker: typeof m.speaker === "string" ? m.speaker : "Unknown",
        observation:
          typeof m.observation === "string"
            ? m.observation
            : "No observation provided",
      }))
      .filter((m) => m.observation !== "No observation provided");

    if (keyMoments.length === 0) {
      console.warn("No valid keyMoments found, using empty array");
      keyMoments = [];
    }
  } else {
    console.warn("Missing keyMoments array, using empty array");
    keyMoments = [];
  }

  // Validate metrics object
  let metrics: SalesFeedback["metrics"];
  if (data.metrics && typeof data.metrics === "object") {
    const m = data.metrics as Record<string, unknown>;
    metrics = {
      toneProfessionalism: clampScore(
        m.toneProfessionalism,
        DEFAULT_METRICS.toneProfessionalism
      ),
      activeListening: clampScore(
        m.activeListening,
        DEFAULT_METRICS.activeListening
      ),
      objectionHandling: clampScore(
        m.objectionHandling,
        DEFAULT_METRICS.objectionHandling
      ),
      closingTechnique: clampScore(
        m.closingTechnique,
        DEFAULT_METRICS.closingTechnique
      ),
      productKnowledge: clampScore(
        m.productKnowledge,
        DEFAULT_METRICS.productKnowledge
      ),
    };
  } else {
    console.warn("Missing metrics object, using defaults");
    metrics = { ...DEFAULT_METRICS };
  }

  return {
    overallScore,
    summary,
    strengths,
    improvements,
    keyMoments,
    metrics,
  };
}

function extractJsonFromResponse(content: string): unknown {
  // First, try to parse the entire content as JSON
  try {
    return JSON.parse(content);
  } catch {
    // Content is not pure JSON, try to extract it
  }

  // Try to find JSON within the content (handles markdown code blocks)
  const jsonPatterns = [
    /```json\s*([\s\S]*?)\s*```/, // ```json ... ```
    /```\s*([\s\S]*?)\s*```/, // ``` ... ```
    /\{[\s\S]*\}/, // Raw JSON object
  ];

  for (const pattern of jsonPatterns) {
    const match = content.match(pattern);
    if (match) {
      const jsonString = match[1] ?? match[0];
      try {
        return JSON.parse(jsonString);
      } catch {
        continue;
      }
    }
  }

  throw new Error(
    "Failed to extract valid JSON from LLM response. The model may not have returned properly formatted JSON."
  );
}

export async function generateSalesFeedback(
  transcript: string,
  customPrompt?: string
): Promise<SalesFeedback> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY environment variable is not set. Please add it to your .env.local file."
    );
  }

  if (!transcript || transcript.trim().length === 0) {
    throw new Error("Transcript cannot be empty");
  }

  const groq = new Groq({ apiKey });

  const systemPrompt = customPrompt?.trim() || DEFAULT_SYSTEM_PROMPT;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Please analyze the following sales call transcript and provide structured feedback:\n\n${transcript}`,
        },
      ],
      temperature: 0.3, // Lower temperature for more consistent JSON output
      max_tokens: 2048,
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      throw new Error(
        "Groq API returned an empty response. Please try again."
      );
    }

    const parsed = extractJsonFromResponse(content);
    const feedback = validateAndNormalizeFeedback(parsed);

    return feedback;
  } catch (error) {
    // Re-throw our own errors
    if (error instanceof Error) {
      // Check for specific Groq API errors
      if (error.message.includes("api_key")) {
        throw new Error(
          "Invalid Groq API key. Please check your GROQ_API_KEY in .env.local"
        );
      }
      if (error.message.includes("rate_limit")) {
        throw new Error(
          "Groq API rate limit exceeded. Please wait a moment and try again."
        );
      }
      if (error.message.includes("model")) {
        throw new Error(
          "The specified Groq model is not available. Please check model availability."
        );
      }
      // Re-throw if it's one of our validation errors
      if (
        error.message.includes("Failed to extract") ||
        error.message.includes("LLM response") ||
        error.message.includes("Transcript cannot") ||
        error.message.includes("GROQ_API_KEY")
      ) {
        throw error;
      }
    }

    // Wrap unknown errors
    throw new Error(
      `Failed to generate sales feedback: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

export { DEFAULT_SYSTEM_PROMPT };
