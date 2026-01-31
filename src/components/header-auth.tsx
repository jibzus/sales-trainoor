import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from "next/link";

export function HeaderAuth() {
  return (
    <div className="flex items-center gap-4">
      <SignedOut>
        <Link
          href="/sign-in"
          className="text-sm font-medium hover:underline"
        >
          Sign In
        </Link>
        <Link
          href="/sign-up"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Sign Up
        </Link>
      </SignedOut>
      <SignedIn>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </div>
  );
}
