import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import eslintConfigPrettier from "eslint-config-prettier";
import prettier from "eslint-plugin-prettier";
import jestPlugin from "eslint-plugin-jest";
import importPlugin from "eslint-plugin-import";
import stylistic from "@stylistic/eslint-plugin";
import * as babelParser from "@babel/eslint-parser";

// Custom rule to add .js extensions (only for relative imports, not path aliases)
const addJsExtensionRule = {
  meta: {
    type: "problem",
    fixable: "code",
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        const { source } = node;
        const filename = context.getFilename();
        // Only enforce .js extension for relative imports (not path aliases like @/)
        // and only for non-JSX files
        if (
          !filename.endsWith(".jsx") &&
          source.type === "Literal" &&
          source.value.startsWith("./") &&
          !source.value.endsWith(".js") &&
          !source.value.endsWith(".jsx")
        ) {
          context.report({
            node: source,
            message: "Missing file extension",
            fix: fixer => fixer.replaceText(source, `'${source.value}.js'`),
          });
        }
      },
    };
  },
};

// Define the custom plugin
const customPlugin = {
  rules: {
    "add-js-extension": addJsExtensionRule,
  },
};

export default [
  { ignores: ["dist", ".next", "node_modules", "prisma/migrations", "*.config.js"] },
  js.configs.recommended,
  eslintConfigPrettier,
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
        jest: "readonly",
      },
      parser: babelParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
        requireConfigFile: false,
        babelOptions: {
          babelrcRoots: ["."],
          presets: ["@babel/preset-env", "@babel/preset-react"],
        },
      },
    },
    settings: {
      react: {
        version: "detect",
      },
      jest: { version: "29" },
      "import/resolver": {
        node: {
          extensions: [".js", ".jsx"],
        },
      },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "@stylistic": stylistic,
      jest: jestPlugin,
      prettier,
      import: importPlugin,
      custom: customPlugin,
    },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs["jsx-runtime"].rules,
      ...reactHooks.configs.recommended.rules,
      ...jestPlugin.configs["flat/recommended"].rules,
      ...eslintConfigPrettier.rules,
      ...js.configs.recommended.rules,
      // React specific rules
      "react/react-in-jsx-scope": "off", // Not needed with React 17+
      "react/prop-types": "off", // Using TypeScript/JSDoc instead
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      // Disable all stylistic formatting rules - let Prettier handle formatting
      "@stylistic/quotes": "off",
      "@stylistic/max-len": "off",
      "@stylistic/arrow-parens": "off",
      "@stylistic/comma-dangle": "off",
      "@stylistic/semi": "off",
      "@stylistic/indent": "off",
      "@stylistic/brace-style": "off",
      "@stylistic/comma-spacing": "off",
      "@stylistic/comma-style": "off",
      "@stylistic/computed-property-spacing": "off",
      "@stylistic/dot-location": "off",
      "@stylistic/eol-last": "off",
      "@stylistic/func-call-spacing": "off",
      "@stylistic/key-spacing": "off",
      "@stylistic/keyword-spacing": "off",
      "@stylistic/linebreak-style": "off",
      "@stylistic/lines-between-class-members": "off",
      "@stylistic/multiline-ternary": "off",
      "@stylistic/no-extra-parens": "off",
      "@stylistic/no-extra-semi": "off",
      "@stylistic/no-floating-decimal": "off",
      "@stylistic/no-mixed-operators": "off",
      "@stylistic/no-mixed-spaces-and-tabs": "off",
      "@stylistic/no-multi-spaces": "off",
      "@stylistic/no-multiple-empty-lines": "off",
      "@stylistic/no-tabs": "off",
      "@stylistic/no-trailing-spaces": "off",
      "@stylistic/no-whitespace-before-property": "off",
      "@stylistic/object-curly-spacing": "off",
      "@stylistic/object-property-newline": "off",
      "@stylistic/operator-linebreak": "off",
      "@stylistic/padded-blocks": "off",
      "@stylistic/padding-line-between-statements": "off",
      "@stylistic/quote-props": "off",
      "@stylistic/space-before-blocks": "off",
      "@stylistic/space-before-function-paren": "off",
      "@stylistic/space-in-parens": "off",
      "@stylistic/space-infix-ops": "off",
      "@stylistic/space-unary-ops": "off",
      "@stylistic/spaced-comment": "off",
      "@stylistic/switch-colon-spacing": "off",
      "@stylistic/template-curly-spacing": "off",
      "@stylistic/wrap-iife": "off",
      "@stylistic/wrap-regex": "off",
      "@stylistic/yield-star-spacing": "off",
      "arrow-body-style": "off",
      "custom/add-js-extension": "error",
      "prefer-arrow-callback": "off",
      "prettier/prettier": "error",
      "sort-imports": ["error", { ignoreDeclarationSort: true, ignoreMemberSort: true }],
      "prefer-destructuring": [
        "warn",
        { AssignmentExpression: { array: false, object: false } },
        { enforceForRenamedProperties: false },
      ],
      "prefer-object-spread": "error",
      "max-nested-callbacks": ["warn", 4],
      "no-implicit-coercion": "warn",
      "import/no-unresolved": "off",
      "import/order": "off",
      "no-underscore-dangle": "off",
      "max-depth": ["warn", 4],
      "max-classes-per-file": ["warn", 1],
      "no-param-reassign": ["error", { props: true, ignorePropertyModificationsFor: ["state", "draft"] }],
      "import/prefer-default-export": "off",
      "import/no-extraneous-dependencies": ["error", { devDependencies: true }],
      "no-mixed-operators": "off",
      "function-paren-newline": "off",
      "space-before-function-paren": "off",
      "no-console": ["warn", { allow: ["warn", "error"] }], // Allow console.warn and console.error
      "no-alert": "error",
      "no-else-return": "off",
      "no-use-before-define": ["error", { variables: false, functions: false }],
      camelcase: "off",
      // Disable import/extensions - using custom rule instead that handles path aliases correctly
      "import/extensions": "off",
      "import/no-unresolved": "off", // Next.js handles module resolution
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["**/*.test.{js,jsx}"],
    ...jestPlugin.configs["flat/recommended"],
    rules: {
      ...jestPlugin.configs["flat/recommended"].rules,
      "jest/prefer-expect-assertions": "off",
      "no-console": "off", // Allow console in tests
    },
  },
  {
    files: ["app/**/*.{js,jsx}", "components/**/*.{js,jsx}", "hooks/**/*.{js,jsx}"],
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }], // More lenient for client components
    },
  },
];
