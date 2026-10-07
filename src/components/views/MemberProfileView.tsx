import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ArrowLeft, Save, Edit2, Trash2, Phone, MapPin, PiggyBank, Wallet, AlertCircle, Info, X } from 'lucide-react';
import { useI18n } from '../../locales/i18n';
import { formatCurrency } from '../../utils';
import { StorageService, storageEvents } from '../../engine/storage';
import { WhatsAppIcon } from '../WhatsAppIcon';
import type { Member, RDInstallment, Loan, LoanRepayment } from '../../types';

interface MemberProfileProps {
  member: Member;
  onBack: () => void;
  targetMonthIndex?: number | null;
}

// Helper to find exact monthly interest rate for given params
function getMonthlyRate(P: number, n: number, A: number) {
  if (P * n >= A) return 0;
  let low = 0.0;
  let high = 0.1; // 10% per month is a safe upper bound for RD
  let r = 0;
  for (let i = 0; i < 50; i++) {
    r = (low + high) / 2;
    // Future value of ordinary annuity with payments at start:
    // Actually, based on user rules: previousBalance * (1 + r) + P
    // Month 1 end: P
    // Month 2 end: P(1+r) + P
    // Month n end: P * [ (1+r)^n - 1 ] / r
    let estimatedA = P * (Math.pow(1 + r, n) - 1) / r;
    if (estimatedA > A) {
      high = r;
    } else {
      low = r;
    }
  }
  return r;
}

function calculateRdInterest(
  installments: RDInstallment[],
  tenureMonths: number,
  monthlyContribution: number,
  expectedMaturityAmount: number,
  startDateStr: string,
  isCompleted: boolean,
  monthsElapsed: number,
  closeDateStr: string | null
) {
  const monthlyRate = getMonthlyRate(monthlyContribution, tenureMonths, expectedMaturityAmount);

  let previousBalance = 0;
  let totalContribution = 0;
  let totalInterest = 0;
  const months = [];

  const startDate = new Date(startDateStr);

  let closeMonthIndex = Infinity;
  let calculationMonths = monthsElapsed;

  if (closeDateStr) {
    const cDate = new Date(closeDateStr);
    closeMonthIndex = (cDate.getFullYear() - startDate.getFullYear()) * 12 + (cDate.getMonth() - startDate.getMonth()) + 1;
    if (closeMonthIndex < 1) closeMonthIndex = 1;

    const maxPaidMonth = installments.reduce((max, inst) => (inst.amountPaid > 0 && inst.monthIndex > max) ? inst.monthIndex : max, 0);
    calculationMonths = Math.max(closeMonthIndex, maxPaidMonth);
  } else if (isCompleted) {
    calculationMonths = Math.max(tenureMonths, monthsElapsed);
  }

  for (let i = 1; i <= calculationMonths; i++) {
    const inst = installments.find(x => x.monthIndex === i);
    const amountPaid = inst ? inst.amountPaid : 0;

    const isPastCloseDate = i > closeMonthIndex;
    const monthlyInterest = isPastCloseDate ? 0 : previousBalance * monthlyRate;

    const currentBalance = previousBalance + monthlyInterest + amountPaid;

    totalContribution += amountPaid;
    totalInterest += monthlyInterest;

    const monthDate = new Date(startDate.getFullYear(), startDate.getMonth() + (i - 1), 1);

    months.push({
      monthNumber: i,
      paymentMonth: monthDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
      installment: amountPaid,
      totalContribution: totalContribution,
      monthlyInterest: monthlyInterest,
      accumulatedInterest: totalInterest,
      closingBalance: currentBalance
    });

    previousBalance = currentBalance;
  }

  return {
    months,
    totalContribution,
    totalInterest,
    currentBalance: previousBalance,
    monthlyRate
  };
}

