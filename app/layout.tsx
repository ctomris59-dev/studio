import type {Metadata} from "next";
import "./globals.css";
import {Barlow_Condensed,IBM_Plex_Mono,Source_Sans_3} from "next/font/google";
import {SITE_URL} from "../lib/seo";

const studioSans=Source_Sans_3({subsets:["latin"],display:"swap",variable:"--studio-sans"});
const studioHeading=Barlow_Condensed({subsets:["latin"],display:"swap",variable:"--studio-heading"});
const studioMono=IBM_Plex_Mono({subsets:["latin"],weight:["400","500","600"],display:"swap",variable:"--studio-mono"});

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
 return <html lang="en"><body className={`${studioSans.variable} ${studioHeading.variable} ${studioMono.variable}`}>{children}</body></html>;
}
