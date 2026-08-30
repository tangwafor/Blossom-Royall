import { expect, test } from "@playwright/test";

const roles = [
  { role: "owner", allowed: ["Command Center", "Vendors", "Rent", "Business Setup"], forbidden: ["Vendor Board", "My Fit"] },
  { role: "manager", allowed: ["Command Center", "Checkout", "Cash Drawer", "Orders", "Vendors", "Rent", "Staff", "Policies"], forbidden: ["Vendor Board", "My Fit", "My Orders", "Business Setup"] },
  { role: "staff", allowed: ["Command Center", "Checkout", "Cash Drawer", "Orders"], forbidden: ["Vendors", "Staff", "Business Setup", "Rent"] },
  { role: "vendor", allowed: ["Vendor Board", "My Products", "Orders", "Rent", "Help"], forbidden: ["Command Center", "Checkout", "Cash Drawer", "Vendors", "Staff", "Business Setup"] },
  { role: "customer", allowed: ["Customer Shop", "My Fit", "Checkout", "My Orders", "Aftercare", "Help"], forbidden: ["Command Center", "Cash Drawer", "Vendors", "Staff", "Business Setup", "Rent"] },
] as const;

for (const roleCase of roles) {
  test(`credential release verifies the real ${roleCase.role} account`, async ({ page }, testInfo) => {
    const prefix = `CREDENTIAL_${roleCase.role.toUpperCase()}`;
    const email = process.env[`${prefix}_EMAIL`];
    const password = process.env[`${prefix}_PASSWORD`];
    if (!email || !password) throw new Error(`${prefix}_EMAIL and ${prefix}_PASSWORD are required for credential release.`);

    await page.goto("/auth?returnTo=%2Fworkspace");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForURL((url) => url.pathname === "/workspace" || (roleCase.role === "owner" && url.pathname === "/auth/mfa"), { timeout: 30000 });
    if (roleCase.role === "owner" && new URL(page.url()).pathname === "/auth/mfa") {
      throw new Error("Owner credential release is blocked until Delly completes multifactor enrollment.");
    }
    const closeTour = page.getByRole("button", { name: "Skip tour", exact: true });
    try {
      await closeTour.waitFor({ state: "visible", timeout: 5000 });
      await closeTour.click();
    } catch {
      // Returning users may have already completed the guided tour.
    }
    await expect(page.getByText("Live tenant records", { exact: true })).toBeVisible();
    await expect(page.getByText("Preview data", { exact: true })).toHaveCount(0);
    await expect(page.getByText(roleCase.role[0].toUpperCase() + roleCase.role.slice(1), { exact: true })).toBeVisible();
    if (testInfo.project.name === "mobile") await page.getByRole("button", { name: "Open menu" }).click();
    for (const label of roleCase.allowed) await expect(page.getByRole("button", { name: label, exact: true })).toBeVisible();
    for (const label of roleCase.forbidden) await expect(page.getByRole("button", { name: label, exact: true })).toHaveCount(0);
    if (roleCase.role === "owner") await expect(page.getByRole("region", { name: "Owner operating controls" })).toBeVisible();
    if (roleCase.role === "manager") await expect(page.getByRole("region", { name: "Manager operating controls" })).toBeVisible();
    if (roleCase.role === "staff") await expect(page.getByRole("region", { name: "Staff operating controls" })).toBeVisible();
    if (roleCase.role === "vendor") {
      await expect(page.getByRole("heading", { name: "Run your store from one board." })).toBeVisible();
      await expect(page.getByRole("heading", { name: /can sell/ })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Recent attributed sales" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "From sale to payout" })).toBeVisible();
      await expect(page.getByText(/not a promised bank date/)).toBeVisible();
    }
    if (roleCase.role === "customer") await expect(page.getByRole("region", { name: "Customer dashboard" })).toBeVisible();
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(page).toHaveURL(/\/auth/);
    await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
  });
}
