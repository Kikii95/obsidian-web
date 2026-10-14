import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Scripts Node en CommonJS (generate-icons.js) : require() y est le format attendu.
  { files: ["scripts/**/*.js"], rules: { "@typescript-eslint/no-require-imports": "off" } },
  // Règles du React Compiler arrivées avec eslint-config-next 16 : 19 cas préexistants dans le code
  // (setState dans un effet, mémoïsation manuelle). Visibles en avertissement le temps de les traiter (BACKLOG).
  {
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/immutability": "warn",
    },
  },
  // Fichiers hérités de plus de 300 lignes (Quality Shield : à découper avant toute retouche) :
  // apostrophes françaises non échappées et un let, purement stylistiques, laissés en avertissement (BACKLOG).
  {
    files: [
      "src/app/*/folder/*/page.tsx",
      "src/app/*/settings/page.tsx",
      "src/app/*/templates/page.tsx",
      "src/app/s/*/page.tsx",
      "src/app/setup/page.tsx",
      "src/app/t/*/*/page.tsx",
      "src/lib/exporters/docx.ts",
    ],
    rules: { "react/no-unescaped-entities": "warn", "prefer-const": "warn" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
