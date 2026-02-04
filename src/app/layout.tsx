import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "TORBIT | Build Software with AI",
  description: "The future of software creation. Describe your vision, we handle the rest. Powered by multi-agent AI.",
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
        className={`${spaceGrotesk.variable} antialiased bg-black text-white`}
      >
        {children}
      </body>
    </html>
  );
}
