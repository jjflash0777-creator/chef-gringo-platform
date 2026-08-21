/**
 * Element-clipped screenshots for the Stage 2 disclosure review.
 * Ad-hoc tooling: needs a running server and a local Chrome.
 */
import { writeFile } from "node:fs/promises";

const CDP = process.env.CDP_URL || "http://[::1]:9222";
const ORIGIN = process.env.ORIGIN || "http://localhost:3000";
const OUT = process.env.OUT || "/tmp/cgshots";

const VIEWPORTS = [
  { name: "390", width: 390, height: 844, dsf: 2, mobile: true },
  { name: "430", width: 430, height: 932, dsf: 2, mobile: true },
  { name: "768", width: 768, height: 1024, dsf: 2, mobile: true },
  { name: "1440", width: 1440, height: 900, dsf: 2, mobile: false },
];

const TARGETS = [
  { name: "disclosure", selector: ".cg-affiliate-disclosure", pad: 14 },
  { name: "card-unpriced", selector: "#sammic-xm51", pad: 10 },
  { name: "card-priced", selector: "#thermoworks-thermapen-one", pad: 10 },
];

function connect(wsUrl) {
  const socket = new WebSocket(wsUrl);
  const pending = new Map();
  let nextId = 1;
  const ready = new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    const entry = pending.get(message.id);
    if (!entry) return;
    pending.delete(message.id);
    if (message.error) entry.reject(new Error(`${message.error.message} (${entry.method})`));
    else entry.resolve(message.result);
  });
  return {
    ready,
    close: () => socket.close(),
    send(method, params = {}) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject, method });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
  };
}

for (const viewport of VIEWPORTS) {
  const tab = await (await fetch(`${CDP}/json/new?about:blank`, { method: "PUT" })).json();
  const client = connect(tab.webSocketDebuggerUrl);
  await client.ready;
  await client.send("Page.enable");
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width, height: viewport.height, deviceScaleFactor: viewport.dsf, mobile: viewport.mobile,
  });
  await client.send("Page.navigate", { url: `${ORIGIN}/marketplace` });
  await new Promise((resolve) => setTimeout(resolve, 2500));

  for (const target of TARGETS) {
    const box = await client.send("Runtime.evaluate", {
      returnByValue: true,
      expression: `(() => {
        const element = document.querySelector(${JSON.stringify(target.selector)});
        if (!element) return null;
        element.scrollIntoView({ block: "center" });
        const rect = element.getBoundingClientRect();
        return { x: rect.left + scrollX, y: rect.top + scrollY, width: rect.width, height: rect.height };
      })()`,
    });
    const rect = box.result.value;
    if (!rect) { console.log(`missing ${target.selector} at ${viewport.name}`); continue; }
    const shot = await client.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
      clip: {
        x: Math.max(0, rect.x - target.pad),
        y: Math.max(0, rect.y - target.pad),
        width: Math.min(viewport.width, rect.width + target.pad * 2),
        height: Math.min(2200, rect.height + target.pad * 2),
        scale: 1,
      },
    });
    await writeFile(`${OUT}/${target.name}-${viewport.name}.png`, Buffer.from(shot.data, "base64"));
    console.log(`${target.name}-${viewport.name}.png  ${Math.round(rect.width)}x${Math.round(rect.height)}`);
  }

  client.close();
  await fetch(`${CDP}/json/close/${tab.id}`);
}
