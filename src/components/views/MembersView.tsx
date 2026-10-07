import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useI18n } from '../../locales/i18n';
import { formatCurrency } from '../../utils';
import { StorageService, storageEvents } from '../../engine/storage';
import type { Member } from '../../types';
import { 
  Plus, 
  Search, 
  User, 
  Phone, 
  CalendarDays, 
  ShieldAlert,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  X,
  Users,
  Wallet,
  PiggyBank,
  BadgeAlert,
  Filter,
  ChevronRight,
  Check
} from 'lucide-react';

import { MemberProfileView } from './MemberProfileView';
import { WhatsAppIcon } from '../WhatsAppIcon';

// Helper to find exact monthly interest rate for given params
function getMonthlyRate(P: number, n: number, A: number) {
  if (P * n >= A || P <= 0 || n <= 0) return 0;
  let low = 0.0;
  let high = 0.1; // 10% per month is a safe upper bound
  let r = 0;
  for (let i = 0; i < 50; i++) {
    r = (low + high) / 2;
    let estimatedA = P * (Math.pow(1 + r, n) - 1) / r;
    if (estimatedA > A) {
      high = r;
    } else {
      low = r;
    }
  }
  return r;
}

function calculateMaturityAmount(P: number, n: number, r: number) {
  if (r <= 0) return P * n;
  return P * (Math.pow(1 + r, n) - 1) / r;
}

