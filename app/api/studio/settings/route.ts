import {NextRequest} from "next/server";
import {authenticated} from "@/lib/server/auth";
import {errorResponse,successResponse,backendError,sameOrigin,jsonObject,stringField} from "@/lib/server/responses";
import {validStudioTimezone} from "@/lib/studio-timezone";
export const runtime="nodejs";

const focuses=["Pilates","Yoga","Barre","Dance","Boutique fitness","Gym"];
const memberTerms=["Members","Clients","Students","Customers"];
const classTerms=["Classes","Sessions","Lessons"];
const creditTerms=["Credits","Visits","Sessions"];
const weekStarts=["monday","sunday"];
const timeFormats=["24h","12h"];
const defaultViews=["today","leads","members","classes","followups","insights","settings"];

function intValue(body:Record<string,unknown>,key:string,current:number,min:number,max:number){
 const raw=body[key];if(raw===undefined)return current;
 return typeof raw==="number"&&Number.isInteger(raw)&&raw>=min&&raw<=max?raw:null;
}
function choiceValue(body:Record<string,unknown>,key:string,current:string,allowed:string[]){
 const raw=body[key];if(raw===undefined)return current;
 return typeof raw==="string"&&allowed.includes(raw)?raw:null;
}
function textValue(body:Record<string,unknown>,key:string,current:string,max:number,min=0){
 if(body[key]===undefined)return current;
 const value=stringField(body,key,max);return value!==null&&value.length>=min?value:null;
}
const selectSettings=`SELECT s.name,s.focus,s.timezone,
 s.accent_color AS "accentColor",s.member_term AS "memberTerm",s.class_term AS "classTerm",s.credit_term AS "creditTerm",
 s.week_starts AS "weekStarts",s.time_format AS "timeFormat",s.default_view AS "defaultView",
 s.default_class_duration AS "defaultClassDuration",s.default_class_capacity AS "defaultClassCapacity",s.default_room AS "defaultRoom",
 s.inactive_days AS "inactiveDays",s.low_credits_threshold AS "lowCreditsThreshold",s.renewal_window_days AS "renewalWindowDays",
 s.trial_followup_hours AS "trialFollowupHours",s.package_review_hours AS "packageReviewHours",s.open_seats_threshold AS "openSeatsThreshold",
 (s.onboarding_completed_at IS NOT NULL) AS "onboardingCompleted",
 EXISTS(SELECT 1 FROM studio_brand_assets a WHERE a.studio_id=s.id) AS "hasLogo"
 FROM studios s WHERE s.id=$1`;

export async function GET(request:NextRequest){
 try{
  const result=await authenticated(request,["owner","manager","receptionist","instructor"],async(client,auth)=>{
   const r=await client.query(selectSettings,[auth.studioId]);return r.rows[0];
  });
  if(!result.access.ok)return errorResponse(result.access.status,result.access.message);
  return successResponse({studio:result.value});
 }catch{return backendError()}
}
export async function PATCH(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
 const body=await jsonObject(request);if(!body)return errorResponse(400,"Invalid studio settings.");
 try{
  const result=await authenticated(request,["owner","manager"],async(client,auth)=>{
   const currentResult=await client.query(`SELECT name,focus,timezone,accent_color,member_term,class_term,credit_term,week_starts,time_format,default_view,
    default_class_duration,default_class_capacity,default_room,inactive_days,low_credits_threshold,renewal_window_days,trial_followup_hours,
    package_review_hours,open_seats_threshold FROM studios WHERE id=$1 FOR UPDATE`,[auth.studioId]);
   const c=currentResult.rows[0];if(!c)return {missing:true};
   const name=textValue(body,"name",c.name,100,2),focus=choiceValue(body,"focus",c.focus,focuses),timezone=textValue(body,"timezone",c.timezone,80,1);
   const accentColor=textValue(body,"accentColor",c.accent_color,7,7);
   const memberTerm=choiceValue(body,"memberTerm",c.member_term,memberTerms),classTerm=choiceValue(body,"classTerm",c.class_term,classTerms);
   const creditTerm=choiceValue(body,"creditTerm",c.credit_term,creditTerms),weekStart=choiceValue(body,"weekStarts",c.week_starts,weekStarts);
   const timeFormat=choiceValue(body,"timeFormat",c.time_format,timeFormats),defaultView=choiceValue(body,"defaultView",c.default_view,defaultViews);
   const defaultClassDuration=intValue(body,"defaultClassDuration",c.default_class_duration,15,240);
   const defaultClassCapacity=intValue(body,"defaultClassCapacity",c.default_class_capacity,1,100);
   const defaultRoom=textValue(body,"defaultRoom",c.default_room,80,1);
   const inactiveDays=intValue(body,"inactiveDays",c.inactive_days,7,90),lowCreditsThreshold=intValue(body,"lowCreditsThreshold",c.low_credits_threshold,0,10);
   const renewalWindowDays=intValue(body,"renewalWindowDays",c.renewal_window_days,1,60),trialFollowupHours=intValue(body,"trialFollowupHours",c.trial_followup_hours,1,168);
   const packageReviewHours=intValue(body,"packageReviewHours",c.package_review_hours,1,168),openSeatsThreshold=intValue(body,"openSeatsThreshold",c.open_seats_threshold,1,50);
   if(!name||!focus||!timezone||!validStudioTimezone(timezone)||!accentColor||!/^#[0-9A-Fa-f]{6}$/.test(accentColor)||
    !memberTerm||!classTerm||!creditTerm||!weekStart||!timeFormat||!defaultView||defaultClassDuration===null||defaultClassCapacity===null||
    !defaultRoom||inactiveDays===null||lowCreditsThreshold===null||renewalWindowDays===null||trialFollowupHours===null||packageReviewHours===null||openSeatsThreshold===null)
    return {invalid:true};
   if(c.timezone!==timezone){
    const exists=await client.query("SELECT 1 FROM class_sessions WHERE studio_id=$1 LIMIT 1",[auth.studioId]);
    if(exists.rowCount)return {timezoneConflict:true};
   }
   await client.query(`UPDATE studios SET name=$2,focus=$3,timezone=$4,accent_color=$5,member_term=$6,class_term=$7,credit_term=$8,
    week_starts=$9,time_format=$10,default_view=$11,default_class_duration=$12,default_class_capacity=$13,default_room=$14,
    inactive_days=$15,low_credits_threshold=$16,renewal_window_days=$17,trial_followup_hours=$18,package_review_hours=$19,open_seats_threshold=$20
    WHERE id=$1`,[auth.studioId,name,focus,timezone,accentColor.toUpperCase(),memberTerm,classTerm,creditTerm,weekStart,timeFormat,defaultView,
     defaultClassDuration,defaultClassCapacity,defaultRoom,inactiveDays,lowCreditsThreshold,renewalWindowDays,trialFollowupHours,packageReviewHours,openSeatsThreshold]);
   const updated=await client.query(selectSettings,[auth.studioId]);return {studio:updated.rows[0]};
  });
  if(!result.access.ok)return errorResponse(result.access.status,result.access.message);
  if(result.value&&"missing" in result.value)return errorResponse(404,"Studio not found.");
  if(result.value&&"invalid" in result.value)return errorResponse(400,"Check studio identity, terminology, appearance and operating-rule values.");
  if(result.value&&"timezoneConflict" in result.value)return errorResponse(409,"Timezone cannot change after classes exist. Existing bookings must not be reinterpreted.");
  return successResponse(result.value);
 }catch{return backendError()}
}
