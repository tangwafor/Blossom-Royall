import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }, testInfo) => {
  page.on("pageerror", (error) =>
    console.error(`Browser error: ${error.message}`),
  );
  if (!testInfo.title.includes("guides a first visit")) {
    await page.addInitScript(() => localStorage.setItem("br-tour-complete", "true"));
  }
});

test("guides a first visit and remembers completion", async ({ page }) => {
  await page.goto("/");
  const tour = page.getByRole("dialog");
  await expect(tour).toBeVisible();
  await expect(page.getByText("Welcome to your Command Center")).toBeVisible();
  await tour.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Run every part of the mall")).toBeVisible();
  await tour.getByRole("button", { name: "Next", exact: true }).click();
  await tour.getByRole("button", { name: "Finish tour" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Open guided tour" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("renders the command center and live operating data", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Command Center" }),
  ).toBeVisible();
  await expect(
    page.getByText("Your mall is moving beautifully."),
  ).toBeVisible();
  await expect(page.getByText("$4,820").first()).toBeVisible();
  await expect(page.getByText("#BR-2048")).toBeVisible();
});

test("navigates between core operating views", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-app-ready", "true");
  if (testInfo.project.name === "mobile")
    await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Products" }).click();
  await expect(
    page.getByRole("heading", { name: "Products & inventory" }),
  ).toBeVisible();
  await expect(page.getByText("Aurelia Satin Midi")).toBeVisible();
  if (testInfo.project.name === "mobile")
    await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Vendors" }).click();
  await expect(page.getByText("Africstyle Fashion")).toBeVisible();
  await expect(page.getByText("Jose Kako")).toBeVisible();
  await expect(page.getByText("Sapologie Italiano")).toBeVisible();
});

test("introduces a prospective brand and persists the inquiry", async ({ page }) => {
  await page.goto("/partners");
  await expect(page.getByRole("heading", { name: "Your next chapter deserves a remarkable stage." })).toBeVisible();
  await page.getByLabel("Brand name").fill("Kente House");
  await page.getByLabel("Your name").fill("Ama Mensah");
  await page.getByLabel("Email").fill("ama@example.com");
  await page.getByLabel("What do you offer?").selectOption({ label: "African fashion and textiles" });
  await page.getByLabel("Tell us about your brand").fill("Contemporary garments made with traceable Ghanaian textiles.");
  await page.getByLabel(/I agree that Blossom Royall may contact me/).check();
  await page.getByRole("button", { name: "Introduce my brand" }).click();
  await expect(page.getByRole("status")).toContainText("Your introduction is with us.");
  const saved = await page.evaluate(() => localStorage.getItem("br-partner-interest:blossom-royall"));
  expect(saved).toContain("Kente House");
});

test("configures shared checkout settlement and inventory controls", async ({ page }, testInfo) => {
  await page.goto("/");
  if (testInfo.project.name === "mobile") await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Shared Commerce" }).click();
  await expect(page.getByRole("heading", { name: "Shared commerce control" })).toBeVisible();
  await page.getByLabel("Payout cadence").selectOption("weekly");
  await page.getByLabel("Return reserve").fill("10");
  await page.getByRole("button", { name: "Save controls" }).click();
  await expect(page.getByRole("button", { name: "Settings saved" })).toBeVisible();
  await page.reload();
  if (testInfo.project.name === "mobile") await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Shared Commerce" }).click();
  await expect(page.getByLabel("Payout cadence")).toHaveValue("weekly");
  await expect(page.getByLabel("Return reserve")).toHaveValue("10");
});

test("configures online fulfillment and keeps the delivery promise", async ({ page }, testInfo) => {
  await page.goto("/");
  if (testInfo.project.name === "mobile") await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Delivery" }).click();
  await expect(page.getByRole("heading", { name: "Delivery operations" })).toBeVisible();
  await page.getByLabel("Local radius").fill("20");
  await page.getByLabel("Routing priority").selectOption("fastest");
  await page.getByRole("button", { name: "Save delivery" }).click();
  await expect(page.getByRole("button", { name: "Delivery saved" })).toBeVisible();
  await page.reload();
  if (testInfo.project.name === "mobile") await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Delivery" }).click();
  await expect(page.getByLabel("Local radius")).toHaveValue("20");
  await expect(page.getByLabel("Routing priority")).toHaveValue("fastest");
  await expect(page.getByText("Mila Gold Clutch")).toBeVisible();
  await expect(page.getByText("Vendor fulfilled")).toBeVisible();
});

test("builds a transparent occasion edit across independent brands", async ({ page }, testInfo) => {
  await page.goto("/");
  if (testInfo.project.name === "mobile") await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Customer Shop" }).click();
  await page.getByLabel("Shopping occasion").selectOption("Traditional ceremony");
  await page.getByLabel("Complete look budget").fill("400");
  await page.getByLabel("Need by").selectOption("Next week");
  await page.getByRole("button", { name: "Build my edit" }).click();
  const result = page.getByRole("status");
  await expect(result).toContainText("Traditional ceremony, ready by next week");
  await expect(result).toContainText("Three pieces from three independent brands");
  await expect(result).toContainText("$88 under your $400 budget");
});

