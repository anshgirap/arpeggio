import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ARPEGGIO",
  description: "Understand music. Don't just memorise it.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
