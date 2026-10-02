import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReformDesk — A calmer way to run your Pilates studio",
  description: "A beautifully simple home for your reformer Pilates studio. Classes, packs, clients, and waitlists, all in one clear place.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
