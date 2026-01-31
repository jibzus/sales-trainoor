import { HeaderAuth } from "@/components/header-auth";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="text-xl font-bold">
            Sales Call Feedback
          </Link>
          <HeaderAuth />
        </div>
      </header>
      <main className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            AI-Powered Sales Call Feedback
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Upload your sales calls and get actionable feedback on tone,
            objection handling, closing techniques, and more.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              href="/protected"
              className="rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              Get Started
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
