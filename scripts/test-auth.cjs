const assert=require("node:assert/strict");
const fs=require("node:fs");
const ts=require("typescript");
const content=fs.readFileSync("lib/auth-crypto.ts","utf8");
const js=ts.transpileModule(content,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
const mod={exports:{}};
new Function("require","module","exports",js)(require,mod,mod.exports);
const auth=mod.exports;
async function run(){
 assert(auth.validatePassword("A string longer than 12"));
 assert(!auth.validatePassword("short"));
 assert(!auth.validatePassword("x".repeat(129)));
 const hash=await auth.passwordHash("Some very long password 123!");
 assert(hash.startsWith("scrypt$v2$"));
 assert(await auth.passwordMatches("Some very long password 123!",hash));
 assert(!(await auth.passwordMatches("wrong password",hash)));
 assert(!(await auth.passwordMatches("another","bad format")));
 const {scryptSync,randomBytes}=require("node:crypto");
 const salt=randomBytes(24),pw="Old account password 123!";
 const legacy="scrypt$v1$"+salt.toString("hex")+"$"+scryptSync(pw,salt,64).toString("hex");
 assert(await auth.passwordMatches(pw,legacy),"Legacy accounts stay valid");
 assert(auth.needsPasswordRehash(legacy));
 assert(!auth.needsPasswordRehash(hash));
 assert(!(await auth.passwordMatches("wrong",auth.DUMMY_PASSWORD_HASH)));
 const oldTrust=process.env.TRUST_PROXY_IP_HEADERS,oldVerified=process.env.LAUNCH_TRUSTED_PROXY_VERIFIED,oldKey=process.env.LOGIN_RATE_HMAC_KEY;
 try{
  process.env.TRUST_PROXY_IP_HEADERS="false";
  assert.equal(auth.trustedLoginIp("203.0.113.1"),null);
  process.env.TRUST_PROXY_IP_HEADERS="true";process.env.LAUNCH_TRUSTED_PROXY_VERIFIED="true";
  assert.equal(auth.trustedLoginIp("203.0.113.1"),"203.0.113.1");
  assert.equal(auth.trustedLoginIp("1.2.3.4, 5.6.7.8"),null);
  process.env.LOGIN_RATE_HMAC_KEY="k".repeat(40);
  assert.equal(auth.loginIpKey("203.0.113.1").length,64);
 }finally{
  for(const [k,v] of [["TRUST_PROXY_IP_HEADERS",oldTrust],["LAUNCH_TRUSTED_PROXY_VERIFIED",oldVerified],["LOGIN_RATE_HMAC_KEY",oldKey]]){
   if(v===undefined)delete process.env[k];else process.env[k]=v;
  }
 }
 const token1=auth.newSessionToken(),token2=auth.newSessionToken();
 assert.notEqual(token1,token2);
 assert.equal(token1.length,43);
 assert.equal(auth.tokenHash(token1).length,64);
 assert.notEqual(auth.tokenHash(token1),token1);
 assert.equal(auth.normalizeEmail(" Example@Domain.COM "),"example@domain.com");
 assert(auth.emailIsValid("valid@example.com"));
 assert(!auth.emailIsValid("invalid"));
 console.log("Authentication crypto checks passed: scrypt, constant-time comparison, random tokens, hashes and validation.");
}
run().catch(e=>{console.error(e);process.exitCode=1});
