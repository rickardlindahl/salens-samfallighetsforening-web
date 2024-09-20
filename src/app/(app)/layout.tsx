import "@/styles/globals.css";

import { TailwindIndicator } from "@/components/tailwind-indicator";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/providers/auth";
import { cn } from "@/lib/utils";
import PlausibleProvider from "next-plausible";
import { Inter } from "next/font/google";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export default function RootLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          inter.variable,
        )}
      >
        <PlausibleProvider domain="salenssamfallighetsforening.se" selfHosted>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <AuthProvider api="rest">{children}</AuthProvider>
            <Toaster richColors />
            <TailwindIndicator />
          </ThemeProvider>
        </PlausibleProvider>
      </body>
    </html>
  );
}
