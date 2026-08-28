import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }, testInfo) => {
  page.on("pageerror", (error) =>
    console.error(`Browser error: ${error.message}`),
  );
  if (!testInfo.title.includes("guides a first visit")) {
    await page.addInitScript(() =>
      localStorage.setItem("br-tour-complete", "true"),
    );
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
  await expect(page.getByText("GOOD MORNING, DELLY")).toBeVisible();
  await expect(page.getByText("Delly", { exact: true })).toBeVisible();
  await expect(page.getByText("Avery Royall")).toHaveCount(0);
});

test("turns owner notifications into direct operating actions", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Notifications" }).click();
  const inbox = page.getByRole("dialog", { name: "Notifications" });
  await expect(inbox.getByText("12 low stock variants")).toBeVisible();
  await inbox
    .locator("article")
    .filter({ hasText: "Leave request awaiting review" })
    .getByRole("button", { name: "Review" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Staff & payroll" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Notifications" }).click();
  await page.getByRole("button", { name: "Mark all reviewed" }).click();
  await expect(page.locator(".notification-count")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".notification-count")).toHaveCount(0);
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

test("lets the owner configure tenant identity without code changes", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  if (testInfo.project.name === "mobile")
    await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Business Setup" }).click();
  await page.getByLabel("Public store name").fill("Delly House");
  await page.getByLabel("Owner display name").fill("Delly");
  await page.getByLabel("Receipt email").fill("hello@example.com");
  await page.getByLabel("Tax rate percent").fill("6");
  await page.getByRole("button", { name: "Save business settings" }).click();
  await expect(page.getByRole("status")).toContainText("Changes are active");
  await page.reload();
  await expect(page.getByText("Delly House", { exact: true })).toBeVisible();
  if (testInfo.project.name === "mobile")
    await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Business Setup" }).click();
  await expect(page.getByLabel("Receipt email")).toHaveValue(
    "hello@example.com",
  );
  await expect(page.getByLabel("Tax rate percent")).toHaveValue("6");
});

test("introduces a prospective brand and persists the inquiry", async ({
  page,
}) => {
  await page.goto("/partners");
  await expect(
    page.getByRole("heading", {
      name: "Your next chapter deserves a remarkable stage.",
    }),
  ).toBeVisible();
  await page.getByLabel("Brand name").fill("Kente House");
  await page.getByLabel("Your name").fill("Ama Mensah");
  await page.getByLabel("Email").fill("ama@example.com");
  await page
    .getByLabel("What do you offer?")
    .selectOption({ label: "African fashion and textiles" });
  await page
    .getByLabel("Tell us about your brand")
    .fill("Contemporary garments made with traceable Ghanaian textiles.");
  await page.getByLabel(/I agree that Blossom Royall may contact me/).check();
  await page.getByRole("button", { name: "Introduce my brand" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Your introduction is with us.",
  );
  const saved = await page.evaluate(() =>
    localStorage.getItem("br-partner-interest:blossom-royall"),
  );
  expect(saved).toContain("Kente House");
});

test("configures shared checkout settlement and inventory controls", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  if (testInfo.project.name === "mobile")
    await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Shared Commerce" }).click();
  await expect(
    page.getByRole("heading", { name: "Shared commerce control" }),
  ).toBeVisible();
  await page.getByLabel("Payout cadence").selectOption("weekly");
  await page.getByLabel("Return reserve").fill("10");
  await page.getByRole("button", { name: "Save controls" }).click();
  await expect(
    page.getByRole("button", { name: "Settings saved" }),
  ).toBeVisible();
  await page.reload();
  if (testInfo.project.name === "mobile")
    await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Shared Commerce" }).click();
  await expect(page.getByLabel("Payout cadence")).toHaveValue("weekly");
  await expect(page.getByLabel("Return reserve")).toHaveValue("10");
});

