import { createDefaultEsmPreset } from "ts-jest";

const esmPreset = createDefaultEsmPreset({
  tsconfig: "./tsconfig.test.json",
});

export default {
  ...esmPreset,
  clearMocks: true,
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  roots: ["<rootDir>/tests"],
  testEnvironment: "node",
};
