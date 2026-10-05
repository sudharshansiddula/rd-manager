# RD Manager - Business Logic Reference

This document serves as a centralized reference for all core business logic and rules implemented in the RD Manager application. The application is built to be dynamic, reading variables from `Settings` rather than hardcoding values.

## 1. Recurring Deposit (RD) Logic
- **Monthly Contribution:** Dynamic per member. 
- **Tenure:** Dynamic per member (default usually 72 months).
- **Maturity Amount:** Dynamic expected amount at the end of the tenure.
- **Bonus Calculation:** 
  - The interest (bonus) earned on RD is calculated using standard recurring deposit formulas.
  - The interest rate is reverse-calculated based on the expected maturity amount, tenure, and monthly contribution.
  - Bonus is evaluated strictly on the *paid months* and their duration in the account, not just the elapsed time.

## 2. Loan & Interest Logic
- **Interest Rate:** Configurable via App Settings (e.g., 2% per month).
- **Interest Calculation:** 
  - Calculated monthly on the *Remaining Principal Balance* (Running Balance).
  - Formula: `Monthly Interest = Math.round((Running Balance * Loan Interest Rate) / 100)`.
  - The total expected interest is tracked cumulatively. Any unpaid interest is treated as an arrear.
- **Repayment Allocation:** When a repayment is made, the principal paid reduces the Running Balance immediately.

## 3. Late Fee (Penalty) Logic
- **Dynamic Configuration:** Late fee period (Daily/Monthly/Yearly), due date of the month (e.g., 10th), and late fee percentage (e.g., 2%) are all fetched from the App Settings.
- **Arrears Calculation:** 
  - The late fee for a given month is calculated based **strictly on the outstanding arrears (unpaid RD + unpaid Loan Interest)** exactly at the end of the *previous* month.
- **No Carry Forward of Penalty:** 
  - Unpaid late fees do NOT compound and do NOT carry forward as a running balance. 
  - Each month's late fee is freshly calculated based purely on the pending principal and interest arrears. If a user clears their primary arrears, the late fee penalty immediately drops to 0 for the subsequent months, even if they waived/discounted the late fee in the current month.

## 4. Account Settlement & Completion Logic
- **Completion Check:** 
  - An account is marked as "Completed" when `Total Saved Amount >= (Monthly Contribution * Tenure Months)`.
  - It does NOT rely on counting individual month rows, allowing users to pay multiple months' dues in a single transaction (or skip months and pay later) without breaking the completion logic.
- **Final Settlement Calculation:**
  - **Amount We Owe (To Member):** Total Saved Amount + Total Bonus Earned (Current Value).
  - **Deductions (To Us):** Remaining Loan Principal + Pending Loan Interest + Calculated Late Fee.
  - **Net Settlement:** Amount We Owe - Deductions.

## 5. UI & State Updates
- **Edit Row Feature:** 
  - Defaults the RD amount to `0` instead of auto-filling the standard contribution when unpaid.
  - Dynamically calculates and displays the specific pending RD and pending Late Fee directly under the input fields as a visual hint (`Due: X`).
- **Dynamic Language:** All labels and tooltips are localized. The selected language is persisted in `localStorage`.

*Note for AI / Developers: Always refer to these established business rules when adding new features or modifying the calculation algorithms to ensure consistency and prevent regressions.*
