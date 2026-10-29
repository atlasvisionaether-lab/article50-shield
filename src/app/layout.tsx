import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Article50 Shield — EU AI Act Compliance Middleware",
  description:
    "Detect EU visitors, watermark AI-generated outputs, and prove Article 50 compliance of the EU AI Act with a compliance report in one API call.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
