import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { AuthProvider } from "@/providers/AuthProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "TORBIT | Build Software with AI",
  description: "The future of software creation. Describe your vision, we handle the rest. Powered by Torbit's AI team.",
  keywords: ["AI", "software", "development", "agents", "enterprise", "automation"],
  authors: [{ name: "TORBIT" }],
  openGraph: {
    title: "TORBIT | Build Software with AI",
    description: "The future of software creation. Describe your vision, we handle the rest.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TORBIT | Build Software with AI",
    description: "The future of software creation. Describe your vision, we handle the rest.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable} font-sans antialiased bg-black text-white`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
