import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Settings } from "@/components/settings";
import { HeaderAuth } from "@/components/header-auth";
import Link from "next/link";

export default async function SettingsPage(): Promise<React.ReactElement> {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-bold">
              Sales Call Feedback
            </Link>
            <nav className="flex items-center gap-4">
              <Link
                href="/protected"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              >
                Dashboard
              </Link>
              <Link
                href="/settings"
                className="text-sm font-medium text-gray-900 dark:text-gray-100"
              >
                Settings
              </Link>
            </nav>
          </div>
          <HeaderAuth />
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>
        <Settings />
      </main>
    </div>
  );
}
