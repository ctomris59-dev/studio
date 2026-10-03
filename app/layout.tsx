import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StudioTasker — A calmer way to run your studio",
  description: "All-in-one studio management for Pilates, yoga, barre and boutique fitness. Organize scheduling, bookings, members, follow-ups and payments from one place.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
