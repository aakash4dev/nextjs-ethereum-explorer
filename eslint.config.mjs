import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

const eslintConfig = [
  ...nextCoreWebVitals,
  {
    ignores: ['.next/**', 'node_modules/**', '.solc-cache/**', 'scripts/devnet/out/**', 'next-env.d.ts'],
  },
  {
    files: ['workers/**/*.cjs'],
    languageOptions: { sourceType: 'commonjs' },
  },
];

export default eslintConfig;