function calculateRdInterest(
  installments: any[],
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

// Module-level cache to preserve search, filter, and selected member states across navigation/re-renders
export interface AdvancedFiltersState {
  dateFrom: string;
  dateTo: string;
  amountMin: string;
  amountMax: string;
  savedMin: string;
  savedMax: string;
  pendingMin: string;
  pendingMax: string;
  paidMin: string;
  paidMax: string;
  loanMin: string;
  loanMax: string;
  interestMin: string;
  interestMax: string;
  lateFeeMin: string;
  lateFeeMax: string;
  totalPayMin: string;
  totalPayMax: string;
  profitMin: string;
  profitMax: string;
}

const defaultAdvancedFilters: AdvancedFiltersState = {
  dateFrom: '',
  dateTo: '',
  amountMin: '',
  amountMax: '',
  savedMin: '',
  savedMax: '',
  pendingMin: '',
  pendingMax: '',
  paidMin: '',
  paidMax: '',
  loanMin: '',
  loanMax: '',
  interestMin: '',
  interestMax: '',
  lateFeeMin: '',
  lateFeeMax: '',
  totalPayMin: '',
  totalPayMax: '',
  profitMin: '',
  profitMax: '',
};

interface MembersViewStateCache {
  searchTerm: string;
  statusFilter: 'ACTIVE' | 'ALL' | 'LOAN_ACTIVE' | 'RD_PENDING' | 'RD_COMPLETED_FULL' | 'RD_CLOSED_MIDDLE' | 'RD_PAID_UP_TO_DATE';
  showAdvancedFilters: boolean;
  advancedFilters: AdvancedFiltersState;
  sortConfig: { key: string; direction: 'asc' | 'desc' } | null;
  highlightedMemberId: string | null;
}

const membersStateCache: MembersViewStateCache = {
  searchTerm: '',
  statusFilter: 'ACTIVE',
  showAdvancedFilters: false,
  advancedFilters: { ...defaultAdvancedFilters },
  sortConfig: null,
  highlightedMemberId: null,
};

interface MembersViewProps {
  navParams?: any;
  clearNavParams?: () => void;
}

export const MembersView = ({ navParams, clearNavParams }: MembersViewProps = {}) => {
  const { t } = useI18n();
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [searchTerm, setSearchTerm] = useState(() => membersStateCache.searchTerm);
  const [statusFilter, setStatusFilter] = useState<typeof membersStateCache.statusFilter>(() => membersStateCache.statusFilter);
  const [currentInterestRate, setCurrentInterestRate] = useState(0.00882434);
  
  // Advanced Filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(() => membersStateCache.showAdvancedFilters);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFiltersState>(() => membersStateCache.advancedFilters);
  const isFilterActive = Object.values(advancedFilters).some(val => val !== '');
  
  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(() => membersStateCache.sortConfig);
  const [highlightedMemberId, setHighlightedMemberId] = useState<string | null>(() => membersStateCache.highlightedMemberId);

  const tableWrapperRef = useRef<HTMLDivElement>(null);
  const shouldScrollRef = useRef(false);

  // Sync state changes to cache so they are preserved
  useEffect(() => {
    membersStateCache.searchTerm = searchTerm;
  }, [searchTerm]);

  useEffect(() => {
    membersStateCache.statusFilter = statusFilter;
  }, [statusFilter]);

  useEffect(() => {
    membersStateCache.showAdvancedFilters = showAdvancedFilters;
  }, [showAdvancedFilters]);

  useEffect(() => {
    membersStateCache.advancedFilters = advancedFilters;
  }, [advancedFilters]);

  useEffect(() => {
    membersStateCache.sortConfig = sortConfig;
  }, [sortConfig]);

  useEffect(() => {
    membersStateCache.highlightedMemberId = highlightedMemberId;
  }, [highlightedMemberId]);

  const handleSelectMember = (member: Member) => {
    setHighlightedMemberId(member.id);
    membersStateCache.highlightedMemberId = member.id;
    shouldScrollRef.current = true;
    setSelectedMember(member);
  };

  const scrollToHighlightedMember = (memberId: string) => {
    const tableWrapper = tableWrapperRef.current;
    if (!tableWrapper) return false;
    const rowEl = document.getElementById(`member-row-${memberId}`);
    if (!rowEl) return false;

    const theadEl = tableWrapper.querySelector('thead');
    const headerHeight = theadEl ? theadEl.getBoundingClientRect().height : 45;

    const wrapperRect = tableWrapper.getBoundingClientRect();
    const rowRect = rowEl.getBoundingClientRect();

    // Distance of the row top relative to the top of tableWrapper viewport
    const relativeTop = rowRect.top - wrapperRect.top;
    const targetScrollTop = tableWrapper.scrollTop + relativeTop - headerHeight;

    tableWrapper.scrollTo({
      top: Math.max(0, targetScrollTop),
      behavior: 'smooth'
    });

    const contentScroll = tableWrapper.closest('.content-scroll');
    if (contentScroll && contentScroll.scrollTop > 0) {
      contentScroll.scrollTo({ top: 0, behavior: 'smooth' });
    }

    return true;
  };

  useEffect(() => {
    if (!selectedMember && highlightedMemberId && shouldScrollRef.current) {
      const timer1 = setTimeout(() => {
        scrollToHighlightedMember(highlightedMemberId);
      }, 60);

      const timer2 = setTimeout(() => {
        if (shouldScrollRef.current) {
          scrollToHighlightedMember(highlightedMemberId);
          shouldScrollRef.current = false;
        }
      }, 250);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [selectedMember, highlightedMemberId]);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Member>>({
    memberNumber: '',
    name: '',
    mobile: '',
    address: '',
    startDate: new Date().toISOString().split('T')[0],
    monthlyContribution: 100,
    tenureMonths: 72,
    expectedMaturityAmount: 10000,
    status: 'ACTIVE'
  });
  
  // Reload members when DB changes
  const loadMembers = () => {
    setMembers(StorageService.getMembers());
  };

  useEffect(() => {
    loadMembers();
    storageEvents.addEventListener('db_updated', loadMembers);
    return () => storageEvents.removeEventListener('db_updated', loadMembers);
  }, []);

  useEffect(() => {
    if (navParams && navParams.memberId) {
      let m = members.find(x => x.id === navParams.memberId);
      if (!m) {
        m = StorageService.getMembers().find(x => x.id === navParams.memberId);
      }
      if (m) {
        setHighlightedMemberId(m.id);
        membersStateCache.highlightedMemberId = m.id;
        shouldScrollRef.current = true;
        setSelectedMember(m);
      }
    }
  }, [navParams, members]);

  // Compute Dashboard Metrics & Enrich Members
  const enrichedMembers = useMemo(() => {
    // 1. Build indexes for O(1) lookup to prevent O(N*M) lag
    const installmentsByMember: Record<string, any[]> = {};
    const loansByMember: Record<string, any[]> = {};
    
    StorageService.getInstallments().forEach(i => {
      if (!installmentsByMember[i.memberId]) installmentsByMember[i.memberId] = [];
      installmentsByMember[i.memberId].push(i);
    });
    
    StorageService.getLoans().forEach(l => {
      if (!loansByMember[l.memberId]) loansByMember[l.memberId] = [];
      loansByMember[l.memberId].push(l);
    });

    const loanRepaymentsByMember: Record<string, any[]> = {};
    StorageService.getLoanRepayments().forEach(r => {
      if (!loanRepaymentsByMember[r.memberId]) loanRepaymentsByMember[r.memberId] = [];
      loanRepaymentsByMember[r.memberId].push(r);
    });

    const settings = StorageService.getSettings();

    return members.map(member => {
      const installments = installmentsByMember[member.id] || [];
      const loans = (loansByMember[member.id] || []).filter((l: any) => l.status === 'ACTIVE');
      
      const start = new Date(member.startDate);
      const now = new Date();
      let monthsElapsed = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()) + 1;
      if (monthsElapsed < 1) monthsElapsed = 1;
      if (monthsElapsed > member.tenureMonths) monthsElapsed = member.tenureMonths;
      
      const paidInstallments = installments.filter(i => i.status === 'PAID' || i.amountPaid > 0);
      const totalAmountPaid = installments.reduce((sum, i) => sum + (i.amountPaid || 0), 0);
      
      const paidMonthsCount = Math.floor(totalAmountPaid / (member.monthlyContribution || 1));
      const lastPaymentMonthIndex = installments.reduce((max, i) => (i.amountPaid || 0) > 0 ? Math.max(max, i.monthIndex) : max, 0);
      const maxPaidMonthIndex = Math.max(paidMonthsCount, lastPaymentMonthIndex);
      
      const pendingMonths = Math.max(0, monthsElapsed - maxPaidMonthIndex);
      const isCompleted = totalAmountPaid >= (member.tenureMonths * member.monthlyContribution);
      const paidMonths = paidMonthsCount;
      const totalSaved = totalAmountPaid;
      
      const rdDueAmount = pendingMonths > 0 ? pendingMonths * member.monthlyContribution : 0;
      
      const allLoans = loansByMember[member.id] || [];
      const repayments = loanRepaymentsByMember[member.id] || [];

      let runningLoanBal = 0;
      let runningInterestDue = 0;
      let calculatedLateFee = 0;

      for (let i = 1; i <= monthsElapsed; i++) {
        const monthDate = new Date(start.getFullYear(), start.getMonth() + (i - 1), 1);
        
        const loansThisMonth = allLoans.filter(l => {
          const ld = new Date(l.disbursementDate);
          return ld.getFullYear() === monthDate.getFullYear() && ld.getMonth() === monthDate.getMonth();
        });
        const loanDisbursedThisMonth = loansThisMonth.reduce((s, l) => s + l.principalAmount, 0);

        const monthlyInterest = runningLoanBal > 0 ? Math.round((runningLoanBal * (settings.loanInterestRate ?? 2)) / 100) : 0;
        runningInterestDue += monthlyInterest;

        runningLoanBal += loanDisbursedThisMonth;
        
        const rep = repayments.find(x => x.monthIndex === i);
        if (rep) {
          runningLoanBal -= rep.principalPaid;
          runningInterestDue -= rep.interestPaid;
        }
        
        runningLoanBal = Math.max(0, runningLoanBal);
        runningInterestDue = Math.max(0, runningInterestDue);

        // Late fee calculation
        const dueDate = new Date(start.getFullYear(), start.getMonth() + (i - 1), settings.lateFine.dueDate);
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
           if (i > maxPaidMonthIndex) {
             monthDue += member.monthlyContribution;
             if (runningInterestDue > 0) {
               monthDue += runningInterestDue;
             }
           }
           if (monthDue > 0 && settings.lateFine.rate > 0) {
             calculatedLateFee += monthDue * (settings.lateFine.rate / 100) * multiplier;
           }
        }
      }

      let loanPrincipal = runningLoanBal;
      let loanInterest = runningInterestDue;

      const sumRD = paidInstallments.reduce((sum, i) => sum + (i.amountPaid || 0), 0);
      const sumLateFeePaid = paidInstallments.reduce((sum, i) => sum + (i.lateFeePaid || 0), 0);
      const sumInterestPaid = repayments.reduce((s, r) => s + (r.interestPaid || 0), 0);
      const sumPrincipalPaid = repayments.reduce((s, r) => s + (r.principalPaid || 0), 0);
      const sumLoanDisbursed = allLoans.reduce((s, l) => s + l.principalAmount, 0);

      const totalEarningsReceived = sumInterestPaid + sumLateFeePaid;
      let netProfitLossValue = 0;

      const isSettlementMode = member.status === 'CLOSED' || member.status === 'MATURED';
      if (isSettlementMode) {
        const totalCashReceived = sumRD + sumPrincipalPaid + totalEarningsReceived;
        let settlementPaid = member.settlementAmountPaid || 0;
        // Approximation: assume settlement amount was out-flow normally
        const totalCashGiven = sumLoanDisbursed + settlementPaid;
        netProfitLossValue = totalCashReceived - totalCashGiven;
      } else {
        const rdCalc = calculateRdInterest(paidInstallments, member.tenureMonths, member.monthlyContribution, member.expectedMaturityAmount, monthsElapsed);
        netProfitLossValue = totalEarningsReceived - Math.round(rdCalc.totalInterest);
      }

      const totalAmountToPay = rdDueAmount + loanInterest + calculatedLateFee;
      
      return {
        ...member,
        paidMonths,
        maxPaidMonthIndex,
        pendingMonths,
        isCompleted,
        rdDueAmount,
        loanPrincipal,
        loanInterest,
        calculatedLateFee,
        totalAmountToPay,
        netProfitLossValue,
        totalSaved
      };
    });
  }, [members]);

  // Filtering
  const filtered = useMemo(() => {
    let result = enrichedMembers.filter(m => 
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        m.memberNumber.includes(searchTerm) ||
        (m.mobile && m.mobile.includes(searchTerm))
      );
      if (searchTerm) {
        result.sort((a, b) => {
          if (a.memberNumber === searchTerm && b.memberNumber !== searchTerm) return -1;
          if (b.memberNumber === searchTerm && a.memberNumber !== searchTerm) return 1;
          return 0;
        });
      }

    if (statusFilter === 'ACTIVE') {
      result = result.filter(m => m.status === 'ACTIVE');
    } else if (statusFilter === 'LOAN_ACTIVE') {
      result = result.filter(m => m.loanPrincipal > 0);
    } else if (statusFilter === 'RD_PENDING') {
      result = result.filter(m => m.status === 'ACTIVE' && m.pendingMonths > 0 && !m.isCompleted);
    } else if (statusFilter === 'RD_COMPLETED_FULL') {
      result = result.filter(m => m.status === 'MATURED' || m.isCompleted);
    } else if (statusFilter === 'RD_CLOSED_MIDDLE') {
      result = result.filter(m => m.status === 'CLOSED' && !m.isCompleted);
    } else if (statusFilter === 'RD_PAID_UP_TO_DATE') {
      result = result.filter(m => m.status === 'ACTIVE' && m.pendingMonths <= 0 && !m.isCompleted);
    }

    if (advancedFilters.dateFrom) {
      result = result.filter(m => m.startDate >= advancedFilters.dateFrom);
    }
    if (advancedFilters.dateTo) {
      result = result.filter(m => m.startDate <= advancedFilters.dateTo);
    }
    if (advancedFilters.amountMin) {
      result = result.filter(m => m.monthlyContribution >= Number(advancedFilters.amountMin));
    }
    if (advancedFilters.amountMax) {
      result = result.filter(m => m.monthlyContribution <= Number(advancedFilters.amountMax));
    }
    if (advancedFilters.savedMin) {
      result = result.filter(m => m.totalSaved >= Number(advancedFilters.savedMin));
    }
    if (advancedFilters.savedMax) {
      result = result.filter(m => m.totalSaved <= Number(advancedFilters.savedMax));
    }
    if (advancedFilters.pendingMin) {
      result = result.filter(m => m.pendingMonths >= Number(advancedFilters.pendingMin));
    }
    if (advancedFilters.pendingMax) {
      result = result.filter(m => m.pendingMonths <= Number(advancedFilters.pendingMax));
    }
    if (advancedFilters.paidMin) {
      result = result.filter(m => m.paidMonths >= Number(advancedFilters.paidMin));
    }
    if (advancedFilters.paidMax) {
      result = result.filter(m => m.paidMonths <= Number(advancedFilters.paidMax));
    }
    if (advancedFilters.loanMin) {
      result = result.filter(m => m.loanPrincipal >= Number(advancedFilters.loanMin));
    }
    if (advancedFilters.loanMax) {
      result = result.filter(m => m.loanPrincipal <= Number(advancedFilters.loanMax));
    }
    if (advancedFilters.interestMin) {
      result = result.filter(m => m.loanInterest >= Number(advancedFilters.interestMin));
    }
    if (advancedFilters.interestMax) {
      result = result.filter(m => m.loanInterest <= Number(advancedFilters.interestMax));
    }
    if (advancedFilters.lateFeeMin) {
      result = result.filter(m => m.calculatedLateFee >= Number(advancedFilters.lateFeeMin));
    }
    if (advancedFilters.lateFeeMax) {
      result = result.filter(m => m.calculatedLateFee <= Number(advancedFilters.lateFeeMax));
    }
    if (advancedFilters.totalPayMin) {
      result = result.filter(m => m.totalAmountToPay >= Number(advancedFilters.totalPayMin));
    }
    if (advancedFilters.totalPayMax) {
      result = result.filter(m => m.totalAmountToPay <= Number(advancedFilters.totalPayMax));
    }
    if (advancedFilters.profitMin) {
      result = result.filter(m => m.netProfitLossValue >= Number(advancedFilters.profitMin));
    }
    if (advancedFilters.profitMax) {
      result = result.filter(m => m.netProfitLossValue <= Number(advancedFilters.profitMax));
    }

    return result;
  }, [enrichedMembers, searchTerm, statusFilter, advancedFilters]);

  // Dashboard Stats - Now calculates based on filtered list so dashboard reflects active filters
  const stats = useMemo(() => {
      return filtered.reduce((acc, m) => {
        acc.totalMembers++;
        acc.totalSaved += (m.paidMonths * m.monthlyContribution);
        if (m.pendingMonths > 0 && !m.isCompleted) acc.pendingMembers++;
        if (m.status === 'ACTIVE') {
          acc.activeMembers++;
        }
      if (m.loanPrincipal > 0) {
        acc.activeLoans++;
        acc.totalLoansAmount += m.loanPrincipal;
      }
      acc.totalDueInterest += m.loanInterest;
      acc.totalAmountToPay += (m.totalAmountToPay || 0);
      acc.netProfitLossValue += (m.netProfitLossValue || 0);
      return acc;
    }, { 
      totalMembers: 0, 
      activeMembers: 0, 
      totalSaved: 0, 
      activeLoans: 0, 
      totalLoansAmount: 0, 
      totalDueInterest: 0,
      pendingMembers: 0,
        totalAmountToPay: 0,
        netProfitLossValue: 0
      });
  }, [filtered]);

  // Sorting with numeric/natural sorting support for A/c No and amounts
  const sortedAndFiltered = useMemo(() => {
    let sortableItems = [...filtered];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof typeof a];
        let bValue: any = b[sortConfig.key as keyof typeof b];

        // Specific integer/numeric sorting for member account number
        if (sortConfig.key === 'memberNumber') {
          const numA = parseInt(aValue, 10);
          const numB = parseInt(bValue, 10);
          if (!isNaN(numA) && !isNaN(numB)) {
            return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
          }
          return sortConfig.direction === 'asc'
            ? String(aValue).localeCompare(String(bValue), undefined, { numeric: true, sensitivity: 'base' })
            : String(bValue).localeCompare(String(aValue), undefined, { numeric: true, sensitivity: 'base' });
        }

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortConfig.direction === 'asc'
            ? aValue.localeCompare(bValue, undefined, { numeric: true, sensitivity: 'base' })
            : bValue.localeCompare(aValue, undefined, { numeric: true, sensitivity: 'base' });
        }
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filtered, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  const handleWhatsAppClick = (e: React.MouseEvent, member: any) => {
    e.stopPropagation();
    
    const settings = StorageService.getSettings();
    const installments = StorageService.getInstallments(member.id);
    const loans = StorageService.getLoans(member.id).filter(l => l.status === 'ACTIVE');
    const repayments = StorageService.getLoanRepayments(member.id);
    const loanInterestRate = settings.loanInterestRate ?? 2;

    const start = new Date(member.startDate);
    const now = new Date();
    let monthsElapsed = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()) + 1;
    if (monthsElapsed < 1) monthsElapsed = 1;
    if (monthsElapsed > member.tenureMonths) monthsElapsed = member.tenureMonths;

    let runningLoanBal = 0;
    let runningInterestDue = 0;
    const rows = [];
    for (let i = 1; i <= monthsElapsed; i++) {
      const monthDate = new Date(start.getFullYear(), start.getMonth() + (i - 1), 1);
      const rep = repayments.find(x => x.monthIndex === i);
      const principalPaid = rep ? rep.principalPaid : 0;
      const interestPaid = rep ? rep.interestPaid : 0;

      const loansThisMonth = loans.filter(l => {
        const ld = new Date(l.disbursementDate);
        return ld.getFullYear() === monthDate.getFullYear() && ld.getMonth() === monthDate.getMonth();
      });
      const loanDisbursedThisMonth = loansThisMonth.reduce((s, l) => s + l.principalAmount, 0);

      const monthlyInterest = runningLoanBal > 0 ? Math.round((runningLoanBal * loanInterestRate) / 100) : 0;
      runningInterestDue += monthlyInterest;
      
      const expectedInterest = runningInterestDue;

      runningLoanBal += loanDisbursedThisMonth;
      runningLoanBal -= principalPaid;
      runningInterestDue -= interestPaid;

      rows.push({ expectedInterest, interestPaid });
    }

    let calculatedLateFee = 0;
    for (let i = 1; i <= monthsElapsed; i++) {
      const inst = installments.find(x => x.monthIndex === i);
      const currentMonthRowInfo = rows[i - 1];

      const monthDate = new Date(start);
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

        const mxPaid = member.maxPaidMonthIndex !== undefined ? member.maxPaidMonthIndex : member.paidMonths;
        let monthDue = 0;
        if (i > mxPaid) {
          monthDue += member.monthlyContribution;
          if (currentMonthRowInfo && currentMonthRowInfo.expectedInterest > currentMonthRowInfo.interestPaid) {
            monthDue += (currentMonthRowInfo.expectedInterest - currentMonthRowInfo.interestPaid);
          }
        }
        if (monthDue > 0 && settings.lateFine.rate > 0) {
          calculatedLateFee += monthDue * (settings.lateFine.rate / 100) * multiplier;
        }
      }
    }

    const currentMonthRow = rows[Math.max(0, monthsElapsed - 1)];
    const remainingInterestDue = currentMonthRow ? Math.max(0, currentMonthRow.expectedInterest - currentMonthRow.interestPaid) : 0;

    const pendingRDMonths = Math.max(0, monthsElapsed - (member.maxPaidMonthIndex !== undefined ? member.maxPaidMonthIndex : member.paidMonths));
    const pendingRDAmount = pendingRDMonths * member.monthlyContribution;

    const totalAmountDueThisMonth = pendingRDAmount + remainingInterestDue + calculatedLateFee;

    const whatsappMsgRaw = settings?.whatsappTemplate || t('whatsappDueMessage');
    const whatsappMsg = whatsappMsgRaw
      .replace('{name}', member.name)
      .replace('{totalDue}', totalAmountDueThisMonth.toString())
      .replace('{rdDue}', pendingRDAmount.toString())
      .replace('{loanPrincipal}', member.loanPrincipal.toString())
      .replace('{loanInterestDue}', remainingInterestDue.toString())
      .replace('{lateFee}', calculatedLateFee.toString());

    const whatsappUrl = `https://wa.me/91${member.mobile}?text=${encodeURIComponent(whatsappMsg)}`;
    window.open(whatsappUrl, '_blank');

    const todayStr = new Date().toISOString().split('T')[0];
    const db = StorageService.getDb();
    const memberToUpdate = db.members.find(m => m.id === member.id);
    if (memberToUpdate) {
      memberToUpdate.lastWhatsappSentDate = todayStr;
      StorageService.saveDb(db);
      loadMembers(); // Reload list to show the check mark
    }
  };

  const handleOpenModal = () => {
    // Auto Increment A/C No
    let maxAc = 0;
    members.forEach(m => {
      const num = parseInt(m.memberNumber, 10);
      if (!isNaN(num) && num > maxAc) {
        maxAc = num;
      }
    });
    const nextAc = maxAc > 0 ? (maxAc + 1).toString() : '1';
    
    // Determine dynamic interest rate from the most recently created member (if any)
    let dynamicRate = 0.00882434; // fallback for 100x72 -> 10000
    if (members.length > 0) {
      const latest = [...members].sort((a,b) => b.createdAt - a.createdAt)[0];
      if (latest.monthlyContribution > 0 && latest.tenureMonths > 0 && latest.expectedMaturityAmount > 0) {
        dynamicRate = getMonthlyRate(latest.monthlyContribution, latest.tenureMonths, latest.expectedMaturityAmount);
      }
    }
    setCurrentInterestRate(dynamicRate);
    
    setFormData({
      memberNumber: nextAc,
      name: '',
      mobile: '',
      address: '',
      startDate: new Date().toISOString().split('T')[0],
      monthlyContribution: 100,
      tenureMonths: 72,
      expectedMaturityAmount: Math.round(calculateMaturityAmount(100, 72, dynamicRate)),
      status: 'ACTIVE'
    });
    setIsModalOpen(true);
  };

  const handleFormChange = (key: keyof Member, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [key]: value };
      
      const mc = Number(updated.monthlyContribution) || 0;
      const tm = Number(updated.tenureMonths) || 0;

      if (key === 'expectedMaturityAmount') {
        // User manually updated maturity, so we learn the new interest rate
        const mat = Number(value) || 0;
        if (mc > 0 && tm > 0) {
          setCurrentInterestRate(getMonthlyRate(mc, tm, mat));
        }
      } else if (key === 'monthlyContribution' || key === 'tenureMonths') {
        // Auto-calculate Maturity Amount using the learned interest rate
        updated.expectedMaturityAmount = Math.round(calculateMaturityAmount(mc, tm, currentInterestRate));
      }
      return updated;
    });
  };

  const handleSave = () => {
    if (!formData.name || !formData.memberNumber) return alert('Name & Account No required');
    
    // We already show an inline warning, but let's keep the confirm prompt for safety if it's a completely different name
    const existingWithMobile = members.find(m => m.mobile === formData.mobile);
    if (existingWithMobile && formData.mobile && formData.mobile.trim() !== '') {
      if (existingWithMobile.name.toLowerCase() !== formData.name?.toLowerCase()) {
        const proceed = window.confirm(`Warning: The mobile number ${formData.mobile} is already registered under the name "${existingWithMobile.name}".

Do you still want to proceed creating an account for "${formData.name}"?`);
        if (!proceed) return;
      }
    }
    
    const newMember: Member = {
      id: 'MEM-' + Date.now(),
      memberNumber: formData.memberNumber!,
      name: formData.name!,
      mobile: formData.mobile || '',
      address: formData.address || '',
      startDate: formData.startDate!,
      status: formData.status as any,
      monthlyContribution: Number(formData.monthlyContribution) || 0,
      tenureMonths: Number(formData.tenureMonths) || 72,
      expectedMaturityAmount: Number(formData.expectedMaturityAmount) || 0,
      createdAt: Date.now()
    };

    StorageService.saveMember(newMember);
    setIsModalOpen(false);
    loadMembers();
  };

  if (selectedMember) {
    return (
      <MemberProfileView 
        member={selectedMember} 
        onBack={() => { 
          shouldScrollRef.current = true;
          setSelectedMember(null); 
          if (clearNavParams) clearNavParams(); 
        }} 
        targetMonthIndex={navParams?.monthIndex} 
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', overflow: 'hidden' }}>
      
      {/* Summary Dashboard Cards */}
      <div className="summary-grid">
          <div className="summary-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="summary-label">{t('totalMembers')}</span>
            <Users size={16} color="var(--primary)" />
          </div>
          <span className="summary-value">{filtered.length} <span style={{ fontSize: `calc(14px * var(--text-scale, 1))`, color: 'var(--text-muted)' }}>/ {enrichedMembers.length}</span></span>
        </div>
        
        <div className="summary-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="summary-label">{t('pendingMembers')}</span>
            <ShieldAlert size={16} color="var(--danger)" />
          </div>
          <span className="summary-value" style={{ color: 'var(--danger)' }}>{stats.pendingMembers}</span>
        </div>

        <div className="summary-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="summary-label">{t('totalSavedAmount')}</span>
            <PiggyBank size={16} color="var(--success)" />
          </div>
          <span className="summary-value" style={{ color: 'var(--success)' }}>₹{formatCurrency(stats.totalSaved)}</span>
        </div>

        <div className="summary-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="summary-label">{t('activeLoans')}</span>
            <Wallet size={16} color="var(--danger)" />
          </div>
          <span className="summary-value" style={{ color: 'var(--danger)' }}>
            {stats.activeLoans} <span style={{ fontSize: `calc(14px * var(--text-scale, 1))`, color: 'var(--text-muted)' }}>(₹{formatCurrency(stats.totalLoansAmount)})</span>
          </span>
        </div>

        <div className="summary-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="summary-label">{t('totalDueInterest')}</span>
            <BadgeAlert size={16} color="var(--danger)" />
          </div>
          <span className="summary-value" style={{ color: 'var(--danger)' }}>₹{formatCurrency(stats.totalDueInterest)}</span>
        </div>

        <div className="summary-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="summary-label">{t('totalDueFromMembers')}</span>
            <Wallet size={16} color="var(--primary)" />
          </div>
          <span className="summary-value" style={{ color: 'var(--primary)' }}>₹{formatCurrency(stats.totalAmountToPay)}</span>
        </div>

        <div className="summary-card" style={{ borderColor: stats.netProfitLossValue >= 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="summary-label" style={{ color: stats.netProfitLossValue >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
              {stats.netProfitLossValue >= 0 ? t('netProfit') : t('netLoss')}
            </span>
            <span style={{ fontSize: '14px' }}>{stats.netProfitLossValue >= 0 ? '📈' : '📉'}</span>
          </div>
          <span className="summary-value" style={{ color: stats.netProfitLossValue >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>
            {stats.netProfitLossValue < 0 ? '-' : '+'}₹{formatCurrency(Math.abs(stats.netProfitLossValue))}
          </span>
        </div>
              </div>

      {/* Top Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ position: 'relative', width: '350px' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            <input 
                type="text" 
                className="input-compact" 
                style={{ paddingLeft: '32px', paddingRight: searchTerm ? '32px' : '10px', width: '100%' }}
                placeholder={t('searchHint')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <X 
                  size={16} 
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', cursor: 'pointer' }} 
                  onClick={() => setSearchTerm('')} 
                />
              )}
          </div>
          <select 
              className="input-compact" 
              style={{ width: '220px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="ACTIVE">{t('filterActive')}</option>
              <option value="ALL">{t('filterAll')}</option>
              <option value="LOAN_ACTIVE">{t('filterLoanActive')}</option>
              <option value="RD_PENDING">{t('filterRDPending')}</option>
              <option value="RD_COMPLETED_FULL">{t('filterRDCompletedFull')}</option>
              <option value="RD_CLOSED_MIDDLE">{t('filterRDClosedMiddle')}</option>
              <option value="RD_PAID_UP_TO_DATE">{t('filterRDPaidUpToDate')}</option>
            </select>
          <div style={{ position: 'relative' }}>
            <button 
              className="btn" 
              style={{ background: '#fff', border: '1px solid var(--border)', position: 'relative' }}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              <Filter size={16} />
              {t('advancedFilters')}
              {isFilterActive && <span style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, background: 'var(--danger)', borderRadius: '50%' }} />}
            </button>

            {showAdvancedFilters && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                background: '#ffffff',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '18px',
                width: '380px',
                maxHeight: '75vh',
                overflowY: 'auto',
                boxShadow: '0 12px 36px rgba(0,0,0,0.18)',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Filter size={16} color="var(--primary)" />
                    <strong style={{ fontSize: `calc(15px * var(--text-scale, 1))`, color: 'var(--text-main)' }}>{t('advancedFilters')}</strong>
                    {isFilterActive && (
                      <span style={{
                        fontSize: `calc(10px * var(--text-scale, 1))`,
                        padding: '2px 8px',
                        backgroundColor: 'var(--primary)',
                        color: '#fff',
                        borderRadius: '10px',
                        fontWeight: 600
                      }}>
                        Active
                      </span>
                    )}
                  </div>
                  <button 
                    onClick={() => setShowAdvancedFilters(false)} 
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                    title={t('close')}
                  >
                    <X size={18} color="var(--text-muted)" />
                  </button>
                </div>
                
                {/* 1. Join Date */}
                <div>
                  <label style={{ fontSize: `calc(12px * var(--text-scale, 1))`, color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
                    {t('joinDate')}
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="date" className="input-compact" value={advancedFilters.dateFrom} onChange={e => setAdvancedFilters(f => ({ ...f, dateFrom: e.target.value }))} title={t('dateFrom')} />
                    <input type="date" className="input-compact" value={advancedFilters.dateTo} onChange={e => setAdvancedFilters(f => ({ ...f, dateTo: e.target.value }))} title={t('dateTo')} />
                  </div>
                </div>

                {/* 2. Monthly Saving */}
                <div>
                  <label style={{ fontSize: `calc(12px * var(--text-scale, 1))`, color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
                    {t('monthlyContribution')} (₹)
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="number" className="input-compact" value={advancedFilters.amountMin} onChange={e => setAdvancedFilters(f => ({ ...f, amountMin: e.target.value }))} placeholder="Min ₹" />
                    <input type="number" className="input-compact" value={advancedFilters.amountMax} onChange={e => setAdvancedFilters(f => ({ ...f, amountMax: e.target.value }))} placeholder="Max ₹" />
                  </div>
                </div>

                {/* 3. Total Saved */}
                <div>
                  <label style={{ fontSize: `calc(12px * var(--text-scale, 1))`, color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
                    {t('savedSoFar')} (₹)
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="number" className="input-compact" value={advancedFilters.savedMin} onChange={e => setAdvancedFilters(f => ({ ...f, savedMin: e.target.value }))} placeholder="Min ₹" />
                    <input type="number" className="input-compact" value={advancedFilters.savedMax} onChange={e => setAdvancedFilters(f => ({ ...f, savedMax: e.target.value }))} placeholder="Max ₹" />
                  </div>
                </div>

                {/* 4. RD Pending Months */}
                <div>
                  <label style={{ fontSize: `calc(12px * var(--text-scale, 1))`, color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
                    {t('pendingMonthsRange')}
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="number" className="input-compact" value={advancedFilters.pendingMin} onChange={e => setAdvancedFilters(f => ({ ...f, pendingMin: e.target.value }))} placeholder="Min" />
                    <input type="number" className="input-compact" value={advancedFilters.pendingMax} onChange={e => setAdvancedFilters(f => ({ ...f, pendingMax: e.target.value }))} placeholder="Max" />
                  </div>
                </div>

                {/* 5. RD Paid Months */}
                <div>
                  <label style={{ fontSize: `calc(12px * var(--text-scale, 1))`, color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
                    {t('paidMonthsRange')}
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="number" className="input-compact" value={advancedFilters.paidMin} onChange={e => setAdvancedFilters(f => ({ ...f, paidMin: e.target.value }))} placeholder="Min" />
                    <input type="number" className="input-compact" value={advancedFilters.paidMax} onChange={e => setAdvancedFilters(f => ({ ...f, paidMax: e.target.value }))} placeholder="Max" />
                  </div>
                </div>

                {/* 6. Active Loan Principal */}
                <div>
                  <label style={{ fontSize: `calc(12px * var(--text-scale, 1))`, color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
                    {t('loan')} (₹)
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="number" className="input-compact" value={advancedFilters.loanMin} onChange={e => setAdvancedFilters(f => ({ ...f, loanMin: e.target.value }))} placeholder="Min ₹" />
                    <input type="number" className="input-compact" value={advancedFilters.loanMax} onChange={e => setAdvancedFilters(f => ({ ...f, loanMax: e.target.value }))} placeholder="Max ₹" />
                  </div>
                </div>

                {/* 7. Due Interest */}
                <div>
                  <label style={{ fontSize: `calc(12px * var(--text-scale, 1))`, color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
                    {t('dueInterest')} (₹)
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="number" className="input-compact" value={advancedFilters.interestMin} onChange={e => setAdvancedFilters(f => ({ ...f, interestMin: e.target.value }))} placeholder="Min ₹" />
                    <input type="number" className="input-compact" value={advancedFilters.interestMax} onChange={e => setAdvancedFilters(f => ({ ...f, interestMax: e.target.value }))} placeholder="Max ₹" />
                  </div>
                </div>

                {/* 8. Late Fee */}
                <div>
                  <label style={{ fontSize: `calc(12px * var(--text-scale, 1))`, color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
                    {t('lblLateFee')} (₹)
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="number" className="input-compact" value={advancedFilters.lateFeeMin} onChange={e => setAdvancedFilters(f => ({ ...f, lateFeeMin: e.target.value }))} placeholder="Min ₹" />
                    <input type="number" className="input-compact" value={advancedFilters.lateFeeMax} onChange={e => setAdvancedFilters(f => ({ ...f, lateFeeMax: e.target.value }))} placeholder="Max ₹" />
                  </div>
                </div>

                {/* 9. Total Amount to Pay */}
                <div>
                  <label style={{ fontSize: `calc(12px * var(--text-scale, 1))`, color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
                    {t('totalAmountToPay')} (₹)
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="number" className="input-compact" value={advancedFilters.totalPayMin} onChange={e => setAdvancedFilters(f => ({ ...f, totalPayMin: e.target.value }))} placeholder="Min ₹" />
                    <input type="number" className="input-compact" value={advancedFilters.totalPayMax} onChange={e => setAdvancedFilters(f => ({ ...f, totalPayMax: e.target.value }))} placeholder="Max ₹" />
                  </div>
                </div>

                {/* 10. Net Profit / Loss */}
                <div>
                  <label style={{ fontSize: `calc(12px * var(--text-scale, 1))`, color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
                    {t('netProfitLoss')} (₹)
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="number" className="input-compact" value={advancedFilters.profitMin} onChange={e => setAdvancedFilters(f => ({ ...f, profitMin: e.target.value }))} placeholder="Min ₹" />
                    <input type="number" className="input-compact" value={advancedFilters.profitMax} onChange={e => setAdvancedFilters(f => ({ ...f, profitMax: e.target.value }))} placeholder="Max ₹" />
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '6px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
                  <button 
                    className="btn" 
                    style={{ flex: 1, background: '#f1f5f9', border: '1px solid var(--border)', color: 'var(--text-main)', fontWeight: 600 }} 
                    onClick={() => { 
                      setAdvancedFilters({ ...defaultAdvancedFilters }); 
                      setShowAdvancedFilters(false); 
                    }}
                  >
                    {t('clear')}
                  </button>
                  <button 
                    className="btn btn-primary" 
                    style={{ flex: 1, fontWeight: 600 }} 
                    onClick={() => setShowAdvancedFilters(false)}
                  >
                    {t('done')} ({filtered.length})
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleOpenModal}>
          <Plus size={16} />
          {t('addNew')}
        </button>
      </div>

      {/* Members Table */}
      <div ref={tableWrapperRef} className="table-wrapper" style={{ overflow: 'auto', flex: 1, minHeight: 0, maxHeight: 'none' }}>
        <table className="table" style={{ whiteSpace: 'nowrap' }}>
          <thead>
            <tr>
              <th style={{ cursor: 'pointer' }} onClick={() => requestSort('memberNumber')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{t('memberNo')} {getSortIcon('memberNumber')}</div>
              </th>
              <th style={{ cursor: 'pointer' }} onClick={() => requestSort('name')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{t('nameAndMobile')} {getSortIcon('name')}</div>
              </th>
              <th style={{ cursor: 'pointer' }} onClick={() => requestSort('startDate')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{t('joinDate')} {getSortIcon('startDate')}</div>
              </th>
              <th style={{ cursor: 'pointer' }} onClick={() => requestSort('totalSaved')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{t('savedSoFar')} {getSortIcon('totalSaved')}</div>
              </th>
              <th style={{ cursor: 'pointer' }} onClick={() => requestSort('pendingMonths')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{t('rdStatus')} {getSortIcon('pendingMonths')}</div>
              </th>
              <th style={{ cursor: 'pointer' }} onClick={() => requestSort('paidMonths')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{t('rdPaidMonths')} {getSortIcon('paidMonths')}</div>
              </th>
              <th style={{ cursor: 'pointer' }} onClick={() => requestSort('loanPrincipal')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{t('loan')} {getSortIcon('loanPrincipal')}</div>
              </th>
              <th style={{ cursor: 'pointer' }} onClick={() => requestSort('loanInterest')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{t('dueInterest')} {getSortIcon('loanInterest')}</div>
              </th>
              <th style={{ cursor: 'pointer' }} onClick={() => requestSort('calculatedLateFee')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{t('lblLateFee')} {getSortIcon('calculatedLateFee')}</div>
              </th>
              <th style={{ cursor: 'pointer' }} onClick={() => requestSort('totalAmountToPay')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{t('totalAmountToPay')} {getSortIcon('totalAmountToPay')}</div>
              </th>
              <th style={{ cursor: 'pointer' }} onClick={() => requestSort('netProfitLossValue')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{t('netProfit')} {getSortIcon('netProfitLossValue')}</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedAndFiltered.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  No members found.
                </td>
              </tr>
            ) : (
              sortedAndFiltered.map(member => {
                const isHighlighted = member.id === highlightedMemberId;
                return (
                  <tr 
                    key={member.id} 
                    id={`member-row-${member.id}`}
                    style={{ cursor: 'pointer' }} 
                    onClick={() => handleSelectMember(member)}
                    className={`hoverable-row ${isHighlighted ? 'highlighted-row' : ''}`}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ 
                          color: isHighlighted ? 'var(--primary-hover)' : 'var(--primary)', 
                          fontSize: `calc(15px * var(--text-scale, 1))` 
                        }}>
                          #{member.memberNumber}
                        </strong>
                        {isHighlighted && (
                          <span style={{
                            fontSize: `calc(10px * var(--text-scale, 1))`,
                            padding: '2px 7px',
                            backgroundColor: 'var(--primary)',
                            color: '#ffffff',
                            borderRadius: '10px',
                            fontWeight: 600,
                            letterSpacing: '0.3px',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 1px 3px rgba(79, 70, 229, 0.3)'
                          }}>
                            {t('selected')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontWeight: 600, fontSize: `calc(14px * var(--text-scale, 1))` }}>{member.name}</span>
                        <div className="icon-label" style={{ fontSize: `calc(12px * var(--text-scale, 1))` }}>
                          <Phone size={12} color="var(--text-muted)" />
                          <span>{member.mobile}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="icon-label" style={{ fontSize: `calc(13px * var(--text-scale, 1))`, fontWeight: 500 }}>
                        <CalendarDays size={14} color="var(--text-muted)" />
                        <span>{new Date(member.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: `calc(13px * var(--text-scale, 1))`, color: 'var(--success)', fontWeight: 600 }}>₹{formatCurrency(member.totalSaved)}</span>
                        <span style={{ fontSize: `calc(11px * var(--text-scale, 1))`, color: 'var(--text-muted)' }}>₹{formatCurrency(member.monthlyContribution)} / {t('month').toLowerCase()}</span>
                      </div>
                    </td>
                    <td>
                      {member.isCompleted ? (
                         <span style={{ color: 'var(--primary)', fontWeight: 600, fontSize: `calc(12px * var(--text-scale, 1))` }}>{t('completed')}</span>
                      ) : member.pendingMonths > 0 ? (
                        <span style={{ color: 'var(--danger)', fontWeight: 600, fontSize: `calc(12px * var(--text-scale, 1))` }}>
                          {member.pendingMonths} months pending
                        </span>
                      ) : (
                        <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: `calc(12px * var(--text-scale, 1))` }}>{t('upToDate')}</span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, fontSize: `calc(13px * var(--text-scale, 1))` }}>{member.paidMonths}</span> <span style={{ color: 'var(--text-muted)', fontSize: `calc(12px * var(--text-scale, 1))` }}>{t('outOf')} {member.tenureMonths}</span>
                    </td>
                    <td>
                      {member.loanPrincipal > 0 ? (
                         <span style={{ color: 'var(--danger)', fontWeight: 600, fontSize: `calc(13px * var(--text-scale, 1))` }}>₹{formatCurrency(member.loanPrincipal)}</span>
                      ) : (
                         <span style={{ color: 'var(--text-muted)' }}>--</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        {member.loanInterest > 0 ? (
                           <span style={{ color: 'var(--danger)', fontWeight: 600, fontSize: `calc(13px * var(--text-scale, 1))` }}>₹{formatCurrency(member.loanInterest)}</span>
                        ) : (
                           <span style={{ color: 'var(--text-muted)' }}>--</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        {member.calculatedLateFee > 0 ? (
                           <span style={{ color: 'var(--danger)', fontWeight: 600, fontSize: `calc(13px * var(--text-scale, 1))` }}>₹{formatCurrency(member.calculatedLateFee)}</span>
                        ) : (
                           <span style={{ color: 'var(--text-muted)' }}>--</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        {member.totalAmountToPay > 0 ? (
                           <span style={{ color: 'var(--danger)', fontWeight: 700, fontSize: `calc(14px * var(--text-scale, 1))` }}>₹{formatCurrency(member.totalAmountToPay)}</span>
                        ) : (
                           <span style={{ color: 'var(--text-muted)' }}>--</span>
                        )}
                        {member.pendingMonths > 0 && !member.isCompleted && (
                          <button
                            onClick={(e) => handleWhatsAppClick(e, member)}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: '4px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: member.lastWhatsappSentDate === new Date().toISOString().split('T')[0] ? 'var(--success)' : '#25D366'
                            }}
                            title="Send WhatsApp Message"
                          >
                            {member.lastWhatsappSentDate === new Date().toISOString().split('T')[0] ? (
                              <Check size={18} />
                            ) : (
                              <WhatsAppIcon size={18} />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                    <td>
                      <span style={{ color: member.netProfitLossValue >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700, fontSize: `calc(13px * var(--text-scale, 1))` }}>
                        {member.netProfitLossValue < 0 ? '-' : '+'}₹{formatCurrency(Math.abs(member.netProfitLossValue))}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <div style={{ height: '220px', pointerEvents: 'none' }} />
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <span>{t('addNew')}</span>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none' }}>
                <X size={20} color="var(--text-muted)" />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>{t('memberNo')}</label>
                  <input 
                    type="text" 
                    className="input-compact" 
                    value={formData.memberNumber}
                    onChange={e => handleFormChange('memberNumber', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>{t('name')}</label>
                  <input 
                    type="text" 
                    className="input-compact" 
                    value={formData.name}
                    onChange={e => handleFormChange('name', e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ position: 'relative' }}>
                  <label>{t('mobile')}</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input 
                      type="text" 
                      className="input-compact" 
                      style={{ width: '100%', paddingRight: '30px' }}
                      value={formData.mobile}
                      onChange={e => handleFormChange('mobile', e.target.value)}
                    />
                    {formData.mobile && members.some(m => m.mobile === formData.mobile) && (
                      <div className="duplicate-mobile-warning" style={{ position: 'absolute', right: '8px', display: 'flex', alignItems: 'center', cursor: 'help' }}>
                        <ShieldAlert size={16} color="var(--danger)" />
                        <div className="duplicate-tooltip" style={{
                          display: 'none',
                          position: 'absolute',
                          top: '100%',
                          right: '0',
                          backgroundColor: '#fff',
                          border: '1px solid var(--border)',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          padding: '8px',
                          borderRadius: '6px',
                          zIndex: 100,
                          minWidth: '150px'
                        }}>
                          <div style={{ fontSize: `calc(11px * var(--text-scale, 1))`, color: 'var(--text-muted)', marginBottom: '4px' }}>Linked Accounts:</div>
                          {members.filter(m => m.mobile === formData.mobile).map(m => (
                            <div 
                              key={m.id}
                              style={{ padding: '4px 8px', fontSize: `calc(13px * var(--text-scale, 1))`, cursor: 'pointer', borderRadius: '4px', color: 'var(--primary)', fontWeight: 500 }}
                              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f0f4f8'}
                              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsModalOpen(false);
                                setSelectedMember(m);
                              }}
                            >
                              {m.name} (#{m.memberNumber})
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="form-group">
                  <label>{t('joinDate')}</label>
                  <input 
                    type="date" 
                    className="input-compact" 
                    value={formData.startDate}
                    onChange={e => handleFormChange('startDate', e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / span 2' }}>
                  <label>{t('address')}</label>
                  <input 
                    type="text" 
                    className="input-compact" 
                    value={formData.address}
                    placeholder="Enter full address"
                    onChange={e => handleFormChange('address', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>{t('monthlyContribution')}</label>
                  <input 
                    type="number" 
                    className="input-compact" 
                    value={formData.monthlyContribution}
                    onChange={e => handleFormChange('monthlyContribution', Number(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label>{t('tenureMonths')}</label>
                  <input 
                    type="number" 
                    className="input-compact" 
                    value={formData.tenureMonths}
                    onChange={e => handleFormChange('tenureMonths', Number(e.target.value))}
                  />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / span 2' }}>
                  <label>{t('maturityAmount')}</label>
                  <input 
                    type="number" 
                    className="input-compact" 
                    value={formData.expectedMaturityAmount}
                    onChange={e => handleFormChange('expectedMaturityAmount', Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" style={{ background: 'var(--border)' }} onClick={() => setIsModalOpen(false)}>
                {t('cancel')}
              </button>
              <button className="btn btn-primary" onClick={handleSave}>
                {t('save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};



