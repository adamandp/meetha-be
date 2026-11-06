import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["test/**/*.spec.ts"],
    exclude: ["test/**/*.e2e-spec.ts"],
    env: {
      LOG_LEVEL: "silent",
      NODE_ENV: "test",
      JWT_SECRET: "test-secret",
      RUNTIME_ENABLED: "false",
      DATA_ROOT: "/private/tmp/meetha-be-test-data",
    },
  },
});
