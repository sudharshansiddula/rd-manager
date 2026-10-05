import React, { useState, useEffect, useMemo } from 'react';
import { useI18n } from '../../locales/i18n';
import { StorageService, storageEvents } from '../../engine/storage';
import { formatCurrency } from '../../utils';
import { 
  Users, PiggyBank, Wallet, Percent, CalendarDays,
  TrendingUp, TrendingDown, ArrowRightLeft, Landmark, Coins, AlertCircle, Info
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from 'recharts';
import type { RDInstallment, Loan, LoanRepayment, Member } from '../../types';

// --- Local Translations ---
const localT = {
  totalRDBonusPayable: { en: 'Total RD Bonus Payable (Till Today)', te: 'నేటి వరకు ఇవ్వాల్సిన బోనస్' },
  totalLoanGiven: { en: 'Total Loan Amount Given', te: 'ఇచ్చిన మొత్తం అప్పు' },
  totalLoanInterestEarned: { en: 'Total Loan Interest Earned', te: 'సృష్టించిన మొత్తం వడ్డీ' },
  totalLoanInterestCollected: { en: 'Total Loan Interest Collected', te: 'వసూలైన మొత్తం వడ్డీ' },
  totalOutstandingLoan: { en: 'Total Outstanding Loan Principal', te: 'బయట ఉన్న మొత్తం అప్పు (అసలు)' },
  totalPendingRD: { en: 'Total Pending RD Amount', te: 'రావాల్సిన మొత్తం పొదుపు (పెండింగ్)' },
  memberMoneyPos: { en: 'Member Money Position', te: 'సభ్యుల ఆర్థిక స్థితి' },
  moneyCollected: { en: 'Money collected from members (RD)', te: 'సభ్యుల నుండి వసూలైన పొదుపు' },
  bonusPayable: { en: 'Bonus earned/payable to members', te: 'సభ్యులకు ఇవ్వాల్సిన బోనస్' },
  totalOwedToMembers: { en: 'Total amount currently owed to members', te: 'సభ్యులకు మొత్తం ఇవ్వాల్సిన డబ్బు' },
  loanGivenToMembers: { en: 'Loan amount given to members', te: 'సభ్యులకు ఇచ్చిన అప్పు' },
  loanPrinRecovered: { en: 'Loan principal still to be recovered', te: 'ఇంకా వసూలు కావాల్సిన అసలు' },
  loanIntPending: { en: 'Loan interest pending to be collected', te: 'వసూలు కావాల్సిన వడ్డీ' },
  futureExpectedPos: { en: 'Future / Expected Position', te: 'భవిష్యత్తు / ఆశించే వివరాలు' },
  futureRDExpected: { en: 'Future RD contributions expected', te: 'రావాల్సిన భవిష్యత్తు పొదుపు' },
  futureBonusExpected: { en: 'Future RD bonus expected', te: 'సభ్యులకు ఇవ్వాల్సిన భవిష్యత్తు బోనస్' },
  futureIntExpected: { en: 'Future loan interest expected', te: 'భవిష్యత్తులో వచ్చే వడ్డీ' },
  totalExpectedIncome: { en: 'Total expected future income', te: 'ఆశించే మొత్తం భవిష్యత్తు ఆదాయం' },
  totalFutureLiability: { en: 'Total future liability to members', te: 'సభ్యులకు ఇవ్వాల్సిన భవిష్యత్తు అప్పు' },
  profitAndLoss: { en: 'Profit & Loss (P&L)', te: 'లాభ నష్టాలు' },
  actualIncome: { en: 'Actual Income (Interest + Fine)', te: 'వాస్తవ ఆదాయం (వడ్డీ + ఫైన్)' },
  actualOutflow: { en: 'Actual Outflow (Bonus Payable)', te: 'వాస్తవ ఖర్చు (బోనస్)' },
  currentProfit: { en: 'Current Profit', te: 'ప్రస్తుత లాభం' },
  currentLoss: { en: 'Current Loss', te: 'ప్రస్తుత నష్టం' },
  netPosition: { en: 'Net Position', te: 'నికర స్థితి' },
  cashBalancePos: { en: 'Cash / Balance Position', te: 'క్యాష్ / బ్యాలెన్స్ వివరాలు' },
  totalMoneyCollected: { en: 'Total money collected (All)', te: 'వసూలైన మొత్తం డబ్బు (అన్నింటిపై)' },
  totalLoansGivenCash: { en: 'Total loans given (Outflow)', te: 'ఇచ్చిన మొత్తం అప్పు' },
  cashInHand: { en: 'Total money currently available', te: 'చేతిలో ఉన్న మొత్తం డబ్బు (Cash)' },
  monthlyAnalysis: { en: 'Monthly Analysis (Cash Flow)', te: 'నెలవారీ విశ్లేషణ (నగదు ప్రవాహం)' },
  memberStatus: { en: 'Member Status', te: 'సభ్యుల స్థితి' },
  viewAll: { en: 'View All', te: 'అన్నీ చూడండి' },
  date: { en: 'Date', te: 'తేదీ' },
  member: { en: 'Member', te: 'సభ్యుడు' },
  type: { en: 'Type', te: 'రకం' },
  amount: { en: 'Amount', te: 'మొత్తం' },
  statusCollected: { en: 'Collected', te: 'వసూలైంది' },
  statusPending: { en: 'Pending', te: 'పెండింగ్' },
  statusPayable: { en: 'Payable', te: 'చెల్లించాల్సింది' },
  statusOutstanding: { en: 'Outstanding', te: 'బయట ఉన్నది' },
  statusFuture: { en: 'Future Expected', te: 'భవిష్యత్తులో ఆశించేది' },
  lateFeeCol: { en: 'Late Fine Collected', te: 'వసూలైన లేట్ ఫైన్' }
};

const getT = (lang: 'en' | 'te', key: keyof typeof localT) => localT[key]?.[lang] || localT[key]?.en || key;

// --- Calculation Helpers ---
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
  startDateStr: string,
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

// --- Component ---
export const DashboardView = () => {
  const { t, lang } = useI18n();
  const [db, setDb] = useState(() => StorageService.getDb());

  useEffect(() => {
    const handleDbUpdate = () => setDb({ ...StorageService.getDb() });
    storageEvents.addEventListener('db_updated', handleDbUpdate);
    return () => storageEvents.removeEventListener('db_updated', handleDbUpdate);
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    let totalMembers = 0;
    let totalRDCollected = 0;
    let totalBonusPayable = 0;
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

    const membersList = db.members || [];
    const installments = db.installments || [];
    const loans = db.loans || [];
    const loanRepayments = db.loanRepayments || [];

    const settings = StorageService.getSettings();
    const loanInterestRate = settings.loanInterestRate ?? 2;

    // Monthly Chart Data Mapping (Last 6 months)
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

    // Calculate per member
    membersList.forEach(m => {
      totalMembers++;
      const mInsts = installments.filter(i => i.memberId === m.id);
      const mLoans = loans.filter(l => l.memberId === m.id);
      const mReps = loanRepayments.filter(r => r.memberId === m.id);

      const start = new Date(m.startDate);
      let monthsElapsed = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()) + 1;
      if (monthsElapsed < 1) monthsElapsed = 1;
      if (monthsElapsed > m.tenureMonths) monthsElapsed = m.tenureMonths;

      // RD calculations
      let mRDCollected = 0;
      let mLateFine = 0;
      mInsts.forEach(inst => {
        mRDCollected += (inst.amountPaid || 0);
        mLateFine += (inst.lateFeePaid || 0);
        if (inst.updatedAt && inst.amountPaid > 0) addToMonth(inst.updatedAt, 'rd', inst.amountPaid);
        if (inst.updatedAt && inst.lateFeePaid > 0) addToMonth(inst.updatedAt, 'lateFee', inst.lateFeePaid);
      });
      totalRDCollected += mRDCollected;
      totalLateFineCollected += mLateFine;

      const expectedRDToDate = monthsElapsed * m.monthlyContribution;
      const mPendingRD = Math.max(0, expectedRDToDate - mRDCollected);
      totalPendingRDAmount += mPendingRD;

      const isCompleted = mRDCollected >= (m.monthlyContribution * m.tenureMonths);
      if (isCompleted) completedMembers++;
      else if (mPendingRD > 0) pendingMembers++;
      else onTimeMembers++;

      const rdCalc = calculateRdInterest(mInsts, m.tenureMonths, m.monthlyContribution, m.expectedMaturityAmount, m.startDate, monthsElapsed);
      totalBonusPayable += rdCalc.totalInterest;

      const remainingMonths = Math.max(0, m.tenureMonths - monthsElapsed);
      futureRDExpected += (remainingMonths * m.monthlyContribution);
      
      const totalEstimatedFinalValue = m.expectedMaturityAmount;
      const futureBonus = totalEstimatedFinalValue - (rdCalc.currentBalance + (remainingMonths * m.monthlyContribution));
      if (futureBonus > 0) futureBonusExpected += futureBonus;

      // Loan calculations
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

      futureInterestExpected += (mCurrentBal * (loanInterestRate / 100) * remainingMonths);
    });

    const totalOutstandingLoan = totalLoanGiven - totalLoanRecovered;
    const totalLoanInterestPending = Math.max(0, totalLoanInterestEarned - totalLoanInterestCollected);
    
    // Profit & Loss
    const actualIncome = totalLoanInterestCollected + totalLateFineCollected;
    const actualOutflow = totalBonusPayable;
    const currentProfit = actualIncome - actualOutflow;

    // Cash Position
    const totalCashCollected = totalRDCollected + totalLoanRecovered + totalLoanInterestCollected + totalLateFineCollected;
    const cashInHand = totalCashCollected - totalLoanGiven;

    const chartData = Array.from(monthMap.entries()).map(([k, v]) => ({
      month: k,
      ...v,
      netCashFlow: (v.rd + v.loanRepaid + v.intCollected + v.lateFee) - v.loanGiven
    }));

    return {
      totalMembers,
      totalRDCollected,
      totalBonusPayable,
      totalOwedToMembers: totalRDCollected + totalBonusPayable,
      totalLoanGiven,
      totalOutstandingLoan,
      totalLoanInterestEarned,
      totalLoanInterestCollected,
      totalLoanInterestPending,
      totalPendingRDAmount,
      totalLateFineCollected,
      futureRDExpected,
      futureBonusExpected,
      futureInterestExpected,
      actualIncome,
      actualOutflow,
      currentProfit,
      totalCashCollected,
      cashInHand,
      chartData,
      statusData: [
        { name: getT(lang, 'statusCollected'), value: completedMembers, fill: '#3b82f6' }, // completed
        { name: 'Up to Date', value: onTimeMembers, fill: '#10b981' },
        { name: 'RD Pending', value: pendingMembers, fill: '#ef4444' },
        { name: 'Active Loan', value: hasLoanMembers, fill: '#f59e0b' }
      ]
    };
  }, [db, lang]);

  const recentTransactions = useMemo(() => {
    const list: any[] = [];
    (db.installments || []).forEach(i => {
      if (i.amountPaid > 0 && i.updatedAt) list.push({ type: 'RD', date: i.updatedAt, amount: i.amountPaid, memberId: i.memberId });
    });
    (db.loans || []).forEach(l => {
      if (l.principalAmount > 0 && l.createdAt) list.push({ type: 'LOAN', date: l.createdAt, amount: l.principalAmount, memberId: l.memberId });
    });
    (db.loanRepayments || []).forEach(r => {
      if ((r.principalPaid > 0 || r.interestPaid > 0) && r.createdAt) list.push({ type: 'REP', date: r.createdAt, amount: r.principalPaid + r.interestPaid, memberId: r.memberId });
    });
    list.sort((a, b) => b.date - a.date);
    return list.slice(0, 5);
  }, [db]);

  const handleNav = (view: string, params?: any) => {
    window.dispatchEvent(new CustomEvent('app-navigate', { detail: { view, ...params } }));
  };

  const InfoIcon = ({ tooltip }: { tooltip: string }) => (
    <div title={tooltip} style={{ cursor: 'help', display: 'inline-flex', marginLeft: '6px' }}>
      <Info size={14} color="#9ca3af" />
    </div>
  );

  const Badge = ({ text, type }: { text: string, type: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }) => {
    const colors = {
      success: { bg: '#dcfce7', text: '#166534' },
      warning: { bg: '#fef3c7', text: '#92400e' },
      danger: { bg: '#fee2e2', text: '#991b1b' },
      info: { bg: '#dbeafe', text: '#1e40af' },
      neutral: { bg: '#f3f4f6', text: '#374151' }
    };
    return (
      <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '10px', backgroundColor: colors[type].bg, color: colors[type].text, fontWeight: 600, marginLeft: '8px' }}>
        {text}
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', backgroundColor: '#f3f4f6', padding: '24px' }}>
      
      {/* 1. Top Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
            <Users size={14} style={{ marginRight: '6px' }} /> {t('totalMembersCount')}
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '8px' }}>{stats.totalMembers}</div>
        </div>
        
        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
            <PiggyBank size={14} style={{ marginRight: '6px' }} /> {getT(lang, 'moneyCollected')}
            <InfoIcon tooltip="Total RD amount collected from all members till today." />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '8px', color: '#10b981' }}>₹{formatCurrency(stats.totalRDCollected)}</div>
          <Badge text={getT(lang, 'statusCollected')} type="success" />
        </div>

        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
            <Landmark size={14} style={{ marginRight: '6px' }} /> {getT(lang, 'totalOwedToMembers')}
            <InfoIcon tooltip="RD Collected + Bonus Payable. Total amount the firm owes to the members currently." />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '8px', color: '#8b5cf6' }}>₹{formatCurrency(stats.totalOwedToMembers)}</div>
          <Badge text={getT(lang, 'statusPayable')} type="danger" />
        </div>

        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
            <Wallet size={14} style={{ marginRight: '6px' }} /> {getT(lang, 'totalOutstandingLoan')}
            <InfoIcon tooltip="Principal amount given as loans that is yet to be recovered." />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '8px', color: '#ef4444' }}>₹{formatCurrency(stats.totalOutstandingLoan)}</div>
          <Badge text={getT(lang, 'statusOutstanding')} type="warning" />
        </div>
      </div>

      {/* Grid Layout for Detailed Sections */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        
        {/* 2. Member Money Position & 3. Future Expected */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Member Money Position */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 16px 0', borderBottom: '1px solid #e5e7eb', paddingBottom: '12px' }}>
              {getT(lang, 'memberMoneyPos')}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: '#4b5563' }}>{getT(lang, 'moneyCollected')}</span>
                <span style={{ fontWeight: 600, color: '#10b981' }}>+ ₹{formatCurrency(stats.totalRDCollected)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: '#4b5563' }}>{getT(lang, 'bonusPayable')}</span>
                <span style={{ fontWeight: 600, color: '#ef4444' }}>- ₹{formatCurrency(stats.totalBonusPayable)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', borderTop: '1px dashed #e5e7eb', paddingTop: '8px' }}>
                <span style={{ color: '#111827', fontWeight: 600 }}>{getT(lang, 'totalOwedToMembers')}</span>
                <span style={{ fontWeight: 700, color: '#8b5cf6' }}>₹{formatCurrency(stats.totalOwedToMembers)}</span>
              </div>
              
              <div style={{ height: '16px' }}></div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: '#4b5563' }}>{getT(lang, 'loanPrinRecovered')}</span>
                <span style={{ fontWeight: 600, color: '#f59e0b' }}>₹{formatCurrency(stats.totalOutstandingLoan)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: '#4b5563' }}>{getT(lang, 'loanIntPending')}</span>
                <span style={{ fontWeight: 600, color: '#f59e0b' }}>₹{formatCurrency(stats.totalLoanInterestPending)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', borderTop: '1px dashed #e5e7eb', paddingTop: '8px' }}>
                <span style={{ color: '#111827', fontWeight: 600 }}>{getT(lang, 'totalPendingRD')}</span>
                <span style={{ fontWeight: 700, color: '#ef4444' }}>₹{formatCurrency(stats.totalPendingRDAmount)}</span>
              </div>
            </div>
          </div>

          {/* Future Expected Position */}
          <div className="card" style={{ padding: '20px', backgroundColor: '#fefce8', border: '1px solid #fef08a' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 16px 0', borderBottom: '1px solid #fde047', paddingBottom: '12px', color: '#a16207' }}>
              {getT(lang, 'futureExpectedPos')} <Badge text={getT(lang, 'statusFuture')} type="warning" />
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: '#854d0e' }}>{getT(lang, 'futureRDExpected')}</span>
                <span style={{ fontWeight: 600, color: '#10b981' }}>+ ₹{formatCurrency(stats.futureRDExpected)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: '#854d0e' }}>{getT(lang, 'futureIntExpected')}</span>
                <span style={{ fontWeight: 600, color: '#10b981' }}>+ ₹{formatCurrency(Math.round(stats.futureInterestExpected))}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', borderTop: '1px dashed #fde047', paddingTop: '8px' }}>
                <span style={{ color: '#713f12', fontWeight: 600 }}>{getT(lang, 'totalExpectedIncome')}</span>
                <span style={{ fontWeight: 700, color: '#10b981' }}>₹{formatCurrency(Math.round(stats.futureRDExpected + stats.futureInterestExpected))}</span>
              </div>

              <div style={{ height: '8px' }}></div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: '#854d0e' }}>{getT(lang, 'futureBonusExpected')}</span>
                <span style={{ fontWeight: 600, color: '#ef4444' }}>- ₹{formatCurrency(stats.futureBonusExpected)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Profit & Loss & 5. Cash Balance */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Profit & Loss */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 16px 0', borderBottom: '1px solid #e5e7eb', paddingBottom: '12px' }}>
              {getT(lang, 'profitAndLoss')}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: '#4b5563' }}>{getT(lang, 'totalLoanInterestCollected')}</span>
                <span style={{ fontWeight: 600, color: '#10b981' }}>+ ₹{formatCurrency(stats.totalLoanInterestCollected)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: '#4b5563' }}>{getT(lang, 'lateFeeCol')}</span>
                <span style={{ fontWeight: 600, color: '#10b981' }}>+ ₹{formatCurrency(stats.totalLateFineCollected)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', borderTop: '1px dashed #e5e7eb', paddingTop: '8px' }}>
                <span style={{ color: '#111827', fontWeight: 600 }}>{getT(lang, 'actualIncome')}</span>
                <span style={{ fontWeight: 700, color: '#10b981' }}>₹{formatCurrency(stats.actualIncome)}</span>
              </div>

              <div style={{ height: '8px' }}></div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: '#4b5563' }}>{getT(lang, 'actualOutflow')}</span>
                <span style={{ fontWeight: 600, color: '#ef4444' }}>- ₹{formatCurrency(stats.actualOutflow)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', borderTop: '1px dashed #e5e7eb', paddingTop: '8px', marginTop: '4px' }}>
                <span style={{ color: '#111827', fontWeight: 700 }}>{getT(lang, 'netPosition')}</span>
                <span style={{ fontWeight: 700, color: stats.currentProfit >= 0 ? '#10b981' : '#ef4444', fontSize: '18px' }}>
                  {stats.currentProfit >= 0 ? getT(lang, 'currentProfit') : getT(lang, 'currentLoss')}: ₹{formatCurrency(Math.abs(stats.currentProfit))}
                </span>
              </div>
            </div>
          </div>

          {/* Cash Balance */}
          <div className="card" style={{ padding: '20px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 16px 0', borderBottom: '1px solid #86efac', paddingBottom: '12px', color: '#166534' }}>
              {getT(lang, 'cashBalancePos')}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: '#15803d' }}>{getT(lang, 'totalMoneyCollected')}</span>
                <span style={{ fontWeight: 600, color: '#15803d' }}>+ ₹{formatCurrency(stats.totalCashCollected)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: '#15803d' }}>{getT(lang, 'totalLoansGivenCash')}</span>
                <span style={{ fontWeight: 600, color: '#dc2626' }}>- ₹{formatCurrency(stats.totalLoanGiven)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', borderTop: '1px dashed #86efac', paddingTop: '8px', marginTop: '4px' }}>
                <span style={{ color: '#14532d', fontWeight: 700 }}>{getT(lang, 'cashInHand')}</span>
                <span style={{ fontWeight: 800, color: '#16a34a', fontSize: '22px' }}>
                  ₹{formatCurrency(stats.cashInHand)}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 6. Monthly Analysis & 7. Member Status */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        
        {/* Monthly Chart */}
        <div className="card" style={{ padding: '20px', minHeight: '350px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 16px 0', color: '#111827' }}>
            {getT(lang, 'monthlyAnalysis')}
          </h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={(v) => `₹${v}`} />
                <RechartsTooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontSize: '12px' }}>
                          <p style={{ margin: '0 0 8px 0', fontWeight: 700 }}>Month: {data.month}</p>
                          <p style={{ margin: '0 0 4px 0', color: '#10b981' }}>RD + Int + Fine: ₹{formatCurrency(data.rd + data.intCollected + data.lateFee)}</p>
                          <p style={{ margin: '0 0 4px 0', color: '#ef4444' }}>Loans Given: ₹{formatCurrency(data.loanGiven)}</p>
                          <p style={{ margin: '0 0 4px 0', color: '#3b82f6' }}>Loans Repaid: ₹{formatCurrency(data.loanRepaid)}</p>
                          <p style={{ margin: '8px 0 0 0', fontWeight: 700, borderTop: '1px solid #e5e7eb', paddingTop: '4px' }}>Net Flow: ₹{formatCurrency(data.netCashFlow)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Bar name="Cash In" dataKey={(d) => d.rd + d.intCollected + d.lateFee + d.loanRepaid} fill="#10b981" radius={[2, 2, 0, 0]} />
                <Bar name="Cash Out (Loans)" dataKey="loanGiven" fill="#ef4444" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Member Status Pie Chart */}
        <div className="card" style={{ padding: '20px', minHeight: '350px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 16px 0', color: '#111827' }}>
            {getT(lang, 'memberStatus')}
          </h3>
          <div style={{ height: '220px', position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.statusData}
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {stats.statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(value: any, name: any) => [`${value} Members`, name as string]} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#111827' }}>{stats.totalMembers}</div>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>Total</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
            {stats.statusData.map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', fontSize: '12px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: d.fill, marginRight: '6px' }}></div>
                <span style={{ color: '#4b5563' }}>{d.name}: <strong>{d.value}</strong></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 8. Recent Transactions */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#111827' }}>
            {t('recentTransactionsDash')}
          </h3>
          <button onClick={() => handleNav('transactions')} className="btn" style={{ background: 'none', border: 'none', color: '#4f46e5', fontSize: '13px', fontWeight: 600, padding: 0 }}>
            {getT(lang, 'viewAll')} &rarr;
          </button>
        </div>
        <div className="table-wrapper">
          <table className="table" style={{ fontSize: '13px', width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb', textAlign: 'left', color: '#6b7280' }}>
                <th style={{ padding: '8px 0' }}>{getT(lang, 'date')}</th>
                <th>{getT(lang, 'member')}</th>
                <th>{getT(lang, 'type')}</th>
                <th style={{ textAlign: 'right' }}>{getT(lang, 'amount')}</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map((txn, idx) => {
                const member = (db.members || []).find(m => m.id === txn.memberId);
                const d = new Date(txn.date);
                let typeStr = '';
                let color = '#111827';
                if (txn.type === 'RD') { typeStr = getT(lang, 'rdPaid'); color = '#10b981'; }
                if (txn.type === 'LOAN') { typeStr = getT(lang, 'loanGiven'); color = '#ef4444'; }
                if (txn.type === 'REP') { typeStr = getT(lang, 'loanRepayment'); color = '#3b82f6'; }

                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 0', color: '#4b5563' }}>{d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td style={{ fontWeight: 500, color: '#111827' }}>{member?.name || 'Unknown'}</td>
                    <td><Badge text={typeStr} type={txn.type === 'RD' ? 'success' : txn.type === 'LOAN' ? 'danger' : 'info'} /></td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color }}>₹{formatCurrency(txn.amount)}</td>
                  </tr>
                );
              })}
              {recentTransactions.length === 0 && (
                <tr><td colSpan={4} style={{ padding: '20px 0', textAlign: 'center', color: '#9ca3af' }}>No transactions found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
