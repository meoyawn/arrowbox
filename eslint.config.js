import js from "@eslint/js"
import typescriptEslint from "@typescript-eslint/eslint-plugin"
import parser from "@typescript-eslint/parser"
import jsxA11y from "eslint-plugin-jsx-a11y"
import solid from "eslint-plugin-solid"
import { dirname } from "node:path"
import { fileURLToPath } from "node:url"

const tsconfigRootDir = dirname(fileURLToPath(import.meta.url))

export default [
  {
    ignores: ["**/*.test.ts", "**/*.pw.ts"],
  },
  js.configs.recommended,
  ...typescriptEslint.configs["flat/recommended-type-checked"],
  solid.configs["flat/typescript"],
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        project: "tsconfig.json",
        tsconfigRootDir,
      },
    },
    plugins: {
      "jsx-a11y": jsxA11y,
    },
    rules: {
      ...jsxA11y.configs.recommended.rules,
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-ignore": "allow-with-description",
          minimumDescriptionLength: 1,
        },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          fixStyle: "inline-type-imports",
        },
      ],
      "@typescript-eslint/explicit-module-boundary-types": "error",
      "@typescript-eslint/no-for-in-array": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-var-requires": "error",
      "@typescript-eslint/require-array-sort-compare": "error",
      eqeqeq: ["error", "always"],
      "no-console": "error",
      "no-param-reassign": "error",
      "no-unused-vars": "off",
    },
  },
]
