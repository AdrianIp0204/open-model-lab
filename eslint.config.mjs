import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".open-next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Local operator and browser-verification output is generated, not repo source.
    "output/**",
    // Generated local browser verification artifacts.
    "output/browser-root-standing/**",
    "output/browser-preview/**",
    // Local automation sandboxes can be unreadable on Windows and are not repo sources.
    "automation/tmp*/**",
  ]),
]);

export default eslintConfig;
