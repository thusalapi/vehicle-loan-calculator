import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const title = "Vehicle Loan Calculator — Sri Lanka";
const description =
  "Work out the monthly installment, total interest and full repayment schedule on a vehicle loan in Sri Lanka. Compare reducing-balance and flat-interest financing, model fees and down payments, and export the schedule.";

/**
 * Absolute base for Open Graph image URLs.
 *
 * Vercel sets `VERCEL_PROJECT_PRODUCTION_URL` automatically on every
 * deployment, so no environment variable needs configuring by hand; locally it
 * falls back to the dev server.
 */
const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: "%s · Vehicle Loan Calculator",
  },
  description,
  applicationName: "Vehicle Loan Calculator",
  keywords: [
    "vehicle loan calculator",
    "car loan Sri Lanka",
    "leasing calculator",
    "EMI calculator LKR",
    "amortization schedule",
    "reducing balance",
    "flat interest",
  ],
  authors: [{ name: "Vehicle Loan Calculator" }],
  openGraph: {
    type: "website",
    url: siteUrl,
    title,
    description,
    siteName: "Vehicle Loan Calculator",
    locale: "en_LK",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
