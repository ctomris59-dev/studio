import {ImageResponse} from "next/og";

export const alt="StudioTasker — studio management software for independent class-based studios";
export const size={width:1200,height:630};
export const contentType="image/png";

export default function Image(){
 return new ImageResponse(
  <div style={{width:"100%",height:"100%",display:"flex",flexDirection:"column",justifyContent:"space-between",background:"#17203c",color:"#fffefa",padding:"72px",fontFamily:"Arial"}}>
   <div style={{display:"flex",alignItems:"center",gap:20,fontSize:28,fontWeight:700}}><span style={{display:"flex",width:58,height:58,borderRadius:14,background:"#334bdd",alignItems:"center",justifyContent:"center"}}>ST</span><span>studiotasker<span style={{color:"#ff8360"}}>.</span></span></div>
   <div style={{display:"flex",flexDirection:"column",fontSize:74,fontWeight:800,lineHeight:.94,letterSpacing:"-4px"}}><span>Less admin.</span><span style={{color:"#e7f982"}}>More movement.</span></div>
   <div style={{display:"flex",justifyContent:"space-between",fontSize:22}}><span>Pilates · Yoga · Barre · Dance · Cycling · Fitness</span><span>$39.90 / month</span></div>
  </div>,
  size
 );
}
