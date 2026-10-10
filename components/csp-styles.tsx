"use client";
import {createContext,useContext,type ReactNode} from "react";

// This value is supplied by the server layout from the middleware-generated
// per-request CSP header. Never generate or persist a nonce in the browser.
const NonceContext=createContext<string|undefined>(undefined);
export function CspNonceProvider({nonce,children}:{nonce?:string;children:ReactNode}){
 return <NonceContext.Provider value={nonce}>{children}</NonceContext.Provider>;
}
export function useCspNonce(){return useContext(NonceContext);}
function safeAccent(value:string){
 // User-entered branding must never be interpolated into CSS unchecked.
 return /^#[0-9a-fA-F]{6}$/.test(value)?value:"#334BDD";
}
export function CspStyle({css}:{css:string}){
 const nonce=useCspNonce();
 return <style nonce={nonce}>{css}</style>;
}
export function CspAccentStyle({accent,kind}:{accent:string;kind:"demo"|"workspace"|"booking"}){
 const color=safeAccent(accent);
 const css=kind==="demo"
  ? `.sad-app .sad-studio .sad-avatar:not(.sad-avatar-logo){border-color:${color}}.sad-app .sad-brand-preview{border-color:${color}}.sad-app .sad-brand-preview>span,.sad-app .sad-booking-mini>div>span{background:${color}}.sad-app .sad-booking-mini{border-color:${color}}.sad-app .sad-booking-mini>strong{color:${color}}`
  : kind==="workspace"
  ? `.rd-live-shell{--studio-accent:${color}}.rd-live-shell .rd-live-accent>span,.rd-live-shell .rd-brand-preview>span{background:${color}}.rd-live-shell .rd-brand-preview{border-color:${color}}`
  : `.sbp-page{--sbp-accent:${color}}`;
 return <CspStyle css={css}/>;
}
