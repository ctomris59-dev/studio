export const dynamic="force-dynamic";
import type {Metadata} from "next";
import "./legal.css";
export const metadata:Metadata={robots:{index:false,follow:true,noarchive:true}};
export default function LegalLayout({children}:{children:React.ReactNode}){return children}
