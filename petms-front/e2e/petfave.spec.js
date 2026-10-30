import { test, expect } from "@playwright/test";
const password = "PetFaveDemo123!";
async function login(page, role) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(role + "@petfave.test");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/app$/);
}
async function request(page, method, pathname, data) {
  return page.evaluate(
    async ({ method, pathname, data }) => {
      const xsrf = document.cookie
        .split("; ")
        .find((value) => value.startsWith("XSRF-TOKEN="))
        ?.slice("XSRF-TOKEN=".length);
      const response = await fetch("http://localhost:8011" + pathname, {
        method,
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(xsrf ? { "X-XSRF-TOKEN": decodeURIComponent(xsrf) } : {}),
        },
        ...(data ? { body: JSON.stringify(data) } : {}),
      });
      return {
        status: response.status,
        body: await response.json().catch(() => null),
      };
    },
    { method, pathname, data },
  );
}
test("public landing and registration adapt to desktop and mobile", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Every pet has/ }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/landing-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("link", { name: "Get started", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/landing-mobile.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Get started", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Join the PetFave family." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Clinic Staff/ }),
  ).toBeVisible();
});
test("unauthenticated routes redirect and API requests return 401", async ({
  page,
}) => {
  await page.goto("/app/pets");
  await expect(page).toHaveURL(/\/login$/);
  expect((await request(page, "GET", "/api/v1/pets")).status).toBe(401);
});
test("owner signs up, retains the session after refresh, signs out and signs in on an additional allowed frontend origin", async ({ page }) => {
  const email = "signup-" + Date.now() + "@petfave.test";
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Signup Verification");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Contact number").fill("09170000000");
  await page.getByLabel("Address", { exact: true }).fill("Manila");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  const registration = page.waitForResponse((response) =>
    response.url() === "http://localhost:8011/register" && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  expect((await registration).status()).toBe(201);
  await expect(page).toHaveURL(/\/app$/);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Hello, Signup." })).toBeVisible();
  expect((await request(page, "GET", "/api/v1/me")).status).toBe(200);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole("heading", { name: "Hello, Signup." })).toBeVisible();
});
test("owner registers a pet, sees it after refresh, requests a correction and archives safely", async ({
  page,
}) => {
  await login(page, "owner");
  await expect(
    page.getByRole("heading", { name: "Hello, Jamie." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Dates to remember" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/dashboard-owner.png",
    fullPage: true,
  });
  const cookies = await page.context().cookies("http://localhost:8011");
  expect(cookies.find((c) => c.name === "petfave_e2e_session")?.httpOnly).toBe(
    true,
  );
  expect(
    await page.evaluate(() => document.cookie.includes("petfave_e2e_session=")),
  ).toBe(false);
  expect(
    await page.evaluate(() => localStorage.length + sessionStorage.length),
  ).toBe(0);
  await page.getByRole("link", { name: "Register a pet", exact: true }).click();
  const name = "Pepper " + Date.now();
  await page.getByLabel("Pet name").fill(name);
  await page
    .getByLabel("Species", { exact: true })
    .selectOption({ label: "Cat" });
  await page.getByLabel("Sex", { exact: true }).selectOption("female");
  await page.getByRole("button", { name: "Register pet", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: new RegExp(name) }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: new RegExp(name) }),
  ).toBeVisible();
  const id = page.url().split("/").at(-1);
  expect(
    (
      await request(page, "POST", "/api/v1/pets/" + id + "/weights", {
        weight_kg: 4,
        measured_at: "2025-01-01",
      })
    ).status,
  ).toBe(403);
  await page
    .getByRole("button", { name: "Request ownership correction" })
    .click();
  await page
    .getByLabel("What needs correcting?")
    .fill("Please verify the ownership registration reference.");
  await page
    .getByRole("button", { name: "Submit request", exact: true })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Correction request submitted" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Archive pet", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Archive pet", exact: true })
    .click();
  await expect(
    page.getByText("This pet is archived.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Restore pet", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Restore pet", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: new RegExp(name) }),
  ).toBeVisible();
  await page.goto("/app/users");
  await expect(page).toHaveURL(/\/app$/);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await request(page, "GET", "/api/v1/me")).status).toBe(401);
});
test("clinic staff records dated health information through forms and cannot use admin routes", async ({
  page,
}) => {
  await login(page, "staff");
  await page.getByRole("link", { name: "Pet records", exact: true }).click();
  await page.getByRole("textbox", { name: "Search pet records" }).fill("Mochi");
  await page
    .getByRole("link")
    .filter({ has: page.getByRole("heading", { name: "Mochi", exact: true }) })
    .click();
  await page.getByRole("tab", { name: "Weight history" }).click();
  await page.getByRole("button", { name: "Add record", exact: true }).click();
  await expect(page.getByLabel("Weight (kg)")).toBeVisible();
  await page.getByLabel("Weight (kg)").fill("4.9");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save changes" })
    .click();
  await expect(page.getByText("4.9 kg", { exact: true }).first()).toBeVisible();
  await page.getByRole("tab", { name: "Medical history" }).click();
  await page.getByRole("button", { name: "Add entry", exact: true }).click();
  const summary = "Historical note " + Date.now();
  await page.getByLabel("Summary / description").fill(summary);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save changes" })
    .click();
  await expect(page.getByRole("heading", { name: summary })).toBeVisible();
  await page.getByRole("tab", { name: "Allergies" }).click();
  await page.getByRole("button", { name: "Add record", exact: true }).click();
  await page.getByLabel("Allergen", { exact: true }).fill("Pollen");
  await page.getByLabel("Known reaction").fill("Sneezing");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save changes" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Pollen", exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Vaccinations" }).click();
  await page.getByRole("button", { name: "Add record", exact: true }).click();
  await page
    .getByLabel("Vaccine", { exact: true })
    .selectOption({ label: "Rabies" });
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save changes" })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.screenshot({
    path: "test-results/pet-record-staff.png",
    fullPage: true,
  });
  await page.goto("/app/users");
  await expect(page).toHaveURL(/\/app$/);
  expect((await request(page, "GET", "/api/v1/users")).status).toBe(403);
});
test("pending staff sees only account status", async ({ page }) => {
  await login(page, "pending");
  await expect(
    page.getByRole("heading", { name: "You’re on the waiting list." }),
  ).toBeVisible();
  expect((await request(page, "GET", "/api/v1/pets")).status).toBe(403);
  await expect(page.getByRole("navigation")).toHaveCount(0);
});
test("administrator reviews accounts and audit changes; mobile navigation works", async ({
  page,
}) => {
  await login(page, "admin");
  await page.getByRole("link", { name: "Accounts & approvals" }).click();
  await expect(
    page.getByRole("heading", { name: "Accounts & approvals." }),
  ).toBeVisible();
  await expect(page.getByText("Taylor Cruz", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Activity log", exact: true }).click();
  await page.getByRole("button", { name: "Inspect changes" }).first().click();
  await expect(
    page.getByRole("heading", { name: "Before", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "After", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("link", { name: "Pet records", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Pet records." }),
  ).toBeVisible();
  await expect(page.locator(".pet-grid .pet-card").first()).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/pets-mobile.png",
    fullPage: true,
  });
});
test("CSRF rejects mutations without a token", async ({ page }) => {
  await page.goto("/login");
  const status = await page.evaluate(
    async () =>
      (
        await fetch("http://localhost:8011/login", {
          method: "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: "owner@petfave.test",
            password: "PetFaveDemo123!",
          }),
        })
      ).status,
  );
  expect(status).toBe(419);
});

test("stale frontend session recovers the existing authenticated account", async ({
  page,
}) => {
  await login(page, "owner");
  await page.evaluate(() =>
    window.dispatchEvent(new CustomEvent("petfave:session", { detail: 419 })),
  );
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email address").fill("owner@petfave.test");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(
    page.getByRole("heading", { name: "Hello, Jamie." }),
  ).toBeVisible();
});
