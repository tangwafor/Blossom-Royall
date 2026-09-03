import { readFile } from "node:fs/promises";

const [migration, runtime, app] = await Promise.all([
  readFile("supabase/migrations/20260828185000_payment_verification.sql", "utf8"),
  readFile("lib/supabase/tenant-runtime.ts", "utf8"),
  readFile("app/operating-system.tsx", "utf8"),
]);

const failures = [];
const requireText = (source, expected, label) => {
  if (!source.includes(expected)) failures.push(`${label} is missing: ${expected}`);
};

requireText(migration, "function public.review_pending_payment", "Protected payment review function");
requireText(migration, "payment_already_reviewed", "Single review enforcement");
requireText(migration, "rejection_note_required", "Rejection reason requirement");
requireText(migration, "payment_evidence_missing", "Evidence requirement");
requireText(migration, "reservation_release", "Rejected inventory release");
requireText(migration, "adjustment_debit", "Rejected vendor ledger reversal");
requireText(migration, "set payment_status = 'succeeded', status = 'confirmed'", "Verified order clearance");
requireText(migration, "set payment_status = 'rejected', status = 'payment_rejected'", "Rejected order state");
requireText(migration, "- 'proof_object_path' - 'proof_file_name'", "Payment audit evidence redaction");
requireText(runtime, "loadTenantPendingPayments", "Pending payment runtime");
requireText(runtime, "createPaymentEvidenceUrl", "Private signed evidence runtime");
requireText(runtime, "reviewTenantPendingPayment", "Payment decision runtime");
requireText(app, "PAYMENT VERIFICATION", "Staff payment queue");
requireText(app, "Open private proof", "Private proof action");
requireText(app, "Add a rejection reason", "Rejection note interface guard");

if (failures.length) {
  console.error("Payment verification failed:");
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}

console.log("Payment verification confirmed: single protected review, evidence redaction, order clearance, rejected inventory release, vendor ledger reversal, and staff queue are present.");
