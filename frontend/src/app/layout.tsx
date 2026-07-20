import type { Metadata } from "next";

import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "CourseForge AI — Turn any PDF into a complete course",
  description:
    "Upload a PDF and CourseForge builds you a structured, lesson-by-lesson course — chapters, topics, quizzes and review. Notion + Linear + ChatGPT for learning.",
  metadataBase: new URL("http://localhost:3001"),
  openGraph: {
    title: "CourseForge AI",
    description:
      "Turn any PDF into a structured, lesson-by-lesson course — powered by AI agents.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