test("checks out one coordinated bag across multiple sellers", async ({ page }, testInfo) => {
  await page.goto("/");
  if (testInfo.project.name === "mobile") await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Customer Shop" }).click();
  await page.getByRole("button", { name: "Build my edit" }).click();
  await page.getByRole("button", { name: "Add complete look" }).click();
  await page.getByRole("button", { name: "Review bag" }).click();
  await expect(page.getByRole("heading", { name: "Your complete edit" })).toBeVisible();
  await expect(page.getByText("Sold by Africstyle Fashion")).toBeVisible();
  await page.getByRole("button", { name: /Layaway/ }).click();
  await page.getByRole("button", { name: "Start secure layaway" }).click();
  await expect(page.getByText("Order #BR-2053 is coordinated across every seller.")).toBeVisible();
  const order = await page.evaluate(() => localStorage.getItem("br-latest-order:blossom-royall"));
  expect(order).toContain("Africstyle Fashion");
  expect(order).toContain("layaway");
});

test("tracks a multi seller order and starts an eligible return", async ({ page }, testInfo) => {
  await page.addInitScript(() => localStorage.setItem("br-latest-order:blossom-royall", JSON.stringify({ id: "#BR-2053", method: "pickup", payment: "layaway", total: 312, items: [{ name: "Aurelia Satin Midi", vendor: "Africstyle Fashion", price: 168, fulfillment: "Pickup today" }] })));
  await page.goto("/");
  if (testInfo.project.name === "mobile") await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "My Orders" }).click();
  await expect(page.getByText("482 915")).toBeVisible();
  await expect(page.getByText("Sold by Africstyle Fashion")).toBeVisible();
  await page.getByRole("button", { name: "Return or exchange" }).click();
  await page.getByLabel("Return reason").selectOption("Fit was not right");
  await page.getByRole("button", { name: "Start request" }).click();
  await expect(page.getByText("Request received")).toBeVisible();
  const request = await page.evaluate(() => localStorage.getItem("br-latest-return:blossom-royall"));
  expect(request).toContain("Aurelia Satin Midi");
});

test("completes the express sale handoff", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-app-ready", "true");
  await page
    .getByRole("button", {
      name: testInfo.project.name === "mobile" ? /Open checkout/ : /New sale/,
    })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: /Tap to scan barcode/ }).click();
  await expect(page.getByText("Order #BR-2049 is ready")).toBeVisible();
  await page.getByRole("button", { name: /Continue to checkout/ }).click();
  await expect(
    page.getByRole("heading", { name: "Ready when your customer is." }),
  ).toBeVisible();
});

test("filters orders without rescanning other views", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "desktop search regression");
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-app-ready", "true");
  await page.getByLabel("Search").fill("Nia");
  await expect(page.getByText("#BR-2046")).toBeVisible();
  await expect(page.getByText("#BR-2048")).toHaveCount(0);
});

test("mobile navigation exposes every core destination", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile regression");
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-app-ready", "true");
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Staff" }).click();
  await expect(
    page.getByRole("heading", { name: "Staff & payroll" }),
  ).toBeVisible();
});

