/**
 * Ad-hoc viewport audit driven over CDP. Not part of the test suite: it needs a
 * running server and a local Chrome. Deterministic checks live in tests/.
 */
import { writeFile } from "node:fs/promises";

const CDP = process.env.CDP_URL || "http://[::1]:9222";
const ORIGIN = process.env.ORIGIN || "http://localhost:3000";
const OUT = process.env.OUT || "/tmp/cgshots";

const VIEWPORTS = [
  { name: "390-mobile", width: 390, height: 844, dsf: 3, mobile: true },
  { name: "430-mobile", width: 430, height: 932, dsf: 3, mobile: true },
  { name: "768-tablet", width: 768, height: 1024, dsf: 2, mobile: true },
  { name: "1440-desktop", width: 1440, height: 900, dsf: 2, mobile: false },
];

const PAGES = [
  { name: "marketplace", path: "/marketplace" },
  { name: "marketplace-all", path: "/marketplace?all=1" },
  { name: "marketplace-compare", path: "/marketplace/compare?ids=thermoworks-thermapen-one,thermoworks-thermopop-2" },
  { name: "marketplace-empty", path: "/marketplace?path=home-growing" },
];

async function openTab() {
  const response = await fetch(`${CDP}/json/new?about:blank`, { method: "PUT" });
  return response.json();
}

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

/** Runs in the page. Measures the things a screenshot cannot prove. */
const PROBE = `(() => {
  function luminance(rgb) {
    const parts = rgb.match(/\\d+(\\.\\d+)?/g).slice(0, 3).map(Number);
    const channels = parts.map((raw) => {
      const value = raw / 255;
      return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  }
  function effectiveBackground(element) {
    let node = element;
    while (node) {
      const background = getComputedStyle(node).backgroundColor;
      if (background && !/rgba\\(0, 0, 0, 0\\)|transparent/.test(background)) return background;
      node = node.parentElement;
    }
    return "rgb(255, 255, 255)";
  }
  function contrast(foreground, background) {
    const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
    return (values[0] + 0.05) / (values[1] + 0.05);
  }

  const documentWidth = document.documentElement.scrollWidth;
  const viewportWidth = document.documentElement.clientWidth;

  const overflowing = [...document.querySelectorAll("body *")]
    .filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && (rect.right > viewportWidth + 1 || rect.left < -1);
    })
    .slice(0, 12)
    .map((element) => ({
      tag: element.tagName.toLowerCase(),
      cls: (typeof element.className === "string" ? element.className : "").slice(0, 60),
      right: Math.round(element.getBoundingClientRect().right),
      left: Math.round(element.getBoundingClientRect().left),
    }));

  const disclosure = document.querySelector(".cg-affiliate-disclosure");
  let disclosureReport = null;
  if (disclosure) {
    const paragraph = disclosure.querySelector("p");
    const link = disclosure.querySelector("a");
    const style = getComputedStyle(paragraph);
    const rect = disclosure.getBoundingClientRect();
    const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2;
    disclosureReport = {
      visible: style.visibility !== "hidden" && style.display !== "none" && rect.height > 0,
      insideDetails: Boolean(disclosure.closest("details")),
      insideDataEvent: Boolean(disclosure.closest("[data-event]")),
      fontSizePx: parseFloat(style.fontSize),
      lines: Math.round(paragraph.getBoundingClientRect().height / lineHeight),
      widthPx: Math.round(rect.width),
      overflowsRight: rect.right > viewportWidth + 1,
      textContrast: Number(contrast(style.color, effectiveBackground(paragraph)).toFixed(2)),
      linkContrast: link ? Number(contrast(getComputedStyle(link).color, effectiveBackground(link)).toFixed(2)) : null,
      linkTapHeight: link ? Math.round(link.getBoundingClientRect().height) : null,
    };
  }

  // Sticky-header interference: does any fixed/sticky chrome cover the disclosure?
  let covered = false;
  if (disclosure) {
    const rect = disclosure.getBoundingClientRect();
    covered = [...document.querySelectorAll("body *")].some((element) => {
      const position = getComputedStyle(element).position;
      if (position !== "fixed" && position !== "sticky") return false;
      if (element.contains(disclosure)) return false;
      const other = element.getBoundingClientRect();
      return other.height > 0 && other.bottom > rect.top && other.top < rect.bottom && other.right > rect.left && other.left < rect.right;
    });
  }

  const headings = [...document.querySelectorAll("h1, h2, h3")].map((el) => ({ tag: el.tagName, text: el.textContent.trim().slice(0, 60) }));
  const filters = document.querySelector(".cg-filters");
  const filterReport = filters ? {
    present: true,
    fieldsets: filters.querySelectorAll("fieldset").length,
    applyHeight: Math.round(filters.querySelector(".cg-filter-apply")?.getBoundingClientRect().height || 0),
    chipHeight: Math.round(filters.querySelector(".cg-filter-chip")?.getBoundingClientRect().height || 0),
  } : { present: false };
  const compareScroll = document.querySelector(".cg-compare-scroll");
  const compareReport = compareScroll ? {
    present: true,
    overflowX: getComputedStyle(compareScroll).overflowX,
    tableMinWidth: Math.round(compareScroll.querySelector("table")?.getBoundingClientRect().width || 0),
  } : { present: false };
  const empty = document.querySelector(".cg-empty");
  const productAction = document.querySelector(".cg-product-action");
  const productActionHeight = productAction ? Math.round(productAction.getBoundingClientRect().height) : 0;

  const actions = [...document.querySelectorAll(".product-actions .button, .cg-menu-button, .cg-affiliate-disclosure a, .cg-product-action, .cg-filter-apply, .cg-goal, .cg-path")]
    .map((element) => {
      const rect = element.getBoundingClientRect();
      return { label: (element.textContent || "").trim().slice(0, 28), w: Math.round(rect.width), h: Math.round(rect.height) };
    });
  const smallTargets = actions.filter((target) => target.h > 0 && target.h < 44);

  return {
    documentWidth,
    viewportWidth,
    horizontalOverflow: documentWidth > viewportWidth + 1,
    overflowing,
    disclosure: disclosureReport,
    disclosureCoveredByStickyChrome: covered,
    headings,
    filterReport,
    compareReport,
    emptyPresent: Boolean(empty),
    productActionHeight,
    actionCount: actions.length,
    smallTargets: smallTargets.slice(0, 8),
    rawUnknownVisible: /(^|[>\\s])unknown([<\\s]|$)/i.test(document.body.innerText),
  };
})()`;

const results = [];

for (const page of PAGES) {
  for (const viewport of VIEWPORTS) {
    const tab = await openTab();
    const client = connect(tab.webSocketDebuggerUrl);
    await client.ready;
    await client.send("Page.enable");
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: viewport.dsf,
      mobile: viewport.mobile,
    });
    await client.send("Page.navigate", { url: `${ORIGIN}${page.path}` });
    await new Promise((resolve) => setTimeout(resolve, 2500));

    const probe = await client.send("Runtime.evaluate", { expression: PROBE, returnByValue: true, awaitPromise: false });
    results.push({ page: page.name, viewport: viewport.name, ...probe.result.value });

    const shot = await client.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await writeFile(`${OUT}/${page.name}-${viewport.name}.png`, Buffer.from(shot.data, "base64"));

    client.close();
    await fetch(`${CDP}/json/close/${tab.id}`);
  }
}

console.log(JSON.stringify(results, null, 2));
