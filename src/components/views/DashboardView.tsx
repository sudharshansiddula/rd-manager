import React, { useState, useEffect, useMemo } from 'react';
import { useI18n } from '../../locales/i18n';
import { StorageService, storageEvents } from '../../engine/storage';
import { formatCurrency } from '../../utils';
import { 
  Users, PiggyBank, Wallet, Percent, CalendarDays,
  Trophy, AlertTriangle, Clock, ChevronLeft, ChevronRight
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
  PieChart, Pie
} from 'recharts';

export const DashboardView = () => {
  const { t } = useI18n();
  const [db, setDb] = useState(() => StorageService.getDb());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const handleDbUpdate = () => setDb({ ...StorageService.getDb() });
    storageEvents.addEventListener('db_updated', handleDbUpdate);
    return () => storageEvents.removeEventListener('db_updated', handleDbUpdate);
  }, []);

  const stats = useMemo(() => {
    let totalMembers = 0, activeMembers = 0, completedMembers = 0;
    let totalSaved = 0;
    let activeLoans = 0, completedLoans = 0;
    let totalLoanPrincipal = 0, totalDueInterest = 0;
    let pendingMembers = 0, onTimeMembers = 0;
    
    let thisMonthCollection = 0, lastMonthCollection = 0;
    let thisMonthInterest = 0;
    
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${now.getMonth()}`;
    const lastMonthD = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthKey = `${lastMonthD.getFullYear()}-${lastMonthD.getMonth()}`;

    const membersList = db.members || [];
    const installments = db.installments || [];
    const loans = db.loans || [];
    const loanRepayments = db.loanRepayments || [];

    const memberStatsMap = new Map<string, any>();

    // 1. Process Installments
    installments.forEach(inst => {
      if (inst.amountPaid > 0) {
        totalSaved += inst.amountPaid;
        const upDate = new Date(inst.updatedAt || Date.now());
        const key = `${upDate.getFullYear()}-${upDate.getMonth()}`;
        if (key === currentMonthKey) thisMonthCollection += inst.amountPaid;
        if (key === lastMonthKey) lastMonthCollection += inst.amountPaid;
      }
    });

    // 2. Process Repayments
    loanRepayments.forEach(rep => {
      const repDate = new Date(rep.createdAt || Date.now());
      const key = `${repDate.getFullYear()}-${repDate.getMonth()}`;
      if (key === currentMonthKey) thisMonthInterest += rep.interestPaid;
    });

    // 3. Process Members
    const settings = StorageService.getSettings();
    const loanInterestRate = settings.loanInterestRate ?? 2;

    membersList.forEach(m => {
      totalMembers++;
      
      const mInsts = installments.filter(i => i.memberId === m.id);
      const mTotalSaved = mInsts.reduce((sum, i) => sum + (i.amountPaid || 0), 0);
      const paidMonths = Math.floor(mTotalSaved / (m.monthlyContribution || 1));
      
      const start = new Date(m.startDate);
      let monthsElapsed = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()) + 1;
      if (monthsElapsed < 1) monthsElapsed = 1;
      if (monthsElapsed > m.tenureMonths) monthsElapsed = m.tenureMonths;
      
      const pendingMonths = Math.max(0, monthsElapsed - paidMonths);
      const isCompleted = mTotalSaved >= (m.monthlyContribution * m.tenureMonths);

      if (isCompleted) {
        completedMembers++;
      } else {
        activeMembers++;
        if (pendingMonths > 0) pendingMembers++;
        else onTimeMembers++;
      }

      // Loans
      const mLoans = loans.filter(l => l.memberId === m.id);
      const mReps = loanRepayments.filter(r => r.memberId === m.id);
      const mLoanPrin = mLoans.reduce((s, l) => s + l.principalAmount, 0);
      const mRepPrin = mReps.reduce((s, r) => s + r.principalPaid, 0);
      const currentLoanBal = mLoanPrin - mRepPrin;

      if (mLoanPrin > 0) {
        if (currentLoanBal > 0) activeLoans++;
        else completedLoans++;
      }
      
      totalLoanPrincipal += currentLoanBal;

      // Interest logic
      let runningLoanBal = 0;
      let runningInterestDue = 0;
      for (let i = 1; i <= m.tenureMonths; i++) {
        const rep = mReps.find(x => x.monthIndex === i);
        const monthDate = new Date(start.getFullYear(), start.getMonth() + (i - 1), 1);
        
        const loansThisMonth = mLoans.filter(l => {
          const ld = new Date(l.disbursementDate);
          return ld.getFullYear() === monthDate.getFullYear() && ld.getMonth() === monthDate.getMonth();
        });
        const loanDisbursedThisMonth = loansThisMonth.reduce((s, l) => s + l.principalAmount, 0);

        const monthlyInterest = runningLoanBal > 0 ? Math.round((runningLoanBal * loanInterestRate) / 100) : 0;
        runningInterestDue += monthlyInterest;
        
        runningLoanBal += loanDisbursedThisMonth;
        
        if (rep) {
          runningLoanBal -= rep.principalPaid;
          runningInterestDue -= rep.interestPaid;
        }
        
        if (i === monthsElapsed) {
          totalDueInterest += Math.max(0, runningInterestDue);
        }
      }

      memberStatsMap.set(m.id, {
        member: m,
        totalSaved: mTotalSaved,
        paidMonths,
        pendingMonths,
        pendingAmount: pendingMonths * m.monthlyContribution,
        currentLoanBal,
        isCompleted
      });
    });

    return {
      totalMembers, activeMembers, completedMembers,
      totalSaved, thisMonthCollection, lastMonthCollection,
      activeLoans, completedLoans, totalLoanPrincipal,
      totalDueInterest, thisMonthInterest,
      pendingMembers, onTimeMembers,
      memberStatsMap
    };
  }, [db]);

  // Chart Data: Monthly RD Collection for currentYear
  const monthlyChartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const data = months.map((m, idx) => ({ name: m, amount: 0, count: 0, members: new Set() }));
    
    (db.installments || []).forEach(inst => {
      if (inst.amountPaid > 0 && inst.updatedAt) {
        const d = new Date(inst.updatedAt);
        if (d.getFullYear() === currentYear) {
          const mIdx = d.getMonth();
          data[mIdx].amount += inst.amountPaid;
          data[mIdx].count++;
          data[mIdx].members.add(inst.memberId);
        }
      }
    });

    return data.map(d => ({ ...d, uniqueMembers: d.members.size }));
  }, [db.installments, currentYear]);

  // Chart Data: Payment Status
  const paymentStatusData = useMemo(() => {
    return [
      { name: t('onTimeDash'), value: stats.onTimeMembers, color: '#10b981' },
      { name: t('pendingDash'), value: stats.pendingMembers, color: '#ef4444' },
      { name: t('completedMembersDash'), value: stats.completedMembers, color: '#3b82f6' }
    ].filter(d => d.value > 0);
  }, [stats, t]);

  // Top 5 Members
  const top5Members = useMemo(() => {
    const arr = Array.from(stats.memberStatsMap.values());
    arr.sort((a, b) => b.totalSaved - a.totalSaved);
    return arr.slice(0, 5);
  }, [stats.memberStatsMap]);

  // Pending Members
  const pendingMembersList = useMemo(() => {
    const arr = Array.from(stats.memberStatsMap.values()).filter(m => m.pendingAmount > 0);
    arr.sort((a, b) => b.pendingAmount - a.pendingAmount);
    return arr.slice(0, 5);
  }, [stats.memberStatsMap]);

  // Recent Transactions
  const recentTransactions = useMemo(() => {
    const list: any[] = [];
    (db.installments || []).forEach(i => {
      if (i.amountPaid > 0 && i.updatedAt) list.push({ type: 'RD', date: i.updatedAt, amount: i.amountPaid, memberId: i.memberId, mIdx: i.monthIndex });
    });
    (db.loans || []).forEach(l => {
      if (l.principalAmount > 0 && l.createdAt) list.push({ type: 'LOAN', date: l.createdAt, amount: l.principalAmount, memberId: l.memberId });
    });
    (db.loanRepayments || []).forEach(r => {
      if ((r.principalPaid > 0 || r.interestPaid > 0) && r.createdAt) list.push({ type: 'REP', date: r.createdAt, amount: r.principalPaid + r.interestPaid, memberId: r.memberId, p: r.principalPaid, i: r.interestPaid });
    });
    list.sort((a, b) => b.date - a.date);
    return list.slice(0, 5);
  }, [db]);

  const handleNav = (view: string, params?: any) => {
    window.dispatchEvent(new CustomEvent('app-navigate', { detail: { view, ...params } }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', backgroundColor: '#f9fafb', padding: '24px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: '#111827' }}>{t('dashboardTitle')}</h2>
          <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '14px' }}>{t('dashboardSubtitle')}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: '#fff', padding: '8px 16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <CalendarDays size={18} color="#6b7280" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
              {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>
              {new Date().toLocaleDateString('en-GB', { weekday: 'long' })}
            </span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '16px', borderTop: '4px solid #4f46e5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Users size={20} color="#4f46e5" />
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#4f46e5' }}>{t('totalMembersCount')}</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#111827', marginBottom: '12px' }}>{stats.totalMembers}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#4b5563', marginBottom: '4px' }}>
            <span>{t('activeMembersDash')}</span><span>{stats.activeMembers}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#4b5563' }}>
            <span>{t('completedMembersDash')}</span><span>{stats.completedMembers}</span>
          </div>
        </div>

        <div className="card" style={{ padding: '16px', borderTop: '4px solid #10b981' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <PiggyBank size={20} color="#10b981" />
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#10b981' }}>{t('totalRdSavings')}</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#111827', marginBottom: '12px' }}>₹{formatCurrency(stats.totalSaved)}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#4b5563', marginBottom: '4px' }}>
            <span>{t('thisMonthCollection')}</span><span>₹{formatCurrency(stats.thisMonthCollection)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#4b5563' }}>
            <span>{t('lastMonthCollection')}</span><span>₹{formatCurrency(stats.lastMonthCollection)}</span>
          </div>
        </div>

        <div className="card" style={{ padding: '16px', borderTop: '4px solid #ef4444' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Wallet size={20} color="#ef4444" />
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#ef4444' }}>{t('totalLoansIssued')}</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#111827', marginBottom: '12px' }}>₹{formatCurrency(stats.totalLoanPrincipal)}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#4b5563', marginBottom: '4px' }}>
            <span>{t('activeLoansDash')}</span><span>{stats.activeLoans}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#4b5563' }}>
            <span>{t('completedLoansDash')}</span><span>{stats.completedLoans}</span>
          </div>
        </div>

        <div className="card" style={{ padding: '16px', borderTop: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Percent size={20} color="#f59e0b" />
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#f59e0b' }}>{t('interestDueDash')}</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#111827', marginBottom: '12px' }}>₹{formatCurrency(stats.totalDueInterest)}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#4b5563', marginBottom: '4px' }}>
            <span>{t('thisMonthInterest')}</span><span>₹{formatCurrency(stats.thisMonthInterest)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#4b5563' }}>
            <span>{t('totalPendingInterest')}</span><span>₹{formatCurrency(stats.totalDueInterest)}</span>
          </div>
        </div>

        <div className="card" style={{ padding: '16px', borderTop: '4px solid #3b82f6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <CalendarDays size={20} color="#3b82f6" />
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#3b82f6' }}>{t('pendingRdMembers')}</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#111827', marginBottom: '12px' }}>{stats.pendingMembers}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#4b5563', marginBottom: '4px' }}>
            <span>{t('onTimeDash')}</span><span>{stats.onTimeMembers}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#4b5563' }}>
            <span>{t('pendingDash')}</span><span>{stats.pendingMembers}</span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: '2 1 400px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#111827' }}>
              <span style={{ display: 'inline-block', width: '4px', height: '16px', background: '#4f46e5', borderRadius: '2px' }}></span>
              {t('monthlyCollectionChart')}
            </h3>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '4px' }}>
              <button onClick={() => setCurrentYear(y => y - 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><ChevronLeft size={16} /></button>
              <span style={{ fontSize: '13px', fontWeight: 600, padding: '0 8px' }}>{currentYear}</span>
              <button onClick={() => setCurrentYear(y => y + 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><ChevronRight size={16} /></button>
            </div>
          </div>
          <div style={{ height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(v) => `₹${v}`} />
                <RechartsTooltip 
                  cursor={{ fill: '#f3f4f6' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                          <p style={{ margin: '0 0 8px 0', fontWeight: 600, color: '#111827' }}>{data.name} {currentYear}</p>
                          <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#4b5563' }}>RD Collection: <strong style={{ color: '#10b981' }}>₹{formatCurrency(data.amount)}</strong></p>
                          <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#4b5563' }}>Payments: {data.count}</p>
                          <p style={{ margin: 0, fontSize: '13px', color: '#4b5563' }}>Members Paid: {data.uniqueMembers}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                  {monthlyChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={new Date().getMonth() === index && currentYear === new Date().getFullYear() ? '#4f46e5' : '#818cf8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card" style={{ flex: '1 1 300px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#111827' }}>
            <span style={{ display: 'inline-block', width: '4px', height: '16px', background: '#10b981', borderRadius: '2px' }}></span>
            {t('paymentStatusChart')}
          </h3>
          <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentStatusData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {paymentStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(value: any, name: string) => [`${value} Members`, name]} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#111827' }}>{stats.totalMembers}</div>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>Total</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
            {paymentStatusData.map((d, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: d.color }}></div>
                  <span style={{ color: '#4b5563' }}>{d.name}</span>
                </div>
                <div style={{ fontWeight: 600 }}>{d.value} <span style={{ color: '#9ca3af', fontWeight: 400, marginLeft: '4px' }}>({((d.value / stats.totalMembers) * 100).toFixed(1)}%)</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
        
        {/* Top 5 Members */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', color: '#111827' }}>
              <Trophy size={18} color="#10b981" />
              {t('top5Members')}
            </h3>
            <button onClick={() => handleNav('members')} className="btn" style={{ background: 'none', border: 'none', color: '#4f46e5', fontSize: '13px', fontWeight: 600, padding: 0 }}>
              {t('viewAll')}
            </button>
          </div>
          <p style={{ margin: '-10px 0 16px 0', fontSize: '12px', color: '#6b7280' }}>{t('basedOnSavings')}</p>
          
          <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb', color: '#6b7280', textAlign: 'left' }}>
                <th style={{ paddingBottom: '8px', fontWeight: 500 }}>#</th>
                <th style={{ paddingBottom: '8px', fontWeight: 500 }}>{t('name')}</th>
                <th style={{ paddingBottom: '8px', fontWeight: 500, textAlign: 'right' }}>Total</th>
                <th style={{ paddingBottom: '8px', fontWeight: 500, textAlign: 'right' }}>{t('months')}</th>
              </tr>
            </thead>
            <tbody>
              {top5Members.map((m, idx) => (
                <tr key={m.member.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 0', color: '#6b7280' }}>{idx + 1}</td>
                  <td style={{ padding: '10px 0', fontWeight: 500, color: '#111827' }}>{m.member.name}</td>
                  <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 600, color: '#10b981' }}>₹{formatCurrency(m.totalSaved)}</td>
                  <td style={{ padding: '10px 0', textAlign: 'right', color: '#4b5563' }}>{m.paidMonths} / {m.member.tenureMonths}</td>
                </tr>
              ))}
              {top5Members.length === 0 && (
                <tr><td colSpan={4} style={{ padding: '20px 0', textAlign: 'center', color: '#9ca3af' }}>{t('noMembersYet')}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pending Members */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', color: '#111827' }}>
              <AlertTriangle size={18} color="#ef4444" />
              {t('pendingMembersAttention')}
            </h3>
            <button onClick={() => handleNav('members')} className="btn" style={{ background: 'none', border: 'none', color: '#4f46e5', fontSize: '13px', fontWeight: 600, padding: 0 }}>
              {t('viewAll')}
            </button>
          </div>
          
          <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb', color: '#6b7280', textAlign: 'left' }}>
                <th style={{ paddingBottom: '8px', fontWeight: 500 }}>#</th>
                <th style={{ paddingBottom: '8px', fontWeight: 500 }}>{t('name')}</th>
                <th style={{ paddingBottom: '8px', fontWeight: 500, textAlign: 'right' }}>{t('totalDue')}</th>
              </tr>
            </thead>
            <tbody>
              {pendingMembersList.map((m, idx) => (
                <tr key={m.member.id} style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }} onClick={() => handleNav('members', { memberId: m.member.id })}>
                  <td style={{ padding: '10px 0', color: '#6b7280' }}>{idx + 1}</td>
                  <td style={{ padding: '10px 0', fontWeight: 500, color: '#111827' }}>{m.member.name}</td>
                  <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 600, color: '#ef4444' }}>₹{formatCurrency(m.pendingAmount)}</td>
                </tr>
              ))}
              {pendingMembersList.length === 0 && (
                <tr><td colSpan={3} style={{ padding: '20px 0', textAlign: 'center', color: '#10b981' }}>{t('noPendingMembersText')}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Recent Transactions */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', color: '#111827' }}>
              <Clock size={18} color="#4f46e5" />
              {t('recentTransactionsDash')}
            </h3>
            <button onClick={() => handleNav('transactions')} className="btn" style={{ background: 'none', border: 'none', color: '#4f46e5', fontSize: '13px', fontWeight: 600, padding: 0 }}>
              {t('viewAll')}
            </button>
          </div>
          
          <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb', color: '#6b7280', textAlign: 'left' }}>
                <th style={{ paddingBottom: '8px', fontWeight: 500 }}>Date &amp; Time</th>
                <th style={{ paddingBottom: '8px', fontWeight: 500 }}>Member</th>
                <th style={{ paddingBottom: '8px', fontWeight: 500, textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map((txn, idx) => {
                const member = (db.members || []).find(m => m.id === txn.memberId);
                const isIncome = txn.type === 'RD' || txn.type === 'REP';
                const color = isIncome ? '#10b981' : '#ef4444';
                const d = new Date(txn.date);
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }} onClick={() => handleNav('members', { memberId: txn.memberId, monthIndex: txn.mIdx })}>
                    <td style={{ padding: '10px 0' }}>
                      <div style={{ color: '#111827' }}>{d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                      <div style={{ fontSize: '11px', color: '#6b7280' }}>{d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td style={{ padding: '10px 0' }}>
                      <div style={{ fontWeight: 500, color: '#111827' }}>{member?.name || 'Unknown'}</div>
                      <div style={{ fontSize: '11px', color: '#6b7280' }}>
                        {txn.type === 'RD' ? 'RD Paid' : txn.type === 'LOAN' ? 'Loan Issued' : 'Loan Repaid'}
                      </div>
                    </td>
                    <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 600, color }}>
                      ₹{formatCurrency(txn.amount)}
                    </td>
                  </tr>
                );
              })}
              {recentTransactions.length === 0 && (
                <tr><td colSpan={3} style={{ padding: '20px 0', textAlign: 'center', color: '#9ca3af' }}>{t('noTransactionsYet')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
};