test("persists the chosen theme across reloads", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-app-ready", "true");
  await page.getByRole("button", { name: "Use dark theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("configures and persists tenant retail policies", async ({ page }, testInfo) => {
  await page.goto("/");
  if (testInfo.project.name === "mobile") await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Policies" }).click();
  await expect(page.getByRole("heading", { name: "Retail policies you control" })).toBeVisible();
  await page.getByLabel("Return window in days").fill("45");
  await page.getByLabel("Layaway deposit percent").fill("25");
  await page.getByRole("button", { name: "Save and publish" }).click();
  await expect(page.getByRole("status")).toContainText("Policy published");
  await page.reload();
  if (testInfo.project.name === "mobile") await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Policies" }).click();
  await expect(page.getByLabel("Return window in days")).toHaveValue("45");
  await expect(page.getByLabel("Layaway deposit percent")).toHaveValue("25");
});

test("manages returns and layaway aftercare", async ({ page }, testInfo) => {
  await page.goto("/");
  if (testInfo.project.name === "mobile") await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Aftercare" }).click();
  await expect(page.getByRole("heading", { name: "Returns, exchanges, and layaway" })).toBeVisible();
  await page.getByRole("button", { name: "Approve exchange" }).click();
  await expect(page.getByRole("status")).toContainText("inventory reserved");
  await expect(page.getByText("Approved for exchange")).toBeVisible();
  await page.getByRole("button", { name: "Send reminder" }).click();
  await expect(page.getByRole("status")).toContainText("payment reminder");
  await expect(page.getByText("Reminder sent")).toBeVisible();
});

test("exposes an installable PWA manifest and service worker", async ({
  page,
  request,
}) => {
  await page.goto("/");
  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBeTruthy();
  expect((await manifest.json()).name).toContain("Blossom Royall");
  expect(JSON.stringify((await manifest.json()).icons)).toContain("icon-v2.png");
  expect((await request.get("/sw.js")).ok()).toBeTruthy();
  expect((await request.get("/og-v2.png")).ok()).toBeTruthy();
});

test("brands printable receipts with tenant and TaTech identity", async ({ page }, testInfo) => {
  await page.goto("/");
  if (testInfo.project.name === "mobile") await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Checkout", exact: true }).click();
  const receipt = page.locator(".receipt");
  await expect(receipt.getByAltText("Blossom Royall monogram")).toBeVisible();
  await expect(receipt.getByText("Powered by TA Tech")).toBeVisible();
  await expect(receipt.getByText("Is not where you have been but where you are going.")).toBeVisible();
});

test("shows personalized customer recommendations with explanations", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-app-ready", "true");
  if (testInfo.project.name === "mobile")
    await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Customer Shop" }).click();
  await expect(
    page.getByRole("heading", { name: "An entrance worth remembering." }),
  ).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Shop collections" })).toBeVisible();
  await expect(page.getByText("Your stylist, one message away")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Craft carried forward." })).toBeVisible();
  await page.getByRole("button", { name: "Explore the collection" }).click();
  await expect(page.getByText("Designed with provenance in view")).toBeVisible();
  await expect(
    page.getByText("Your private edit", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("Because you love emerald occasionwear"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Add Aurelia Satin Midi to bag" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Why these picks?" }).click();
  await expect(
    page.getByText("Recommendations you can understand"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Not for me" }).first().click();
  await expect(
    page.getByRole("button", { name: "Restore hidden picks" }),
  ).toBeVisible();
});

test("turns intelligence signals into accountable owner actions", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  if (testInfo.project.name === "mobile")
    await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Intelligence" }).click();
  await expect(
    page.getByRole("heading", { name: "Demand you can act on" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Create merchandising brief" })
    .click();
  await expect(
    page.getByText("Protect the weekend opportunity."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Approve reorder" }).click();
  await expect(page.getByText("Reorder approved")).toBeVisible();
});

test("presents a branded luxury mall entrance", async ({ page }) => {
  await page.goto("/welcome");
  await expect(page.getByAltText("Blossom Royall monogram")).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "A world of style, in one store.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Meet us at The Mall at Prince George’s Plaza." })).toBeVisible();
  await expect(page.getByText("3500 East West Highway, Hyattsville, MD 20782")).toBeVisible();
  await expect(page.getByText("Africstyle Fashion", { exact: false })).toBeVisible();
  await expect(page.getByText("Powered by TA Tech")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Enter Blossom Royall" }),
  ).toBeVisible();
});

test("explains the shared marketplace through an interactive concept", async ({ page }) => {
  await page.goto("/concept");
  await expect(page.getByRole("heading", { name: /One destination/ })).toBeVisible();
  await page.getByRole("button", { name: "One checkout" }).click();
  await expect(page.getByText("The customer pays once.")).toBeVisible();
  await page.getByRole("button", { name: "Vendor payout" }).click();
  await expect(page.getByText("Every vendor knows what they earned.")).toBeVisible();
  await page.getByLabel("Estimated monthly marketplace sales").fill("10000");
  await expect(page.getByText("$120,000")).toBeVisible();
  await expect(page.getByRole("link", { name: "Introduce a brand" })).toHaveAttribute("href", "/partners");
});

test("gives the owner purchase performance by brand", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "What customers are buying" }),
  ).toBeVisible();
  await expect(page.getByText("Atelier Omi")).toBeVisible();
  await expect(page.getByText("Repeat buyers")).toBeVisible();
});

test("renders branded authentication with safe password controls", async ({
  page,
}) => {
  await page.goto("/auth");
  await expect(page.getByAltText("Blossom Royall monogram")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
  await expect(page.getByText("Powered by TA Tech")).toBeVisible();
  await expect(
    page.getByText("Is not where you have been but where you are going."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Forgot password?" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  await expect(page.getByLabel("Remember my email")).toBeVisible();
  await page.getByRole("button", { name: "Email link" }).click();
  await expect(page.getByRole("button", { name: "Send secure sign in link" })).toBeVisible();
  await expect(page.getByPlaceholder("Your password")).toHaveCount(0);
  await page.getByRole("button", { name: "Password", exact: true }).click();
  const password = page.getByPlaceholder("Your password");
  await expect(password).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(password).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: /Create an account/ }).click();
  await expect(
    page.getByRole("heading", { name: "Create your account" }),
  ).toBeVisible();
  await expect(
    page.getByLabel(
      "I agree to the Blossom Royall account terms and privacy notice.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Back to Blossom Royall" }),
  ).toBeVisible();
});
