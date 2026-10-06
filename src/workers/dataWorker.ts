import type { Member, RDInstallment, Loan, LoanRepayment, AppSettings } from '../types';

export interface DashboardStatsResult {
  totalMembers: number;
  totalRDCollected: number;
  totalBonusPayable: number;
  activeRDCollected: number;
  activeBonusPayable: number;
  totalSettlementPaid: number;
  totalOwedToMembers: number;
  totalLoanGiven: number;
  totalLoanRecovered: number;
  totalOutstandingLoan: number;
  totalLoanInterestEarned: number;
  totalLoanInterestCollected: number;
  totalLoanInterestPending: number;
  totalPendingRDAmount: number;
  futureRDExpected: number;
  futureBonusExpected: number;
  futureInterestExpected: number;
  totalExpectedFutureIncome: number;
  totalExpectedFutureLiability: number;
  actualIncome: number;
  actualOutflow: number;
  netPosition: number;
  totalCashIn: number;
  totalCashOut: number;
  cashInHand: number;
  onTimeMembers: number;
  pendingMembers: number;
  completedMembers: number;
  hasLoanMembers: number;
  pendingInterestMembers: number;
  chartData: any[];
}

// Re-use the interest calculation function
function getMonthlyRate(P: number, n: number, A: number) {
  if (P * n >= A) return 0;
  let low = 0.0;
  let high = 0.1;
  let r = 0;
  for (let i = 0; i < 50; i++) {
    r = (low + high) / 2;
    let estimatedA = P * (Math.pow(1 + r, n) - 1) / r;
    if (estimatedA > A) high = r;
    else low = r;
  }
  return r;
}

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

self.onmessage = (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === 'CALCULATE_DASHBOARD') {
    const { db, settings } = payload;
    try {
      const result = calculateDashboardStats(db, settings);
      self.postMessage({ type: 'DASHBOARD_RESULT', result });
    } catch (err: any) {
      self.postMessage({ type: 'ERROR', error: err.message });
    }
  }
};

