import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

// Configure responsive color states for browser ui bars
export const viewport: Viewport = {
  themeColor: "#09090b", // Match Tailwind zinc-950 dark background
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

// SEO-Optimized Metadata
export const metadata: Metadata = {
  title: "QuickChat — Connect, Talk, and Share Code Instantly",
  description: "Meet new people and share cleanly formatted code snippets in real-time. A fast, spam-proof random chat web app designed for developers and learners.",
  keywords: ["chat", "random chat", "code sharing", "real-time messenger", "QuickChat", "developer chat", "messaging", "meet developers"],
  authors: [{ name: "QuickChat Team" }],
  creator: "QuickChat",
  publisher: "QuickChat",
  
  // Robots directions for crawling
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // Open Graph (Link Preview card metadata)
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://quickchat.example.com", // update with your custom host link
    title: "QuickChat — Instant Messaging & Live Code Share",
    description: "A lightning-fast, privacy-first random messenger with robust code snippet syntax highlighting and reaction tools.",
    siteName: "QuickChat",
  },

  // Twitter Previews
  twitter: {
    card: "summary_large_image",
    title: "QuickChat — Connect, Talk, and Share Code Instantly",
    description: "A fast, privacy-first random chat web app with live code syntax formatting.",
  },

  // Target search engines optimization
  alternates: {
    canonical: "https://quickchat.example.com",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100 overflow-x-hidden select-none">
        {children}
      </body>
    </html>
  );
}