export const MemberProfileView = ({ member, onBack, targetMonthIndex }: MemberProfileProps) => {
  const { t, lang } = useI18n();
  const [installments, setInstallments] = useState<RDInstallment[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [repayments, setRepayments] = useState<LoanRepayment[]>([]);
  const [editRowIdx, setEditRowIdx] = useState<number | null>(null);
  const [closeDateStr, setCloseDateStr] = useState<string | null>(null);
  const [showCalculationModal, setShowCalculationModal] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileFormData, setProfileFormData] = useState({ name: '', mobile: '', address: '', tenureMonths: 72, expectedMaturityAmount: 0 });
  const [isDeletingProfile, setIsDeletingProfile] = useState(false);
  const [deleteConfirmationName, setDeleteConfirmationName] = useState('');
  const [showLateFeeTooltip, setShowLateFeeTooltip] = useState(false);

  const [settlementData, setSettlementData] = useState({
    date: member.settlementDate || '',
    amountPaid: member.settlementAmountPaid || ''
  });

  const [includeSavings, setIncludeSavings] = useState(true);
  const [includeBonus, setIncludeBonus] = useState(true);
  const [includeLoan, setIncludeLoan] = useState(true);
  const [includeInterest, setIncludeInterest] = useState(true);
  const [includeLateFee, setIncludeLateFee] = useState(true);

  const handleSaveSettlement = (field: 'date' | 'amountPaid', value: any) => {
    setSettlementData(prev => {
      const updated = { ...prev, [field]: value };
      const db = StorageService.getDb();
      const m = db.members.find(x => x.id === member.id);
      if (m) {
        if (field === 'date') m.settlementDate = value;
        if (field === 'amountPaid') m.settlementAmountPaid = Number(value);
        StorageService.saveDb(db);
        if (field === 'date') member.settlementDate = value;
        if (field === 'amountPaid') member.settlementAmountPaid = Number(value);
      }
      return updated;
    });
  };

  const currentMonthRowRef = useRef<HTMLTableRowElement>(null);
  const targetRowRef = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    if (targetRowRef.current) {
      setTimeout(() => {
        targetRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } else if (currentMonthRowRef.current && !targetMonthIndex) {
      setTimeout(() => {
        currentMonthRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [targetMonthIndex]);

  // Row edits state
  const [rowEdits, setRowEdits] = useState({
    rdAmount: 0,
    depositorDetails: '',
    loanDisbursed: 0,
    principalPaid: 0,
    interestPaid: 0,
    lateFee: 0
  });

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    storageEvents.addEventListener('db_updated', handleUpdate);
    return () => storageEvents.removeEventListener('db_updated', handleUpdate);
  }, [member.id]);

  const loadData = () => {
    setInstallments(StorageService.getInstallments(member.id));
    setLoans(StorageService.getLoans(member.id));
    setRepayments(StorageService.getLoanRepayments(member.id));
  };

  // Calculate stats for summary
  const totalSaved = installments.reduce((sum, i) => sum + (i.amountPaid || 0), 0);
  const paidMonthsCount = Math.floor(totalSaved / (member.monthlyContribution || 1));
  const lastPaymentMonthIndex = installments.reduce((max, i) => (i.amountPaid || 0) > 0 ? Math.max(max, i.monthIndex) : max, 0);
  const maxPaidMonthIndex = Math.max(paidMonthsCount, lastPaymentMonthIndex);
  const totalPrincipalRepaid = repayments.reduce((sum, r) => sum + (r.principalPaid || 0), 0);
  const totalLoanPrincipal = loans.reduce((sum, l) => sum + (l.principalAmount || 0), 0);
  const currentLoanBal = totalLoanPrincipal - totalPrincipalRepaid;

  // Build the table data
  const rows = useMemo(() => {
    const settings = StorageService.getSettings();
    const loanInterestRate = settings.loanInterestRate ?? 2;

    let runningLoanBal = 0;
    let runningInterestDue = 0;
    const result = [];
    const startDate = new Date(member.startDate);

    for (let i = 1; i <= member.tenureMonths; i++) {
      const inst = installments.find(x => x.monthIndex === i);
      const rep = repayments.find(x => x.monthIndex === i);

      const monthDate = new Date(startDate.getFullYear(), startDate.getMonth() + (i - 1), 1);
      const monthStr = monthDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });

      const rdAmount = inst ? inst.amountPaid : 0;
      const lateFee = inst ? inst.lateFeePaid : 0;
      const principalPaid = rep ? rep.principalPaid : 0;
      const interestPaid = rep ? rep.interestPaid : 0;

      // Calculate loan disbursed this month
      // (Loans where disbursementDate falls in this month/year)
      const loansThisMonth = loans.filter(l => {
        const ld = new Date(l.disbursementDate);
        return ld.getFullYear() === monthDate.getFullYear() && ld.getMonth() === monthDate.getMonth();
      });
      const loanDisbursedThisMonth = loansThisMonth.reduce((s, l) => s + l.principalAmount, 0);

      // Interest is calculated on the running balance *before* this month's disbursement
      const monthlyInterest = runningLoanBal > 0 ? Math.round((runningLoanBal * loanInterestRate) / 100) : 0;
      runningInterestDue += monthlyInterest;

      const expectedInterest = runningInterestDue;

      runningLoanBal += loanDisbursedThisMonth;

      const updatedAt = inst?.updatedAt || rep?.createdAt || null;

      const row = {
        monthIndex: i,
        monthStr,
        rdAmount,
        depositorDetails: inst?.depositorDetails || '',
        loanDisbursed: loanDisbursedThisMonth,
        lateFee,
        principalPaid,
        interestPaid,
        expectedInterest,
        totalPaid: rdAmount + lateFee + principalPaid + interestPaid,
        loanBalAfter: runningLoanBal - principalPaid,
        updatedAt
      };

      runningLoanBal -= principalPaid;
      runningInterestDue -= interestPaid;

      result.push(row);
    }
    return result;
  }, [member, installments, repayments, loans]);

  const handleEditClick = (idx: number, row: any) => {
    setEditRowIdx(idx);
    setRowEdits({
      rdAmount: row.rdAmount || 0,
      depositorDetails: row.depositorDetails || '',
      loanDisbursed: row.loanDisbursed || 0,
      principalPaid: row.principalPaid || 0,
      interestPaid: row.interestPaid || 0,
      lateFee: row.lateFee || 0
    });
    setTimeout(() => {
      document.getElementById(`rdAmount-${row.monthIndex}`)?.focus();
    }, 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, fieldName: string, monthIndex: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (fieldName === 'rdAmount') {
        document.getElementById(`depositorDetails-${monthIndex}`)?.focus();
      } else if (fieldName === 'depositorDetails') {
        document.getElementById(`loanDisbursed-${monthIndex}`)?.focus();
      } else if (fieldName === 'loanDisbursed') {
        document.getElementById(`principalPaid-${monthIndex}`)?.focus();
      } else if (fieldName === 'principalPaid') {
        document.getElementById(`interestPaid-${monthIndex}`)?.focus();
      } else if (fieldName === 'interestPaid') {
        document.getElementById(`lateFee-${monthIndex}`)?.focus();
      } else if (fieldName === 'lateFee') {
        handleSaveRow(monthIndex);
        const nextMonthRowIdx = rows.findIndex(r => r.monthIndex === monthIndex + 1);
        if (nextMonthRowIdx !== -1) {
          const nextRow = rows[nextMonthRowIdx];
          handleEditClick(nextMonthRowIdx, nextRow);
        }
      }
    }
  };

  const handleClearRow = (monthIndex: number) => {
    if (window.confirm('Are you sure you want to clear all data for this month?')) {
      // Clear installment
      let inst = installments.find(x => x.monthIndex === monthIndex);
      if (inst) {
        inst.amountPaid = 0;
        inst.depositorDetails = '';
        inst.lateFeePaid = 0;
        inst.status = 'PENDING';
        StorageService.saveInstallments([inst]);
      }

      // Clear repayment
      let rep = repayments.find(x => x.monthIndex === monthIndex);
      if (rep) {
        rep.principalPaid = 0;
        rep.interestPaid = 0;
        StorageService.saveLoanRepayments([rep]);
      }

      // Delete loans for this month
      const startDate = new Date(member.startDate);
      const monthDate = new Date(startDate.getFullYear(), startDate.getMonth() + (monthIndex - 1), 1);

      const db = StorageService.getDb();
      db.loans = db.loans.filter(l => {
        if (l.memberId !== member.id) return true;
        const ld = new Date(l.disbursementDate);
        return !(ld.getFullYear() === monthDate.getFullYear() && ld.getMonth() === monthDate.getMonth());
      });
      StorageService.saveDb(db);
    }
  };

  const handleSaveRow = (monthIndex: number) => {
    // Save Installment
    let inst = installments.find(x => x.monthIndex === monthIndex);
    if (!inst) {
      inst = {
        id: `INST-${member.id}-${monthIndex}`,
        memberId: member.id,
        monthIndex,
        dueDate: '',
        status: rowEdits.rdAmount >= member.monthlyContribution ? 'PAID' : (rowEdits.rdAmount > 0 ? 'PENDING' : 'PENDING'),
        amountPaid: rowEdits.rdAmount,
        depositorDetails: rowEdits.depositorDetails,
        lateFeePaid: rowEdits.lateFee,
        updatedAt: Date.now()
      };
    } else {
      inst.amountPaid = rowEdits.rdAmount;
      inst.depositorDetails = rowEdits.depositorDetails;
      inst.lateFeePaid = rowEdits.lateFee;
      inst.status = inst.amountPaid >= member.monthlyContribution ? 'PAID' : 'PENDING';
      inst.updatedAt = Date.now();
    }
    StorageService.saveInstallments([inst]);

    // Handle Loan Disbursement
    const startDate = new Date(member.startDate);
    const monthDate = new Date(startDate.getFullYear(), startDate.getMonth() + (monthIndex - 1), 1);
    const db = StorageService.getDb();

    // Check if loan already exists this month
    let existingLoan = db.loans.find(l => {
      if (l.memberId !== member.id) return false;
      const ld = new Date(l.disbursementDate);
      return ld.getFullYear() === monthDate.getFullYear() && ld.getMonth() === monthDate.getMonth();
    });

    if (rowEdits.loanDisbursed > 0) {
      if (existingLoan) {
        existingLoan.principalAmount = rowEdits.loanDisbursed;
      } else {
        const localISODate = new Date(monthDate.getTime() - monthDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];
        existingLoan = {
          id: `LOAN-${member.id}-${monthIndex}-${Date.now()}`,
          memberId: member.id,
          principalAmount: rowEdits.loanDisbursed,
          disbursementDate: localISODate,
          interestRatePerMonth: 2,
          status: 'ACTIVE',
          principalOutstanding: rowEdits.loanDisbursed,
          createdAt: Date.now()
        };
        db.loans.push(existingLoan);
      }
      StorageService.saveDb(db);
    } else if (existingLoan) {
      // If entered 0, remove the loan
      db.loans = db.loans.filter(l => l.id !== existingLoan!.id);
      StorageService.saveDb(db);
      existingLoan = undefined;
    }

    // Since we directly modified DB, let's refresh activeLoan context
    const allLoans = StorageService.getLoans(member.id);
    const anyActiveLoan = allLoans.length > 0 ? allLoans[0] : undefined;

    // Save Loan Repayment if there's an active loan OR repayment is entered
    if (anyActiveLoan && (rowEdits.principalPaid > 0 || rowEdits.interestPaid > 0 || (repayments.some(r => r.monthIndex === monthIndex)))) {
      let rep = repayments.find(x => x.monthIndex === monthIndex);
      if (!rep) {
        rep = {
          id: `REP-${member.id}-${monthIndex}`,
          loanId: anyActiveLoan.id,
          memberId: member.id,
          monthIndex,
          repaymentDate: new Date().toISOString().split('T')[0],
          principalPaid: rowEdits.principalPaid,
          interestPaid: rowEdits.interestPaid,
          createdAt: Date.now()
        };
      } else {
        rep.principalPaid = rowEdits.principalPaid;
        rep.interestPaid = rowEdits.interestPaid;
      }
      StorageService.saveLoanRepayments([rep]);
    }

    setEditRowIdx(null);
  };

  const handleSaveProfile = () => {
    const db = StorageService.getDb();
    const m = db.members.find(x => x.id === member.id);
    if (m) {
      m.name = profileFormData.name;
      m.mobile = profileFormData.mobile;
      m.address = profileFormData.address;
      m.tenureMonths = profileFormData.tenureMonths;
      m.expectedMaturityAmount = profileFormData.expectedMaturityAmount;
      StorageService.saveDb(db);

      // Update local member object to trigger re-render
      member.name = m.name;
      member.mobile = m.mobile;
      member.address = m.address;
      member.tenureMonths = m.tenureMonths;
      member.expectedMaturityAmount = m.expectedMaturityAmount;
    }
    setIsEditingProfile(false);
  };

  const handleDeleteProfile = () => {
    if (deleteConfirmationName.trim().toLowerCase() !== member.name.toLowerCase()) {
      alert("Name does not match. Deletion cancelled.");
      return;
    }
    StorageService.deleteMember(member.id);
    setIsDeletingProfile(false);
    onBack(); // Go back to members list after deletion
  };

  const start = new Date(member.startDate);
  const now = new Date();
  let monthsElapsed = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()) + 1;
  if (monthsElapsed < 1) monthsElapsed = 1;
  if (monthsElapsed > member.tenureMonths) monthsElapsed = member.tenureMonths;

  const pendingRDMonths = Math.max(0, monthsElapsed - maxPaidMonthIndex);
  const pendingRDAmount = pendingRDMonths * member.monthlyContribution;

  const currentMonthRow = rows[Math.max(0, monthsElapsed - 1)];
  const remainingInterestDue = currentMonthRow ? Math.max(0, currentMonthRow.expectedInterest - currentMonthRow.interestPaid) : 0;

  // Fetch settings dynamically
  const settings = StorageService.getSettings();

  // Calculate Late Fine based on settings
  let calculatedLateFee = 0;
  const lateFeeBreakdown: { month: string; pendingAmount: number; rate: number; multiplier: number; periodText: string; fine: number; }[] = [];

  for (let i = 1; i <= monthsElapsed; i++) {
    const inst = installments.find(x => x.monthIndex === i);
    const currentMonthRowInfo = rows[i - 1];

    const monthDate = new Date(member.startDate);
    monthDate.setMonth(monthDate.getMonth() + (i - 1));
    const dueDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), settings.lateFine.dueDate);

    if (now > dueDate) {
      let multiplier = 0;
      if (settings.lateFine.period === 'DAILY') {
        const diffTime = Math.abs(now.getTime() - dueDate.getTime());
        multiplier = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      } else if (settings.lateFine.period === 'MONTHLY') {
        const diffMonths = (now.getFullYear() - dueDate.getFullYear()) * 12 + (now.getMonth() - dueDate.getMonth());
        multiplier = diffMonths > 0 ? diffMonths : 1;
      } else if (settings.lateFine.period === 'YEARLY') {
        const diffYears = Math.ceil(((now.getFullYear() - dueDate.getFullYear()) * 12 + (now.getMonth() - dueDate.getMonth())) / 12);
        multiplier = diffYears > 0 ? diffYears : 1;
      }

      let monthDue = 0;

      // 1. RD Late Fine Base
      if (i > maxPaidMonthIndex) {
        monthDue += member.monthlyContribution;
        
        // 2. Loan Interest Late Fine Base
        if (currentMonthRowInfo && currentMonthRowInfo.expectedInterest > currentMonthRowInfo.interestPaid) {
          monthDue += (currentMonthRowInfo.expectedInterest - currentMonthRowInfo.interestPaid);
        }
      }

      // Calculate percentage based fine
      if (monthDue > 0 && settings.lateFine.rate > 0) {
        const feeForMonth = monthDue * (settings.lateFine.rate / 100) * multiplier;
        calculatedLateFee += feeForMonth;
        
        const periodText = settings.lateFine.period === 'DAILY' ? 'days' : settings.lateFine.period === 'MONTHLY' ? 'months' : 'years';
        lateFeeBreakdown.push({
          month: monthDate.toLocaleString('default', { month: 'short', year: 'numeric' }),
          pendingAmount: monthDue,
          rate: settings.lateFine.rate,
          multiplier: multiplier,
          periodText: periodText,
          fine: Math.round(feeForMonth)
        });
      }
    }
  }

  const totalAmountDueThisMonth = pendingRDAmount + remainingInterestDue + calculatedLateFee;

  // Settlement Logic
  const isCompleted = totalSaved >= (member.tenureMonths * member.monthlyContribution);
  const isSettlementMode = isCompleted || closeDateStr !== null;

  const n = member.tenureMonths;

  // New exact bonus calculation
  const rdCalcResult = useMemo(() => {
    return calculateRdInterest(
      installments,
      member.tenureMonths,
      member.monthlyContribution,
      member.expectedMaturityAmount,
      member.startDate,
      isCompleted,
      monthsElapsed,
      closeDateStr
    );
  }, [installments, member, isCompleted, monthsElapsed, closeDateStr]);

  const earnedBonus = Math.round(rdCalcResult.totalInterest);
  const activeSavingsAmount = Math.round(rdCalcResult.totalContribution);

  const totalToPayMember = (includeSavings ? activeSavingsAmount : 0) + (includeBonus ? earnedBonus : 0);
  const totalDeductions = (includeLoan ? currentLoanBal : 0) + (includeInterest ? remainingInterestDue : 0) + (includeLateFee ? calculatedLateFee : 0);
  const netSettlement = totalToPayMember - totalDeductions;

  const minMonthDate = new Date(member.startDate);
  const minMonth = `${minMonthDate.getFullYear()}-${String(minMonthDate.getMonth() + 1).padStart(2, '0')}`;
  const maxMonthDate = new Date(minMonthDate.getFullYear(), minMonthDate.getMonth() + member.tenureMonths - 1, 1);
  const maxMonth = `${maxMonthDate.getFullYear()}-${String(maxMonthDate.getMonth() + 1).padStart(2, '0')}`;

  const whatsappMsgRaw = settings?.whatsappTemplate || t('whatsappDueMessage');
  const whatsappMsg = whatsappMsgRaw
    .replace('{name}', member.name)
    .replace('{totalDue}', totalAmountDueThisMonth.toString())
    .replace('{rdDue}', pendingRDAmount.toString())
    .replace('{loanPrincipal}', currentLoanBal.toString())
    .replace('{loanInterestDue}', remainingInterestDue.toString())
    .replace('{lateFee}', calculatedLateFee.toString());

  const whatsappUrl = `https://wa.me/91${member.mobile}?text=${encodeURIComponent(whatsappMsg)}`;

  const getPendingRDAmtForMonth = (targetMonthIndex: number, isEditing: boolean, editingRdAmount: number) => {
    let pending = 0;
    for (let i = 1; i <= targetMonthIndex; i++) {
      const inst = installments.find(x => x.monthIndex === i);
      let paid = inst ? inst.amountPaid : 0;
      if (isEditing && i === targetMonthIndex) {
        paid = editingRdAmount;
      }
      pending += (member.monthlyContribution - paid);
    }
    return Math.max(0, pending);
  };

  const getPendingArrearsAtEndOfMonth = (monthIndex: number) => {
    if (monthIndex < 1) return { rd: 0, int: 0 };

    // RD Pending
    const expectedRD = monthIndex * member.monthlyContribution;
    const paidRD = rows.slice(0, monthIndex).reduce((sum, r) => sum + r.rdAmount, 0);
    const pendingRD = Math.max(0, expectedRD - paidRD);

    // Interest Pending
    const row = rows[monthIndex - 1];
    const pendingInt = Math.max(0, row.expectedInterest - row.interestPaid);

    return { rd: pendingRD, int: pendingInt };
  };

  const getLateFeeHintForMonth = (targetMonthIndex: number) => {
    // Penalty for month T is calculated on the total arrears pending at the end of month T-1.
    // Late fees are not compounded or carried forward if unpaid. They are recalculated freshly.
    const arrears = getPendingArrearsAtEndOfMonth(targetMonthIndex - 1);
    const totalPending = arrears.rd + arrears.int;

    if (totalPending > 0) {
      return Math.round((totalPending * settings.lateFine.rate) / 100);
    }
    return 0;
  };

  return (
    <div className="profile-container">
      {/* Sticky Header & Dashboards Section */}
      <div className="profile-header-section">
        {/* Header Section */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <button className="btn" onClick={onBack} style={{ background: '#fff', border: '1px solid var(--border)', marginTop: '4px' }}>
              <ArrowLeft size={18} />
            </button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: `calc(24px * var(--text-scale, 1))`, fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                  {member.name} <span style={{ fontSize: `calc(16px * var(--text-scale, 1))`, color: 'var(--primary)' }}>(#{member.memberNumber})</span>
                </h2>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={() => {
                    setProfileFormData({ name: member.name, mobile: member.mobile || '', address: member.address || '', tenureMonths: member.tenureMonths || 72, expectedMaturityAmount: member.expectedMaturityAmount || 0 });
                    setIsEditingProfile(true);
                  }} className="btn" style={{ background: 'transparent', padding: '4px', border: 'none' }} title="Edit Profile">
                    <Edit2 size={16} color="var(--primary)" />
                  </button>
                  <button onClick={() => {
                    setDeleteConfirmationName('');
                    setIsDeletingProfile(true);
                  }} className="btn" style={{ background: 'transparent', padding: '4px', border: 'none' }} title="Delete Member">
                    <Trash2 size={16} color="var(--danger)" />
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-main)', fontWeight: 500 }}>
                  {member.mobile ? (
                    <a href={`tel:${member.mobile}`} style={{ display: 'flex', alignItems: 'center', color: 'var(--primary)' }} title="Call">
                      <Phone size={14} />
                    </a>
                  ) : (
                    <Phone size={14} color="var(--text-muted)" />
                  )}
                  {member.mobile || 'N/A'}
                  {member.mobile && (
                    <a href={whatsappUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', color: '#25D366', marginLeft: '4px' }} title="Send Dues via WhatsApp">
                      <WhatsAppIcon size={16} />
                    </a>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                  <MapPin size={14} />
                  {member.address || 'No Address Provided'}
                </div>
              </div>
            </div>
          </div>
          {!isCompleted && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: closeDateStr ? '#fff0f0' : '#f8f9fa', border: `1px solid ${closeDateStr ? 'var(--danger)' : 'var(--border)'}`, borderRadius: '8px' }}>
              {closeDateStr ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: `calc(13px * var(--text-scale, 1))`, fontWeight: 600, color: pendingRDMonths > 0 ? 'var(--danger)' : 'var(--success)' }}>Closed on:</span>
                  <input
                    type="month"
                    value={closeDateStr}
                    min={minMonth}
                    max={maxMonth}
                    onChange={e => setCloseDateStr(e.target.value)}
                    style={{ padding: '4px 8px', border: '1px solid var(--danger)', borderRadius: '4px', fontSize: `calc(13px * var(--text-scale, 1))` }}
                  />
                  <button onClick={() => setCloseDateStr(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    const d = new Date();
                    setCloseDateStr(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
                  }}
                  className="btn"
                  style={{ fontSize: `calc(13px * var(--text-scale, 1))`, fontWeight: 600, color: 'var(--text-main)', background: '#fff', border: '1px solid var(--border)', padding: '6px 12px' }}
                >
                  {t('prematureClose')}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Dashboards Section */}
        {(() => {
          const sumRD = totalSaved;
          const sumLoanDisbursed = rows.reduce((sum, r) => sum + (r.loanDisbursed || 0), 0);
          const sumPrincipalPaid = rows.reduce((sum, r) => sum + (r.principalPaid || 0), 0);
          const sumInterestPaidDash = rows.reduce((sum, r) => sum + (r.interestPaid || 0), 0);
          const sumLateFeeDash = rows.reduce((sum, r) => sum + (r.lateFee || 0), 0);
          
          const totalEarningsReceived = sumInterestPaidDash + sumLateFeeDash;
          const totalCashReceived = sumRD + sumPrincipalPaid + sumInterestPaidDash + sumLateFeeDash;

          let netProfitLossValue = 0;
          let totalCashGiven = 0;
          let signedSettlementPaid = 0;
          
          if (isSettlementMode) {
            const settlementPaid = Number(settlementData.amountPaid) || 0;
            signedSettlementPaid = netSettlement >= 0 ? settlementPaid : -settlementPaid;
            totalCashGiven = sumLoanDisbursed + signedSettlementPaid;
            netProfitLossValue = totalCashReceived - totalCashGiven;
          } else {
            netProfitLossValue = totalEarningsReceived - earnedBonus;
          }

          return (
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>

          {/* RD Dashboard */}
          <div className="card" style={{ flex: '1 1 300px', padding: '16px', borderLeft: '4px solid var(--primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--primary)' }}>
              <PiggyBank size={18} />
              <strong style={{ fontSize: `calc(14px * var(--text-scale, 1))` }}>{t('rdDetails')}</strong>
              <div title={t('rdTooltip')} style={{ cursor: 'help', display: 'flex', marginLeft: 'auto' }}>
                <Info size={16} color="var(--primary)" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <div style={{ fontSize: `calc(11px * var(--text-scale, 1))`, color: 'var(--text-muted)' }}>{t('monthlySavingDash')}</div>
                <div style={{ fontWeight: 600, fontSize: `calc(13px * var(--text-scale, 1))` }}>₹{formatCurrency(member.monthlyContribution)}</div>
              </div>
              <div>
                <div style={{ fontSize: `calc(11px * var(--text-scale, 1))`, color: 'var(--text-muted)' }}>{t('monthsPaidDash')}</div>
                <div style={{ fontWeight: 600, fontSize: `calc(13px * var(--text-scale, 1))` }}>{paidMonthsCount} / {member.tenureMonths}</div>
              </div>
              <div>
                <div style={{ fontSize: `calc(11px * var(--text-scale, 1))`, color: 'var(--text-muted)' }}>{t('savedSoFar')}</div>
                <div style={{ fontWeight: 600, fontSize: `calc(13px * var(--text-scale, 1))`, color: 'var(--success)' }}>₹{formatCurrency(totalSaved)}</div>
              </div>
              <div>
                <div style={{ fontSize: `calc(11px * var(--text-scale, 1))`, color: 'var(--text-muted)' }}>{t('bonusEarned')}</div>
                <div style={{ fontWeight: 600, fontSize: `calc(13px * var(--text-scale, 1))`, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  + ₹{formatCurrency(earnedBonus)}
                  <button onClick={() => setShowCalculationModal(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'var(--text-muted)' }}>
                    <Info size={14} />
                  </button>
                </div>
              </div>
              <div style={{ gridColumn: '1 / span 2', paddingTop: '8px', borderTop: '1px dashed var(--border)' }}>
                <div style={{ fontSize: `calc(11px * var(--text-scale, 1))`, color: 'var(--text-muted)' }}>{t('currentValueVsMaturity')}</div>
                <div style={{ fontWeight: 700, fontSize: `calc(16px * var(--text-scale, 1))`, color: 'var(--primary)' }}>
                  ₹{formatCurrency(Math.round(activeSavingsAmount + earnedBonus))} <span style={{ fontSize: `calc(13px * var(--text-scale, 1))`, color: 'var(--text-muted)', fontWeight: 500 }}>/ ₹{formatCurrency(member.expectedMaturityAmount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Loan Dashboard */}
          <div className="card" style={{ flex: '1 1 300px', padding: '16px', borderLeft: '4px solid var(--danger)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: pendingRDMonths > 0 ? 'var(--danger)' : 'var(--success)' }}>
              <Wallet size={18} />
              <strong style={{ fontSize: `calc(14px * var(--text-scale, 1))` }}>{t('loanDetails')}</strong>
              <div title={t('loanTooltip')} style={{ cursor: 'help', display: 'flex', marginLeft: 'auto' }}>
                <Info size={16} color="var(--danger)" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
              <div>
                <div style={{ fontSize: `calc(11px * var(--text-scale, 1))`, color: 'var(--text-muted)' }}>{t('remainingPrincipal')}</div>
                <div style={{ fontWeight: 600, fontSize: `calc(14px * var(--text-scale, 1))`, color: currentLoanBal > 0 ? 'var(--danger)' : 'var(--text-main)' }}>₹{formatCurrency(currentLoanBal)}</div>
              </div>
              <div>
                <div style={{ fontSize: `calc(11px * var(--text-scale, 1))`, color: 'var(--text-muted)' }}>{t('interestDueDash')}</div>
                <div style={{ fontWeight: 600, fontSize: `calc(14px * var(--text-scale, 1))`, color: remainingInterestDue > 0 ? 'var(--danger)' : 'var(--text-main)' }}>₹{formatCurrency(remainingInterestDue)}</div>
              </div>
              <div>
                <div style={{ fontSize: `calc(11px * var(--text-scale, 1))`, color: 'var(--text-muted)' }}>{t('lblLateFee')}</div>
                <div style={{ fontWeight: 600, fontSize: `calc(14px * var(--text-scale, 1))`, color: calculatedLateFee > 0 ? 'var(--danger)' : 'var(--text-main)' }}>₹{formatCurrency(calculatedLateFee)}</div>
              </div>
              <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '12px' }}>
                <div style={{ fontSize: `calc(11px * var(--text-scale, 1))`, color: 'var(--text-muted)' }}>{t('totalAmountToPay')}</div>
                <div style={{ fontWeight: 700, fontSize: `calc(15px * var(--text-scale, 1))`, color: (currentLoanBal + remainingInterestDue + calculatedLateFee) > 0 ? 'var(--danger)' : 'var(--text-main)' }}>₹{formatCurrency(currentLoanBal + remainingInterestDue + calculatedLateFee)}</div>
              </div>
            </div>
          </div>

          {/* Due / Settlement Dashboard */}
          {isSettlementMode ? (
            <div className="card" style={{ flex: '1 1 300px', padding: '16px', borderLeft: '4px solid var(--danger)', backgroundColor: '#fff0f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: pendingRDMonths > 0 ? 'var(--danger)' : 'var(--success)' }}>
                <AlertCircle size={18} />
                <strong style={{ fontSize: `calc(14px * var(--text-scale, 1))` }}>{t('finalSettlement')} {closeDateStr ? '(Premature)' : '(Completed)'}</strong>
                <div title={t('settlementTooltip')} style={{ cursor: 'help', display: 'flex', marginLeft: 'auto' }}>
                  <Info size={16} color="var(--danger)" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: `calc(11px * var(--text-scale, 1))`, color: 'var(--text-muted)' }}>
                    {t('totalAmountToPayMember')}
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginLeft: '6px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', opacity: includeSavings ? 1 : 0.5 }}>
                        <input type="checkbox" checked={includeSavings} onChange={(e) => setIncludeSavings(e.target.checked)} style={{ accentColor: 'var(--success)' }} />
                        {t('lblSavings')}
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', opacity: includeBonus ? 1 : 0.5 }}>
                        <input type="checkbox" checked={includeBonus} onChange={(e) => setIncludeBonus(e.target.checked)} style={{ accentColor: 'var(--success)' }} />
                        {t('lblBonus')}
                      </label>
                    </div>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: `calc(15px * var(--text-scale, 1))`, color: (includeSavings || includeBonus) ? 'var(--success)' : 'var(--text-muted)' }}>
                    ₹{formatCurrency(totalToPayMember)}
                  </div>
                  <div style={{ fontSize: `calc(11px * var(--text-scale, 1))`, color: 'var(--text-muted)', marginTop: '2px', fontWeight: 500 }}>
                    (₹{formatCurrency(activeSavingsAmount)} + ₹{formatCurrency(earnedBonus)})
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: `calc(11px * var(--text-scale, 1))`, color: 'var(--text-muted)' }}>
                    {t('totalDeductions')}
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginLeft: '6px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', opacity: includeLoan ? 1 : 0.5 }}>
                        <input type="checkbox" checked={includeLoan} onChange={(e) => setIncludeLoan(e.target.checked)} style={{ accentColor: 'var(--danger)' }} />
                        {t('lblLoan')}
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', opacity: includeInterest ? 1 : 0.5 }}>
                        <input type="checkbox" checked={includeInterest} onChange={(e) => setIncludeInterest(e.target.checked)} style={{ accentColor: 'var(--danger)' }} />
                        {t('lblInterest')}
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', opacity: includeLateFee ? 1 : 0.5 }}>
                        <input type="checkbox" checked={includeLateFee} onChange={(e) => setIncludeLateFee(e.target.checked)} style={{ accentColor: 'var(--danger)' }} />
                        {t('lblLateFee')}
                      </label>
                    </div>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: `calc(15px * var(--text-scale, 1))`, color: (includeLoan || includeInterest || includeLateFee) ? 'var(--danger)' : 'var(--text-muted)' }}>
                    ₹{formatCurrency(totalDeductions)}
                  </div>
                  <div style={{ fontSize: `calc(11px * var(--text-scale, 1))`, color: 'var(--text-muted)', marginTop: '2px', fontWeight: 500 }}>
                    (₹{formatCurrency(currentLoanBal)} + ₹{formatCurrency(remainingInterestDue)} + ₹{formatCurrency(calculatedLateFee)})
                  </div>
                </div>
                <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '16px' }}>
                  <div style={{ fontSize: `calc(11px * var(--text-scale, 1))`, color: 'var(--text-muted)' }}>{t('netSettlement')}</div>
                  <div style={{ fontWeight: 700, fontSize: `calc(20px * var(--text-scale, 1))`, color: netSettlement >= 0 ? 'var(--primary)' : 'var(--danger)' }}>
                    {netSettlement < 0 ? '-' : ''}₹{formatCurrency(Math.abs(netSettlement))}
                  </div>
                  <div style={{ fontSize: `calc(12px * var(--text-scale, 1))`, marginTop: '4px', color: netSettlement >= 0 ? 'var(--primary)' : 'var(--danger)', fontWeight: 500 }}>
                    {netSettlement >= 0 ? t('wePay') : t('memberPays')}
                  </div>
                </div>
              </div>
              
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed var(--danger)' }}>
                <div style={{ fontSize: `calc(13px * var(--text-scale, 1))`, fontWeight: 600, color: pendingRDMonths > 0 ? 'var(--danger)' : 'var(--success)', marginBottom: '8px' }}>
                  {t('settlementPaymentDetails')}
                </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: `calc(11px * var(--text-scale, 1))`, color: 'var(--text-muted)', marginBottom: '4px' }}>{t('datePaid')}</div>
                    <input 
                      type="date" 
                      className="input-compact" 
                      value={settlementData.date} 
                      onChange={(e) => handleSaveSettlement('date', e.target.value)}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: `calc(11px * var(--text-scale, 1))`, color: 'var(--text-muted)', marginBottom: '4px' }}>
                      {netSettlement >= 0 ? t('amountPaidToMember') : t('amountPaidToUs')}
                    </div>
                    <input 
                      type="number" 
                      className="input-compact" 
                      value={settlementData.amountPaid} 
                      onChange={(e) => handleSaveSettlement('amountPaid', e.target.value)}
                      placeholder="Enter amount"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card" style={{ flex: '1 1 300px', padding: '16px', borderLeft: '4px solid var(--warning)', backgroundColor: '#fffdf5' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#b28900' }}>
                <AlertCircle size={18} />
                <strong style={{ fontSize: `calc(14px * var(--text-scale, 1))` }}>{t('currentDues')} ({t('upTo')} {now.toLocaleString('en-US', { month: 'short', year: 'numeric' })})</strong>
                <div title={t('duesTooltip')} style={{ cursor: 'help', display: 'flex', marginLeft: 'auto' }}>
                  <Info size={16} color="#b28900" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: `calc(11px * var(--text-scale, 1))`, color: 'var(--text-muted)' }}>{t('pendingRDM')}
                      <div style={{ color: pendingRDMonths > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 'bold', fontSize: `calc(14px * var(--text-scale, 1))`, marginTop: '4px' }}>
                        ({pendingRDMonths} {t('months')})
                      </div></div>
                  <div style={{ fontWeight: 600, fontSize: `calc(14px * var(--text-scale, 1))` }}>₹{formatCurrency(pendingRDAmount)}</div>
                </div>
                <div>
                  <div style={{ fontSize: `calc(11px * var(--text-scale, 1))`, color: 'var(--text-muted)' }}>{t('pendingInterest')}</div>
                  <div style={{ fontWeight: 600, fontSize: `calc(14px * var(--text-scale, 1))` }}>₹{formatCurrency(remainingInterestDue)}</div>
                </div>
                <div>
                  <div style={{ fontSize: `calc(11px * var(--text-scale, 1))`, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {t('lateFee')}
                    <button 
                      onClick={() => setShowLateFeeTooltip(true)} 
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'var(--text-muted)' }}
                    >
                      <Info size={12} />
                    </button>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: `calc(14px * var(--text-scale, 1))` }}>₹{formatCurrency(calculatedLateFee)}</div>
                </div>
                <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '16px' }}>
                  <div style={{ fontSize: `calc(11px * var(--text-scale, 1))`, color: 'var(--text-muted)' }}>{t('totalAmountToPay')}</div>
                  <div style={{ fontWeight: 700, fontSize: `calc(18px * var(--text-scale, 1))`, color: pendingRDMonths > 0 ? 'var(--danger)' : 'var(--success)' }}>₹{formatCurrency(totalAmountDueThisMonth)}</div>
                </div>
              </div>
            </div>
          )}

          {/* Transactions / P&L Dashboard */}
          <div className="card" style={{ flex: '1 1 300px', padding: '16px', borderLeft: `4px solid ${netProfitLossValue >= 0 ? 'var(--success)' : 'var(--danger)'}`, backgroundColor: netProfitLossValue >= 0 ? '#f6ffed' : '#fff0f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: netProfitLossValue >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              <Wallet size={18} />
              <strong style={{ fontSize: `calc(14px * var(--text-scale, 1))` }}>{t('transactionsCardTitle')}</strong>
              <div title={isSettlementMode ? t('transactionsCardTooltipSettled') : t('transactionsCardTooltipActive')} style={{ cursor: 'help', display: 'flex', marginLeft: 'auto' }}>
                <Info size={16} color={netProfitLossValue >= 0 ? 'var(--success)' : 'var(--danger)'} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '12px' }}>
              {!isSettlementMode ? (
                <>
                  <div>
                    <div style={{ fontSize: `calc(11px * var(--text-scale, 1))`, color: 'var(--text-muted)' }}>{t('totalEarningsReceived')}</div>
                    <div style={{ fontWeight: 600, fontSize: `calc(14px * var(--text-scale, 1))`, color: 'var(--text-main)' }}>
                      ₹{formatCurrency(totalEarningsReceived)}
                      <div style={{ fontSize: `calc(10px * var(--text-scale, 1))`, color: 'var(--text-muted)', fontWeight: 500, marginTop: '2px' }}>
                        (₹{formatCurrency(sumInterestPaidDash)} + ₹{formatCurrency(sumLateFeeDash)})
                      </div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: `calc(11px * var(--text-scale, 1))`, color: 'var(--text-muted)' }}>{t('bonusGiven')}</div>
                    <div style={{ fontWeight: 600, fontSize: `calc(14px * var(--text-scale, 1))`, color: 'var(--text-main)' }}>₹{formatCurrency(earnedBonus)}</div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <div style={{ fontSize: `calc(11px * var(--text-scale, 1))`, color: 'var(--text-muted)' }}>{t('totalCashReceivedPL')}</div>
                    <div style={{ fontWeight: 600, fontSize: `calc(14px * var(--text-scale, 1))`, color: 'var(--text-main)' }}>
                      ₹{formatCurrency(totalCashReceived)}
                      <div style={{ fontSize: `calc(10px * var(--text-scale, 1))`, color: 'var(--text-muted)', fontWeight: 500, marginTop: '2px' }}>
                        (RD+Repayments+Int+Fine)
                      </div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: `calc(11px * var(--text-scale, 1))`, color: 'var(--text-muted)' }}>{t('totalCashGivenPL')}</div>
                    <div style={{ fontWeight: 600, fontSize: `calc(14px * var(--text-scale, 1))`, color: 'var(--text-main)' }}>
                      ₹{formatCurrency(totalCashGiven)}
                      <div style={{ fontSize: `calc(10px * var(--text-scale, 1))`, color: 'var(--text-muted)', fontWeight: 500, marginTop: '2px' }}>
                        ({sumLoanDisbursed ? 'Loan + ' : ''}Settlement)
                      </div>
                    </div>
                  </div>
                </>
              )}
              <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '12px' }}>
                <div style={{ fontSize: `calc(11px * var(--text-scale, 1))`, color: 'var(--text-muted)', fontWeight: 600 }}>{netProfitLossValue >= 0 ? t('netProfit') : t('netLoss')}</div>
                <div style={{ fontWeight: 700, fontSize: `calc(18px * var(--text-scale, 1))`, color: netProfitLossValue >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {netProfitLossValue < 0 ? '-' : '+'}₹{formatCurrency(Math.abs(netProfitLossValue))}
                </div>
              </div>
            </div>
          </div>

        </div>
          );
        })()}
      </div>

      {/* Table Column Sums */}
      {(() => {
        const sumLoanDisbursed = rows.reduce((sum, r) => sum + (r.loanDisbursed || 0), 0);
        const sumPrincipalPaid = rows.reduce((sum, r) => sum + (r.principalPaid || 0), 0);
        const sumInterestPaid = rows.reduce((sum, r) => sum + (r.interestPaid || 0), 0);
        const sumLateFee = rows.reduce((sum, r) => sum + (r.lateFee || 0), 0);
        const sumTotalPaid = rows.reduce((sum, r) => sum + (r.totalPaid || 0), 0);

        return (
          <div className="profile-table-container" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="table-wrapper" style={{ flex: 1, maxHeight: 'none' }}>
              <table className="table" style={{ fontSize: `calc(13px * var(--text-scale, 1))` }}>
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>
                      {t('month')}
                      <div style={{ fontSize: `calc(11px * var(--text-scale, 1))`, color: 'var(--primary)', marginTop: '4px', fontWeight: 700 }}>{paidMonthsCount}</div>
                    </th>
                    <th style={{ textAlign: 'right', width: '90px', wordWrap: 'break-word' }}>
                      {t('monthlyContribution')}
                      <div style={{ fontSize: `calc(11px * var(--text-scale, 1))`, color: 'var(--success)', marginTop: '4px', fontWeight: 700 }}>(₹{formatCurrency(totalSaved)})</div>
                    </th>
                    <th style={{ width: '150px', wordWrap: 'break-word' }}>
                      {t('depositorDetails')}
                    </th>
                    <th style={{ textAlign: 'right', width: '90px', wordWrap: 'break-word' }}>
                      {t('loanOut')} (₹)
                      <div style={{ fontSize: `calc(11px * var(--text-scale, 1))`, color: pendingRDMonths > 0 ? 'var(--danger)' : 'var(--success)', marginTop: '4px', fontWeight: 700 }}>{sumLoanDisbursed > 0 ? `(₹${formatCurrency(sumLoanDisbursed)})` : '-'}</div>
                    </th>
                    <th style={{ textAlign: 'right', width: '90px', wordWrap: 'break-word' }}>
                      {t('principalRepayment')}
                      <div style={{ fontSize: `calc(11px * var(--text-scale, 1))`, color: 'var(--primary)', marginTop: '4px', fontWeight: 700 }}>{sumPrincipalPaid > 0 ? `(₹${formatCurrency(sumPrincipalPaid)})` : '-'}</div>
                    </th>
                    <th style={{ textAlign: 'right', width: '90px', wordWrap: 'break-word' }}>
                      {t('interestOnLoan')}
                      <div style={{ fontSize: `calc(11px * var(--text-scale, 1))`, color: 'var(--primary)', marginTop: '4px', fontWeight: 700 }}>{sumInterestPaid > 0 ? `(₹${formatCurrency(sumInterestPaid)})` : '-'}</div>
                    </th>
                    <th style={{ textAlign: 'right', width: '70px', wordWrap: 'break-word' }}>
                      {t('lateFee')}
                      <div style={{ fontSize: `calc(11px * var(--text-scale, 1))`, color: pendingRDMonths > 0 ? 'var(--danger)' : 'var(--success)', marginTop: '4px', fontWeight: 700 }}>{sumLateFee > 0 ? `(₹${formatCurrency(sumLateFee)})` : '-'}</div>
                    </th>
                    <th style={{ textAlign: 'right', width: '90px', wordWrap: 'break-word' }}>
                      {t('totalPaid')}
                      <div style={{ fontSize: `calc(11px * var(--text-scale, 1))`, color: 'var(--success)', marginTop: '4px', fontWeight: 700 }}>(₹{formatCurrency(sumTotalPaid)})</div>
                    </th>
                    <th style={{ textAlign: 'right', width: '90px', wordWrap: 'break-word' }}>
                      {t('remainingLoan')}
                      <div style={{ fontSize: `calc(11px * var(--text-scale, 1))`, color: pendingRDMonths > 0 ? 'var(--danger)' : 'var(--success)', marginTop: '4px', fontWeight: 700 }}>{currentLoanBal > 0 ? `(₹${formatCurrency(currentLoanBal)})` : '-'}</div>
                    </th>
                    <th style={{ width: '70px', fontSize: `calc(11px * var(--text-scale, 1))`, textAlign: 'center', lineHeight: '1.2' }}>{t('updatedAt')}</th>
                    <th style={{ width: '100px', textAlign: 'center', verticalAlign: 'top' }}>{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => {
                    const isEditing = editRowIdx === idx;
                    const isCurrentMonth = idx === Math.max(0, monthsElapsed - 1);
                    const isTarget = targetMonthIndex ? r.monthIndex === targetMonthIndex : false;

                    return (
                      <tr
                        key={r.monthIndex}
                        className="hoverable-row"
                        ref={isTarget ? targetRowRef : (isCurrentMonth && !targetMonthIndex ? currentMonthRowRef : null)}
                        style={{
                          ...(isCurrentMonth ? { backgroundColor: '#f0f7ff', borderLeft: '4px solid var(--primary)' } : {}),
                          ...(isTarget ? { backgroundColor: '#fffbe6', outline: '2px solid var(--warning)', outlineOffset: '-2px' } : {}),
                          ...(isEditing ? { backgroundColor: '#f6ffed', outline: '2px solid var(--success)', outlineOffset: '-2px' } : {})
                        }}
                      >
                        <td>
                          <div style={{ fontWeight: 600 }}>
                            {r.monthStr}
                            {isCurrentMonth && <span style={{ fontSize: `calc(10px * var(--text-scale, 1))`, color: 'var(--primary)', marginLeft: '6px', padding: '2px 6px', background: '#e3f2fd', borderRadius: '10px' }}>Current</span>}
                          </div>
                          <div style={{ fontSize: `calc(11px * var(--text-scale, 1))`, color: 'var(--text-muted)' }}>M-{r.monthIndex}</div>
                        </td>

                        {isEditing ? (
                          <>
                            <td style={{ textAlign: 'right' }}>
                              <input id={`rdAmount-${r.monthIndex}`} type="number" className="input-compact" value={rowEdits.rdAmount === 0 ? '' : rowEdits.rdAmount} onChange={e => setRowEdits({ ...rowEdits, rdAmount: Number(e.target.value) })} onKeyDown={e => handleKeyDown(e, 'rdAmount', r.monthIndex)} style={{ width: '80px', textAlign: 'right' }} />
                              {getPendingRDAmtForMonth(r.monthIndex, isEditing, rowEdits.rdAmount) > 0 && (
                                <div 
                                  onClick={() => {
                                    const due = getPendingRDAmtForMonth(r.monthIndex, isEditing, rowEdits.rdAmount);
                                    if (due > 0) setRowEdits({ ...rowEdits, rdAmount: rowEdits.rdAmount + due });
                                  }}
                                  style={{ fontSize: `calc(10px * var(--text-scale, 1))`, color: 'var(--warning)', marginTop: '4px', whiteSpace: 'nowrap', cursor: 'pointer' }}
                                  title="Click to autofill"
                                >
                                  Due: ₹{getPendingRDAmtForMonth(r.monthIndex, isEditing, rowEdits.rdAmount)}
                                </div>
                              )}
                            </td>
                            <td style={{ textAlign: 'left' }}>
                              <input 
                                id={`depositorDetails-${r.monthIndex}`} 
                                type="text" 
                                className="input-compact" 
                                value={rowEdits.depositorDetails} 
                                onChange={e => setRowEdits({ ...rowEdits, depositorDetails: e.target.value })} 
                                onKeyDown={e => handleKeyDown(e, 'depositorDetails', r.monthIndex)}
                                placeholder="Name / Details..."
                                style={{ width: '130px', textAlign: 'left' }} 
                              />
                            </td>
                            <td style={{ textAlign: 'right' }}><input id={`loanDisbursed-${r.monthIndex}`} type="number" className="input-compact" value={rowEdits.loanDisbursed === 0 ? '' : rowEdits.loanDisbursed} onChange={e => setRowEdits({ ...rowEdits, loanDisbursed: Number(e.target.value) })} onKeyDown={e => handleKeyDown(e, 'loanDisbursed', r.monthIndex)} style={{ width: '80px', textAlign: 'right' }} /></td>
                            <td style={{ textAlign: 'right' }}><input id={`principalPaid-${r.monthIndex}`} type="number" className="input-compact" value={rowEdits.principalPaid === 0 ? '' : rowEdits.principalPaid} onChange={e => setRowEdits({ ...rowEdits, principalPaid: Number(e.target.value) })} onKeyDown={e => handleKeyDown(e, 'principalPaid', r.monthIndex)} style={{ width: '80px', textAlign: 'right' }} /></td>
                            <td style={{ textAlign: 'right' }}>
                              <input id={`interestPaid-${r.monthIndex}`} type="number" className="input-compact" value={rowEdits.interestPaid === 0 ? '' : rowEdits.interestPaid} onChange={e => setRowEdits({ ...rowEdits, interestPaid: Number(e.target.value) })} onKeyDown={e => handleKeyDown(e, 'interestPaid', r.monthIndex)} style={{ width: '80px', textAlign: 'right' }} />
                              {r.expectedInterest > 0 && rowEdits.interestPaid < r.expectedInterest && (
                                <div 
                                  onClick={() => {
                                    const due = r.expectedInterest - rowEdits.interestPaid;
                                    if (due > 0) setRowEdits({ ...rowEdits, interestPaid: rowEdits.interestPaid + due });
                                  }}
                                  style={{ fontSize: `calc(11px * var(--text-scale, 1))`, color: 'var(--warning)', marginTop: '2px', cursor: 'pointer' }}
                                  title="Click to autofill"
                                >
                                  Due: ₹{formatCurrency(r.expectedInterest - rowEdits.interestPaid)}
                                </div>
                              )}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <input id={`lateFee-${r.monthIndex}`} type="number" className="input-compact" value={rowEdits.lateFee === 0 ? '' : rowEdits.lateFee} onChange={e => setRowEdits({ ...rowEdits, lateFee: Number(e.target.value) })} onKeyDown={e => handleKeyDown(e, 'lateFee', r.monthIndex)} style={{ width: '60px', textAlign: 'right' }} />
                              {getLateFeeHintForMonth(r.monthIndex) > 0 && (
                                <div 
                                  onClick={() => {
                                    const due = getLateFeeHintForMonth(r.monthIndex);
                                    if (due > 0) setRowEdits({ ...rowEdits, lateFee: due });
                                  }}
                                  style={{ fontSize: `calc(10px * var(--text-scale, 1))`, color: 'var(--text-muted)', marginTop: '4px', whiteSpace: 'nowrap', cursor: 'pointer' }}
                                  title="Click to autofill"
                                >
                                  Due: ₹{getLateFeeHintForMonth(r.monthIndex)}
                                </div>
                              )}
                            </td>
                            <td style={{ fontWeight: 600, textAlign: 'right' }}>₹{formatCurrency(rowEdits.rdAmount + rowEdits.principalPaid + rowEdits.interestPaid + rowEdits.lateFee)}</td>
                            <td style={{ fontWeight: 600, textAlign: 'right', color: r.loanBalAfter > 0 ? 'inherit' : 'var(--text-muted)' }}>{r.loanBalAfter > 0 ? `₹${formatCurrency(r.loanBalAfter)}` : '-'}</td>
                            <td style={{ fontSize: `calc(10px * var(--text-scale, 1))`, color: 'var(--text-muted)', textAlign: 'center', lineHeight: '1.2' }}>
                              {r.updatedAt ? (
                                <>
                                  <div style={{ whiteSpace: 'nowrap' }}>{new Date(r.updatedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                                  <div style={{ whiteSpace: 'nowrap' }}>{new Date(r.updatedAt).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
                                </>
                              ) : '-'}
                            </td>
                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                <button className="btn btn-primary" style={{ padding: '4px 8px' }} onClick={() => handleSaveRow(r.monthIndex)}>
                                  <Save size={14} />
                                </button>
                                <button className="btn btn-secondary" style={{ padding: '4px 8px', border: '1px solid var(--border)', background: '#fff' }} onClick={() => setEditRowIdx(null)}>
                                  <X size={14} />
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td style={{ textAlign: 'right', color: r.rdAmount > 0 ? 'var(--success)' : 'var(--text-muted)' }}>{r.rdAmount > 0 ? `₹${formatCurrency(r.rdAmount)}` : '-'}</td>
                            <td style={{ textAlign: 'left', fontSize: `calc(11px * var(--text-scale, 1))`, color: 'var(--text-muted)' }}>{r.depositorDetails || '-'}</td>
                            <td style={{ textAlign: 'right', color: r.loanDisbursed > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>{r.loanDisbursed > 0 ? `₹${formatCurrency(r.loanDisbursed)}` : '-'}</td>
                            <td style={{ textAlign: 'right', color: r.principalPaid > 0 ? 'var(--primary)' : 'var(--text-muted)' }}>{r.principalPaid > 0 ? `₹${formatCurrency(r.principalPaid)}` : '-'}</td>
                            <td style={{ textAlign: 'right', color: r.interestPaid > 0 ? 'inherit' : 'var(--text-muted)' }}>{r.interestPaid > 0 ? `₹${formatCurrency(r.interestPaid)}` : '-'}</td>
                            <td style={{ textAlign: 'right', color: r.lateFee > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>{r.lateFee > 0 ? `₹${formatCurrency(r.lateFee)}` : '-'}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600, color: r.totalPaid > 0 ? 'inherit' : 'var(--text-muted)' }}>{r.totalPaid > 0 ? `₹${formatCurrency(r.totalPaid)}` : '-'}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600, color: (r.monthIndex <= monthsElapsed && r.loanBalAfter > 0) ? 'inherit' : 'var(--text-muted)' }}>{(r.monthIndex <= monthsElapsed && r.loanBalAfter > 0) ? `₹${formatCurrency(r.loanBalAfter)}` : '-'}</td>
                            <td style={{ fontSize: `calc(10px * var(--text-scale, 1))`, color: 'var(--text-muted)', textAlign: 'center', lineHeight: '1.2' }}>
                              {r.updatedAt ? (
                                <>
                                  <div style={{ whiteSpace: 'nowrap' }}>{new Date(r.updatedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                                  <div style={{ whiteSpace: 'nowrap' }}>{new Date(r.updatedAt).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
                                </>
                              ) : '-'}
                            </td>
                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                              <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                <button className="btn" style={{ background: 'transparent', padding: '4px' }} onClick={() => handleEditClick(idx, r)}>
                                  <Edit2 size={16} color="var(--primary)" />
                                </button>
                                <button className="btn" style={{ background: 'transparent', padding: '4px' }} onClick={() => handleClearRow(r.monthIndex)}>
                                  <Trash2 size={16} color="var(--danger)" />
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* Edit Profile Modal */}
      {isEditingProfile && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{
            background: 'var(--bg-app)', borderRadius: '12px', width: '100%', maxWidth: '400px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: `calc(18px * var(--text-scale, 1))` }}>Edit Profile</h3>
              <button onClick={() => setIsEditingProfile(false)} className="btn" style={{ padding: '8px', background: '#f1f3f5' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label style={{ fontSize: `calc(12px * var(--text-scale, 1))`, fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Account Number</label>
                  <input
                    type="text"
                    value={member.memberNumber}
                    disabled
                    className="input"
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '6px', background: '#f8f9fa', color: 'var(--text-muted)' }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: `calc(12px * var(--text-scale, 1))`, fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Joining Date</label>
                  <input
                    type="text"
                    value={member.startDate}
                    disabled
                    className="input"
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '6px', background: '#f8f9fa', color: 'var(--text-muted)' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label style={{ fontSize: `calc(12px * var(--text-scale, 1))`, fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Name</label>
                <input
                  type="text"
                  value={profileFormData.name}
                  onChange={e => setProfileFormData({ ...profileFormData, name: e.target.value })}
                  className="input"
                  style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '6px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label style={{ fontSize: `calc(12px * var(--text-scale, 1))`, fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Mobile Number</label>
                  <input
                    type="text"
                    value={profileFormData.mobile}
                    onChange={e => setProfileFormData({ ...profileFormData, mobile: e.target.value })}
                    className="input"
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '6px' }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: `calc(12px * var(--text-scale, 1))`, fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Monthly Save (₹)</label>
                  <input
                    type="text"
                    value={formatCurrency(member.monthlyContribution)}
                    disabled
                    className="input"
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '6px', background: '#f8f9fa', color: 'var(--text-muted)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label style={{ fontSize: `calc(12px * var(--text-scale, 1))`, fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Tenure (Months)</label>
                  <input
                    type="number"
                    value={profileFormData.tenureMonths === 0 ? '' : profileFormData.tenureMonths}
                    onChange={e => setProfileFormData({ ...profileFormData, tenureMonths: Number(e.target.value) })}
                    className="input"
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '6px' }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: `calc(12px * var(--text-scale, 1))`, fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Maturity Amount (₹)</label>
                  <input
                    type="number"
                    value={profileFormData.expectedMaturityAmount === 0 ? '' : profileFormData.expectedMaturityAmount}
                    onChange={e => setProfileFormData({ ...profileFormData, expectedMaturityAmount: Number(e.target.value) })}
                    className="input"
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '6px' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label style={{ fontSize: `calc(12px * var(--text-scale, 1))`, fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Address</label>
                <input
                  type="text"
                  value={profileFormData.address}
                  onChange={e => setProfileFormData({ ...profileFormData, address: e.target.value })}
                  className="input"
                  style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '6px' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button className="btn btn-secondary" style={{ padding: '8px 16px', border: '1px solid var(--border)', background: '#fff', borderRadius: '6px', fontWeight: 600 }} onClick={() => setIsEditingProfile(false)}>Cancel</button>
                <button className="btn btn-primary" style={{ padding: '8px 16px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600 }} onClick={handleSaveProfile}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Profile Modal */}
      {isDeletingProfile && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{
            background: 'var(--bg-app)', borderRadius: '12px', width: '100%', maxWidth: '400px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: `calc(18px * var(--text-scale, 1))`, color: pendingRDMonths > 0 ? 'var(--danger)' : 'var(--success)' }}>Delete Member</h3>
              <button onClick={() => setIsDeletingProfile(false)} className="btn" style={{ padding: '8px', background: '#f1f3f5' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ margin: 0, fontSize: `calc(14px * var(--text-scale, 1))`, color: 'var(--text-main)', lineHeight: '1.5' }}>
                Are you sure you want to delete this member? This action cannot be undone and will remove all related installments and loans.
              </p>
              <div className="form-group">
                <label style={{ fontSize: `calc(12px * var(--text-scale, 1))`, fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                  Please type <strong>{member.name}</strong> to confirm.
                </label>
                <input
                  type="text"
                  value={deleteConfirmationName}
                  onChange={e => setDeleteConfirmationName(e.target.value)}
                  className="input"
                  style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '6px' }}
                  placeholder={member.name}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button className="btn btn-secondary" style={{ padding: '8px 16px', border: '1px solid var(--border)', background: '#fff', borderRadius: '6px', fontWeight: 600 }} onClick={() => setIsDeletingProfile(false)}>Cancel</button>
                <button
                  className="btn btn-primary"
                  style={{
                    padding: '8px 16px',
                    background: deleteConfirmationName.trim().toLowerCase() === member.name.toLowerCase() ? 'var(--danger)' : '#ccc',
                    color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600,
                    cursor: deleteConfirmationName.trim().toLowerCase() === member.name.toLowerCase() ? 'pointer' : 'not-allowed'
                  }}
                  disabled={deleteConfirmationName.trim().toLowerCase() !== member.name.toLowerCase()}
                  onClick={handleDeleteProfile}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Late Fee Calculation Modal Overlay */}
      {showLateFeeTooltip && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{
            background: 'var(--bg-app)', borderRadius: '12px', width: '100%', maxWidth: '500px',
            maxHeight: '90vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: `calc(18px * var(--text-scale, 1))`, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Info size={20} color="var(--primary)" />
                {t('lateFee')} {lang === 'te' ? 'వివరాలు' : 'Breakdown'}
              </h3>
              <button onClick={() => setShowLateFeeTooltip(false)} className="btn" style={{ padding: '8px', background: '#f1f3f5' }}>
                <X size={18} />
              </button>
            </div>
            
            <div style={{ padding: '20px', overflowY: 'auto' }}>
              {lateFeeBreakdown.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: `calc(13px * var(--text-scale, 1))`, textAlign: 'left' }}>
                  <thead style={{ position: 'sticky', top: '-20px', backgroundColor: 'var(--bg-app)', zIndex: 2, boxShadow: '0 1px 0 var(--border)' }}>
                    <tr style={{ color: 'var(--text-muted)' }}>
                      <th style={{ padding: '12px 4px 8px' }}>{lang === 'te' ? 'నెల' : 'Month'}</th>
                      <th style={{ padding: '12px 4px 8px' }}>{lang === 'te' ? 'బాకీ అమౌంట్' : 'Pending'}</th>
                      <th style={{ padding: '12px 4px 8px' }}>{lang === 'te' ? 'ఆలస్యం' : 'Delay'}</th>
                      <th style={{ padding: '12px 4px 8px', textAlign: 'right' }}>{lang === 'te' ? 'పెనాల్టీ' : 'Fine'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lateFeeBreakdown.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px 4px', fontWeight: 500 }}>{row.month}</td>
                        <td style={{ padding: '8px 4px' }}>₹{formatCurrency(row.pendingAmount)} <span style={{ fontSize: `calc(11px * var(--text-scale, 1))`, color: 'var(--text-muted)' }}>({row.rate}%)</span></td>
                        <td style={{ padding: '8px 4px' }}>{row.multiplier} {row.periodText}</td>
                        <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 600, color: pendingRDMonths > 0 ? 'var(--danger)' : 'var(--success)' }}>₹{row.fine}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot style={{ position: 'sticky', bottom: '-20px', backgroundColor: 'var(--bg-app)', zIndex: 2, boxShadow: '0 -1px 0 var(--border)' }}>
                    <tr>
                      <td colSpan={3} style={{ padding: '16px 4px', textAlign: 'right', fontWeight: 600 }}>{t('totalAmountToPay')} ({lateFeeBreakdown.length} {t('months')}):</td>
                      <td style={{ padding: '16px 4px', textAlign: 'right', fontWeight: 700, fontSize: `calc(15px * var(--text-scale, 1))`, color: pendingRDMonths > 0 ? 'var(--danger)' : 'var(--success)' }}>₹{formatCurrency(calculatedLateFee)}</td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                  {lang === 'te' ? 'ఎటువంటి లేట్ ఫైన్ లేదు.' : 'No late fee pending.'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RD Interest Calculation Modal Overlay */}
      {showCalculationModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{
            background: 'var(--bg-app)', borderRadius: '12px', width: '100%', maxWidth: '800px',
            maxHeight: '90vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: `calc(18px * var(--text-scale, 1))`, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Info size={20} color="var(--primary)" />
                {t('rdInterestCalc')}
              </h3>
              <button onClick={() => setShowCalculationModal(false)} className="btn" style={{ padding: '8px', background: '#f1f3f5' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div className="card" style={{ padding: '12px', background: '#f8f9fa' }}>
                  <div style={{ fontSize: `calc(12px * var(--text-scale, 1))`, color: 'var(--text-muted)' }}>{t('totalInstPaid')}</div>
                  <div style={{ fontWeight: 600, fontSize: `calc(15px * var(--text-scale, 1))` }}>{paidMonthsCount}</div>
                </div>
                <div className="card" style={{ padding: '12px', background: '#f8f9fa' }}>
                  <div style={{ fontSize: `calc(12px * var(--text-scale, 1))`, color: 'var(--text-muted)' }}>{t('installmentAmt')}</div>
                  <div style={{ fontWeight: 600, fontSize: `calc(15px * var(--text-scale, 1))` }}>₹{formatCurrency(member.monthlyContribution)}</div>
                </div>
                <div className="card" style={{ padding: '12px', background: '#f8f9fa' }}>
                  <div style={{ fontSize: `calc(12px * var(--text-scale, 1))`, color: 'var(--text-muted)' }}>{t('totalContr')}</div>
                  <div style={{ fontWeight: 600, fontSize: `calc(15px * var(--text-scale, 1))` }}>₹{formatCurrency(rdCalcResult.totalContribution)}</div>
                </div>
                <div className="card" style={{ padding: '12px', background: '#f8f9fa' }}>
                  <div style={{ fontSize: `calc(12px * var(--text-scale, 1))`, color: 'var(--text-muted)' }}>{t('accInt')}</div>
                  <div style={{ fontWeight: 600, fontSize: `calc(15px * var(--text-scale, 1))`, color: 'var(--success)' }}>₹{formatCurrency(rdCalcResult.totalInterest)}</div>
                </div>
                <div className="card" style={{ padding: '12px', background: '#e3f2fd', border: '1px solid #90caf9' }}>
                  <div style={{ fontSize: `calc(12px * var(--text-scale, 1))`, color: 'var(--text-muted)' }}>{t('closingBal')}</div>
                  <div style={{ fontWeight: 700, fontSize: `calc(16px * var(--text-scale, 1))`, color: 'var(--primary)' }}>₹{formatCurrency(rdCalcResult.currentBalance)}</div>
                </div>
              </div>

              <div className="card" style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: '50px' }}>{t('monthNo')}</th>
                      <th>{t('paymentMonth')}</th>
                      <th style={{ textAlign: 'right' }}>{t('installmentAmt')}</th>
                      <th style={{ textAlign: 'right' }}>{t('totalContr')}</th>
                      <th style={{ textAlign: 'right' }}>{t('monthlyInt')}</th>
                      <th style={{ textAlign: 'right' }}>{t('accInt')}</th>
                      <th style={{ textAlign: 'right' }}>{t('closingBal')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rdCalcResult.months.map((m) => (
                      <tr key={m.monthNumber}>
                        <td>{m.monthNumber}</td>
                        <td>{m.paymentMonth}</td>
                        <td style={{ textAlign: 'right' }}>₹{formatCurrency(m.installment)}</td>
                        <td style={{ textAlign: 'right' }}>₹{formatCurrency(m.totalContribution)}</td>
                        <td style={{ textAlign: 'right', color: 'var(--success)' }}>₹{formatCurrency(m.monthlyInterest)}</td>
                        <td style={{ textAlign: 'right' }}>₹{formatCurrency(m.accumulatedInterest)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{formatCurrency(m.closingBalance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


