module.exports = {
    "env": {
        "browser": true,
        "node": true,
        "es2021": true
    },
    "extends": "eslint:recommended",
    "parserOptions": {
        "ecmaVersion": "latest",
        "sourceType": "module"
    },
    "rules": {
        // Enforce semicolons at the end of statements
        "semi": ["error", "always"],

        // Enforce the use of double quotes
        "quotes": ["error", "double"],

        // Enforce 4 spaces for indentation
        "indent": ["error", 4],

        // Disallow the use of var (use let or const instead)
        "no-var": "error",

        // Prefer const if variables are not reassigned
        "prefer-const": "error",

        // Prefer arrow functions in callbacks (e.g., for map, filter, reduce)
        "prefer-arrow-callback": "error",

        // Enforce compact arrow functions when the body is a single expression
        "arrow-body-style": ["error", "as-needed"],

        // Remove parentheses around a single arrow function parameter when unnecessary
        "arrow-parens": ["error", "as-needed"],

        // Prevent confusing arrow functions (e.g., potential misinterpretation with expressions)
        "no-confusing-arrow": ["error", { "allowParens": true }],

        // Prefer function declarations but allow arrow functions where they make sense
        "func-style": ["error", "declaration", { "allowArrowFunctions": true }]
    }
};