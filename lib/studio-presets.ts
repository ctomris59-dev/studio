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
export function studioPreset(focus:string):StudioPreset{
 return STUDIO_PRESETS[(STUDIO_FOCUSES as readonly string[]).includes(focus)?focus as StudioFocus:"Boutique fitness"];
}
