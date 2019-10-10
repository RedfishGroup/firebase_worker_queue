module.exports = {
    parser: 'babel-eslint',
    env: {
        es6: true,
        browser: true,
        node: true,
        'jest/globals': true,
    },
    parserOptions: {
        ecmaVersion: 2018,
        sourceType: 'module',
        ecmaFeatures: {
            jsx: true,
        },
        allowImportExportEverywhere: true,

    },
    plugins: ['react', 'jest'],
    extends: [
        'eslint:recommended',
        'plugin:react/recommended',
        'plugin:jest/recommended',
    ],
    rules: {
        // enable additional rules
        semi: ['warn', 'never'],
        quotes: ['warn', 'single'],
        indent: ['warn', 4, { SwitchCase: 1, flatTernaryExpressions: false }],
        'comma-dangle': ['warn', 'always-multiline'],
        'no-console': ['warn', { allow: ['assert', 'log', 'warn', 'error'] }],
        'react/prop-types': 0,
        'no-unused-vars': ['warn', { varsIgnorePattern: 'React' }],
        'no-irregular-whitespace': 'warn',
        'react/no-direct-mutation-state': 'warn',

        // disable rules
        'array-callback-return': 'off',
        'no-class-assign': 'off',
        'react/no-string-refs': 'off',
        'react/no-unescaped-entities': 'off',
    },
    settings: {
        react: {
            version: '16.5',
        },
    },
}
