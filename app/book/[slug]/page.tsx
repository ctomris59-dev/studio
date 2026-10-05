import {PublicBookingClient} from "./public-booking-client";
import "./booking.css";
export const dynamic="force-dynamic";
export const metadata={title:"Book a class — StudioTasker",robots:{index:false,follow:false}};
export default async function PublicBookingPage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;return <PublicBookingClient slug={slug}/>;
}
