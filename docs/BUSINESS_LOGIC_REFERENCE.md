# RD Manager — Master Architecture & Mathematical Logic Reference Guide

> **Target Audience:** Future AI Coding Agents, Full-Stack Engineers, and System Architects.  
> **Purpose:** Serves as the single source of truth (SSOT) for all mathematical formulas, financial domain logic, database models, state lifecycle, and UI/UX behaviors in **RD Manager**.

---

## 1. System Overview & Technology Stack

- **Framework:** React 18 + TypeScript + Vite
- **Styling:** Vanilla CSS design system with CSS custom properties (`--primary`, `--success`, `--danger`, `--text-scale`)
- **Persistence & Storage:** `StorageService` (Local JSON database with Event Dispatcher `storageEvents`) + Firebase Firestore real-time bidirectional sync
- **Multithreading:** Dedicated Web Worker (`src/workers/dataWorker.ts`) for high-volume aggregate metrics and background ledger calculations
- **Localization (i18n):** Dual-language support (**Telugu** `te` & **English** `en`), real-time reactivity without page reload

---

## 2. Data Models & Type System

```typescript
export interface Member {
  id: string;                      // e.g. "MEM-1712478900000"
  memberNumber: string;            // A/c No (Numeric string, e.g. "1", "12", "105")
  name: string;                    // Member's Full Name
  mobile: string;                  // 10-digit mobile number
  address: string;                 // Residential address
  startDate: string;               // ISO format: "YYYY-MM-DD"
  status: 'ACTIVE' | 'MATURED' | 'CLOSED';
  monthlyContribution: number;     // Recurring monthly deposit amount (P)
  tenureMonths: number;            // Total duration in months (n), typically 72
  expectedMaturityAmount: number;  // Maturity target amount (A)
  settlementAmountPaid?: number;   // Final amount paid/received on closure
  settlementDate?: string;         // ISO date when settled
  lastWhatsappSentDate?: string;   // ISO date of last due reminder sent
  createdAt: number;               // Unix epoch timestamp (ms)
}

export interface RDInstallment {
  id: string;                      // "INST-{memberId}-{monthIndex}"
  memberId: string;
  monthIndex: number;              // 1 to tenureMonths (e.g. Month 1, Month 2...)
  dueDate: string;                 // "YYYY-MM-DD"
  amountPaid: number;              // Actual amount deposited for this month
  lateFeePaid: number;             // Late penalty paid for this month
  paymentDate: string | null;      // Date payment was recorded
  depositorDetails?: string;       // Name/notes of depositor / guarantor
  status: 'PAID' | 'PENDING';
  updatedAt?: number;
}

export interface Loan {
  id: string;                      // "LOAN-{memberId}-{monthIndex}-{timestamp}"
  memberId: string;
  principalAmount: number;         // Disbursed principal (₹)
  disbursementDate: string;        // "YYYY-MM-DD"
  interestRatePerMonth: number;    // Monthly interest % (typically 2%)
  status: 'ACTIVE' | 'CLOSED';
  principalOutstanding: number;
  createdAt: number;
}

export interface LoanRepayment {
  id: string;                      // "REP-{memberId}-{monthIndex}"
  loanId: string;
  memberId: string;
  monthIndex: number;
  repaymentDate: string;
  principalPaid: number;           // Principal reduction amount (₹)
  interestPaid: number;            // Interest collected (₹)
  createdAt: number;
}

export interface AppSettings {
  loanInterestRate: number;        // Default 2% per month
  lateFine: {
    rate: number;                  // e.g. 2%
    period: 'DAILY' | 'MONTHLY' | 'YEARLY';
    dueDate: number;               // Due cut-off date of month (e.g. 10th)
  };
  whatsappTemplate?: string;       // Dynamic reminder template
  zoomLevel?: number;              // Display zoom %
  textSize?: number;               // Text scale %
  defaultView?: 'dashboard' | 'members' | 'transactions';
}
```

---

## 3. Recurring Deposit (RD) Mathematical Engine

### 3.1. Reverse-Engineering Monthly Interest Rate ($r$)

When a user enters Monthly Contribution ($P$), Tenure in Months ($n$), and Maturity Amount ($A$), the system solves for the exact effective monthly compound interest rate $r$ using the **Binary Search (Bisection) Method**:

$$\text{Future Value } A = P \cdot \frac{(1 + r)^n - 1}{r}$$

