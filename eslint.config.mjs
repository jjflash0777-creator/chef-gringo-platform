import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  {
    files: ["app/admin/growth/GrowthQueue.tsx"],
    rules: {
      // The initial queue hydration is intentionally a one-shot mount effect.
      // applyQueue is defined inside the component and is also used by later
      // explicit reload actions; adding it to this effect's dependency list
      // would turn initial hydration into a re-run contract without improving
      // correctness. Keep this exception narrow to the admin Growth Queue file.
      "react-hooks/exhaustive-deps": "off",
    },
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
