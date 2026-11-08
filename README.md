# RD Manager (ఆర్డీ మేనేజర్) 🏦

A modern, high-performance, offline-first Recurring Deposit (RD) and Loan Management Progressive Web Application (PWA).

- **🌐 Live Production Web App:** [https://rd-manager-4b40e.web.app](https://rd-manager-4b40e.web.app)
- **☁️ Cloud Backup & Source Repository:** [https://github.com/sudharshansiddula/rd-manager](https://github.com/sudharshansiddula/rd-manager)

---

## 🚀 Key Features

1. **Recurring Deposit (RD) Ledger:**
   - 72-month tenure tracking with customizable monthly contributions and target maturity amounts.
   - Bisection method compound interest engine calculating precise monthly accrued bonuses.
   - Automatic penalty and late fine calculations based on due dates.

2. **Loan Management & Arrears Tracking:**
   - Reducing-balance simple interest loans disbursed to members.
   - Real-time monthly interest calculation before repayments.
   - **Visual Shortfall Alerts:** Unpaid or partially paid monthly loan interest is highlighted with a bold red `(బకాయి: ₹...)` badge directly in the table.
   - **Smart Suggestions:** Autofill suggestion with arrears breakdown (`డ్యూ: ₹... (పాత బకాయి: ₹... + ఈ నెల: ₹...)`) in edit mode.

3. **Chit Settlement & Account Closure Lifecycle:**
   - Supports both full maturity (`isCompleted`) and premature closure (`isPrematureClosed`).
   - Final Settlement card showing total payable (savings + bonus), deductions (principal + pending interest + late fines), and net payout.
   - Locked view and edit mode toggling for recorded settlements.
   - One-click account reactivation (`తిరిగి కొనసాగించు`) with memory cleanup and storage sync.

4. **Executive Financial Dashboard:**
   - Real-time Cash-in-Hand calculation factoring in all deposits, loan disbursements, repayments, and settlement outflows.
   - Accurate Profit & Loss (P&L) tracking operational income against active accrued bonus obligations and settled bonus payouts.
   - Status distribution breakdown across active, on-time, pending, loan-active, and closed members.
   - Multithreaded Web Worker (`src/workers/dataWorker.ts`) ensuring zero UI stutter.

5. **Offline-First & Cloud Synchronization:**
   - Seamless offline operation with IndexedDB persistence.
   - Real-time bidirectional sync with Google Cloud Firestore (`StorageService`).
   - Google Authentication with account data isolation.

6. **Dual Language Localization (i18n):**
   - Full support for **Telugu (తెలుగు)** and **English**.

---

## 🛠️ Technology Stack

- **Frontend:** React 19, TypeScript, Vite 8
- **Styling:** Modular CSS variables (Dark/Light mode ready)
- **Database & Auth:** Firebase Authentication & Cloud Firestore (offline persistence via IndexedDB)
- **Worker Multithreading:** Web Worker API
- **Charts & Export:** Recharts, jsPDF, html2canvas, Lucide Icons
- **Hosting:** Firebase Hosting

---

## 💻 Development & Deployment Commands

```bash
# Install dependencies
npm install

# Run local development server
npm run dev

# Build production bundle
npm run build

# Deploy to Firebase Hosting
npm run deploy
```

---

## 📖 Architecture & Business Logic Documentation

For deep technical specifications, mathematical formulas, and state lifecycle contracts:
- [Business Logic & Mathematical Reference](docs/BUSINESS_LOGIC_REFERENCE.md)
- [Developer Guide & Architecture](DEVELOPER_GUIDE.md)
