import Link from "next/link";
export default function NotFound(){
 return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:"40px",background:"#f4f0e7",color:"#17203c",fontFamily:"Arial,sans-serif"}}>
  <section style={{maxWidth:720}}>
   <p style={{fontFamily:"monospace",color:"#334bdd",fontWeight:800}}>404 / PAGE NOT FOUND</p>
   <h1 style={{fontSize:"clamp(52px,8vw,96px)",lineHeight:.9,letterSpacing:"-.05em",margin:"20px 0"}}>This page<br/>isn&apos;t here.</h1>
   <p style={{fontSize:18,lineHeight:1.6}}>The URL may have changed or never existed. Use a real StudioTasker destination instead.</p>
   <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:28}}>
    <Link href="/" style={{padding:"14px 18px",background:"#e7f982",border:"2px solid #17203c",color:"#17203c",textDecoration:"none",fontWeight:800}}>HOME</Link>
    <Link href="/app-demo?tour=1" style={{padding:"14px 18px",border:"2px solid #17203c",color:"#17203c",textDecoration:"none",fontWeight:800}}>WATCH DEMO</Link>
   </div>
  </section>
 </main>;
}
