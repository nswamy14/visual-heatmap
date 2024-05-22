module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  env: {
    browser: true,
    es6: true,
  },
  globals: {
    Image: true,
    Canvas: true,
  },
  rules: {
    // allow paren-less arrow functions
    "arrow-parens": "off",
    // allow async-await
    "generator-star-spacing": "off",
    // allow debugger during development
    "no-debugger": process.env.NODE_ENV === "production" ? "error" : "off",
    //Allow semi colons
    semi: ["error", "always"],
    //Tab indentation
    indent: [
      "error",
      "tab",
      { SwitchCase: 1, FunctionDeclaration: { body: 1, parameters: 2 } },
    ],
    "no-trailing-spaces": [
      "error",
      { skipBlankLines: true, ignoreComments: true },
    ],
    "no-tabs": "off",
    // "no-mixed-spaces-and-tabs": ["error", "smart-tabs"],
    "no-mixed-spaces-and-tabs": "off",
    "no-multiple-empty-lines": ["error", { max: 2, maxEOF: 1 }],
    "no-global-assign": ["error", { exceptions: ["window", "document"] }],
    // "no-mixed-operators": [
    //   "error",
    //   {
    //     groups: [
    //       ["+", "-", "*", "/", "%", "**"],
    //       ["&", "|", "^", "~", "<<", ">>", ">>>"],
    //       ["==", "!=", "===", "!==", ">", ">=", "<", "<="],
    //       ["&&", "||"],
    //       ["in", "instanceof"],
    //     ],
    //     allowSamePrecedence: true,
    //   },
    // ],
  },
};
