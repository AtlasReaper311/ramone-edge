import fs from "node:fs";

import AxeBuilder from "@axe-core/playwright";
import { chromium, firefox } from "playwright";

const base = process.env.PREVIEW_URL;
if (!base) throw new Error("PREVIEW_URL is required");

const viewports = [
  ["320", { width: 320, height: 760 }],
  ["375", { width: 375, height: 812 }],
  ["768", { width: 768, height: 900 }],
  ["1024", { width: 1024, height: 900 }],
  ["1440", { width: 1440, height: 1000 }],
];
const browsers = [
  ["chrome", () => chromium.launch({ channel: "chrome", headless: true })],
  ["firefox", () => firefox.launch({ headless: true })],
];
const report = [];
const failures = [];

function writeReport() {
  fs.writeFileSync(
    "evidence.json",
    `${JSON.stringify({
      preview: base,
      commit: process.env.HEAD_SHA,
      fixture: "deterministic-offline-with-cited-answer",
      browsers: browsers.map(([name]) => name),
      viewports: viewports.map(([name]) => Number(name)),
      cases: report,
      failures,
    }, null, 2)}\n`,
  );
}

function summarizeViolation(item) {
  return {
    id: item.id,
    impact: item.impact,
    help: item.help,
    nodes: item.nodes.map((node) => ({
      target: node.target,
      html: node.html,
      failureSummary: node.failureSummary,
    })),
  };
}

async function openWithRetry(page, url) {
  let lastError;
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      const response = await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      });
      if (!response || !response.ok()) {
        throw new Error(`HTTP ${response?.status() ?? "no response"}`);
      }
      await page.waitForSelector("#machine-availability", { timeout: 15_000 });
      await page.waitForFunction(
        () => document.querySelector("#state-text")?.textContent.includes("offline"),
        { timeout: 15_000 },
      );
      await page.evaluate(() => document.fonts?.ready || Promise.resolve());
      return;
    } catch (error) {
      lastError = error;
      await page.waitForTimeout(attempt * 1_000);
    }
  }
  throw lastError;
}

async function inspect(page) {
  return page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const scrollWidth = document.documentElement.scrollWidth;
    const mobileNav = document.querySelector(".atlas-bottom-nav");
    const mobileVisible = Boolean(mobileNav) && getComputedStyle(mobileNav).display !== "none";
    const targets = [
      ...document.querySelectorAll(
        ".atlas-global-header a, .atlas-global-header button, .suggestion, .composer button, .atlas-bottom-nav a",
      ),
    ]
      .filter((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          label: element.getAttribute("aria-label") || element.textContent.trim(),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      });

    return {
      width,
      scrollWidth,
      h1Count: document.querySelectorAll("h1").length,
      mainCount: document.querySelectorAll("main").length,
      interfaceVersion: document.querySelector('meta[name="atlas-interface-version"]')?.content,
      interfaceSha256: document.querySelector('meta[name="atlas-interface-sha256"]')?.content,
      statusText: document.querySelector("#state-text")?.textContent,
      availabilityText: document.querySelector("#machine-availability")?.textContent.trim(),
      desktopRoutes: [...document.querySelectorAll(".atlas-global-header__nav a")].map((link) => link.textContent.trim()),
      mobileRoutes: [...document.querySelectorAll(".atlas-bottom-nav a")].map((link) => link.textContent.trim()),
      mobileVisible,
      mobileActive: document.querySelectorAll('.atlas-bottom-nav [aria-current="page"]').length,
      bodyPaddingBottom: Number.parseFloat(getComputedStyle(document.body).paddingBottom) || 0,
      mobileNavHeight: mobileVisible ? mobileNav.getBoundingClientRect().height : 0,
      starterHidden: document.querySelector("#starter-prompts")?.hidden,
      sourceCards: document.querySelectorAll("details.source-card").length,
      openSourceCards: document.querySelectorAll("details.source-card[open]").length,
      targetFailures: targets.filter((target) => target.width < 44 || target.height < 44),
    };
  });
}

