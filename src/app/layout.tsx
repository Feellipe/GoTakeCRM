import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GoTakeCRM - CRM Dashboard - For Filmmakers & Photographers",
  description: "Modern CRM dashboard for filmmakers and photographers. Manage clients, track deals, schedule bookings, and monitor finances with beautiful glassmorphism design.",
  keywords: ["CRM", "filmmakers", "photographers", "WhatsApp", "Next.js", "TypeScript", "Tailwind CSS", "shadcn/ui", "React"],
  authors: [{ name: "Felipe Albuquerque" }],
  openGraph: {
    title: "GoTakeFilm",
    description: "Beautiful CRM dashboard for filmmakers and photographers",
    url: "https://gotakefilm.vercel.app",
    siteName: "GoTakeFilm",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CRM Dashboard For Filmmakers and Photographers",
    description: "Beautiful CRM dashboard for filmmakers and photographers",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
