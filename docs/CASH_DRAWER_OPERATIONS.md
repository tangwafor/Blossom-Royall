# Cash drawer operations

## Purpose

The cash drawer workspace connects every onsite cash sale to a named register, a signed in cashier, and a single accountable shift.

## Start a shift

1. An owner or manager creates the physical register in Cash Drawer.

2. The cashier counts the starting cash.

3. The cashier selects the register, enters the opening float, adds an optional note, then chooses Open drawer.

4. Only one open drawer is allowed for each register. A cashier must have an open drawer before recording a cash sale.

## During a shift

1. Use Checkout for customer sales. Successful cash payments attach to the signed in cashier's open drawer automatically.

2. Use Paid in when cash enters the drawer outside a sale.

3. Use Paid out when cash leaves the drawer. A clear reason is required.

4. Every register, drawer, and movement write creates an audit record.

## Close and reconcile

1. Count all physical cash in the drawer.

2. Enter Counted cash and an optional closing note.

3. Choose Close and reconcile.

4. The server calculates expected cash from the opening float, successful cash sales, paid in movements, and paid out movements.

5. Variance equals counted cash minus expected cash. The closed record retains the cashier, manager, server time, totals, and audit history.

## Permissions

Staff can open, operate, and close drawers. Owners and managers can also create and update registers. Only an owner can remove an unused register. Tenant RLS prevents another store from reading or changing these records.

## Production status

The implementation is currently local and migration ready. Apply the migration only after explicit production approval and a fresh production backup check.