test("configures online fulfillment and keeps the delivery promise", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  if (testInfo.project.name === "mobile")
    await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Delivery" }).click();
  await expect(
    page.getByRole("heading", { name: "Delivery operations" }),
  ).toBeVisible();
  await page.getByLabel("Local radius").fill("20");
  await page.getByLabel("Routing priority").selectOption("fastest");
  await page.getByRole("button", { name: "Save delivery" }).click();
  await expect(
    page.getByRole("button", { name: "Delivery saved" }),
  ).toBeVisible();
  await page.reload();
  if (testInfo.project.name === "mobile")
    await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Delivery" }).click();
  await expect(page.getByLabel("Local radius")).toHaveValue("20");
  await expect(page.getByLabel("Routing priority")).toHaveValue("fastest");
  await expect(page.getByText("Mila Gold Clutch")).toBeVisible();
  await expect(page.getByText("Vendor fulfilled")).toBeVisible();
});

test("builds a transparent occasion edit across independent brands", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  if (testInfo.project.name === "mobile")
    await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Customer Shop" }).click();
  await page
    .getByLabel("Shopping occasion")
    .selectOption("Traditional ceremony");
  await page.getByLabel("Complete look budget").fill("400");
  await page.getByLabel("Need by").selectOption("Next week");
  await page.getByRole("button", { name: "Build my edit" }).click();
  const result = page.getByRole("status");
  await expect(result).toContainText(
    "Traditional ceremony, ready by next week",
  );
  await expect(result).toContainText(
    "Three pieces from three independent brands",
  );
  await expect(result).toContainText("$88 under your $400 budget");
});

test("guides self measurement and uses My Fit while shopping", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  if (testInfo.project.name === "mobile")
    await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "My Fit", exact: true }).click();

  await page.getByLabel("My Fit language").selectOption("fr");
  await expect(page.getByText("Mesurez une fois. Achetez en confiance.")).toBeVisible();
  await page.getByLabel("My Fit language").selectOption("en");

  await page.getByLabel("Bust").fill("36");
  await page.getByRole("button", { name: "Next measurement" }).click();
  await page.getByLabel("Natural waist").fill("30");
  await page.getByRole("button", { name: "Next measurement" }).click();
  await page.getByLabel("Hips").fill("40");
  await page.getByRole("button", { name: "Next measurement" }).click();
  await page.getByLabel("Inseam").fill("30");
  await page.getByRole("button", { name: "Next measurement" }).click();
  await page.getByLabel("Shoulder width").fill("15");
  await page.getByLabel(/I consent to saving/).check();

  await page.context().setOffline(true);
  await page.getByRole("button", { name: "Save My Fit" }).click();
  await expect(page.getByRole("status")).toContainText("Saved offline");
  expect(
    await page.evaluate(() =>
      localStorage.getItem("br-offline-writes:blossom-royall"),
    ),
  ).toContain("fit_profile");
  await page.context().setOffline(false);
  await expect(page.getByRole("status")).toContainText("synced after reconnecting");

  await page.getByRole("button", { name: "Shop with My Fit" }).click();
  await expect(page.getByText("Size 8 is ready for matching")).toBeVisible();
  await expect(page.getByText("My Fit recommends size 8").first()).toBeVisible();

  await page.reload();
  if (testInfo.project.name === "mobile")
    await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Customer Shop" }).click();
  await expect(page.getByText("Size 8 is ready for matching")).toBeVisible();

  if (testInfo.project.name === "mobile")
    await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "My Fit", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export My Fit" }).click();
  expect((await downloadPromise).suggestedFilename()).toBe("blossom-royall-my-fit.json");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete My Fit" }).click();
  await expect(page.getByRole("status")).toContainText("My Fit was deleted");
  expect(await page.evaluate(() => localStorage.getItem("br-my-fit:blossom-royall"))).toBeNull();
});