function assertEvidence(evidence, browserName, viewportName) {
  const prefix = `${browserName}/${viewportName}`;
  const expectedRoutes = ["Work", "Writing", "Lab", "Systems", "About"];
  const mobileExpected = Number(viewportName) < 768;
  const values = [];

  if (evidence.scrollWidth > evidence.width + 1) {
    values.push(`${prefix}: horizontal overflow ${evidence.scrollWidth} > ${evidence.width}`);
  }
  if (evidence.h1Count !== 1) values.push(`${prefix}: expected one h1, found ${evidence.h1Count}`);
  if (evidence.mainCount !== 1) values.push(`${prefix}: expected one main, found ${evidence.mainCount}`);
  if (evidence.interfaceVersion !== "0.1.1") values.push(`${prefix}: Interface Kit version is not 0.1.1`);
  if (!/^[a-f0-9]{64}$/.test(evidence.interfaceSha256 || "")) values.push(`${prefix}: Interface Kit fingerprint is missing`);
  if (evidence.statusText !== "SPECULAR-CORE offline") values.push(`${prefix}: offline machine state is not explicit`);
  if (!evidence.availabilityText.includes("SPECULAR-CORE is currently offline.")) values.push(`${prefix}: offline explanation is missing`);
  if (JSON.stringify(evidence.desktopRoutes) !== JSON.stringify(expectedRoutes)) values.push(`${prefix}: desktop navigation order drifted`);
  if (JSON.stringify(evidence.mobileRoutes) !== JSON.stringify(expectedRoutes)) values.push(`${prefix}: mobile navigation order drifted`);
  if (evidence.mobileVisible !== mobileExpected) values.push(`${prefix}: mobile navigation visibility is incorrect`);
  if (mobileExpected && evidence.mobileActive !== 1) values.push(`${prefix}: mobile navigation has no active route`);
  if (mobileExpected && evidence.bodyPaddingBottom + 1 < evidence.mobileNavHeight) values.push(`${prefix}: bottom navigation can obscure content`);
  if (!evidence.starterHidden) values.push(`${prefix}: starter questions did not recede after conversation began`);
  if (evidence.sourceCards !== 2) values.push(`${prefix}: expected two source cards, found ${evidence.sourceCards}`);
  if (evidence.openSourceCards !== 1) values.push(`${prefix}: source card did not expand`);
  if (evidence.targetFailures.length) values.push(`${prefix}: controls below 44px ${JSON.stringify(evidence.targetFailures)}`);
  return values;
}

async function runCase(context, browserName, viewportName) {
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  try {
    await openWithRetry(page, new URL("/", base).toString());
    await page.screenshot({
      path: `screenshots/${browserName}-${viewportName}-offline.png`,
      fullPage: Number(viewportName) >= 768,
    });

    await page.getByRole("button", { name: "Search the estate" }).click();
    await page.waitForSelector("#atlas-estate-search:not([hidden])");
    const searchFocused = await page.evaluate(
      () => document.activeElement?.id === "atlas-estate-search-input",
    );
    if (!searchFocused) throw new Error("Estate search did not move focus into the dialog");
    await page.keyboard.press("Escape");
    await page.waitForSelector("#atlas-estate-search[hidden]");
    const searchFocusRestored = await page.evaluate(
      () => document.activeElement?.matches("[data-estate-search-open]"),
    );
    if (!searchFocusRestored) throw new Error("Estate search did not restore trigger focus");

    await page.getByLabel("Ask Ramone a question").fill("Show me how Ramone cites public evidence.");
    await page.getByRole("button", { name: "transmit" }).click();
    await page.waitForSelector("details.source-card");
    const sourceCards = page.locator("details.source-card");
    if (await sourceCards.count() !== 2) throw new Error("Preview fixture did not render two source cards");
    await sourceCards.first().locator("summary").click();
    await page.waitForSelector("details.source-card[open]");

    const semantics = await inspect(page);
    const accessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const violations = accessibility.violations.map(summarizeViolation);
    const blocking = violations.filter(
      (item) => item.impact === "serious" || item.impact === "critical",
    );
    const caseFailures = assertEvidence(semantics, browserName, viewportName);
    if (pageErrors.length) caseFailures.push(`${browserName}/${viewportName}: page errors ${JSON.stringify(pageErrors)}`);
    if (blocking.length) caseFailures.push(`${browserName}/${viewportName}: serious accessibility findings ${JSON.stringify(blocking)}`);

    await page.screenshot({
      path: `screenshots/${browserName}-${viewportName}-conversation.png`,
      fullPage: Number(viewportName) >= 768,
    });
    failures.push(...caseFailures);
    report.push({
      browser: browserName,
      viewport: viewportName,
      semantics,
      pageErrors,
      accessibilityViolations: violations,
      failures: caseFailures,
    });
  } catch (error) {
    const message = `${browserName}/${viewportName}: ${error.stack || error.message}`;
    failures.push(message);
    report.push({ browser: browserName, viewport: viewportName, failures: [message] });
  } finally {
    writeReport();
    await page.close();
  }
}

try {
  fs.mkdirSync("screenshots", { recursive: true });
  for (const [browserName, launch] of browsers) {
    const browser = await launch();
    try {
      for (const [viewportName, viewport] of viewports) {
        const context = await browser.newContext({ viewport, reducedMotion: "no-preference" });
        await runCase(context, browserName, viewportName);
        await context.close();
      }
    } finally {
      await browser.close();
    }
  }
  writeReport();
  if (failures.length) {
    throw new Error(`Interface evidence failed:\n${failures.join("\n")}`);
  }
} catch (error) {
  fs.writeFileSync("capture-error.txt", `${error.stack || error.message}\n`);
  writeReport();
  throw error;
}
