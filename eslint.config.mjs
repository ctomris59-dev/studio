// Generated initially with npm init @eslint/config@latest; adapted for
// Next.js 15 + ESLint 9. Importing eslint-config-next's legacy config here
// activates @rushstack/eslint-patch, which breaks ESLint 9 flat config.
import {defineConfig} from "eslint/config";
import parser from "@typescript-eslint/parser";
import nextPlugin from "@next/eslint-plugin-next";

export default defineConfig([
 {ignores:[".next/**","node_modules/**","coverage/**","dist/**","out/**","next-env.d.ts","*.tsbuildinfo"]},
 {
  files:["**/*.{js,cjs,mjs,jsx,ts,tsx}"],
  languageOptions:{ecmaVersion:"latest"},
  rules:{
   "no-eval":"error",
   "no-implied-eval":"error",
   "no-new-func":"error",
   "no-unsafe-finally":"error",
   "no-unreachable":"error",
   "no-constant-binary-expression":"error",
   "no-prototype-builtins":"error"
  }
 },
 {
  files:["**/*.{ts,tsx}"],
  languageOptions:{
   parser,
   parserOptions:{ecmaFeatures:{jsx:true},sourceType:"module"}
  },
  plugins:{"@next/next":nextPlugin},
  rules:{"@next/next/no-sync-scripts":"error"}
 }
]);