```typescript
function getMonthlyRate(P: number, n: number, A: number): number {
  if (P * n >= A || P <= 0 || n <= 0) return 0;
  let low = 0.0;
  let high = 0.1; // 10% per month upper bound
  let r = 0;
  
  for (let i = 0; i < 50; i++) {
    r = (low + high) / 2;
    const estimatedA = P * (Math.pow(1 + r, n) - 1) / r;
    if (estimatedA > A) {
      high = r;
    } else {
      low = r;
    }
  }
  return r;
}
```

### 3.2. Forward Maturity Amount Calculation

$$\text{Maturity Amount } A = \begin{cases} P \cdot n & \text{if } r \le 0 \\ P \cdot \frac{(1 + r)^n - 1}{r} & \text{if } r > 0 \end{cases}$$

```typescript
function calculateMaturityAmount(P: number, n: number, r: number): number {
  if (r <= 0) return P * n;
  return P * (Math.pow(1 + r, n) - 1) / r;
}
```

### 3.3. Month-by-Month Compounding & Bonus Accumulation

At any elapsed month $t$, interest compounds on the **Previous Accumulated Balance** ($B_{t-1}$), and the current month's actual deposit ($D_t$) is added:

$$I_t = B_{t-1} \cdot r$$
$$B_t = B_{t-1} + I_t + D_t$$

```typescript
function calculateRdInterest(
  installments: RDInstallment[],
  tenureMonths: number,
  monthlyContribution: number,
  expectedMaturityAmount: number,
  monthsElapsed: number
) {
  const monthlyRate = getMonthlyRate(monthlyContribution, tenureMonths, expectedMaturityAmount);
  let previousBalance = 0;
  let totalContribution = 0;
  let totalInterest = 0;

  for (let i = 1; i <= monthsElapsed; i++) {
    const inst = installments.find(x => x.monthIndex === i);
    const amountPaid = inst ? inst.amountPaid : 0;
    const monthlyInterest = previousBalance * monthlyRate;
    const currentBalance = previousBalance + monthlyInterest + amountPaid;
    
    totalContribution += amountPaid;
    totalInterest += monthlyInterest;
    previousBalance = currentBalance;
  }
  return { totalContribution, totalInterest, currentBalance: previousBalance };
}
```

---

## 4. Loan & Interest Calculation Engine

### 4.1. Monthly Running Balance & Due Interest Rules

1. **Disbursements:** Loans disbursed in month $i$ increase the running balance:
   $$\text{Running Principal} \mathrel{+}= \text{Loan Disbursed This Month}$$
2. **Interest Calculation:** Interest for month $i$ is calculated on the running balance **before** deducting principal repayments:
   $$\text{Monthly Interest} = \left\lfloor \frac{\text{Running Principal} \cdot \text{Rate}}{100} + 0.5 \right\rfloor$$
3. **Cumulative Arrears:** If interest is unpaid, it adds to cumulative `runningInterestDue`.
4. **Repayments:**
   $$\text{Running Principal} \mathrel{-}= \text{Principal Paid}$$
   $$\text{Running Interest Due} \mathrel{-}= \text{Interest Paid}$$

---

## 5. Late Fee (Penalty) Calculation Logic

### 5.1. Dynamic Calculation on Outstanding Arrears

1. **Due Date Threshold:** Cut-off date defined in settings (e.g. 10th of every month).
2. **Penalty Multiplier ($M$):**
   - **DAILY:** $M = \lceil \Delta\text{days} \rceil$
   - **MONTHLY:** $M = \max(1, \Delta\text{months})$
   - **YEARLY:** $M = \max(1, \lceil \Delta\text{months} / 12 \rceil)$
3. **Base Amount for Fine:**
   $$\text{Month Due} = (\text{Pending RD Contribution}) + (\text{Pending Loan Interest})$$
4. **Late Fee Formula:**
   $$\text{Late Fee} = \text{Month Due} \cdot \left(\frac{\text{Late Fee Rate}}{100}\right) \cdot M$$
5. **No Penalty Compounding:** Late fees do NOT compound. Once arrears are cleared, subsequent penalties drop to 0.

---

## 6. Profit & Loss (P&L) Engine