test("checks out one coordinated bag across multiple sellers", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  if (testInfo.project.name === "mobile")
    await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Customer Shop" }).click();
  await page.getByRole("button", { name: "Build my edit" }).click();
  await page.getByRole("button", { name: "Add complete look" }).click();
  await page.getByRole("button", { name: "Review bag" }).click();
  await expect(
    page.getByRole("heading", { name: "Your complete edit" }),
  ).toBeVisible();
  await expect(page.getByText("Sold by Africstyle Fashion")).toBeVisible();
  await page.getByRole("button", { name: /Layaway/ }).click();
  await page.getByRole("button", { name: "Start secure layaway" }).click();
  await expect(
    page.getByText(/Order BR-\d{6} is coordinated across every seller\./),
  ).toBeVisible();
  const order = await page.evaluate(() =>
    localStorage.getItem("br-latest-order:blossom-royall"),
  );
  expect(order).toContain("Africstyle Fashion");
  expect(order).toContain("layaway");
});

test("tracks a multi seller order and starts an eligible return", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "br-latest-order:blossom-royall",
      JSON.stringify({
        id: "#BR-2053",
        method: "pickup",
        payment: "layaway",
        total: 312,
        items: [
          {
            name: "Aurelia Satin Midi",
            vendor: "Africstyle Fashion",
            price: 168,
            fulfillment: "Pickup today",
          },
        ],
      }),
    ),
  );
  await page.goto("/");
  if (testInfo.project.name === "mobile")
    await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "My Orders" }).click();
  await expect(page.getByText("482 915")).toBeVisible();
  await expect(page.getByText("Sold by Africstyle Fashion")).toBeVisible();
  await page.getByRole("button", { name: "Return or exchange" }).click();
  await page.getByLabel("Return reason").selectOption("Fit was not right");
  await page.getByRole("button", { name: "Start request" }).click();
  await expect(page.getByText("Request received")).toBeVisible();
  const request = await page.evaluate(() =>
    localStorage.getItem("br-latest-return:blossom-royall"),
  );
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

test("provides role aware help with direct workflow routing", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  if (testInfo.project.name === "mobile")
    await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Help", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Answers at the moment of work." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Vendor", exact: true }).click();
  await page.getByLabel("Search help").fill("collection");
  const guide = page.getByText("Add one item or a collection", { exact: true });
  await expect(guide).toBeVisible();
  await guide.click();
  await page.getByRole("button", { name: "Open Products" }).click();
  await expect(
    page.getByRole("heading", { name: "Products & inventory" }),
  ).toBeVisible();
});

test("provides a renameable policy aware tenant assistant", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open Blossom assistant" }).click();
  const assistant = page.getByRole("dialog", { name: "Blossom assistant" });
  await assistant.getByRole("button", { name: "How do returns work?" }).click();
  await expect(assistant.getByRole("status")).toContainText(
    "tenant policy saved in Policies",
  );
  await assistant.getByText("Assistant settings").click();
  await assistant.getByLabel("Assistant name").fill("Delly Rose");
  await assistant.getByRole("button", { name: "Save assistant name" }).click();
  await page
    .getByRole("dialog", { name: "Delly Rose assistant" })
    .getByRole("button", { name: "Close assistant" })
    .click();
  await page.reload();
  await page.getByRole("button", { name: "Open Delly Rose assistant" }).click();
  await expect(
    page.getByRole("dialog", { name: "Delly Rose assistant" }),
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

test("configures and persists tenant retail policies", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  if (testInfo.project.name === "mobile")
    await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Policies" }).click();
  await expect(
    page.getByRole("heading", { name: "Retail policies you control" }),
  ).toBeVisible();
  await page.getByLabel("Return window in days").fill("45");
  await page.getByLabel("Layaway deposit percent").fill("25");
  await page.getByRole("button", { name: "Save and publish" }).click();
  await expect(page.getByRole("status")).toContainText("Policy published");
  await page.reload();
  if (testInfo.project.name === "mobile")
    await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Policies" }).click();
  await expect(page.getByLabel("Return window in days")).toHaveValue("45");
  await expect(page.getByLabel("Layaway deposit percent")).toHaveValue("25");
});

test("manages returns and layaway aftercare", async ({ page }, testInfo) => {
  await page.goto("/");
  if (testInfo.project.name === "mobile")
    await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Aftercare" }).click();
  await expect(
    page.getByRole("heading", { name: "Returns, exchanges, and layaway" }),
  ).toBeVisible();
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
  expect(JSON.stringify((await manifest.json()).icons)).toContain(
    "icon-v2.png",
  );
  expect((await request.get("/sw.js")).ok()).toBeTruthy();
  expect((await request.get("/og-v2.png")).ok()).toBeTruthy();
});

test("brands printable receipts with tenant and TaTech identity", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  if (testInfo.project.name === "mobile")
    await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Checkout", exact: true }).click();
  const receipt = page.locator(".receipt");
  await expect(receipt.getByAltText("Blossom Royall monogram")).toBeVisible();
  await expect(receipt.getByText("Powered by TA Tech")).toBeVisible();
  await expect(
    receipt.getByText("Is not where you have been but where you are going."),
  ).toBeVisible();
});

