import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { NavLinks } from "@/components/nav-links";
import { UpgradeBanner } from "@/components/upgrade-banner";
import { UserMenu } from "@/components/user-menu";
import { ViewerProvider } from "@/components/access";
import { getViewer } from "@/lib/access";
import { auth, signOut } from "@/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cursor Usage Tracker",
  description: "Monitor Cursor IDE usage, detect anomalies, and alert on spending spikes",
  icons: { icon: "/favicon.png" },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = process.env.AUTH_SECRET ? await auth() : null;
  const viewer = getViewer(session?.user?.email);

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen">
        <ViewerProvider value={viewer}>
          <nav className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-11">
                <div className="flex items-center gap-1">
                  <Link href="/" className="flex items-center gap-2 mr-4">
                    <Image src="/logo.png" alt="" width={22} height={22} aria-hidden />
                    <span className="text-sm font-semibold text-white">Cursor Tracker</span>
                  </Link>
                  <NavLinks />
                </div>
                <div className="flex items-center gap-2">
                  <UpgradeBanner />
                  {session?.user && (
                    <UserMenu
                      name={session.user.name ?? session.user.email ?? "User"}
                      email={session.user.email ?? ""}
                      image={session.user.image ?? undefined}
                      signOutAction={async () => {
                        "use server";
                        await signOut({ redirectTo: "/login" });
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          </nav>
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">{children}</main>
        </ViewerProvider>
      </body>
    </html>
  );
}