function calculateDashboardStats(db: any, settings: AppSettings): DashboardStatsResult {
  const now = new Date();
  let totalMembers = 0;
  let totalRDCollected = 0;
  let totalBonusPayable = 0;
  let activeRDCollected = 0;
  let activeBonusPayable = 0;
  let totalSettlementPaid = 0;
  let totalLoanGiven = 0;
  let totalLoanRecovered = 0;
  let totalLoanInterestEarned = 0;
  let totalLoanInterestCollected = 0;
  let totalPendingRDAmount = 0;
  let totalLateFineCollected = 0;

  let futureRDExpected = 0;
  let futureBonusExpected = 0;
  let futureInterestExpected = 0;

  let onTimeMembers = 0, pendingMembers = 0, completedMembers = 0;
  let hasLoanMembers = 0, pendingInterestMembers = 0;

  const membersList: Member[] = db.members || [];
  const installments: RDInstallment[] = db.installments || [];
  const loans: Loan[] = db.loans || [];
  const loanRepayments: LoanRepayment[] = db.loanRepayments || [];

  const instMap: Record<string, RDInstallment[]> = {};
  const loanMap: Record<string, Loan[]> = {};
  const repMap: Record<string, LoanRepayment[]> = {};

  installments.forEach(i => {
    if (!instMap[i.memberId]) instMap[i.memberId] = [];
    instMap[i.memberId].push(i);
  });
  loans.forEach(l => {
    if (!loanMap[l.memberId]) loanMap[l.memberId] = [];
    loanMap[l.memberId].push(l);
  });
  loanRepayments.forEach(r => {
    if (!repMap[r.memberId]) repMap[r.memberId] = [];
    repMap[r.memberId].push(r);
  });

  const loanInterestRate = settings.loanInterestRate ?? 2;

  const monthMap = new Map<string, { rd: number, loanGiven: number, loanRepaid: number, intCollected: number, lateFee: number }>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthMap.set(key, { rd: 0, loanGiven: 0, loanRepaid: 0, intCollected: 0, lateFee: 0 });
  }

  const addToMonth = (dateVal: number | string, type: 'rd' | 'loanGiven' | 'loanRepaid' | 'intCollected' | 'lateFee', amt: number) => {
    const d = new Date(dateVal);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (monthMap.has(key)) {
      monthMap.get(key)![type] += amt;
    }
  };

  membersList.forEach(m => {
    totalMembers++;
    const mInsts = instMap[m.id] || [];
    const mLoans = loanMap[m.id] || [];
    const mReps = repMap[m.id] || [];

    const start = new Date(m.startDate);
    let monthsElapsed = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()) + 1;
    if (monthsElapsed < 1) monthsElapsed = 1;
    if (monthsElapsed > m.tenureMonths) monthsElapsed = m.tenureMonths;

    let mRDCollected = 0;
    let mLateFine = 0;
    
    mInsts.forEach(inst => {
      mRDCollected += (inst.amountPaid || 0);
      mLateFine += (inst.lateFeePaid || 0);
      
      if (inst.updatedAt && inst.amountPaid > 0) addToMonth(inst.updatedAt, 'rd', inst.amountPaid);
      if (inst.updatedAt && inst.lateFeePaid > 0) addToMonth(inst.updatedAt, 'lateFee', inst.lateFeePaid);
    });
    const totalPaidMonths = Math.floor(mRDCollected / (m.monthlyContribution || 1));
    const lastPaymentMonthIndex = mInsts.reduce((max, i) => (i.amountPaid || 0) > 0 ? Math.max(max, i.monthIndex) : max, 0);
    const maxPaidMonthIndex = Math.max(totalPaidMonths, lastPaymentMonthIndex);
    totalRDCollected += mRDCollected;
    totalLateFineCollected += mLateFine;

    const pendingMonthsCount = Math.max(0, monthsElapsed - maxPaidMonthIndex);
    const mPendingRD = pendingMonthsCount > 0 ? pendingMonthsCount * m.monthlyContribution : 0;
    totalPendingRDAmount += mPendingRD;

    const isCompleted = maxPaidMonthIndex >= m.tenureMonths;
    if (isCompleted) completedMembers++;
    else if (mPendingRD > 0) pendingMembers++;
    else onTimeMembers++;

    const rdCalc = calculateRdInterest(mInsts, m.tenureMonths, m.monthlyContribution, m.expectedMaturityAmount, monthsElapsed);
    const earnedBonus = rdCalc.totalInterest;
    totalBonusPayable += earnedBonus;

    const isSettlementMode = m.status === 'closed' || m.status === 'matured';
    if (isSettlementMode) {
      const settlementPaid = m.settlementAmountPaid ? Number(m.settlementAmountPaid) : 0;
      totalSettlementPaid += settlementPaid;
    } else {
      activeRDCollected += mRDCollected;
      activeBonusPayable += earnedBonus;
    }

    const remainingMonths = Math.max(0, m.tenureMonths - monthsElapsed);
    futureRDExpected += (remainingMonths * m.monthlyContribution);
    
    const totalEstimatedFinalValue = m.expectedMaturityAmount;
    const futureBonus = totalEstimatedFinalValue - (rdCalc.currentBalance + (remainingMonths * m.monthlyContribution));
    if (futureBonus > 0) futureBonusExpected += futureBonus;

    let mLoanGiven = 0;
    mLoans.forEach(l => {
      mLoanGiven += l.principalAmount;
      if (l.createdAt) addToMonth(l.createdAt, 'loanGiven', l.principalAmount);
    });
    totalLoanGiven += mLoanGiven;

    let mLoanRecovered = 0;
    let mIntCollected = 0;
    mReps.forEach(r => {
      mLoanRecovered += r.principalPaid;
      mIntCollected += r.interestPaid;
      if (r.createdAt && r.principalPaid > 0) addToMonth(r.createdAt, 'loanRepaid', r.principalPaid);
      if (r.createdAt && r.interestPaid > 0) addToMonth(r.createdAt, 'intCollected', r.interestPaid);
    });
    totalLoanRecovered += mLoanRecovered;
    totalLoanInterestCollected += mIntCollected;

    const mCurrentBal = mLoanGiven - mLoanRecovered;
    if (mCurrentBal > 0) hasLoanMembers++;

    let runningLoanBal = 0;
    let mIntEarned = 0;
    for (let i = 1; i <= monthsElapsed; i++) {
      const monthDate = new Date(start.getFullYear(), start.getMonth() + (i - 1), 1);
      const loansThisMonth = mLoans.filter(l => {
        const ld = new Date(l.disbursementDate);
        return ld.getFullYear() === monthDate.getFullYear() && ld.getMonth() === monthDate.getMonth();
      });
      const loanDisbursedThisMonth = loansThisMonth.reduce((s, l) => s + l.principalAmount, 0);
      
      const monthlyInterest = runningLoanBal > 0 ? (runningLoanBal * loanInterestRate) / 100 : 0;
      mIntEarned += monthlyInterest;
      runningLoanBal += loanDisbursedThisMonth;
      
      const rep = mReps.find(x => x.monthIndex === i);
      if (rep) runningLoanBal -= rep.principalPaid;
    }
    totalLoanInterestEarned += mIntEarned;

    if ((mIntEarned - mIntCollected) > 0) pendingInterestMembers++;
  });

  const totalOwedToMembers = activeRDCollected + activeBonusPayable;
  const totalOutstandingLoan = totalLoanGiven - totalLoanRecovered;
  const totalLoanInterestPending = Math.max(0, totalLoanInterestEarned - totalLoanInterestCollected);
  
  const totalExpectedFutureIncome = futureRDExpected + futureInterestExpected;
  const totalExpectedFutureLiability = futureRDExpected + futureBonusExpected;

  const actualIncome = totalLoanInterestCollected + totalLateFineCollected;
  const actualOutflow = activeBonusPayable + totalSettlementPaid;
  const netPosition = actualIncome - actualOutflow;

  const totalCashIn = totalRDCollected + totalLoanRecovered + totalLoanInterestCollected + totalLateFineCollected;
  const totalCashOut = totalLoanGiven + totalSettlementPaid;
  const cashInHand = totalCashIn - totalCashOut;

  const chartData = Array.from(monthMap.entries()).map(([key, val]) => {
    const [y, m] = key.split('-');
    const monthName = new Date(Number(y), Number(m)-1).toLocaleDateString('en-GB', { month: 'short' });
    return {
      name: monthName,
      CashIn: val.rd + val.loanRepaid + val.intCollected + val.lateFee,
      CashOut: val.loanGiven
    };
  }).reverse();

  return {
    totalMembers,
    totalRDCollected,
    totalBonusPayable,
    activeRDCollected,
    activeBonusPayable,
    totalSettlementPaid,
    totalOwedToMembers,
    totalLoanGiven,
    totalLoanRecovered,
    totalOutstandingLoan,
    totalLoanInterestEarned,
    totalLoanInterestCollected,
    totalLoanInterestPending,
    totalPendingRDAmount,
    futureRDExpected,
    futureBonusExpected,
    futureInterestExpected,
    totalExpectedFutureIncome,
    totalExpectedFutureLiability,
    actualIncome,
    actualOutflow,
    netPosition,
    totalCashIn,
    totalCashOut,
    cashInHand,
    onTimeMembers,
    pendingMembers,
    completedMembers,
    hasLoanMembers,
    pendingInterestMembers,
    chartData
  };
}