test("prints a complete seller attributed receipt after checkout", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    localStorage.setItem("br-tour-complete", "true");
    localStorage.setItem(
      "br-customer-bag:blossom-royall",
      JSON.stringify([
        {
          name: "Kente Ceremony Coat",
          vendor: "Africstyle Fashion",
          price: 284,
          fulfillment: "Pickup today",
        },
      ]),
    );
    Object.defineProperty(window, "print", {
      value: () => (document.body.dataset.printRequested = "true"),
      configurable: true,
    });
  });
  await page.goto("/");
  if (testInfo.project.name === "mobile")
    await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Checkout", exact: true }).click();
  await page.getByRole("button", { name: "Place order" }).click();
  const receipt = page.getByRole("article", {
    name: /Receipt for order BR-\d{6}/,
  });
  await expect(receipt.getByText("Kente Ceremony Coat")).toBeVisible();
  await expect(receipt.getByText("Sold by Africstyle Fashion")).toBeVisible();
  await expect(
    receipt.getByText("Return eligible for 30 days after handoff"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Print receipt" }).click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-print-requested",
    "true",
  );
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
  await expect(
    page.getByRole("navigation", { name: "Shop collections" }),
  ).toBeVisible();
  await expect(page.getByText("Your stylist, one message away")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Craft carried forward." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Explore the collection" }).click();
  await expect(
    page.getByText("Designed with provenance in view"),
  ).toBeVisible();
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
  await expect(
    page.getByRole("heading", {
      name: "Meet us at The Mall at Prince George’s Plaza.",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("3500 East West Highway, Hyattsville, MD 20782"),
  ).toBeVisible();
  await expect(
    page.getByText("Africstyle Fashion", { exact: false }),
  ).toBeVisible();
  await expect(page.getByText("Powered by TA Tech")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Enter Blossom Royall" }),
  ).toBeVisible();
});

test("explains the shared marketplace through an interactive concept", async ({
  page,
}) => {
  await page.goto("/concept");
  await expect(page.locator("main[data-concept-ready]")).toHaveAttribute(
    "data-concept-ready",
    "true",
  );
  await expect(page.getByLabel("Internal document notice")).toContainText(
    "Confidential internal strategy",
  );
  await expect(page.getByText("Internal only", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /One destination/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "One checkout" }).click();
  await expect(page.getByText("The customer pays once.")).toBeVisible();
  await page.getByRole("button", { name: "Vendor payout" }).click();
  await expect(
    page.getByText("Every vendor sees what they earned."),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "More ways to be discovered. Less to manage alone.",
    }),
  ).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
  await expect(
    page.getByRole("link", { name: "Review vendor inquiries" }),
  ).toHaveAttribute("href", "/partners");
});

