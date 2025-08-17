import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // 全局忽略规则
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "dist_electron/**",
      ".next/**",
      "coverage/**",
      "*.config.js",
      "*.config.mjs",
      "scripts/**/*.sh"
    ]
  },
  
  // 默认配置
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    }
  },
  
  // 继承 Next.js 配置
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  
  // 自定义规则
  {
    rules: {
      // 允许 console 在开发环境中使用
      "no-console": "warn",
      
      // 允许未使用的变量（在开发中常见）
      "no-unused-vars": "warn",
      
      // 允许下划线开头的变量
      "no-underscore-dangle": "off",
      
      // 允许使用 any 类型（在迁移期间）
      "@typescript-eslint/no-explicit-any": "warn"
    }
  }
];

export default eslintConfig;
