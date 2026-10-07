export const STUDIO_FOCUSES=[
 "Pilates","Yoga","Barre","Dance","Indoor cycling","Fitness & Gym","Boutique fitness"
] as const;
export type StudioFocus=typeof STUDIO_FOCUSES[number];

export const CLASS_FORMATS=[
 ["group","Group class"],["private","Private"],["semi_private","Semi-private"],
 ["course","Course / term"],["open_gym","Open gym"],["pt","Personal training"]
] as const;

export type StudioPreset={
 memberTerm:"Members"|"Clients"|"Students"|"Customers";
 classTerm:"Classes"|"Sessions"|"Lessons";
 creditTerm:"Credits"|"Visits"|"Sessions";
 defaultClassDuration:number;defaultClassCapacity:number;defaultRoom:string;
 spotBookingEnabled:boolean;equipmentLabel:string;defaultSpotCount:number;
 defaultClassFormat:"group"|"private"|"semi_private"|"course"|"open_gym"|"pt";
 waiverRequired:boolean;
};

export const STUDIO_PRESETS:Record<StudioFocus,StudioPreset>={
 Pilates:{memberTerm:"Members",classTerm:"Classes",creditTerm:"Credits",defaultClassDuration:50,defaultClassCapacity:8,defaultRoom:"Reformer room",spotBookingEnabled:true,equipmentLabel:"Reformer",defaultSpotCount:8,defaultClassFormat:"group",waiverRequired:true},
 Yoga:{memberTerm:"Members",classTerm:"Classes",creditTerm:"Credits",defaultClassDuration:60,defaultClassCapacity:16,defaultRoom:"Main studio",spotBookingEnabled:false,equipmentLabel:"Mat",defaultSpotCount:16,defaultClassFormat:"group",waiverRequired:true},
 Barre:{memberTerm:"Members",classTerm:"Classes",creditTerm:"Credits",defaultClassDuration:50,defaultClassCapacity:14,defaultRoom:"Main studio",spotBookingEnabled:false,equipmentLabel:"Spot",defaultSpotCount:14,defaultClassFormat:"group",waiverRequired:true},
 Dance:{memberTerm:"Students",classTerm:"Lessons",creditTerm:"Sessions",defaultClassDuration:60,defaultClassCapacity:20,defaultRoom:"Studio 1",spotBookingEnabled:false,equipmentLabel:"Place",defaultSpotCount:20,defaultClassFormat:"course",waiverRequired:true},
 "Indoor cycling":{memberTerm:"Members",classTerm:"Classes",creditTerm:"Credits",defaultClassDuration:45,defaultClassCapacity:24,defaultRoom:"Cycle studio",spotBookingEnabled:true,equipmentLabel:"Bike",defaultSpotCount:24,defaultClassFormat:"group",waiverRequired:true},
 "Fitness & Gym":{memberTerm:"Members",classTerm:"Sessions",creditTerm:"Visits",defaultClassDuration:60,defaultClassCapacity:20,defaultRoom:"Training floor",spotBookingEnabled:false,equipmentLabel:"Station",defaultSpotCount:20,defaultClassFormat:"group",waiverRequired:true},
 "Boutique fitness":{memberTerm:"Members",classTerm:"Classes",creditTerm:"Credits",defaultClassDuration:50,defaultClassCapacity:14,defaultRoom:"Main studio",spotBookingEnabled:false,equipmentLabel:"Spot",defaultSpotCount:14,defaultClassFormat:"group",waiverRequired:true}
};
export type StudioPresetProfile={headline:string;capabilities:string[];recommendedFormats:string[]};
export const STUDIO_PRESET_PROFILES:Record<StudioFocus,StudioPresetProfile>={
 Pilates:{headline:"Reformer-first operations",capabilities:["Numbered Reformer booking","Private & semi-private sessions","Recurring schedules","Waitlist + check-in","Packages, credits & waiver status"],recommendedFormats:["group","private","semi_private"]},
 Yoga:{headline:"Classes, workshops and courses",capabilities:["Recurring weekly classes","Course / workshop labels","Room capacity","Privates","Waitlist, attendance & follow-up"],recommendedFormats:["group","course","private"]},
 Barre:{headline:"Fast class-based studio flow",capabilities:["Recurring classes","Capacity & waitlist","Attendance / no-show","Packages & credits","Instructor substitutions"],recommendedFormats:["group","private"]},
 Dance:{headline:"Lessons, levels and terms",capabilities:["Course / term schedules","Levels / tracks","Student terminology","Parent / guardian contact","Attendance & waitlist"],recommendedFormats:["course","group","private"]},
 "Indoor cycling":{headline:"Bike-based class operations",capabilities:["Numbered Bike booking","Recurring ride schedule","Waitlist auto-promotion","Front-desk check-in","Capacity & instructor tracking"],recommendedFormats:["group","private"]},
 "Fitness & Gym":{headline:"Classes, PT and open-gym operations",capabilities:["Group classes","Personal training","Open gym sessions","Check-in & no-show","Member records & operational reports"],recommendedFormats:["group","pt","open_gym"]},
 "Boutique fitness":{headline:"Flexible class-based studio operations",capabilities:["Recurring schedule","Waitlist & attendance","Packages / credits","Staff roster","Follow-up & Insights"],recommendedFormats:["group","private","semi_private"]}
};
export function studioPreset(focus:string):StudioPreset{
 return STUDIO_PRESETS[(STUDIO_FOCUSES as readonly string[]).includes(focus)?focus as StudioFocus:"Boutique fitness"];
}
export function studioPresetProfile(focus:string):StudioPresetProfile{
 return STUDIO_PRESET_PROFILES[(STUDIO_FOCUSES as readonly string[]).includes(focus)?focus as StudioFocus:"Boutique fitness"];
}