test("gives the owner purchase performance by brand", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "What customers are buying" }),
  ).toBeVisible();
  await expect(page.getByText("Atelier Omi")).toBeVisible();
  await expect(page.getByText("Repeat buyers")).toBeVisible();
});

test("manages a vendor lifecycle without developer intervention", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  if (testInfo.project.name === "mobile")
    await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Vendors", exact: true }).click();
  await page.getByRole("button", { name: "Invite vendor" }).click();
  await page.getByLabel("Public brand name").fill("Kente House");
  await page.getByLabel("Category").fill("Contemporary African fashion");
  await page.getByLabel("Contact person").fill("Ama Mensah");
  await page
    .getByLabel("Email", { exact: true })
    .fill("ama@kentehouse.example");
  await page.getByLabel("Phone").fill("2025550142");
  await page.getByLabel("Opening roster").selectOption("Confirmed");
  await page.getByRole("button", { name: "Create invitation" }).click();
  const invitationHref = await page
    .getByText(/\/readiness\?role=vendor/)
    .getAttribute("href");
  expect(invitationHref).toContain("brandName=Kente+House");
  let vendor = page
    .locator(".vendor-directory .vendor")
    .filter({ hasText: "Kente House" });
  await expect(vendor).toContainText("Invited");
  await vendor.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Onboarding status").selectOption("Launch ready");
  await page.getByRole("button", { name: "Save vendor" }).click();
  await expect(vendor).toContainText("Launch ready");
  await vendor.getByRole("button", { name: "Suspend" }).click();
  await expect(vendor).toContainText("Suspended");
  await page.reload();
  if (testInfo.project.name === "mobile")
    await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Vendors", exact: true }).click();
  vendor = page
    .locator(".vendor-directory .vendor")
    .filter({ hasText: "Kente House" });
  await expect(vendor).toContainText("Suspended");
  await vendor.getByRole("button", { name: "Remove" }).click();
  await vendor.getByRole("button", { name: "Confirm remove" }).click();
  await expect(vendor).toHaveCount(0);
  await page.getByText("View vendor change history").click();
  await expect(page.getByText("Vendor removed")).toBeVisible();
  await expect(page.getByText("Vendor invited")).toBeVisible();
  await page.goto(invitationHref!);
  await expect(page.getByText("VENDOR READINESS")).toBeVisible();
  await expect(page.getByLabel("Public brand name")).toHaveValue("Kente House");
  await expect(page.getByLabel("Owner or contact name")).toHaveValue(
    "Ama Mensah",
  );
  await expect(page.getByLabel("Contact email")).toHaveValue(
    "ama@kentehouse.example",
  );
});

test("keeps vendor writes in a clearly identified preview without tenant membership", async ({
  page,
}, testInfo) => {
  await page.route("**/auth/v1/user", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ message: "missing session" }),
    }),
  );
  await page.goto("/");
  if (testInfo.project.name === "mobile")
    await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Vendors", exact: true }).click();
  const runtime = page.locator(".vendor-operations .tenant-runtime");
  await expect(runtime).toContainText("Private preview mode");
  await expect(runtime).toContainText("authorized Blossom Royall account");
});

test("clearly labels sample activity as preview data", async ({ page }) => {
  await page.route("**/auth/v1/user", (route) => route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ message: "missing session" }) }));
  await page.goto("/");
  const boundary = page.getByRole("complementary", { name: "Data source" });
  await expect(boundary).toBeVisible();
  await expect(boundary).toContainText("Figures and names on operating screens are examples");
  await expect(boundary.getByRole("link", { name: "Open secure workspace" })).toHaveAttribute("href", "/auth");
});

