// Generated initially with npm init @eslint/config@latest; adapted for
// Next.js 15 + ESLint 9. Importing eslint-config-next's legacy config here
// activates @rushstack/eslint-patch, which breaks ESLint 9 flat config.
import {defineConfig} from "eslint/config";
import parser from "@typescript-eslint/parser";
import nextPlugin from "@next/eslint-plugin-next";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";

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
   "no-prototype-builtins":"error",
   "complexity":["warn",{max:12}],
   "max-lines-per-function":["warn",{max:80,skipBlankLines:true,skipComments:true}],
   "no-unused-vars":["warn",{argsIgnorePattern:"^_",varsIgnorePattern:"^_"}]
  }
 },
 {
  files:["**/*.{ts,tsx}"],
  languageOptions:{
   parser,
   parserOptions:{ecmaFeatures:{jsx:true},sourceType:"module"}
  },
  plugins:{"@next/next":nextPlugin,"jsx-a11y":jsxA11y,"react-hooks":reactHooks},
  rules:{
   "@next/next/no-sync-scripts":"error",
   "react-hooks/rules-of-hooks":"error",
   "react-hooks/exhaustive-deps":"warn",
   "jsx-a11y/label-has-associated-control":"warn",
   "jsx-a11y/anchor-is-valid":"warn",
   "jsx-a11y/no-autofocus":"warn",
   "jsx-a11y/click-events-have-key-events":"warn",
   "jsx-a11y/no-static-element-interactions":"warn"
  }
 }
]);
