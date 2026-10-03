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
 assert(hash.startsWith("scrypt$v1$"));
 assert(await auth.passwordMatches("Some very long password 123!",hash));
 assert(!(await auth.passwordMatches("wrong password",hash)));
 assert(!(await auth.passwordMatches("another","bad format")));
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