test("configures a vendor agreement and issues a rent receipt", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  if (testInfo.project.name === "mobile")
    await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Vendors", exact: true }).click();
  await page.getByRole("button", { name: "New agreement" }).click();
  const agreementForm = page.locator(".vendor-agreement-form");
  await agreementForm
    .locator('select[name="vendorId"]')
    .selectOption({ label: "Africstyle Fashion" });
  await agreementForm.locator('input[name="monthlyRent"]').fill("800");
  await agreementForm.locator('input[name="deposit"]').fill("1600");
  await agreementForm.locator('input[name="commissionPercent"]').fill("8");
  await agreementForm.locator('input[name="dueDay"]').fill("1");
  await agreementForm.locator('input[name="startDate"]').fill("2026-09-01");
  await agreementForm.locator('input[name="endDate"]').fill("2027-08-31");
  await agreementForm
    .locator('select[name="status"]')
    .selectOption("Ready for legal review");
  await page.getByRole("button", { name: "Save agreement" }).click();
  await expect(
    page.getByText("Agreement draft created and recorded."),
  ).toBeVisible();
  const agreement = page
    .locator(".agreement-ledger article")
    .filter({ hasText: "Africstyle Fashion" });
  await expect(agreement).toContainText("$800.00");
  await expect(agreement).toContainText("Ready for legal review");
  const paymentForm = page.locator(".vendor-payment-form");
  await paymentForm
    .locator('select[name="agreementId"]')
    .selectOption({ label: "Africstyle Fashion" });
  await paymentForm.locator('select[name="type"]').selectOption("Rent");
  await paymentForm.locator('input[name="amount"]').fill("800");
  await paymentForm.locator('select[name="method"]').selectOption("ACH");
  await page.getByRole("button", { name: "Record and receipt" }).click();
  const receipt = page.getByLabel("Receipt BRR-00001");
  await expect(receipt).toContainText("Africstyle Fashion");
  await expect(receipt).toContainText("$800.00");
  await expect(
    receipt.getByRole("button", { name: "Print receipt" }),
  ).toBeVisible();
  await page.reload();
  if (testInfo.project.name === "mobile")
    await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Vendors", exact: true }).click();
  await expect(
    page
      .locator(".agreement-ledger article")
      .filter({ hasText: "Africstyle Fashion" }),
  ).toContainText("$800.00");
  await page.getByText("View payment ledger").click();
  await expect(page.getByText("BRR-00001 · Rent")).toBeVisible();
});

test("accepts and approves a vendor supplied logo without developer intervention", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  if (testInfo.project.name === "mobile")
    await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Vendors", exact: true }).click();
  await page.getByRole("button", { name: "Submit brand package" }).click();
  await page.getByLabel("Brand name").fill("Kente House");
  await page
    .getByLabel("Vendor contact email")
    .fill("owner@kentehouse.example");
  await page
    .getByLabel("Official logo file")
    .setInputFiles("public/vendor-logos/africstyle-fashion.png");
  await page.getByLabel(/I confirm that I own this logo/).check();
  await page.getByRole("button", { name: "Send for owner review" }).click();
  await expect(
    page.getByText("Logo formatted as WebP and submitted for owner review."),
  ).toBeVisible();
  await expect(
    page.getByText(/africstyle-fashion\.png → africstyle-fashion\.webp/),
  ).toBeVisible();
  await expect(page.getByText("Kente House", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Approve logo" }).click();
  await expect(page.getByText("Approved", { exact: true })).toBeVisible();
  await page.reload();
  if (testInfo.project.name === "mobile")
    await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Vendors", exact: true }).click();
  await expect(page.getByText("Kente House", { exact: true })).toBeVisible();
  await expect(page.getByText("Approved", { exact: true })).toBeVisible();
});

test("formats and publishes one item or a bulk vendor collection", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() =>
    localStorage.setItem("br-tour-complete", "true"),
  );
  await page.goto("/");
  if (testInfo.project.name === "mobile")
    await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Products" }).click();
  await page.getByRole("button", { name: "Add one or bulk upload" }).click();
  await page.getByLabel("Vendor").selectOption({ label: "Africstyle Fashion" });
  await page
    .getByLabel("Item photographs")
    .setInputFiles([
      "public/vendor-logos/africstyle-fashion.png",
      "public/vendor-logos/sapologie-italiano.png",
    ]);
  await page.getByRole("button", { name: "Format and stage items" }).click();
  await expect(
    page.getByText(
      "2 items were formatted as WebP and added to the collection studio.",
    ),
  ).toBeVisible();
  await expect(
    page.getByLabel("Item name for africstyle-fashion.png"),
  ).toHaveValue("Africstyle Fashion");
  await expect(page.getByText("africstyle-fashion.webp")).toBeVisible();
  await page.getByRole("button", { name: "Publish all" }).click();
  await expect(page.getByText("Live in storefront")).toHaveCount(2);
  await page.reload();
  if (testInfo.project.name === "mobile")
    await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Products" }).click();
  await expect(page.getByText("Live in storefront")).toHaveCount(2);
});

