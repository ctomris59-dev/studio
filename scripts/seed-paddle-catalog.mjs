import {Environment,Paddle} from "@paddle/paddle-node-sdk";

const apiKey=process.env.PADDLE_API_KEY;
if(!apiKey){
  console.error("Missing PADDLE_API_KEY. Create a Sandbox API key in Paddle > Developer tools > Authentication.");
  process.exit(1);
}

const paddle=new Paddle(apiKey,{environment:Environment.sandbox});

async function seed(){
  console.log("Creating StudioTasker catalog in Paddle SANDBOX...");

  const product=await paddle.products.create({
    name:"StudioTasker",
    taxCategory:"saas",
    description:"Studio management software for independent Pilates, yoga, barre, dance, indoor cycling, boutique fitness and gym businesses."
  });

  const monthly=await paddle.prices.create({
    productId:product.id,
    description:"StudioTasker Monthly",
    unitPrice:{amount:"3990",currencyCode:"USD"},
    billingCycle:{interval:"month",frequency:1}
  });

  const annual=await paddle.prices.create({
    productId:product.id,
    description:"StudioTasker Annual",
    unitPrice:{amount:"40680",currencyCode:"USD"},
    billingCycle:{interval:"year",frequency:1}
  });

  const result={
    environment:"sandbox",
    productId:product.id,
    monthlyPriceId:monthly.id,
    annualPriceId:annual.id,
    monthly:"$39.90 USD / month",
    annual:"$406.80 USD / year",
    annualEffectiveMonthly:"$33.90 USD / month",
    annualSavings:"$72.00 USD / year"
  };

  console.log("\nStudioTasker Paddle sandbox catalog created:");
  console.log(JSON.stringify(result,null,2));
  console.log("\nNext env values:");
  console.log("PADDLE_MONTHLY_PRICE_ID="+monthly.id);
  console.log("PADDLE_ANNUAL_PRICE_ID="+annual.id);
}

seed().catch((error)=>{
  console.error("Paddle catalog seed failed.");
  console.error(error);
  process.exit(1);
});
