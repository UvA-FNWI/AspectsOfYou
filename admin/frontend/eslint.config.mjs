import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  {
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
