# Staff Operations Activation

## Working now

The staff workspace provides an end to end operating preview for the owner and managers.

1. Invite, view, edit, deactivate, restore, and remove staff records.

2. Configure job title, department, hourly rate, shift times, scheduled days, and unpaid break duration.

3. Record clock in and clock out activity.

4. Calculate a transparent weekly gross pay estimate from the configured schedule, break, and hourly rate.

5. Submit leave requests and record approval or decline decisions.

6. Preserve staff, leave, clock, and decision state in the tenant keyed browser adapter.

7. Create a visible audit entry for each staff mutation.

## Production activation inputs

Delly or an authorized representative must provide and approve the following before real staff use.

1. Legal employing entity, work location, and tax jurisdiction.

2. Real employee names, private contact details, roles, departments, and start dates.

3. Role permissions for owner, manager, staff, vendor, and customer access.

4. Pay type, wage, overtime, break, rounding, tip, commission, and holiday rules.

5. Time clock policy, permitted devices, location rules, and correction approval process.

6. Leave types, accrual rules, blackout dates, approval chain, and required notices.

7. Payroll provider and authorization to configure its development environment.

8. Approval for the first production store, owner membership, and staff invitations.

## Production engineering gates

1. Pull and archive a fresh production schema dump before authoring SQL.

2. Map the existing staff schema and add only reviewed migrations.

3. Enforce tenant row level security and role scoped endpoint authorization.

4. Move every write into server validated persistence with immutable database audit records.

5. Encrypt sensitive employee fields and exclude them from logs, analytics, and browser storage.

6. Test schedule concurrency, duplicate clock events, corrections, leave conflicts, and payroll export reconciliation.

7. Validate employment and payroll behavior with Delly and qualified legal and payroll professionals before production promotion.
