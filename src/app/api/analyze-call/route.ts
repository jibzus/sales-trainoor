import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  transcribeWithDistribution,
  TranscribeWithDistributionResult,
} from "@/lib/provider-manager";
import { formatTranscriptionText } from "@/lib/transcription";
import { generateSalesFeedback } from "@/lib/groq-feedback";
import { SalesFeedback } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow longer transcription time (seconds)

// Validate that URL is from Convex storage (prevent SSRF)
function isValidConvexStorageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Convex storage URLs are on *.convex.cloud domain
    return parsed.hostname.endsWith(".convex.cloud");
  } catch {
    return false;
  }
}

interface AnalyzeCallRequestBody {
  audioFileId: string;
  fileUrl: string;
  fileName: string;
  customPrompt?: string;
}

interface AnalyzeCallSuccessResponse {
  success: true;
  transcriptionText: string;
  provider: string;
  usedFallback: boolean;
  audioFileId: string;
  fileName: string;
  feedback: SalesFeedback;
  model: string;
}

interface AnalyzeCallErrorResponse {
  success: false;
  error: string;
}

type AnalyzeCallResponse = AnalyzeCallSuccessResponse | AnalyzeCallErrorResponse;

export async function POST(request: NextRequest): Promise<NextResponse<AnalyzeCallResponse>> {
  // Verify authentication
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = (await request.json()) as AnalyzeCallRequestBody;
    const { audioFileId, fileUrl, fileName, customPrompt } = body;

    // Validate required fields
    if (!audioFileId || !fileUrl || !fileName) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: audioFileId, fileUrl, fileName",
        },
        { status: 400 }
      );
    }

    // Security: Validate URL is from Convex storage to prevent SSRF
    if (!isValidConvexStorageUrl(fileUrl)) {
      return NextResponse.json(
        { success: false, error: "Invalid file URL" },
        { status: 400 }
      );
    }

    // Fetch file from Convex storage
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      return NextResponse.json(
        { success: false, error: "Failed to fetch file from storage" },
        { status: 500 }
      );
    }

    // Convert to Buffer
    const arrayBuffer = await fileResponse.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Transcribe with round-robin distribution and fallback
    let transcriptionResult: TranscribeWithDistributionResult;
    try {
      transcriptionResult = await transcribeWithDistribution(fileBuffer, fileName);
    } catch (transcriptionError) {
      console.error("Transcription failed:", transcriptionError);
      return NextResponse.json(
        {
          success: false,
          error:
            transcriptionError instanceof Error
              ? transcriptionError.message
              : "Transcription failed",
        },
        { status: 500 }
      );
    }

    const formattedText = formatTranscriptionText(transcriptionResult.result);

    // Generate sales feedback using Groq/Qwen
    let feedback: SalesFeedback;
    try {
      feedback = await generateSalesFeedback(formattedText, customPrompt);
    } catch (feedbackError) {
      console.error("Feedback generation failed:", feedbackError);
      return NextResponse.json(
        {
          success: false,
          error:
            feedbackError instanceof Error
              ? feedbackError.message
              : "Failed to generate feedback",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      transcriptionText: formattedText,
      provider: transcriptionResult.provider,
      usedFallback: transcriptionResult.usedFallback,
      audioFileId,
      fileName,
      feedback,
      model: "llama-3.3-70b-versatile",
    });
  } catch (error) {
    console.error("Analyze call error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
