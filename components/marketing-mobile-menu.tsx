"use client";
import {useRef,type KeyboardEvent,type MouseEvent} from "react";
import Link from "next/link";
export function MarketingMobileMenu(){
 const menu=useRef<HTMLDetailsElement>(null);
 function onKeyDown(event:KeyboardEvent<HTMLDetailsElement>){
  if(event.key!=="Escape"||!menu.current?.open)return;
  event.preventDefault();menu.current.open=false;
  menu.current.querySelector("summary")?.focus();
 }
 function onClick(event:MouseEvent<HTMLDetailsElement>){
  if((event.target as HTMLElement).closest("a")&&menu.current)menu.current.open=false;
 }
 return <details ref={menu} className="ed-mobile-menu" onKeyDown={onKeyDown} onClick={onClick}>
  <summary aria-label="Open main navigation">Menu</summary>
  <nav aria-label="Mobile and tablet navigation">
   <a href="#pricing">Pricing</a><a href="#studio-types">Studio types</a>
   <a href="#product-tour">Product tour</a><a href="#why">Why StudioTasker</a>
   <Link href="/contact">Contact</Link><Link href="/workspace">Customer sign in</Link>
   <Link href="/app-demo">Try demo</Link><Link href="/start">Start StudioTasker</Link>
  </nav>
 </details>;
}
