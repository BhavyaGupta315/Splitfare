import { defineConfig } from "vitest/config";
import { readFileSync } from "fs";
import { resolve } from "path";

function parseEnvFile(filePath: string): Record<string, string> {
  try {
    const lines = readFileSync(filePath, "utf-8").split("\n");
    const env: Record<string, string> = {};
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
    }
    return env;
  } catch {
    return {};
  }
}

const testEnv = parseEnvFile(resolve(__dirname, "../../.env.test"));

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/__tests__/setup.ts"],
    fileParallelism: false, // run test files serially — they share a DB
    testTimeout: 15000,
    hookTimeout: 30000,
    clearMocks: true,
    restoreMocks: true,
    env: testEnv,
  },
});