test("manages staff schedules, time activity, leave, and payroll estimates", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  if (testInfo.project.name === "mobile")
    await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Staff", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "One accountable team workspace" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Invite staff" }).click();
  const staffForm = page.locator(".staff-form");
  await staffForm.getByLabel("Full name").fill("Amina Bello");
  await staffForm.getByLabel("Email").fill("amina@example.com");
  await staffForm.getByLabel("Job title").fill("Senior stylist");
  await staffForm.getByLabel("Department").selectOption("Sales floor");
  await staffForm.getByLabel("Employment status").selectOption("Active");
  await staffForm.getByLabel("Hourly rate").fill("24");
  await staffForm.getByRole("button", { name: "Save staff record" }).click();
  let person = page
    .locator(".staff-roster article")
    .filter({ hasText: "Amina Bello" });
  await expect(person).toContainText("Senior stylist");
  await person.getByRole("button", { name: "Clock in" }).click();
  await expect(person.getByRole("button", { name: "Clock out" })).toBeVisible();
  await page.getByRole("button", { name: "Request leave" }).click();
  const leaveForm = page.locator(".staff-leave-form");
  await leaveForm
    .getByLabel("Team member")
    .selectOption({ label: "Amina Bello" });
  await leaveForm.getByLabel("First day").fill("2026-09-10");
  await leaveForm.getByLabel("Return date").fill("2026-09-12");
  await leaveForm.getByRole("button", { name: "Submit for review" }).click();
  const request = page
    .locator(".staff-leave article")
    .filter({ hasText: "Amina Bello" });
  await request.getByRole("button", { name: "Approve" }).click();
  await expect(request).toContainText("Approved");
  await page.reload();
  if (testInfo.project.name === "mobile")
    await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Staff", exact: true }).click();
  person = page
    .locator(".staff-roster article")
    .filter({ hasText: "Amina Bello" });
  await expect(person.getByRole("button", { name: "Clock out" })).toBeVisible();
  await expect(
    page.locator(".staff-leave article").filter({ hasText: "Amina Bello" }),
  ).toContainText("Approved");
  await page.getByText("View staff change history").click();
  await expect(page.getByText("Leave request approved")).toBeVisible();
});

test("keeps the readiness experience inside a narrow viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 480, height: 820 });
  await page.goto("/readiness");
  await expect(
    page.getByRole("heading", {
      name: "Let every brand shine. Let the mall work as one.",
    }),
  ).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    page: document.documentElement.scrollWidth,
    offenders: Array.from(document.querySelectorAll("body *"))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName,
          className: element.className,
          left: rect.left,
          right: rect.right,
          width: rect.width,
        };
      })
      .filter(
        (element) => element.right > window.innerWidth + 1 || element.left < -1,
      )
      .slice(0, 12),
  }));
  expect(dimensions.offenders).toEqual([]);
  expect(dimensions.page).toBeLessThanOrEqual(dimensions.viewport);
});

