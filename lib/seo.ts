export const SITE_URL="https://www.studiotasker.com";

export const studioTypeLinks=[
 {name:"Pilates & Reformer",href:"/pilates-studio-software"},
 {name:"Yoga",href:"/yoga-studio-software"},
 {name:"Barre",href:"/barre-studio-software"},
 {name:"Dance",href:"/dance-studio-software"},
 {name:"Indoor Cycling",href:"/indoor-cycling-software"},
 {name:"Fitness & Gym",href:"/fitness-gym-software"},
 {name:"Boutique Fitness",href:"/boutique-fitness-software"}
] as const;

export function absoluteUrl(path="/"){
 return new URL(path,SITE_URL).toString();
}

export function websiteJsonLd(){
 return {
  "@context":"https://schema.org",
  "@graph":[
   {
    "@type":"WebSite",
    "@id":SITE_URL+"/#website",
    url:SITE_URL+"/",
    name:"StudioTasker",
    description:"Studio management software for independent class-based studios.",
    inLanguage:"en"
   },
   {
    "@type":"SoftwareApplication",
    "@id":SITE_URL+"/#software",
    name:"StudioTasker",
    url:SITE_URL+"/",
    applicationCategory:"BusinessApplication",
    applicationSubCategory:"Studio management software",
    operatingSystem:"Web",
    description:"StudioTasker helps independent class-based studios manage members, recurring classes, bookings, waitlists, credits, attendance, staff, follow-up and operational insights.",
    featureList:[
     "Lead and member CRM",
     "Recurring class schedules",
     "Waitlists and promotion",
     "Check-in, cancellation and no-show workflows",
     "Packages and credits",
     "Staff roster",
     "Operational insights",
     "CSV migration"
    ],
    offers:[
     {
      "@type":"Offer",
      name:"StudioTasker Monthly",
      url:SITE_URL+"/start?plan=monthly",
      price:"39.90",
      priceCurrency:"USD",
      category:"subscription"
     },
     {
      "@type":"Offer",
      name:"StudioTasker Annual",
      url:SITE_URL+"/start?plan=annual",
      price:"406.80",
      priceCurrency:"USD",
      category:"subscription"
     }
    ]
   }
  ]
 };
}

export function breadcrumbJsonLd(items:{name:string;path:string}[]){
 return {
  "@context":"https://schema.org",
  "@type":"BreadcrumbList",
  itemListElement:items.map((item,index)=>({
   "@type":"ListItem",
   position:index+1,
   name:item.name,
   item:absoluteUrl(item.path)
  }))
 };
}
