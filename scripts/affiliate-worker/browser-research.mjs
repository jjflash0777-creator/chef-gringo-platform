import { execFileSync } from "node:child_process";

const MAX_PAGES = 3;
const RESEARCH_LINK_PATTERN = /advocat|affiliate|referr|partner|program|terms/i;

function normalizeHttpUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Research URL must use http(s)");
  url.hash = "";
  return url.href.replace(/\/$/, "");
}

function domainFamily(value) {
  return new URL(value).hostname.toLowerCase().replace(/^www\./, "").split(".").slice(-2).join(".");
}

export function selectFirstPartyResearchLinks(startUrl, links) {
  const family = domainFamily(normalizeHttpUrl(startUrl));
  const unique = [...new Set(links
    .filter((link) => link && typeof link.href === "string" && RESEARCH_LINK_PATTERN.test(`${link.text ?? ""} ${link.href}`))
    .map((link) => { try { return normalizeHttpUrl(link.href); } catch { return null; } })
    .filter((href) => href && domainFamily(href) === family))];
  const score = (url) => /advocates?-terms|legal.*advocat/i.test(url) ? 0 : /\/advocates?$|referral/i.test(url) ? 1 : 2;
  return unique.sort((left, right) => score(left) - score(right) || left.localeCompare(right));
}

export function createBrowserUseReader({ executable = "browser-use", execute = execFileSync } = {}) {
  return {
    read(url, firstPage = false) {
      const safeUrl = normalizeHttpUrl(url);
      const navigation = firstPage ? "new_tab" : "goto_url";
      const program = [
        "import json",
        `${navigation}(${JSON.stringify(safeUrl)})`,
        "wait_for_load()",
        "result=js(\"({url:location.href,title:document.title,text:document.body.innerText,links:Array.from(document.querySelectorAll('a[href]')).map(a=>({text:(a.innerText||a.getAttribute('aria-label')||'').trim(),href:a.href}))})\")",
        "print(json.dumps(result))",
      ].join("\n");
      const output = execute(executable, [], { input: program, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
      const jsonLine = output.trim().split("\n").reverse().find((line) => line.startsWith("{"));
      if (!jsonLine) throw new Error("Browser adapter returned no structured page result");
      return JSON.parse(jsonLine);
    },
  };
}

export function acquireFirstPartyPages({ website, browser }) {
  const visitedUrls = [];
  const failures = [];
  const pages = [];
  try {
    const home = browser.read(website, true); const queue = selectFirstPartyResearchLinks(home.url, home.links);
    pages.push(home); visitedUrls.push(home.url);
    while (queue.length && pages.length < MAX_PAGES) {
      const url = queue.shift();
      if (visitedUrls.includes(url)) continue;
      try {
        const page = browser.read(url, false); pages.push(page); visitedUrls.push(page.url);
        const discovered = selectFirstPartyResearchLinks(home.url, page.links).filter((href) => !visitedUrls.includes(href) && !queue.includes(href));
        queue.unshift(...discovered);
      } catch (error) { failures.push({ url, reason: error instanceof Error ? error.message : "Browser read failed" }); }
    }
  } catch (error) {
    failures.push({ url: website, reason: error instanceof Error ? error.message : "Browser read failed" });
  }
  return { pages, visitedUrls, failures, actions: ["navigate", "read_visible_text", "inspect_links"], externalWrites: false };
}
