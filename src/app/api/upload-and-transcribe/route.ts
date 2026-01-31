import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { transcribe, formatTranscriptionText } from "@/lib/transcription";
import { TranscriptionProvider } from "@/lib/types";

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

interface TranscribeRequestBody {
  audioFileId: string;
  fileUrl: string;
  fileName: string;
  provider?: string;
  language?: string;
  diarization?: boolean;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Verify authentication
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = (await request.json()) as TranscribeRequestBody;
    const { audioFileId, fileUrl, fileName, provider, language, diarization } =
      body;

    // Validate required fields
    if (!fileUrl || !fileName) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: fileUrl, fileName" },
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

    // Transcribe
    const result = await transcribe(fileBuffer, fileName, {
      provider: (provider || "openai") as TranscriptionProvider,
      language,
      diarization: diarization ?? false,
    });

    const formattedText = formatTranscriptionText(result);

    return NextResponse.json({
      success: true,
      text: formattedText,
      provider: provider || "openai",
      fileName,
      audioFileId,
    });
  } catch (error) {
    console.error("Transcription error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
