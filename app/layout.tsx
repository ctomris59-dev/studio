import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StudioTasker — A calmer way to run your studio",
  description: "StudioTasker is all-in-one studio management software for Pilates, yoga, barre, gyms and boutique fitness. Manage members, classes, bookings, credits, attendance and follow-ups from one private workspace.",
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
