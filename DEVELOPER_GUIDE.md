# RD Manager - Developer Guide & Architecture Documentation

This document serves as the central knowledge base for the **RD Manager** application. It contains all the core logic, UI patterns, and architectural decisions made during development to ensure future maintainability.

## 1. Application Overview
RD Manager is a financial tracking application designed for managing Recurring Deposits (RD), Loans, Interest Collections, and Late Fees. It is built as an **offline-first Progressive Web App (PWA)**, allowing users to operate seamlessly without internet connectivity while ensuring their data is safely synchronized with the cloud.

## 2. Core Technologies
- **Framework**: React 19 + TypeScript
- **Bundler**: Vite 8
- **UI Styling**: Vanilla CSS (`index.css`) with CSS Variables for themes (Dark/Light mode support).
- **Icons**: Lucide React
- **Charts**: Recharts
- **Database & Sync**: Firebase Firestore with IndexedDB (`enableIndexedDbPersistence`).
- **Deployment**: GitHub Pages via GitHub Actions.

## 3. Storage Architecture (State Management)
The application avoids heavy state management libraries like Redux and instead uses a custom lightweight Event-Driven pattern tied directly to Firebase.

### Data Isolation
- Data is strictly isolated per Google Account. 
- All data for a specific user is stored in a single Firestore document: `rd_manager_users/<GOOGLE_UID>`.

### Real-time Sync & Offline-First (StorageService)
- Located in `src/engine/storage.ts`.
- **Read**: Uses Firestore's `onSnapshot()` to listen for real-time changes. This automatically reads from the local IndexedDB cache when offline, providing instant UI loads.
- **Write**: Uses `setDoc` with a debounce mechanism (800ms `saveTimeout`). When a user updates data, it immediately mutates the local state, triggers a custom `db_updated` event to re-render the UI (Optimistic Update), and then syncs to Firestore in the background.
- **Offline Writes**: Firebase automatically queues offline writes in IndexedDB and pushes them to the server once the internet is restored.

## 4. UI & Design System
The UI is designed to be a professional financial dashboard that is simple enough for non-technical users.

### Colors & Significance
- **Green (`var(--success)`)**: Income, Money Collected, Profit, RD Collections.
- **Red (`var(--danger)`)**: Outflow, Money Payable, Loans Given, Outstanding Dues.
- **Blue/Purple (`var(--primary)`)**: General information, Total Members, Informational text.
- **Orange/Yellow (`var(--warning)`)**: Future expected amounts, Warnings, Pending actions.

### Key UI Components
1. **Dashboard (`DashboardView.tsx`)**: 
   - Provides a 10-second glance at the total financial position.
   - Calculates Cash-in-Hand, Profit & Loss, Future Expected Income, and Total Liabilities.
   - Financial Reconciliation: Only includes active loans and active interest dues in operational outstanding figures; settled members' liabilities are resolved through final settlement.
   - Includes Recharts for Monthly Cash Flow Analysis and a 5-way Member Status Distribution (including Prematurely Closed members in slate `#64748b`).
2. **Member Profile (`MemberProfileView.tsx`)**: 
   - A detailed month-by-month ledger.
   - **Smart Autofill & Due Breakdown**: The due amounts (RD, Interest, Late Fees) are shown as clickable suggestions below the input fields. For loan interest, it displays an explicit breakdown: `డ్యూ: ₹... (పాత బకాయి: ₹... + ఈ నెల: ₹...)`. Clicking autofills the combined total into the field.
   - **Visual Interest Arrears Indicator**: In the monthly table view, if an active loan month has paid interest less than the expected interest, a bold red badge `(బకాయి: ₹...)` is shown beneath the paid figure.
   - **Account Closure & Final Settlement Card**: Displays a dedicated summary card for completed chits and premature closures. Includes toggling between a locked "Saved" view and "Edit" mode, as well as a "తిరిగి కొనసాగించు" (Reopen RD) button.
3. **Responsive Tables**: Uses CSS wrappers to allow horizontal scrolling on mobile devices while keeping the layout intact.

## 5. Core Business Logic & Calculations

### RD Interest Calculation
The RD bonus (interest) is calculated using an iterative approximation of the Future Value of an Annuity formula.
- **Logic**: For a given `monthlyContribution`, `tenureMonths`, and `expectedMaturityAmount`, the app calculates the exact monthly interest rate (`getMonthlyRate`) required to reach that maturity amount.
- It then calculates the accrued interest month-by-month based on the actual amounts paid.
- **Source**: `calculateRdInterest` in `DashboardView.tsx` / `MemberProfileView.tsx`.

### Loan Interest Calculation & Arrears Tracking
- Loans are calculated on a **Simple Interest on Reducing Balance** method.
- **Logic**: 
  - `Remaining Principal = Total Loan Disbursed - Principal Repaid`.
  - `Monthly Interest = Remaining Principal * (Interest Rate / 100)`.
- Interest is charged at the start of each month based on the closing balance of the previous month.
- **Arrears Tracking**: If interest paid is less than the calculated interest, the shortfall is tracked and surfaced as `(బకాయి: ₹...)` in the ledger table, and added to `prevInterestArrears` for subsequent months.

### Late Fine Calculation
Late fees are calculated based on user-defined settings (Daily, Monthly, Yearly).
- **Logic**: Penalty is applied as a percentage on the *Total Pending Arrears* (Unpaid RD + Unpaid Interest) at the time of the due date.

### Final Settlement & Account Closure Lifecycle
When an account is closed (Prematurely or at Maturity):
- **Payable to Member**: Total RD Saved + Bonus Earned till date.
- **Deductions**: Remaining Loan Principal + Pending Loan Interest + Late Fees.
- **Net Settlement**: `Payable - Deductions`. If positive, the firm pays the member. If negative, the member pays the firm.
- **Settlement Persistence & Reopen**:
  - Saved settlement details lock the card to prevent accidental edits until the "Edit" button is clicked.
  - When reopened via "తిరిగి కొనసాగించు", `closedDate`, `settlementDate`, and `settlementAmountPaid` are safely deleted, and `status` is restored to `ACTIVE`. A deep sanitization strips `undefined` keys to ensure clean Firestore serialization.

### Dashboard Reconciliation for Settled Accounts
- Active loan and pending interest metrics strictly filter for `status === 'ACTIVE'` members since closed members have had their loans cleared/deducted via settlement.
- Cash in Hand accounts for all actual cash inflows minus disbursements and cash settlements paid.
- Firm P&L accounts for historical revenues (interest + fines) minus active accrued bonus obligations and actual bonuses paid to settled members.

## 6. Language & Internationalization (i18n)
- The app supports dynamic switching between **English** and **Telugu**.
- Translations are managed in `src/locales/i18n.tsx`.
- Fallbacks are provided so that if a Telugu translation is missing, it seamlessly falls back to English.

## Future Recommendations
- If the app scales to hundreds of members, consider splitting the single Firestore document into a `members` subcollection to optimize payload sizes.
- For now, the single document approach is highly efficient, reduces reads, and makes offline syncing robust.
