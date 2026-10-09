"use client";

import Script from "next/script";
import {useEffect,useRef} from "react";

type WidgetApi={
 render:(container:HTMLElement,options:{sitekey:string;callback:(token:string)=>void;"expired-callback":()=>void;"error-callback":()=>void})=>string;
 remove:(id:string)=>void;
};
declare global{interface Window{turnstile?:WidgetApi}}
const sitekey=process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function TurnstileChallenge({onToken,resetKey}:{onToken:(token:string)=>void;resetKey?:number}){
 const mount=useRef<HTMLDivElement>(null);
 const widget=useRef<string|null>(null);
 const callback=useRef(onToken);
 callback.current=onToken;
 function render(){
  if(!sitekey||!mount.current||!window.turnstile||widget.current)return;
  widget.current=window.turnstile.render(mount.current,{
   sitekey,callback:token=>callback.current(token),
   "expired-callback":()=>callback.current(""),
   "error-callback":()=>callback.current("")
  });
 }
 useEffect(()=>{
  callback.current("");
  if(widget.current&&window.turnstile){window.turnstile.remove(widget.current);widget.current=null}
  render();
  return ()=>{if(widget.current&&window.turnstile){window.turnstile.remove(widget.current);widget.current=null}};
 },[resetKey]);
 if(!sitekey)return null;
 return <div className="studio-turnstile" aria-label="Bot verification">
  <div ref={mount}/>
  <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
   strategy="afterInteractive" onReady={render}/>
 </div>;
}