test("plays the approved vision film with optional captions kept out of the way", async ({
  page,
}) => {
  await page.goto("/readiness");
  await expect(page.locator("video")).toHaveCount(0);
  await page
    .getByRole("button", { name: /Watch the Blossom Royall vision/ })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Blossom Royall vision film",
  });
  await expect(dialog).toBeVisible();
  const video = dialog.locator("video");
  await expect(video).toHaveAttribute(
    "poster",
    "/media/readiness-welcome-2026-08-27-poster.jpg",
  );
  await expect(video.locator("source")).toHaveAttribute(
    "src",
    "/media/readiness-welcome-2026-08-27-natural-british.mp4",
  );
  await expect(video.locator("track")).not.toHaveAttribute("default", "");
  await dialog.getByRole("button", { name: "Close vision film" }).click();
  await expect(dialog).toHaveCount(0);
});

test("lets owners select and persist multiple readiness propositions", async ({
  page,
}) => {
  await page.goto("/readiness");
  await page.getByRole("button", { name: /I own Blossom Royall/ }).click();
  await expect(page.getByText("Select all that apply.").first()).toBeVisible();
  const systems = page.getByRole("group", { name: /Systems, spreadsheets/ });
  await systems.getByText("Square", { exact: true }).click();
  await systems.getByText("Shopify", { exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: /I own Blossom Royall/ }).click();
  await expect(
    page
      .getByRole("group", { name: /Systems, spreadsheets/ })
      .getByRole("checkbox", { name: "Square" }),
  ).toBeChecked();
  await expect(
    page
      .getByRole("group", { name: /Systems, spreadsheets/ })
      .getByRole("checkbox", { name: "Shopify" }),
  ).toBeChecked();
});

test("securely delivers a vendor readiness response", async ({ page }) => {
  await page.route("**/rest/v1/readiness_submissions*", async (route) => {
    const payload = route.request().postDataJSON();
    expect(payload).toMatchObject({
      tenant_slug: "blossom-royall",
      respondent_role: "vendor",
      consent_confirmed: true,
    });
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: "[]",
    });
  });
  await page.goto("/readiness");
  await page
    .getByRole("button", { name: /I am a participating vendor/ })
    .click();
  await page.getByLabel(/I confirm that I am authorized/).check();
  await page
    .getByRole("button", { name: "Complete readiness profile" })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Your readiness profile was securely delivered.",
    }),
  ).toBeVisible();
});

test("keeps zero percent readiness status readable", async ({ page }) => {
  await page.goto("/readiness");
  await page
    .getByRole("button", { name: /I am a participating vendor/ })
    .click();
  const progress = page.locator(".readiness-progress");
  await expect(progress).toHaveCSS("background-color", "rgb(67, 38, 48)");
  await expect(progress.locator("span")).toHaveCSS(
    "color",
    "rgb(255, 255, 255)",
  );
  await expect(progress.locator("span")).toHaveCSS("font-size", "10px");
});

test("persists the black and white readiness theme", async ({ page }) => {
  await page.goto("/readiness");
  await page.getByRole("button", { name: "Use dark theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator(".readiness-page")).toHaveCSS(
    "background-color",
    "rgb(8, 8, 8)",
  );
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Use light theme" }).click();
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
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeVisible();
  await expect(page.getByLabel("Remember my email")).toBeVisible();
  await page.getByRole("button", { name: "Email link" }).click();
  await expect(
    page.getByRole("button", { name: "Send secure sign in link" }),
  ).toBeVisible();
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

test("protects the operating workspace from unauthenticated access", async ({
  page,
}) => {
  await page.route("**/auth/v1/user", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ message: "missing session" }),
    }),
  );
  await page.goto("/workspace");
  await expect(page).toHaveURL(/\/auth\?returnTo=%2Fworkspace$/);
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
});