| Member State | P&L Formula | Business Logic Meaning |
| :--- | :--- | :--- |
| **Active Member** | $\text{Net P&L} = (\text{Interest Paid} + \text{Late Fee Paid}) - \text{RD Bonus Accrued}$ | Operational P&L: Total revenue generated minus interest obligation accrued. |
| **Settled / Closed** | $\text{Net P&L} = (\text{Total Cash Received}) - (\text{Total Cash Given})$ | Cash Flow P&L: Total cash inflows minus all cash outflows (Loans + Final Settlement Paid). |

- **Color Indication:**
  - $\text{Net P&L} \ge 0 \implies$ **Green (`var(--success)`)** with label **`Net Profit` (`నికర లాభం`)** and `📈`
  - $\text{Net P&L} < 0 \implies$ **Red (`var(--danger)`)** with label **`Net Loss` (`నికర నష్టం`)** and `📉`

---

## 7. Account Completion & Settlement Logic

### 7.1. Completion Check
$$\text{isCompleted} = \text{Total RD Amount Paid} \ge (\text{Tenure Months} \cdot \text{Monthly Contribution})$$
*Note: Evaluated based on total accumulated deposits to allow bulk/advance payments.*

### 7.2. Final Settlement Calculation
$$\text{Total Payable to Member} = \text{Active Savings Amount} + \text{Earned Bonus}$$
$$\text{Total Deductions} = \text{Remaining Loan Principal} + \text{Pending Loan Interest} + \text{Late Fee}$$
$$\mathbf{\text{Net Settlement Amount}} = \text{Total Payable to Member} - \text{Total Deductions}$$

---

## 8. State Lifecycle, Filter Preservation & UX Standards

### 8.1. Module-Level State Cache (`membersStateCache`)
Filters (`searchTerm`, `statusFilter`, `advancedFilters`, `sortConfig`, `highlightedMemberId`) are stored in `membersStateCache` to ensure:
- When navigating between Members List and Profile View, **filters never reset**.
- The selected member remains **visually highlighted** with pulse animation and `#eef2ff` tint.
- The table **automatically scrolls smoothly to top position** placing the selected member directly under the sticky header.

### 8.2. Natural / Numeric Account Number Sorting
Account numbers (`memberNumber`) are parsed as integers:
```typescript
if (sortConfig.key === 'memberNumber') {
  const numA = parseInt(aValue, 10);
  const numB = parseInt(bValue, 10);
  if (!isNaN(numA) && !isNaN(numB)) {
    return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
  }
}
```
*Ensures `1, 2, 3... 9, 10, 11` sequence instead of alphabetical `1, 10, 11, 2`.*

---

## 9. Comprehensive Advanced Filter Mapping

The Advanced Filters popup menu mirrors the exact 10 table columns in sequence:

| # | Column Name (English / Telugu) | Filter State Field | Range Type |
| :-: | :--- | :--- | :--- |
| **1** | Join Date (`చేరిన తేదీ`) | `dateFrom`, `dateTo` | ISO Date Range (`YYYY-MM-DD`) |
| **2** | Monthly Saving (`నెలవారీ పొదుపు`) | `amountMin`, `amountMax` | Numeric Range (₹) |
| **3** | Total Saved (`ఇప్పటివరకు పొదుపు`) | `savedMin`, `savedMax` | Numeric Range (₹) |
| **4** | RD Status / Pending Months (`పెండింగ్ నెలలు`) | `pendingMin`, `pendingMax` | Integer Range (Months) |
| **5** | RD Paid Months (`కట్టిన నెలలు`) | `paidMin`, `paidMax` | Integer Range (Months) |
| **6** | Active Loan (`అప్పు అసలు`) | `loanMin`, `loanMax` | Numeric Range (₹) |
| **7** | Due Interest (`రావాల్సిన వడ్డీ`) | `interestMin`, `interestMax` | Numeric Range (₹) |
| **8** | Late Fee (`లేట్ ఫైన్`) | `lateFeeMin`, `lateFeeMax` | Numeric Range (₹) |
| **9** | Total Due to Pay (`మొత్తం కట్టాల్సినది`) | `totalPayMin`, `totalPayMax` | Numeric Range (₹) |
| **10** | Net Profit / Loss (`నికర లాభం / నష్టం`) | `profitMin`, `profitMax` | Numeric Range (₹) |

---

*This document is maintained as the architectural standard. When extending features or adding new modules, preserve all mathematical formulas and state contracts documented herein.*
