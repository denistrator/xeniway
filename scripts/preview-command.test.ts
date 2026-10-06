import { expect, test } from "bun:test";

const root = await Bun.file(new URL("../package.json", import.meta.url)).json();
const api = await Bun.file(new URL("../apps/api/package.json", import.meta.url)).json();
const web = await Bun.file(new URL("../apps/web/package.json", import.meta.url)).json();

test("preview builds successfully before supervising both servers", () => {
  expect(root.scripts.preview).toStartWith("bun run build && concurrently -k ");
  expect(root.scripts.preview).toContain("bun run --cwd apps/api start");
  expect(root.scripts.preview).toContain("bun run --cwd apps/web preview");
});

test("preview aligns API port, proxy, and browser origin without overriding runtime mode", () => {
  expect(root.scripts.preview).toContain("PORT=3101 ");
  expect(root.scripts.preview).toContain("API_PORT=3101 ");
  expect(root.scripts.preview).toContain("APP_ORIGIN=http://127.0.0.1:4174 ");
  expect(root.scripts.preview).toContain("CORS_ORIGIN=http://127.0.0.1:4174 ");
  expect(root.scripts.preview).not.toContain("NODE_ENV=");
  expect(root.scripts.preview).not.toContain("db:seed");
  expect(root.scripts.preview).not.toContain("docker");
});

test("API start loads local configuration without watch and web preview uses a strict loopback port", () => {
  expect(api.scripts.start).toBe("bun --env-file=../../.env src/server.ts");
  expect(web.scripts.preview).toBe("vite preview --host 127.0.0.1 --port 4174 --strictPort");
});
