import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// vitest.config.ts does not enable globals, so RTL's automatic cleanup never
// registers; unmount rendered components between tests explicitly.
afterEach(() => {
  cleanup();
});
