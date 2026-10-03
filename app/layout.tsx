import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StudioTasker — A calmer way to run your studio",
  description: "StudioTasker is an all-in-one studio management concept for Pilates, yoga and boutique fitness. Try classes, bookings, member CRM and follow-ups in our interactive sample demo.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
