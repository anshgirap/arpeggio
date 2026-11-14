import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "ARPEGGIO", template: "%s · ARPEGGIO" },
  description: "Understand music. Don't just memorise it.",
  icons: {
    icon: "/brand/favicon.png",
    shortcut: "/brand/favicon.png",
    apple: "/brand/favicon.png",
  },
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
