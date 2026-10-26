import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    settings: {
      // ESLint 10 flat config: avoid eslint-plugin-react calling legacy getFilename().
      react: { version: "19" },
    },
    rules: {
      // New in eslint-plugin-react-hooks v7; existing app patterns predate these checks.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
      "react-hooks/exhaustive-deps": "off",
      // Static UI assets and dynamic survey images; next/image not used here.
      "@next/next/no-img-element": "off",
      "@next/next/no-page-custom-font": "off",
    },
  },
]);
