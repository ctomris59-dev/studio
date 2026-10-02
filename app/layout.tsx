import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReformDesk — A calmer way to run your studio",
  description: "A beautifully simple home for Pilates, yoga and boutique fitness studios. Classes, memberships, clients and waitlists in one clear place.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
