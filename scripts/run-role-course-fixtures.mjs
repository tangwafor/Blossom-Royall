import { spawnSync } from "node:child_process";
import { cleanupRoleCourseFixtures, createRoleCourseFixtures, roleCourseFixtureRoles } from "./role-course-fixtures.mjs";

let fixtures = null;
let runError = null;

try {
  fixtures = await createRoleCourseFixtures();
  const roleEnvironment = Object.fromEntries(roleCourseFixtureRoles.flatMap((role) => {
    const prefix = `TRAINING_${role.toUpperCase()}`;
    const identity = fixtures.identities[role];
    return [[`${prefix}_EMAIL`, identity.email], [`${prefix}_PASSWORD`, identity.password], [`${prefix}_USER_ID`, identity.userId]];
  }));
  for (const edition of ["detailed", "reel"]) {
    const result = spawnSync("node", ["scripts/record-role-training.mjs"], {
      stdio: "inherit",
      env: {
        ...process.env,
        ...roleEnvironment,
        TRAINING_ROLE: "all",
        TRAINING_EDITION: edition,
        TRAINING_BASE_URL: process.env.TRAINING_BASE_URL || "https://app.blossomroyall.com",
        TRAINING_PRODUCTION_APPROVED: "true",
        TRAINING_NARRATION_MODE: process.env.TRAINING_NARRATION_MODE || "ndamba",
        TRAINING_SERVER_KEY: fixtures.serverKey,
        TRAINING_SUPABASE_URL: fixtures.url,
        TRAINING_STORE_ID: fixtures.storeId,
        TRAINING_FIXTURE_RUN_ID: fixtures.runId,
        TRAINING_FIXTURE_VENDOR_ID: fixtures.vendorId,
        TRAINING_FIXTURE_PRODUCT_ID: fixtures.productId,
        TRAINING_FIXTURE_VARIANT_ID: fixtures.variantId,
        TRAINING_FIXTURE_LEASE_ID: fixtures.leaseId,
        TRAINING_FIXTURE_REVIEW_LEASE_ID: fixtures.leaseReviewId,
        TRAINING_FIXTURE_SUBMIT_LEASE_ID: fixtures.leaseSubmitId,
        TRAINING_FIXTURE_REGISTER_ID: fixtures.registerId,
      },
    });
    if (result.status !== 0) throw new Error(`${edition} all role production course failed.`);
  }
} catch (error) {
  runError = error instanceof Error ? error : new Error(String(error));
} finally {
  if (fixtures) {
    try {
      await cleanupRoleCourseFixtures(fixtures);
    } catch (error) {
      runError ||= error instanceof Error ? error : new Error(String(error));
    }
  }
}

if (runError) throw runError;
console.log("Detailed and reel role courses passed. Disposable production fixtures were removed and audited.");
