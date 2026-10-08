"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const sourceDirectories = ["app", "components", "lib"];
const textExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".css", ".mjs", ".cjs", ".html", ".json", ".md", ".txt", ".svg"]);
const longDash = String.fromCharCode(0x2014);
const removedCopy = ["Classes, bookings and capacity", "Illustrative preview"];
const problems = [];
let scanned = 0;

function inspectFile(file) {
  if (!textExtensions.has(path.extname(file))) return;
  const content = fs.readFileSync(file, "utf8");
  scanned++;
  const relative = path.relative(root, file).split(path.sep).join("/");
  if (content.includes(longDash)) problems.push(relative + ": forbidden long dash");
  if (relative === "app/page.tsx") {
    for (const snippet of removedCopy) {
      if (content.includes(snippet)) problems.push(relative + ": removed homepage copy returned: " + snippet);
    }
  }
}

function inspectDirectory(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) inspectDirectory(target);
    else if (entry.isFile()) inspectFile(target);
  }
}

for (const name of sourceDirectories) inspectDirectory(path.join(root, name));

if (problems.length) {
  console.error("StudioTasker copy check failed:\n" + problems.join("\n"));
  process.exitCode = 1;
} else {
  console.log("StudioTasker copy check passed: " + scanned + " source files have no long dash or removed homepage copy.");
}
