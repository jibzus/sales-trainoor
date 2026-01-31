# Sales Call Feedback App

An AI-powered sales call feedback application that analyzes audio recordings of sales calls and provides actionable feedback.

## Quick Start

```bash
# Install dependencies
pnpm install

# Set up Convex (first time only)
npx convex dev

# Start development server
pnpm dev
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
# Convex
NEXT_PUBLIC_CONVEX_URL=         # From Convex dashboard

# Clerk (Authentication)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_JWT_ISSUER_DOMAIN=

# Transcription Providers (both needed for fallback)
DEEPGRAM_API_KEY=
ASSEMBLYAI_API_KEY=

# LLM Feedback (Groq)
GROQ_API_KEY=
```

## Architecture

- **Next.js 16** (App Router) + TypeScript + Tailwind
- **Convex** for database, file storage, and auth integration
- **Clerk** for authentication
- **Deepgram/AssemblyAI** for transcription (round-robin + fallback)
- **Groq API** with Llama 3.3 70B for feedback generation

## Key Files

| Path | Purpose |
|------|---------|
| `src/app/api/analyze-call/route.ts` | Main API endpoint (transcription + feedback) |
| `src/lib/provider-manager.ts` | Round-robin transcription provider distribution |
| `src/lib/groq-feedback.ts` | LLM feedback generation |
| `src/components/call-upload.tsx` | Audio upload component |
| `src/components/feedback-display.tsx` | Feedback visualization |
| `convex/schema.ts` | Database schema |
| `convex/feedback.ts` | Feedback mutations/queries |
| `convex/settings.ts` | User settings (custom prompts) |

## Flow

1. User uploads audio file
2. File stored in Convex storage
3. API route transcribes audio (Deepgram primary, AssemblyAI fallback)
4. Diarization always enabled (identifies speakers)
5. Transcript sent to Groq/Llama for analysis
6. Structured feedback returned with scores and recommendations
7. Both transcript and feedback saved to Convex

## Commands

```bash
pnpm dev          # Start dev server
pnpm build        # Build for production
pnpm typecheck    # Run TypeScript check
pnpm lint         # Run ESLint
```

## Notes

- Diarization is always enabled (hardcoded) since all calls have multiple speakers
- Provider selection uses round-robin to distribute load
- Custom prompts can be set in Settings page
- Feedback includes overall score (1-10) and detailed metrics
