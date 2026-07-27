import globals from "globals";
import js from "@eslint/js";
import { defineConfig } from "eslint/config";

export default defineConfig([
{
    files: ["**/*.js"],
    plugins: {
        js,
    },
    extends: ["js/recommended"],
    languageOptions: {
        globals: {
            ...globals.browser,
            "$": "readonly",
        }
    },
    rules: {
        "eqeqeq": "warn",
        "curly": "error",
        "no-await-in-loop": "warn",
        "no-constructor-return": "error",
        "no-duplicate-imports": "warn",
        "no-promise-executor-return": "warn",
        "no-self-compare": "error",
        "no-template-curly-in-string": "warn",
        "no-unreachable-loop": "warn",
        //"no-use-before-define": "error", // doesn't work across files with global scope. maybe re-enable that once we have less globals and define the remaining ones above
        "block-scoped-var": "warn",
        "no-unused-vars": "off", // this is better handled by webstorm across files
        "no-undef": "off", // this is better handled by webstorm across files
    },
}
]);
