import type {Metadata} from "next";
import "./globals.css";

export const metadata:Metadata={
 metadataBase:new URL("https://www.studiotasker.com"),
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
