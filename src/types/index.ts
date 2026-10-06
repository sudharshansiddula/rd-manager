export interface Member {
  id: string;
  memberNumber: string; // Account Number
  name: string;
  mobile: string;
  address?: string;
  startDate: string; // YYYY-MM-DD
  status: 'ACTIVE' | 'MATURED' | 'CLOSED';
  
  // Scheme settings
  monthlyContribution: number; // e.g., 100
  tenureMonths: number; // e.g., 72
  expectedMaturityAmount: number; // e.g., 10000
  
  createdAt: number; // timestamp
  lastWhatsappSentDate?: string;
  settlementDate?: string;
  settlementAmountPaid?: number;
}

export interface RDInstallment {
  id: string;
  memberId: string;
  monthIndex: number; // 1 to 72
  dueDate: string; // e.g., 2026-10-05
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  
  // Payment details
  paidDate?: string;
  amountPaid: number;
  lateFeePaid: number;
  depositorDetails?: string;
  receiptNo?: string;
  
  updatedAt: number;
}

export interface Loan {
  id: string;
  memberId: string;
  principalAmount: number;
  disbursementDate: string;
  interestRatePerMonth: number; // e.g., 2 for 2%
  status: 'ACTIVE' | 'CLOSED';
  
  // Tracking (Calculated on the fly, but good to store snapshots or derive)
  principalOutstanding: number;
  
  createdAt: number;
}

export interface LoanRepayment {
  id: string;
  loanId: string;
  memberId: string;
  repaymentDate: string;
  monthIndex?: number; // Added to map repayment to a specific RD month row
  
  principalPaid: number;
  interestPaid: number;
  receiptNo?: string;
  
  createdAt: number;
}

// For Dashboard & Transactions Logging (Ledger)
export interface Transaction {
  id: string;
  date: string;
  type: 'RD_DEPOSIT' | 'LOAN_DISBURSEMENT' | 'LOAN_REPAYMENT' | 'MATURITY_PAYOUT';
  amount: number;
  memberId: string;
  referenceId: string; // InstallmentId or LoanId
  notes?: string;
  createdAt: number;
}

export interface AppSettings {
  defaultView: 'dashboard' | 'members' | 'transactions';
  lateFine: {
    period: 'DAILY' | 'MONTHLY' | 'YEARLY';
    dueDate: number;
    rate: number; // percentage
  };
  whatsappTemplate?: string;
  loanInterestRate: number;
}
