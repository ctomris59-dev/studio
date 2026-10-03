const {decryptStream}=require("./backup-crypto.cjs");
const file=process.argv[2],password=process.env.BACKUP_PASSPHRASE;
if(!file||!password){console.error("Usage: BACKUP_PASSPHRASE=... node scripts/verify-backup.cjs /path/to/file.rdbk");process.exit(2)}
decryptStream(file,password).then(({bytes,sha256})=>
 console.log("Authenticated AES-256-GCM archive verified:",bytes,"bytes; archive content SHA-256:",sha256)
).catch(e=>{console.error("Backup verification FAILED:",e.message);process.exitCode=1});
