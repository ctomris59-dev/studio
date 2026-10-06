import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StudioTasker — Global studio management software",
  description: "StudioTasker is English-first studio management software for independent Pilates, yoga, barre, gyms and boutique fitness studios in the USA, Canada, UK, Europe and beyond. Manage members, classes, bookings, credits, attendance and follow-ups from one private workspace.",
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
