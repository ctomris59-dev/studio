import type { StudioData } from "./studio-crm";

export type HistoryEntry = {snapshot:StudioData;label:string};
export type StudioHistory = {present:StudioData;past:HistoryEntry[];future:HistoryEntry[]};
export type HistoryAction =
  | {type:"load";data:StudioData}
  | {type:"apply";change:(previous:StudioData)=>StudioData;label:string}
  | {type:"undo"}
  | {type:"redo"};

const MAX_UNDO_STEPS=15;

export function initialHistory(data:StudioData):StudioHistory {
  return {present:data,past:[],future:[]};
}

/** Pure, in-memory undo history for the browser demo.
 * This is NOT a production audit log or a multi-user transaction mechanism. */
export function studioHistoryReducer(state:StudioHistory,action:HistoryAction):StudioHistory {
  switch(action.type) {
    case "load":return initialHistory(action.data);
    case "apply":{
      const next=action.change(state.present);
      if(next===state.present)return state;
      const entry:HistoryEntry={snapshot:state.present,label:action.label};
      return {
        present:next,
        past:[...state.past,entry].slice(-MAX_UNDO_STEPS),
        future:[]
      };
    }
    case "undo":{
      const previous=state.past[state.past.length-1];
      if(!previous)return state;
      return {
        present:previous.snapshot,
        past:state.past.slice(0,-1),
        future:[...state.future,{snapshot:state.present,label:previous.label}].slice(-MAX_UNDO_STEPS)
      };
    }
    case "redo":{
      const next=state.future[state.future.length-1];
      if(!next)return state;
      return {
        present:next.snapshot,
        past:[...state.past,{snapshot:state.present,label:next.label}].slice(-MAX_UNDO_STEPS),
        future:state.future.slice(0,-1)
      };
    }
  }
}

/** Explicit credits adjustment with nonnegative balance and a demo activity entry. */
export function adjustMemberCredits(
  data:StudioData, memberId:string, change:number, reason:string,
  id:string, today:string
):{success:boolean;data:StudioData;message:string} {
  const member=data.members.find(m=>m.id===memberId);
  if(!member)return {success:false,data,message:"Member not found."};
  if(member.credits===null)return {success:false,data,message:"Unlimited members do not use credit balances."};
  if(member.paymentStatus==="Pending")return {success:false,data,message:"Confirm the package before manually adjusting class credits."};
  if(!Number.isSafeInteger(change)||change===0||Math.abs(change)>1000)return {success:false,data,message:"Enter a whole number of 1 to 1,000 credits."};
  if(!reason.trim()||reason.trim().length>200)return {success:false,data,message:"An adjustment reason (up to 200 characters) is required."};
  const target=member.credits+change;
  if(target<0)return {success:false,data,message:"Cannot remove more credits than the current balance."};
  if(target>1000000)return {success:false,data,message:"Balance cannot exceed 1,000,000 credits."};
  const description="Manual credit adjustment "+(change>0?"+":"")+change+" ("+reason.trim()+"); no payment collected";
  return {
    success:true,
    data:{
      ...data,
      members:data.members.map(m=>m.id===memberId?{...m,credits:target}:m),
      activities:[{id,personKind:"member",personId:memberId,text:description,date:today},...data.activities]
    },
    message:member.name+": "+member.credits+" → "+target+" credits. You can undo this change."
  };
}
