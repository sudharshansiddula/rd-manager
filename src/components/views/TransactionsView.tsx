import React, { useState, useEffect, useMemo } from 'react';
import { StorageService, storageEvents } from '../../engine/storage';
import type { Member, RDInstallment, Loan, LoanRepayment } from '../../types';
import { Search, Filter, Calendar, Phone, PiggyBank, Wallet, AlertCircle, ArrowUp, ArrowDown, X } from 'lucide-react';
import { formatCurrency } from '../../utils';
import { useI18n } from '../../locales/i18n';

interface HistoryEntry {
  id: string;
  timestamp: number;
  dateStr: string;
  memberId: string;
  monthIndex: number;
  rdAmount: number;
  lateFee: number;
  loanDisbursed: number;
  principalPaid: number;
  interestPaid: number;
}

export const TransactionsView = () => {
  const { t } = useI18n();
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [members, setMembers] = useState<Record<string, Member>>({});
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  
  // Member dynamic stats (computed once per member)
  const [memberStats, setMemberStats] = useState<Record<string, any>>({});

  // Sorting
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'timestamp', direction: 'desc' });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilterType, setDateFilterType] = useState<string>('THIS_MONTH');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [dateError, setDateError] = useState('');
  
  const [showFilters, setShowFilters] = useState(false);
  const [advFilters, setAdvFilters] = useState({
    hasLoan: false,
    hasLateFee: false,
    rdMin: '',
    rdMax: '',
    totalMin: '',
    totalMax: '',
    intMin: '',
    intMax: ''
  });

  const [isCalculating, setIsCalculating] = useState(true);

  const loadData = () => {
    setIsCalculating(true);
    
    // Use setTimeout to yield to the UI thread (simulates background thread isolation)
    // This allows the browser to render the loading state and prevents UI lag/freeze
    setTimeout(() => {
      try {
        const db = StorageService.getDb();
        
        // 1. Build members map
        const memberMap: Record<string, Member> = {};
        db.members?.forEach(m => memberMap[m.id] = m);
        
        // 2. Build indexes for O(1) lookup
        const instMap: Record<string, RDInstallment[]> = {};
        const loanMap: Record<string, Loan[]> = {};
        const repMap: Record<string, LoanRepayment[]> = {};

        db.installments?.forEach(i => {
          if (!instMap[i.memberId]) instMap[i.memberId] = [];
          instMap[i.memberId].push(i);
        });
        db.loans?.forEach(l => {
          if (!loanMap[l.memberId]) loanMap[l.memberId] = [];
          loanMap[l.memberId].push(l);
        });
        db.loanRepayments?.forEach(r => {
          if (!repMap[r.memberId]) repMap[r.memberId] = [];
          repMap[r.memberId].push(r);
        });

        // 3. Compute member stats
        const statsMap: Record<string, any> = {};
        db.members?.forEach(member => {
          const installments = instMap[member.id] || [];
          const loans = loanMap[member.id] || [];
          const repayments = repMap[member.id] || [];
          
          const totalSaved = installments.reduce((sum, i) => sum + (i.amountPaid || 0), 0);
          const paidMonthsCount = Math.floor(totalSaved / (member.monthlyContribution || 1));
          const lastPaymentMonthIndex = installments.reduce((max, i) => (i.amountPaid || 0) > 0 ? Math.max(max, i.monthIndex) : max, 0);
          const maxPaidMonthIndex = Math.max(paidMonthsCount, lastPaymentMonthIndex);
          
          const totalPrincipalRepaid = repayments.reduce((sum, r) => sum + (r.principalPaid || 0), 0);
          const totalLoanPrincipal = loans.reduce((sum, l) => sum + (l.principalAmount || 0), 0);
          const currentLoanBal = totalLoanPrincipal - totalPrincipalRepaid;

          const start = new Date(member.startDate);
          const now = new Date();
          let monthsElapsed = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()) + 1;
          if (monthsElapsed < 1) monthsElapsed = 1;
          if (monthsElapsed > member.tenureMonths) monthsElapsed = member.tenureMonths;
          
          const pendingRDMonths = Math.max(0, monthsElapsed - maxPaidMonthIndex);
          const pendingRDAmount = pendingRDMonths * member.monthlyContribution;
          
          statsMap[member.id] = {
            paidMonthsCount,
            totalSaved,
            currentLoanBal,
            pendingRDMonths,
            pendingRDAmount,
            isCompleted: paidMonthsCount >= member.tenureMonths
          };
        });
        
        // 4. Reconstruct History Entries
        const historyMap = new Map<string, HistoryEntry>();
        
        const getEntry = (mId: string, mIdx: number, tStamp: number): HistoryEntry => {
          const d = new Date(tStamp);
          const dStr = d.toISOString().split('T')[0];
          const key = `${mId}-${mIdx}-${dStr}`;
          if (!historyMap.has(key)) {
            historyMap.set(key, {
              id: key,
              timestamp: tStamp,
              dateStr: dStr,
              memberId: mId,
              monthIndex: mIdx,
              rdAmount: 0,
              lateFee: 0,
              loanDisbursed: 0,
              principalPaid: 0,
              interestPaid: 0
            });
          }
          return historyMap.get(key)!;
        };

        db.installments?.forEach(inst => {
          if (!inst.updatedAt || inst.amountPaid === 0 && inst.lateFeePaid === 0) return;
          const entry = getEntry(inst.memberId, inst.monthIndex, inst.updatedAt);
          entry.rdAmount = inst.amountPaid;
          entry.lateFee = inst.lateFeePaid;
          if (inst.updatedAt > entry.timestamp) entry.timestamp = inst.updatedAt;
        });

        db.loanRepayments?.forEach(rep => {
          if (!rep.createdAt || (rep.principalPaid === 0 && rep.interestPaid === 0)) return;
          const entry = getEntry(rep.memberId, rep.monthIndex || 0, rep.createdAt);
          entry.principalPaid = rep.principalPaid;
          entry.interestPaid = rep.interestPaid;
          if (rep.createdAt > entry.timestamp) entry.timestamp = rep.createdAt;
        });

        db.loans?.forEach(loan => {
          if (!loan.createdAt || loan.principalAmount === 0) return;
          const m = memberMap[loan.memberId];
          let monthIndex = 0;
          if (m) {
            const sDate = new Date(m.startDate);
            const lDate = new Date(loan.disbursementDate);
            monthIndex = (lDate.getFullYear() - sDate.getFullYear()) * 12 + (lDate.getMonth() - sDate.getMonth()) + 1;
          }
          const entry = getEntry(loan.memberId, monthIndex, loan.createdAt);
          entry.loanDisbursed = loan.principalAmount;
          if (loan.createdAt > entry.timestamp) entry.timestamp = loan.createdAt;
        });

        const entries = Array.from(historyMap.values());
        
        // Batch React state updates
        setMembers(memberMap);
        setMemberStats(statsMap);
        setHistoryEntries(entries);
        setIsCalculating(false);
      } catch (err) {
        console.error("Error calculating transactions:", err);
        setIsCalculating(false);
      }
    }, 50); // Small delay to let the UI paint the loading state
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    storageEvents.addEventListener('db_updated', handleUpdate);
    return () => storageEvents.removeEventListener('db_updated', handleUpdate);
  }, []);

  useEffect(() => {
    if (dateFilterType === 'CUSTOM' && dateFrom && dateTo) {
      if (new Date(dateFrom) > new Date(dateTo)) {
        setDateError(t('dateFromCannotBeLater'));
      } else {
        setDateError('');
      }
    } else {
      setDateError('');
    }
  }, [dateFilterType, dateFrom, dateTo]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
    if (sortConfig?.key === key) {
      return sortConfig.direction === 'asc' ? 
        <ArrowUp size={14} style={{ display: 'inline', marginLeft: '4px', verticalAlign: 'text-bottom' }} /> : 
        <ArrowDown size={14} style={{ display: 'inline', marginLeft: '4px', verticalAlign: 'text-bottom' }} />;
    }
    return null;
  };

  const filteredEntries = useMemo(() => {
    return historyEntries.filter(entry => {
      const member = members[entry.memberId];
      if (!member) return false;

      const memberName = member.name.toLowerCase();
      const memberNo = member.memberNumber.toLowerCase();
      const memberMobile = (member.mobile || '').toLowerCase();
      const term = searchTerm.trim().toLowerCase();
      
      // Search filter: Account number, Name, Mobile
      const matchesSearch = !term || 
                            memberNo.includes(term) ||
                            memberName.includes(term) || 
                            memberMobile.includes(term);
                            
      // Date filter
      let matchesDate = true;
      const entryDateObj = new Date(entry.timestamp);
      
      const today = new Date();
      today.setHours(0,0,0,0);
      
      if (dateFilterType === 'TODAY') {
        const d = new Date(entryDateObj);
        d.setHours(0,0,0,0);
        matchesDate = d.getTime() === today.getTime();
      } else if (dateFilterType === 'YESTERDAY') {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const d = new Date(entryDateObj);
        d.setHours(0,0,0,0);
        matchesDate = d.getTime() === yesterday.getTime();
      } else if (dateFilterType === 'THIS_WEEK') {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(today);
        endOfWeek.setDate(today.getDate() + (6 - today.getDay()));
        matchesDate = entryDateObj >= startOfWeek && entryDateObj <= endOfWeek;
      } else if (dateFilterType === 'THIS_MONTH') {
        matchesDate = entryDateObj.getMonth() === today.getMonth() && entryDateObj.getFullYear() === today.getFullYear();
      } else if (dateFilterType === 'THIS_YEAR') {
        matchesDate = entryDateObj.getFullYear() === today.getFullYear();
      } else if (dateFilterType === 'CUSTOM') {
        if (dateFrom) {
          const df = new Date(dateFrom);
          df.setHours(0,0,0,0);
          matchesDate = matchesDate && entryDateObj >= df;
        }
        if (dateTo) {
          const dt = new Date(dateTo);
          dt.setHours(23,59,59,999);
          matchesDate = matchesDate && entryDateObj <= dt;
        }
      }

      let matchesAdvanced = true;
      if (advFilters.hasLoan) {
        const stats = memberStats[entry.memberId] || {};
        if ((stats.currentLoanBal || 0) <= 0 && entry.loanDisbursed <= 0) matchesAdvanced = false;
      }
      if (advFilters.hasLateFee && entry.lateFee <= 0) {
        matchesAdvanced = false;
      }
      
      const rdMin = advFilters.rdMin ? Number(advFilters.rdMin) : -1;
      const rdMax = advFilters.rdMax ? Number(advFilters.rdMax) : Infinity;
      if (rdMin !== -1 && entry.rdAmount < rdMin) matchesAdvanced = false;
      if (rdMax !== Infinity && entry.rdAmount > rdMax) matchesAdvanced = false;

      const intMin = advFilters.intMin ? Number(advFilters.intMin) : -1;
      const intMax = advFilters.intMax ? Number(advFilters.intMax) : Infinity;
      if (intMin !== -1 && entry.interestPaid < intMin) matchesAdvanced = false;
      if (intMax !== Infinity && entry.interestPaid > intMax) matchesAdvanced = false;

      const totalPaid = entry.rdAmount + entry.principalPaid + entry.interestPaid + entry.lateFee;
      const totalMin = advFilters.totalMin ? Number(advFilters.totalMin) : -1;
      const totalMax = advFilters.totalMax ? Number(advFilters.totalMax) : Infinity;
      if (totalMin !== -1 && totalPaid < totalMin) matchesAdvanced = false;
      if (totalMax !== Infinity && totalPaid > totalMax) matchesAdvanced = false;

      return matchesSearch && matchesDate && matchesAdvanced;
    });
  }, [historyEntries, members, searchTerm, dateFilterType, dateFrom, dateTo, advFilters, memberStats]);

  const sortedEntries = useMemo(() => {
    let sortableItems = [...filteredEntries];
    const term = searchTerm.trim().toLowerCase();

    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const memberA = members[a.memberId];
        const memberB = members[b.memberId];

        // If search term is present, prioritize exact account number matches first
        if (term) {
          const aExact = memberA?.memberNumber.toLowerCase() === term;
          const bExact = memberB?.memberNumber.toLowerCase() === term;
          if (aExact && !bExact) return -1;
          if (!aExact && bExact) return 1;
          const aStarts = memberA?.memberNumber.toLowerCase().startsWith(term);
          const bStarts = memberB?.memberNumber.toLowerCase().startsWith(term);
          if (aStarts && !bStarts) return -1;
          if (!aStarts && bStarts) return 1;
        }

        const statsA = memberStats[a.memberId] || {};
        const statsB = memberStats[b.memberId] || {};

        let valA: any = 0;
        let valB: any = 0;

        switch (sortConfig.key) {
          case 'timestamp':
            valA = a.timestamp; valB = b.timestamp; break;
          case 'memberName':
            valA = memberA?.name || ''; valB = memberB?.name || ''; break;
          case 'memberStatus':
            valA = statsA.paidMonthsCount || 0; valB = statsB.paidMonthsCount || 0; break;
          case 'monthIndex':
            valA = a.monthIndex; valB = b.monthIndex; break;
          case 'rdAmount':
            valA = a.rdAmount; valB = b.rdAmount; break;
          case 'loanDisbursed':
            valA = a.loanDisbursed; valB = b.loanDisbursed; break;
          case 'principalPaid':
            valA = a.principalPaid; valB = b.principalPaid; break;
          case 'interestPaid':
            valA = a.interestPaid; valB = b.interestPaid; break;
          case 'lateFee':
            valA = a.lateFee; valB = b.lateFee; break;
          case 'totalPaid':
            valA = a.rdAmount + a.principalPaid + a.interestPaid + a.lateFee;
            valB = b.rdAmount + b.principalPaid + b.interestPaid + b.lateFee;
            break;
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredEntries, sortConfig, members, memberStats]);

  // Dashboard Stats
  const totalAmount = filteredEntries.reduce((sum, e) => sum + e.rdAmount + e.principalPaid + e.interestPaid + e.lateFee, 0);
  const totalLoanIssued = filteredEntries.reduce((sum, e) => sum + e.loanDisbursed, 0);
  const totalRecords = filteredEntries.length;
  
  const totalPages = Math.ceil(totalRecords / itemsPerPage);
  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedEntries.slice(start, start + itemsPerPage);
  }, [sortedEntries, currentPage]);

  if (isCalculating) {
    return (
      <div className="view-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '400px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid #e0e7ff', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <div style={{ color: '#4f46e5', fontWeight: 600, fontSize: `calc(16px * var(--text-scale, 1))` }}>Processing Data...</div>
          <style>
            {`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}
          </style>
        </div>
      </div>
    );
  }

  return (
    <div className="view-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Dashboard Top */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 250px', background: '#fff', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: `calc(14px * var(--text-scale, 1))` }}>{t('totalEntries')}</h3>
          <p style={{ margin: 0, fontSize: `calc(24px * var(--text-scale, 1))`, fontWeight: 'bold', color: '#111827' }}>{totalRecords}</p>
        </div>
        <div style={{ flex: '1 1 250px', background: '#fff', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: `calc(14px * var(--text-scale, 1))` }}>{t('totalCollectionsFiltered')}</h3>
          <p style={{ margin: 0, fontSize: `calc(24px * var(--text-scale, 1))`, fontWeight: 'bold', color: '#10b981' }}>₹{totalAmount.toLocaleString()}</p>
        </div>
        <div style={{ flex: '1 1 250px', background: '#fff', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: `calc(14px * var(--text-scale, 1))` }}>{t('totalLoanIssued')}</h3>
          <p style={{ margin: 0, fontSize: `calc(24px * var(--text-scale, 1))`, fontWeight: 'bold', color: '#ef4444' }}>₹{totalLoanIssued.toLocaleString()}</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px', background: '#fff', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 250px', position: 'relative', display: 'flex', alignItems: 'center', background: '#f9fafb', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <Search size={18} color="#6b7280" style={{ marginRight: '8px', flexShrink: 0 }} />
            <input 
              type="text" 
              placeholder={t('searchHint')} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', paddingRight: searchTerm ? '24px' : '0' }}
            />
            {searchTerm && (
              <X 
                size={16} 
                color="#6b7280" 
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', flexShrink: 0 }} 
                onClick={() => setSearchTerm('')} 
              />
            )}
          </div>
          
          <button 
            onClick={() => setShowFilters(!showFilters)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 16px', borderRadius: '8px',
              background: showFilters ? '#e0e7ff' : '#f9fafb',
              border: `1px solid ${showFilters ? '#4f46e5' : '#e5e7eb'}`,
              color: showFilters ? '#4f46e5' : '#4b5563',
              cursor: 'pointer', fontWeight: 600, fontSize: `calc(14px * var(--text-scale, 1))`,
              transition: 'all 0.2s'
            }}
          >
            <Filter size={18} />
            {t('filterWord')}
          </button>
        </div>

        {/* Quick Date Filters */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', flex: '1 1 100%' }}>
          {['TODAY', 'YESTERDAY', 'THIS_WEEK', 'THIS_MONTH', 'THIS_YEAR', 'CUSTOM'].map(filter => {
            let label = filter;
            if (filter === 'TODAY') label = t('filterToday');
            if (filter === 'YESTERDAY') label = t('filterYesterday');
            if (filter === 'THIS_WEEK') label = t('filterThisWeek');
            if (filter === 'THIS_MONTH') label = t('filterThisMonth');
            if (filter === 'THIS_YEAR') label = t('filterThisYear');
            if (filter === 'CUSTOM') label = t('filterCustom');
            return (
              <button
                key={filter}
                onClick={() => setDateFilterType(filter)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '16px',
                  border: 'none',
                  background: dateFilterType === filter ? '#4f46e5' : '#f3f4f6',
                  color: dateFilterType === filter ? '#fff' : '#4b5563',
                  fontSize: `calc(13px * var(--text-scale, 1))`,
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {dateFilterType === 'CUSTOM' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f9fafb', padding: '8px 12px', borderRadius: '8px', border: dateError ? '1px solid #ef4444' : '1px solid #e5e7eb' }}>
              <Calendar size={18} color="#6b7280" />
              <input 
                type="date" 
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none' }}
              />
              <span style={{ color: '#6b7280' }}>to</span>
              <input 
                type="date" 
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none' }}
              />
            </div>
            {dateError && <span style={{ color: '#ef4444', fontSize: `calc(12px * var(--text-scale, 1))`, paddingLeft: '4px', fontWeight: 500 }}>{dateError}</span>}
          </div>
        )}

        {showFilters && (
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px', marginTop: '8px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: `calc(14px * var(--text-scale, 1))`, color: '#4b5563', fontWeight: 500 }}>
                <input type="checkbox" checked={advFilters.hasLoan} onChange={(e) => setAdvFilters(prev => ({ ...prev, hasLoan: e.target.checked }))} style={{ width: '16px', height: '16px', accentColor: '#4f46e5' }} />
                {t('filterLoanActive')}
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: `calc(14px * var(--text-scale, 1))`, color: '#4b5563', fontWeight: 500 }}>
                <input type="checkbox" checked={advFilters.hasLateFee} onChange={(e) => setAdvFilters(prev => ({ ...prev, hasLateFee: e.target.checked }))} style={{ width: '16px', height: '16px', accentColor: '#4f46e5' }} />
                {t('filterOnlyLateFee')}
              </label>
            </div>
            <div>
              <label style={{ fontSize: `calc(13px * var(--text-scale, 1))`, fontWeight: 600, color: '#4b5563', marginBottom: '8px', display: 'block' }}>{t('filterRdRange')}</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="number" placeholder={t('minAmount')} value={advFilters.rdMin} onChange={e => setAdvFilters(p => ({...p, rdMin: e.target.value}))} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: `calc(13px * var(--text-scale, 1))` }} />
                <input type="number" placeholder={t('maxAmount')} value={advFilters.rdMax} onChange={e => setAdvFilters(p => ({...p, rdMax: e.target.value}))} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: `calc(13px * var(--text-scale, 1))` }} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: `calc(13px * var(--text-scale, 1))`, fontWeight: 600, color: '#4b5563', marginBottom: '8px', display: 'block' }}>{t('filterTotalRange')}</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="number" placeholder={t('minAmount')} value={advFilters.totalMin} onChange={e => setAdvFilters(p => ({...p, totalMin: e.target.value}))} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: `calc(13px * var(--text-scale, 1))` }} />
                <input type="number" placeholder={t('maxAmount')} value={advFilters.totalMax} onChange={e => setAdvFilters(p => ({...p, totalMax: e.target.value}))} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: `calc(13px * var(--text-scale, 1))` }} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: `calc(13px * var(--text-scale, 1))`, fontWeight: 600, color: '#4b5563', marginBottom: '8px', display: 'block' }}>{t('filterInterestRange')}</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="number" placeholder={t('minAmount')} value={advFilters.intMin} onChange={e => setAdvFilters(p => ({...p, intMin: e.target.value}))} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: `calc(13px * var(--text-scale, 1))` }} />
                <input type="number" placeholder={t('maxAmount')} value={advFilters.intMax} onChange={e => setAdvFilters(p => ({...p, intMax: e.target.value}))} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: `calc(13px * var(--text-scale, 1))` }} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button onClick={() => setAdvFilters({ hasLoan: false, hasLateFee: false, rdMin: '', rdMax: '', totalMin: '', totalMax: '', intMin: '', intMax: '' })} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ef4444', color: '#ef4444', background: 'transparent', cursor: 'pointer', fontSize: `calc(13px * var(--text-scale, 1))`, fontWeight: 600, width: '100%' }}>
                {t('resetFilters')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Comprehensive History List */}
      <div className="table-wrapper" style={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', flex: 1, minHeight: 0, maxHeight: 'none', overflow: 'auto' }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1200px' }}>
          <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
                <th onClick={() => requestSort('timestamp')} style={{ cursor: 'pointer', padding: '12px 16px', color: '#4b5563', fontWeight: 600, fontSize: `calc(13px * var(--text-scale, 1))`, userSelect: 'none' }}>{t('entryDate')}{getSortIcon('timestamp')}</th>
                <th onClick={() => requestSort('memberName')} style={{ cursor: 'pointer', padding: '12px 16px', color: '#4b5563', fontWeight: 600, fontSize: `calc(13px * var(--text-scale, 1))`, userSelect: 'none' }}>{t('memberDetails')}{getSortIcon('memberName')}</th>
                <th onClick={() => requestSort('memberStatus')} style={{ cursor: 'pointer', padding: '12px 16px', color: '#4b5563', fontWeight: 600, fontSize: `calc(13px * var(--text-scale, 1))`, userSelect: 'none' }}>{t('memberStatus')}{getSortIcon('memberStatus')}</th>
                <th onClick={() => requestSort('monthIndex')} style={{ cursor: 'pointer', padding: '12px 16px', color: '#4b5563', fontWeight: 600, fontSize: `calc(13px * var(--text-scale, 1))`, background: '#f0f9ff', userSelect: 'none' }}>{t('entryMonth')}{getSortIcon('monthIndex')}</th>
                <th onClick={() => requestSort('rdAmount')} style={{ cursor: 'pointer', padding: '12px 16px', color: '#4b5563', fontWeight: 600, fontSize: `calc(13px * var(--text-scale, 1))`, background: '#f0f9ff', textAlign: 'right', userSelect: 'none' }}>{t('rdPaid')}{getSortIcon('rdAmount')}</th>
                <th onClick={() => requestSort('loanDisbursed')} style={{ cursor: 'pointer', padding: '12px 16px', color: '#4b5563', fontWeight: 600, fontSize: `calc(13px * var(--text-scale, 1))`, background: '#fff1f2', textAlign: 'right', userSelect: 'none' }}>{t('loanIssued')}{getSortIcon('loanDisbursed')}</th>
                <th onClick={() => requestSort('principalPaid')} style={{ cursor: 'pointer', padding: '12px 16px', color: '#4b5563', fontWeight: 600, fontSize: `calc(13px * var(--text-scale, 1))`, background: '#fff1f2', textAlign: 'right', userSelect: 'none' }}>{t('prinPaid')}{getSortIcon('principalPaid')}</th>
                <th onClick={() => requestSort('interestPaid')} style={{ cursor: 'pointer', padding: '12px 16px', color: '#4b5563', fontWeight: 600, fontSize: `calc(13px * var(--text-scale, 1))`, background: '#fff1f2', textAlign: 'right', userSelect: 'none' }}>{t('intPaid')}{getSortIcon('interestPaid')}</th>
                <th onClick={() => requestSort('lateFee')} style={{ cursor: 'pointer', padding: '12px 16px', color: '#4b5563', fontWeight: 600, fontSize: `calc(13px * var(--text-scale, 1))`, background: '#fdf4ff', textAlign: 'right', userSelect: 'none' }}>{t('lateFeeHistory')}{getSortIcon('lateFee')}</th>
                <th onClick={() => requestSort('totalPaid')} style={{ cursor: 'pointer', padding: '12px 16px', color: '#4b5563', fontWeight: 600, fontSize: `calc(13px * var(--text-scale, 1))`, background: '#f0fdf4', textAlign: 'right', userSelect: 'none' }}>{t('totalPaidHistory')}{getSortIcon('totalPaid')}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedEntries.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                    {t('noEntriesFound')}
                  </td>
                </tr>
              ) : (
                paginatedEntries.map((entry, index) => {
                  const member = members[entry.memberId];
                  const stats = memberStats[entry.memberId] || {};
                  
                  const monthDate = new Date(member.startDate);
                  monthDate.setMonth(monthDate.getMonth() + (entry.monthIndex - 1));
                  const entryMonthStr = monthDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
                  
                  const totalPaidThisEntry = entry.rdAmount + entry.principalPaid + entry.interestPaid + entry.lateFee;

                  return (
                    <tr 
                      key={entry.id} 
                      style={{ borderBottom: '1px solid #e5e7eb', background: index % 2 === 0 ? '#fff' : '#fafafa', cursor: 'pointer' }} 
                      className="hoverable-row"
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('app-navigate', { 
                          detail: { view: 'members', memberId: entry.memberId, monthIndex: entry.monthIndex } 
                        }));
                      }}
                    >
                      {/* Date */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 600, color: '#111827' }}>
                          {new Date(entry.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                        <div style={{ fontSize: `calc(12px * var(--text-scale, 1))`, color: '#6b7280', marginTop: '4px' }}>
                          {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      
                      {/* Member Details */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 600, color: '#111827', fontSize: `calc(14px * var(--text-scale, 1))` }}>{member.name}</div>
                        <div style={{ fontSize: `calc(12px * var(--text-scale, 1))`, color: 'var(--primary)', fontWeight: 500 }}>{t('acStr')}: #{member.memberNumber}</div>
                        <div style={{ fontSize: `calc(12px * var(--text-scale, 1))`, color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <Phone size={10} /> {member.mobile}
                        </div>
                      </td>
                      
                      {/* Member Status */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                        <div style={{ fontSize: `calc(12px * var(--text-scale, 1))`, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                            <span style={{ color: '#6b7280' }}>{t('monthsPaidTable')}</span>
                            <strong style={{ color: 'var(--success)' }}>{stats.paidMonthsCount} / {member.tenureMonths}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                            <span style={{ color: '#6b7280' }}>{t('loanOutTable')}</span>
                            <strong style={{ color: stats.currentLoanBal > 0 ? 'var(--danger)' : '#6b7280' }}>
                              ₹{formatCurrency(stats.currentLoanBal || 0)}
                            </strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', borderTop: '1px dashed #e5e7eb', paddingTop: '4px' }}>
                            <span style={{ color: '#6b7280' }}>{t('dueStatusTable')}</span>
                            {stats.pendingRDMonths > 0 ? (
                              <strong style={{ color: 'var(--danger)' }}>{t('dueAmount')} ₹{formatCurrency(stats.pendingRDAmount)}</strong>
                            ) : stats.isCompleted ? (
                              <strong style={{ color: 'var(--primary)' }}>{t('completed')}</strong>
                            ) : (
                              <strong style={{ color: 'var(--success)' }}>{t('paidTillDate')}</strong>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Entry Month */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'top', background: '#f0f9ff' }}>
                        <div style={{ fontWeight: 600, fontSize: `calc(13px * var(--text-scale, 1))`, color: '#0369a1' }}>{entryMonthStr}</div>
                        <div style={{ fontSize: `calc(11px * var(--text-scale, 1))`, color: '#0284c7' }}>({t('month')} {entry.monthIndex})</div>
                      </td>

                      {/* RD Paid */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'top', textAlign: 'right', background: '#f0f9ff' }}>
                        <div style={{ fontWeight: 600, color: entry.rdAmount > 0 ? '#0369a1' : '#9ca3af', fontSize: `calc(14px * var(--text-scale, 1))` }}>
                          {entry.rdAmount > 0 ? `₹${formatCurrency(entry.rdAmount)}` : '-'}
                        </div>
                      </td>

                      {/* Loan Issued */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'top', textAlign: 'right', background: '#fff1f2' }}>
                        <div style={{ fontWeight: 600, color: entry.loanDisbursed > 0 ? '#be123c' : '#9ca3af', fontSize: `calc(14px * var(--text-scale, 1))` }}>
                          {entry.loanDisbursed > 0 ? `₹${formatCurrency(entry.loanDisbursed)}` : '-'}
                        </div>
                      </td>

                      {/* Prin Paid */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'top', textAlign: 'right', background: '#fff1f2' }}>
                        <div style={{ fontWeight: 600, color: entry.principalPaid > 0 ? '#059669' : '#9ca3af', fontSize: `calc(14px * var(--text-scale, 1))` }}>
                          {entry.principalPaid > 0 ? `₹${formatCurrency(entry.principalPaid)}` : '-'}
                        </div>
                      </td>

                      {/* Int Paid */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'top', textAlign: 'right', background: '#fff1f2' }}>
                        <div style={{ fontWeight: 600, color: entry.interestPaid > 0 ? '#059669' : '#9ca3af', fontSize: `calc(14px * var(--text-scale, 1))` }}>
                          {entry.interestPaid > 0 ? `₹${formatCurrency(entry.interestPaid)}` : '-'}
                        </div>
                      </td>

                      {/* Late Fee */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'top', textAlign: 'right', background: '#fdf4ff' }}>
                        <div style={{ fontWeight: 600, color: entry.lateFee > 0 ? '#a21caf' : '#9ca3af', fontSize: `calc(14px * var(--text-scale, 1))` }}>
                          {entry.lateFee > 0 ? `₹${formatCurrency(entry.lateFee)}` : '-'}
                        </div>
                      </td>

                      {/* Total Paid */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'top', textAlign: 'right', background: '#f0fdf4' }}>
                        <div style={{ fontWeight: 700, color: totalPaidThisEntry > 0 ? '#15803d' : '#9ca3af', fontSize: `calc(15px * var(--text-scale, 1))` }}>
                          {totalPaidThisEntry > 0 ? `₹${formatCurrency(totalPaidThisEntry)}` : '-'}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', marginTop: '16px', background: '#fff', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <div style={{ color: '#6b7280', fontSize: `calc(14px * var(--text-scale, 1))` }}>
            Showing {Math.min(totalRecords, (currentPage - 1) * itemsPerPage + 1)} to {Math.min(totalRecords, currentPage * itemsPerPage)} of {totalRecords} entries
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #d1d5db', background: currentPage === 1 ? '#f3f4f6' : '#fff', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontWeight: 600, color: '#4b5563' }}
            >
              Previous
            </button>
            <div style={{ padding: '6px 12px', fontWeight: 600, color: '#111827', fontSize: `calc(14px * var(--text-scale, 1))` }}>Page {currentPage} of {totalPages}</div>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #d1d5db', background: currentPage === totalPages ? '#f3f4f6' : '#fff', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontWeight: 600, color: '#4b5563' }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

