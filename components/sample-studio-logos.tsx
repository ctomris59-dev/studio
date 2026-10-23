// Original, fictional design concepts only. Never present as real client references.
const concepts=[
 {id:"willow",name:"willow",suffix:"STUDIO",category:"PILATES & REFORMER"},
 {id:"forma",name:"FORMA",suffix:"MOVEMENT",category:"BARRE & MOVEMENT"},
 {id:"northline",name:"NORTHLINE",suffix:"PILATES",category:"BOUTIQUE PILATES"},
 {id:"motion",name:"motion",suffix:"HOUSE",category:"FITNESS & TRAINING"},
 {id:"orbit",name:"ORBIT",suffix:"STUDIO",category:"INDOOR CYCLING"},
 {id:"flow",name:"FLOW",suffix:"DISTRICT",category:"YOGA & WELLNESS"}
] as const;
type MarkId=typeof concepts[number]["id"];

function StudioMark({id}:{id:MarkId}){
 return <svg viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
  {id==="willow"&&<><path d="M32 54V10M32 35C18 35 13 24 14 16c10 0 18 7 18 19ZM32 26c14 0 18-9 18-16-11 0-18 6-18 16ZM32 44c12 0 18-7 19-13-10-1-16 4-19 13Z"/><path d="M24 54h16"/></>}
  {id==="forma"&&<><path strokeWidth="3.2" d="M10 49V14h21c11 0 16 6 16 14S42 42 31 42H10"/><path d="M20 23h11c4 0 7 2 7 5s-3 5-7 5H20M54 14v35"/></>}
  {id==="northline"&&<><path strokeWidth="3" d="M8 49 23 16l9 19 9-19 15 33M14 49h36"/><path d="M24 40h16"/></>}
  {id==="motion"&&<><path strokeWidth="3" d="M8 46V18l14 18 10-18 11 18 13-18v28"/><path d="M8 53h48"/></>}
  {id==="orbit"&&<><circle cx="32" cy="32" r="20" strokeWidth="2.5"/><ellipse cx="32" cy="32" rx="29" ry="11" transform="rotate(-28 32 32)"/><circle cx="32" cy="32" r="4.5" fill="currentColor" stroke="none"/></>}
  {id==="flow"&&<><path strokeWidth="3" d="M7 21c11-13 20 13 32 0 6-7 12-7 18-1M7 34c11-13 20 13 32 0 6-7 12-7 18-1M7 47c11-13 20 13 32 0 6-7 12-7 18-1"/></>}
 </svg>;
}

export default function SampleStudioLogos(){
 return <ul className="ed-concept-logo-grid" aria-label="Six fictional studio design concepts, not customer references">
  {concepts.map(({id,name,suffix,category})=><li className={"ed-concept-logo ed-concept-"+id} key={id}>
   <div className="ed-concept-lockup"><span className="ed-concept-emblem"><StudioMark id={id}/></span>
    <span className="ed-concept-type"><strong>{name}</strong><small>{suffix}</small></span>
   </div>
   <span className="ed-concept-kind">{category}</span>
  </li>)}
 </ul>;
}
