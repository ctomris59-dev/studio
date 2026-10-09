import type {Metadata} from "next";
import "./globals.css";
// Font files are packaged with the app and served from our own origin: no
// build-time calls to Google Fonts, and no browser font requests to Google.
import "@fontsource/source-sans-3/400.css";
import "@fontsource/source-sans-3/600.css";
import "@fontsource/source-sans-3/700.css";
import "@fontsource/barlow-condensed/400.css";
import "@fontsource/barlow-condensed/500.css";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource/barlow-condensed/800.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import {SITE_URL} from "../lib/seo";
export const metadata:Metadata={
 metadataBase:new URL(SITE_URL),
 title:"StudioTasker | Studio Management Software",
 description:"StudioTasker is studio management software for independent Pilates, yoga, barre, dance, indoor cycling, fitness and boutique studios. Run members, recurring classes, bookings, waitlists, credits, attendance, staff and follow-up in one workspace.",
 category:"software",
 robots:{
  index:true,
  follow:true,
  googleBot:{index:true,follow:true,"max-image-preview":"large","max-snippet":-1,"max-video-preview":-1}
 }
};

export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){
 return <html lang="en"><body>{children}</body></html>;
}
