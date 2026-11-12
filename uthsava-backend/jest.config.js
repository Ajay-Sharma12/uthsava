/** @type {import('jest').Config} */
export default {
  preset: "ts-jest",
  testEnvironment: "node",


moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/src/$1',
},
  setupFilesAfterEnv: ["<rootDir>/src/test/setup.ts"],

  testMatch: [
    "**/__tests__/**/*.ts?(x)",
    "**/?(*.)+(spec|test).ts?(x)",
  ],

  moduleFileExtensions: ["ts", "tsx", "js", "jsx"],

  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/index.ts",
    "!src/**/vite-env.d.ts",
  ],

  testPathIgnorePatterns: ["/node_modules/", "/dist/"],

  transformIgnorePatterns: [
    "node_modules/(?!(libphonenumber-js)/)",
  ],

  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "./tsconfig.json",
      },
    ],
  },
};