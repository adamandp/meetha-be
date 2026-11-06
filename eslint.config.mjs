import tseslint from "typescript-eslint";
import globals from "globals";
import unusedImports from "eslint-plugin-unused-imports";
export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**"] },
  {
    files: ["src/**/*.ts", "test/**/*.ts"],
    languageOptions: { parser: tseslint.parser, globals: globals.node },
    plugins: { "unused-imports": unusedImports },
    rules: {
      "no-duplicate-imports": "error",
      "no-unreachable": "error",
      "unused-imports/no-unused-imports": "error",
    },
  },
  {
    files: ["src/**/*.js"],
    languageOptions: { sourceType: "commonjs", globals: globals.node },
    rules: { "no-undef": "error", "no-unreachable": "error" },
  },
);
