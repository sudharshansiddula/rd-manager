import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { formatCurrency } from '../utils';

export interface CurrentDuesData {
  pendingRDAmount: number;
  pendingRDMonths: number;
  monthlyContribution: number;
  remainingInterestDue: number;
  pendingLoanMonths: number;
  loanInterestRate: number;
  calculatedLateFee: number;
  lateFineRate: number;
  lateFineMonths: number;
  totalAmountDueThisMonth: number;
  currentLoanBal: number;
}

export interface MemberStatementData {
  member: {
    id: string;
    name: string;
    mobile?: string;
    address?: string;
    startDate: string;
    tenureMonths: number;
    monthlyContribution: number;
    expectedMaturityAmount?: number;
  };
  currentDues: CurrentDuesData;
  summary: {
    paidMonthsCount: number;
    remainingMonths: number;
    totalSaved: number;
    totalLoanTaken: number;
    totalPrincipalRepaid: number;
    currentLoanBal: number;
    totalInterestPaid: number;
    totalLateFeePaid: number;
    grandTotalPaid: number;
    expectedMaturityAmount: number;
  };
  rows: Array<{
    monthIndex: number;
    monthStr: string;
    rdAmount: number;
    depositorDetails?: string;
    loanDisbursed?: number;
    principalPaid?: number;
    interestPaid?: number;
    lateFee?: number;
    totalPaid: number;
    loanBalAfter: number;
    updatedAt?: number;
  }>;
  totals: {
    sumRD: number;
    sumLoanDisbursed: number;
    sumPrincipalPaid: number;
    sumInterestPaid: number;
    sumLateFee: number;
    sumTotalPaid: number;
  };
  lang?: 'te' | 'en';
}

/**
 * Creates a hidden HTML element, renders high-quality statement markup,
 * captures via html2canvas (at 2x scale for crisp font rendering),
 * and generates a Landscape A4 jsPDF instance.
 */
export async function createMemberStatementPdf(data: MemberStatementData): Promise<{ pdf: jsPDF; blob: Blob; file: File; fileName: string }> {
  const isTe = data.lang !== 'en';
  const fileName = `${data.member.name.replace(/[^a-zA-Z0-9\u0C00-\u0C7F_-]/g, '_')}_Statement.pdf`;

  // Create temporary container
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-99999px';
  container.style.left = '-99999px';
  container.style.width = '1120px'; // Landscape proportion ~297mm
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#1e293b';
  container.style.fontFamily = "'Nirmala UI', 'Gautami', 'Segoe UI', -apple-system, Roboto, Arial, sans-serif";
  container.style.padding = '24px 28px';
  container.style.boxSizing = 'border-box';
  container.style.zIndex = '-9999';

  const generatedDate = new Date().toLocaleString(isTe ? 'te-IN' : 'en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  container.innerHTML = `
    <!-- Top Header -->
    <div style="border-bottom: 2px solid #0284c7; padding-bottom: 10px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: flex-end;">
      <div>
        <h1 style="margin: 0 0 4px 0; color: #0369a1; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">
          ${isTe ? 'ఆర్ డి చిట్టి నిర్వహణ - సభ్యుని ఖాతా నివేదిక' : 'RD Chitti Management - Member Account Statement'}
        </h1>
        <div style="font-size: 12px; color: #64748b;">
          ${isTe ? 'తేదీ & సమయం:' : 'Generated on:'} ${generatedDate}
        </div>
      </div>
      <div style="text-align: right;">
        <span style="display: inline-block; background-color: #e0f2fe; color: #0369a1; padding: 4px 12px; border-radius: 6px; font-weight: 700; font-size: 12px; border: 1px solid #bae6fd;">
          ${isTe ? 'ఖాతా స్టేట్‌మెంట్' : 'Official Statement'}
        </span>
      </div>
    </div>

    <!-- Member Details Section (సభ్యుని వివరాలు - Full Width, 2 Lines, Neat & Spacious) -->
    <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-left: 5px solid #0284c7; border-radius: 8px; padding: 10px 16px; margin-bottom: 12px;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #0284c7; background-color: #e0f2fe; padding: 2px 8px; border-radius: 4px; border: 1px solid #bae6fd;">
            ${isTe ? 'సభ్యుని వివరాలు' : 'Member Details'}
          </span>
          <span style="font-size: 16px; font-weight: 800; color: #0f172a;">
            ${data.member.name}
          </span>
        </div>
        <div style="font-size: 12px; color: #475569;">
          <span style="color: #64748b;">${isTe ? 'నెలసరి పొదుపు:' : 'Monthly RD:'}</span>
          <strong style="color: #15803d; margin-left: 4px;">₹${formatCurrency(data.member.monthlyContribution)}</strong>
          <span style="margin: 0 8px; color: #cbd5e1;">|</span>
          <span style="color: #64748b;">${isTe ? 'కాలపరిమితి:' : 'Tenure:'}</span>
          <strong style="color: #0f172a; margin-left: 4px;">${data.member.tenureMonths} ${isTe ? 'నెలలు' : 'Months'}</strong>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; font-size: 12px;">
        <div>
          <span style="color: #64748b; font-weight: 600;">${isTe ? 'ఫోన్ నెంబర్:' : 'Phone:'}</span>
          <strong style="color: #0f172a; margin-left: 6px;">${data.member.mobile || '-'}</strong>
        </div>
        <div>
          <span style="color: #64748b; font-weight: 600;">${isTe ? 'చిరునామా:' : 'Address:'}</span>
          <strong style="color: #0f172a; margin-left: 6px;">${data.member.address || '-'}</strong>
        </div>
        <div>
          <span style="color: #64748b; font-weight: 600;">${isTe ? 'ప్రారంభ తేదీ:' : 'Start Date:'}</span>
          <strong style="color: #0f172a; margin-left: 6px;">${data.member.startDate || '-'}</strong>
        </div>
      </div>
    </div>

    <!-- Current Dues Dashboard Card (ప్రస్తుత బకాయిల వివరాలు - Full Width under Member Details) -->
    <div style="background-color: #fffdf2; border: 1.5px solid #fde047; border-left: 5px solid #eab308; border-radius: 8px; padding: 10px 14px; margin-bottom: 14px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px dashed #facc15; padding-bottom: 4px;">
        <div style="font-size: 13px; font-weight: 700; color: #854d0e; display: flex; align-items: center; gap: 6px;">
          <span>📋</span>
          <span>${isTe ? 'ప్రస్తుత బకాయిల వివరాలు' : 'Current Dues Summary'}</span>
        </div>
        <div style="font-size: 11px; color: #a16207; font-weight: 600;">
          ${isTe ? 'ఈ నెలకు చెల్లించవలసినది' : 'Payable for this month'}
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1.3fr; gap: 10px; align-items: stretch;">
        <!-- Pending RD -->
        <div style="background-color: #ffffff; border: 1px solid #fef08a; border-radius: 6px; padding: 8px 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; color: #713f12; font-weight: 600;">${isTe ? 'బాకీ ఉన్న పొదుపు' : 'Pending RD'}</span>
            <span style="font-size: 11px; font-weight: 700; color: ${data.currentDues.pendingRDMonths > 0 ? '#dc2626' : '#15803d'};">
              (${data.currentDues.pendingRDMonths} ${isTe ? 'నెలలు' : 'm'})
            </span>
          </div>
          <div style="font-size: 16px; font-weight: 800; color: ${data.currentDues.pendingRDMonths > 0 ? '#dc2626' : '#15803d'}; margin: 2px 0;">
            ₹${formatCurrency(data.currentDues.pendingRDAmount)}
          </div>
          <div style="font-size: 10px; color: #854d0e; line-height: 1.2;">
            ₹${formatCurrency(data.currentDues.monthlyContribution)} x ${data.currentDues.pendingRDMonths} ${isTe ? 'నెలలు' : 'm'}
          </div>
        </div>

        <!-- Pending Loan Interest -->
        <div style="background-color: #ffffff; border: 1px solid #fef08a; border-radius: 6px; padding: 8px 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; color: #713f12; font-weight: 600;">${isTe ? 'బాకీ ఉన్న వడ్డీ' : 'Pending Interest'}</span>
            <span style="font-size: 11px; font-weight: 600; color: #a16207;">
              (${data.currentDues.pendingLoanMonths} ${isTe ? 'నెలలు' : 'm'})
            </span>
          </div>
          <div style="font-size: 16px; font-weight: 800; color: ${data.currentDues.remainingInterestDue > 0 ? '#b91c1c' : '#15803d'}; margin: 2px 0;">
            ₹${formatCurrency(data.currentDues.remainingInterestDue)}
          </div>
          <div style="font-size: 10px; color: #854d0e; line-height: 1.2;">
            ₹${formatCurrency(data.currentDues.currentLoanBal)} x ${data.currentDues.loanInterestRate}% ${isTe ? 'వడ్డీ రేటు' : 'rate'}
          </div>
        </div>

        <!-- Late Fine -->
        <div style="background-color: #ffffff; border: 1px solid #fef08a; border-radius: 6px; padding: 8px 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; color: #713f12; font-weight: 600;">${isTe ? 'ఆలస్య రుసుము' : 'Late Fine'}</span>
            <span style="font-size: 11px; font-weight: 600; color: #a16207;">
              (${data.currentDues.lateFineRate}%)
            </span>
          </div>
          <div style="font-size: 16px; font-weight: 800; color: ${data.currentDues.calculatedLateFee > 0 ? '#dc2626' : '#15803d'}; margin: 2px 0;">
            ₹${formatCurrency(data.currentDues.calculatedLateFee)}
          </div>
          <div style="font-size: 10px; color: #854d0e; line-height: 1.2;">
            ${isTe ? `రేటు: ${data.currentDues.lateFineRate}% (${data.currentDues.lateFineMonths} నెలలు)` : `Rate: ${data.currentDues.lateFineRate}% (${data.currentDues.lateFineMonths}m)`}
          </div>
        </div>

        <!-- Total Amount to Pay -->
        <div style="background-color: ${data.currentDues.totalAmountDueThisMonth > 0 ? '#fff1f2' : '#f0fdf4'}; border: 1.5px solid ${data.currentDues.totalAmountDueThisMonth > 0 ? '#fca5a5' : '#86efac'}; border-radius: 6px; padding: 8px 12px; display: flex; flex-direction: column; justify-content: center;">
          <div style="font-size: 11px; font-weight: 700; color: ${data.currentDues.totalAmountDueThisMonth > 0 ? '#991b1b' : '#166534'};">
            ${isTe ? 'మొత్తం కట్టవలసిన బాకీ' : 'Total Amount to Pay'}
          </div>
          <div style="font-size: 20px; font-weight: 900; color: ${data.currentDues.totalAmountDueThisMonth > 0 ? '#dc2626' : '#15803d'}; margin: 1px 0;">
            ₹${formatCurrency(data.currentDues.totalAmountDueThisMonth)}
          </div>
          <div style="font-size: 9.5px; color: #475569; line-height: 1.2;">
            ${isTe ? `(పొదుపు ₹${formatCurrency(data.currentDues.pendingRDAmount)} + వడ్డీ ₹${formatCurrency(data.currentDues.remainingInterestDue)} + ఫైన్ ₹${formatCurrency(data.currentDues.calculatedLateFee)})` : `(RD ₹${formatCurrency(data.currentDues.pendingRDAmount)} + Int ₹${formatCurrency(data.currentDues.remainingInterestDue)} + Fine ₹${formatCurrency(data.currentDues.calculatedLateFee)})`}
          </div>
        </div>
      </div>
    </div>

    <!-- Chit Key Metrics Lifecycle Grid -->
    <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 14px;">
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 8px; text-align: center;">
        <div style="font-size: 10.5px; color: #166534; font-weight: 600;">${isTe ? 'కట్టిన నెలలు' : 'Months Paid'}</div>
        <div style="font-size: 15px; font-weight: 700; color: #15803d; margin-top: 2px;">${data.summary.paidMonthsCount} / ${data.member.tenureMonths}</div>
        <div style="font-size: 9.5px; color: #4ade80;">${isTe ? `ఇంకా: ${data.summary.remainingMonths} నెలలు` : `Left: ${data.summary.remainingMonths}m`}</div>
      </div>

      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 8px; text-align: center;">
        <div style="font-size: 10.5px; color: #166534; font-weight: 600;">${isTe ? 'మొత్తం పొదుపు' : 'Total Savings'}</div>
        <div style="font-size: 15px; font-weight: 700; color: #15803d; margin-top: 2px;">₹${formatCurrency(data.summary.totalSaved)}</div>
        <div style="font-size: 9.5px; color: #64748b;">(₹${formatCurrency(data.member.monthlyContribution)}/${isTe ? 'నెల' : 'mo'})</div>
      </div>

      <div style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 6px; padding: 8px; text-align: center;">
        <div style="font-size: 10.5px; color: #9a3412; font-weight: 600;">${isTe ? 'తీసుకున్న అప్పు' : 'Loan Taken'}</div>
        <div style="font-size: 15px; font-weight: 700; color: #c2410c; margin-top: 2px;">₹${formatCurrency(data.summary.totalLoanTaken)}</div>
        <div style="font-size: 9.5px; color: #9a3412;">${isTe ? 'మొత్తం రుణం' : 'Disbursed'}</div>
      </div>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; text-align: center;">
        <div style="font-size: 10.5px; color: #0369a1; font-weight: 600;">${isTe ? 'తిరిగిచ్చిన అసలు' : 'Principal Repaid'}</div>
        <div style="font-size: 15px; font-weight: 700; color: #0284c7; margin-top: 2px;">₹${formatCurrency(data.summary.totalPrincipalRepaid)}</div>
        <div style="font-size: 9.5px; color: #64748b;">${isTe ? 'అసలు జమ' : 'Repaid'}</div>
      </div>

      <div style="background-color: ${data.summary.currentLoanBal > 0 ? '#fef2f2' : '#f0fdf4'}; border: 1px solid ${data.summary.currentLoanBal > 0 ? '#fecaca' : '#bbf7d0'}; border-radius: 6px; padding: 8px; text-align: center;">
        <div style="font-size: 10.5px; color: ${data.summary.currentLoanBal > 0 ? '#991b1b' : '#166534'}; font-weight: 600;">${isTe ? 'మిగిలిన అప్పు' : 'Balance Loan'}</div>
        <div style="font-size: 15px; font-weight: 700; color: ${data.summary.currentLoanBal > 0 ? '#dc2626' : '#15803d'}; margin-top: 2px;">₹${formatCurrency(data.summary.currentLoanBal)}</div>
        <div style="font-size: 9.5px; color: #64748b;">${data.summary.currentLoanBal > 0 ? (isTe ? 'బాకీ ఉంది' : 'Due') : (isTe ? 'క్లియర్' : 'Clear')}</div>
      </div>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; text-align: center;">
        <div style="font-size: 10.5px; color: #475569; font-weight: 600;">${isTe ? 'చెల్లించిన వడ్డీ' : 'Interest Paid'}</div>
        <div style="font-size: 15px; font-weight: 700; color: #334155; margin-top: 2px;">₹${formatCurrency(data.summary.totalInterestPaid)}</div>
        <div style="font-size: 9.5px; color: #64748b;">${isTe ? 'అప్పుపై వడ్డీ' : 'Loan Interest'}</div>
      </div>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; text-align: center;">
        <div style="font-size: 10.5px; color: #475569; font-weight: 600;">${isTe ? 'ఆలస్య రుసుము' : 'Late Fee Paid'}</div>
        <div style="font-size: 15px; font-weight: 700; color: #334155; margin-top: 2px;">₹${formatCurrency(data.summary.totalLateFeePaid)}</div>
        <div style="font-size: 9.5px; color: #64748b;">${isTe ? 'ఫైన్ మొత్తం' : 'Penalties'}</div>
      </div>

      <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 8px; text-align: center;">
        <div style="font-size: 10.5px; color: #1e40af; font-weight: 600;">${isTe ? 'మొత్తం చెల్లింపు' : 'Total Paid'}</div>
        <div style="font-size: 15px; font-weight: 700; color: #2563eb; margin-top: 2px;">₹${formatCurrency(data.summary.grandTotalPaid)}</div>
        <div style="font-size: 9.5px; color: #1e40af;">${isTe ? 'మొత్తం జమ' : 'Grand Total'}</div>
      </div>

      <div style="background-color: #faf5ff; border: 1px solid #e9d5ff; border-radius: 6px; padding: 8px; text-align: center; grid-column: span 2;">
        <div style="font-size: 10.5px; color: #6b21a8; font-weight: 600;">${isTe ? 'అంచనా మెచ్యూరిటీ మొత్తం' : 'Expected Maturity Amount'}</div>
        <div style="font-size: 16px; font-weight: 800; color: #7e22ce; margin-top: 2px;">₹${formatCurrency(data.summary.expectedMaturityAmount)}</div>
        <div style="font-size: 9.5px; color: #6b21a8;">${isTe ? 'చివరికి వచ్చే మొత్తం' : 'At Tenure End'}</div>
      </div>
    </div>

    <!-- Monthly Transactions Table -->
    <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px;">
      <thead>
        <tr style="background-color: #0f172a; color: #ffffff;">
          <th style="padding: 8px 6px; border: 1px solid #334155; text-align: center; width: 65px;">${isTe ? 'నెల / వ.సం' : 'Month'}</th>
          <th style="padding: 8px 6px; border: 1px solid #334155; text-align: right; width: 95px;">${isTe ? 'నెలసరి పొదుపు' : 'Monthly RD'}</th>
          <th style="padding: 8px 6px; border: 1px solid #334155; text-align: left; width: 140px;">${isTe ? 'జమానతు పేరు, వివరాలు' : 'Guarantor / Depositor'}</th>
          <th style="padding: 8px 6px; border: 1px solid #334155; text-align: right; width: 95px;">${isTe ? 'అప్పు ఇచ్చినది' : 'Loan Out'}</th>
          <th style="padding: 8px 6px; border: 1px solid #334155; text-align: right; width: 95px;">${isTe ? 'అసలు జమ' : 'Prin. Repaid'}</th>
          <th style="padding: 8px 6px; border: 1px solid #334155; text-align: right; width: 90px;">${isTe ? 'అప్పుపై వడ్డీ' : 'Interest'}</th>
          <th style="padding: 8px 6px; border: 1px solid #334155; text-align: right; width: 85px;">${isTe ? 'ఆలస్య రుసుము' : 'Late Fee'}</th>
          <th style="padding: 8px 6px; border: 1px solid #334155; text-align: right; width: 105px;">${isTe ? 'చెల్లించిన మొత్తం' : 'Total Paid'}</th>
          <th style="padding: 8px 6px; border: 1px solid #334155; text-align: right; width: 95px;">${isTe ? 'మిగిలిన అప్పు' : 'Bal. Loan'}</th>
          <th style="padding: 8px 6px; border: 1px solid #334155; text-align: center; width: 110px;">${isTe ? 'నమోదు తేదీ & సమయం' : 'Updated Date'}</th>
        </tr>
      </thead>
      <tbody>
        ${data.rows.map((r, i) => {
          const bg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
          const updateText = r.updatedAt ? new Date(r.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
          return `
            <tr style="background-color: ${bg};">
              <td style="padding: 6px 4px; border: 1px solid #e2e8f0; text-align: center; font-weight: 600;">
                ${r.monthStr}<br><span style="font-size: 10px; color: #64748b;">M-${r.monthIndex}</span>
              </td>
              <td style="padding: 6px 6px; border: 1px solid #e2e8f0; text-align: right; color: ${r.rdAmount > 0 ? '#15803d' : '#94a3b8'}; font-weight: ${r.rdAmount > 0 ? 600 : 400};">
                ${r.rdAmount > 0 ? `₹${formatCurrency(r.rdAmount)}` : '-'}
              </td>
              <td style="padding: 6px 6px; border: 1px solid #e2e8f0; text-align: left; color: #475569; font-size: 11px;">
                ${r.depositorDetails || '-'}
              </td>
              <td style="padding: 6px 6px; border: 1px solid #e2e8f0; text-align: right; color: ${r.loanDisbursed && r.loanDisbursed > 0 ? '#b91c1c' : '#94a3b8'};">
                ${r.loanDisbursed && r.loanDisbursed > 0 ? `₹${formatCurrency(r.loanDisbursed)}` : '-'}
              </td>
              <td style="padding: 6px 6px; border: 1px solid #e2e8f0; text-align: right; color: ${r.principalPaid && r.principalPaid > 0 ? '#0284c7' : '#94a3b8'};">
                ${r.principalPaid && r.principalPaid > 0 ? `₹${formatCurrency(r.principalPaid)}` : '-'}
              </td>
              <td style="padding: 6px 6px; border: 1px solid #e2e8f0; text-align: right; color: ${r.interestPaid && r.interestPaid > 0 ? '#334155' : '#94a3b8'};">
                ${r.interestPaid && r.interestPaid > 0 ? `₹${formatCurrency(r.interestPaid)}` : '-'}
              </td>
              <td style="padding: 6px 6px; border: 1px solid #e2e8f0; text-align: right; color: ${r.lateFee && r.lateFee > 0 ? '#dc2626' : '#94a3b8'};">
                ${r.lateFee && r.lateFee > 0 ? `₹${formatCurrency(r.lateFee)}` : '-'}
              </td>
              <td style="padding: 6px 6px; border: 1px solid #e2e8f0; text-align: right; font-weight: 700; color: ${r.totalPaid > 0 ? '#0f172a' : '#94a3b8'};">
                ${r.totalPaid > 0 ? `₹${formatCurrency(r.totalPaid)}` : '-'}
              </td>
              <td style="padding: 6px 6px; border: 1px solid #e2e8f0; text-align: right; font-weight: 600; color: ${r.loanBalAfter > 0 ? '#b91c1c' : '#94a3b8'};">
                ${r.loanBalAfter > 0 ? `₹${formatCurrency(r.loanBalAfter)}` : '-'}
              </td>
              <td style="padding: 6px 4px; border: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 10px;">
                ${updateText}
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
      <tfoot>
        <tr style="background-color: #f1f5f9; font-weight: 700; border-top: 2px solid #0f172a;">
          <td style="padding: 8px 6px; border: 1px solid #cbd5e1; text-align: center;">${isTe ? 'మొత్తం (Total)' : 'Total'}</td>
          <td style="padding: 8px 6px; border: 1px solid #cbd5e1; text-align: right; color: #15803d;">₹${formatCurrency(data.totals.sumRD)}</td>
          <td style="padding: 8px 6px; border: 1px solid #cbd5e1; text-align: left; font-size: 10px; color: #64748b;">-</td>
          <td style="padding: 8px 6px; border: 1px solid #cbd5e1; text-align: right; color: #b91c1c;">₹${formatCurrency(data.totals.sumLoanDisbursed)}</td>
          <td style="padding: 8px 6px; border: 1px solid #cbd5e1; text-align: right; color: #0284c7;">₹${formatCurrency(data.totals.sumPrincipalPaid)}</td>
          <td style="padding: 8px 6px; border: 1px solid #cbd5e1; text-align: right; color: #334155;">₹${formatCurrency(data.totals.sumInterestPaid)}</td>
          <td style="padding: 8px 6px; border: 1px solid #cbd5e1; text-align: right; color: #dc2626;">₹${formatCurrency(data.totals.sumLateFee)}</td>
          <td style="padding: 8px 6px; border: 1px solid #cbd5e1; text-align: right; color: #0f172a; font-size: 13px;">₹${formatCurrency(data.totals.sumTotalPaid)}</td>
          <td style="padding: 8px 6px; border: 1px solid #cbd5e1; text-align: right; color: ${data.summary.currentLoanBal > 0 ? '#b91c1c' : '#15803d'};">
            ${data.summary.currentLoanBal > 0 ? `₹${formatCurrency(data.summary.currentLoanBal)}` : '-'}
          </td>
          <td style="padding: 8px 6px; border: 1px solid #cbd5e1; text-align: center; font-size: 10px; color: #64748b;">-</td>
        </tr>
      </tfoot>
    </table>

    <div style="margin-top: 16px; padding-top: 10px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #94a3b8;">
      <div>${isTe ? 'RD Manager అప్లికేషన్ ద్వారా సృష్టించబడింది' : 'Generated by RD Manager'}</div>
      <div>${isTe ? 'కంప్యూటర్ జెనరేటెడ్ డాక్యుమెంట్ - సంతకం అవసరం లేదు' : 'Computer Generated Statement - No Signature Required'}</div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2, // 2x DPI for crystal clear text and print quality
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = 297; // A4 Landscape width
    const pageHeight = 210; // A4 Landscape height
    const imgWidth = pageWidth - 16; // 8mm margins
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    if (imgHeight <= pageHeight - 16) {
      pdf.addImage(imgData, 'JPEG', 8, 8, imgWidth, imgHeight);
    } else {
      // Multi-page handling if content is long
      let position = 8;
      let heightLeft = imgHeight;

      pdf.addImage(imgData, 'JPEG', 8, position, imgWidth, imgHeight);
      heightLeft -= (pageHeight - 16);

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 8;
        pdf.addPage('a4', 'landscape');
        pdf.addImage(imgData, 'JPEG', 8, position, imgWidth, imgHeight);
        heightLeft -= (pageHeight - 16);
      }
    }

    const pdfBlob = pdf.output('blob');
    const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

    return {
      pdf,
      blob: pdfBlob,
      file: pdfFile,
      fileName
    };
  } finally {
    document.body.removeChild(container);
  }
}

/**
 * Downloads the member statement as PDF
 */
export async function downloadMemberStatementPdf(data: MemberStatementData): Promise<void> {
  const { pdf, fileName } = await createMemberStatementPdf(data);
  pdf.save(fileName);
}

/**
 * Shares the member statement PDF file via Web Share API if supported.
 * Falls back to direct PDF download on desktop / unsupported browsers.
 */
export async function shareMemberStatementPdf(data: MemberStatementData): Promise<{ shared: boolean; method: 'web-share' | 'download-fallback' }> {
  const { pdf, file, fileName } = await createMemberStatementPdf(data);
  const isTe = data.lang !== 'en';

  const shareTitle = isTe
    ? `${data.member.name} - ఆర్ డి చిట్టి స్టేట్‌మెంట్`
    : `${data.member.name} - RD Chitti Statement`;

  const shareText = isTe
    ? `${data.member.name} గారి ఆర్ డి చిట్టి ఖాతా స్టేట్‌మెంట్ వివరాలు.\nమొత్తం పొదుపు: ₹${formatCurrency(data.summary.totalSaved)} | మిగిలిన అప్పు: ₹${formatCurrency(data.summary.currentLoanBal)}`
    : `${data.member.name}'s RD Chitti Statement.\nTotal Savings: ₹${formatCurrency(data.summary.totalSaved)} | Balance Loan: ₹${formatCurrency(data.summary.currentLoanBal)}`;

  // Check if Web Share API supports file sharing (Mobile browsers: Android Chrome, iOS Safari, etc.)
  if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: shareTitle,
        text: shareText
      });
      return { shared: true, method: 'web-share' };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User cancelled share dialog
        return { shared: false, method: 'web-share' };
      }
      console.warn('File share failed, falling back to download:', err);
    }
  }

  // If text-only share is available (without file)
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      pdf.save(fileName);
      await navigator.share({
        title: shareTitle,
        text: shareText
      });
      return { shared: true, method: 'web-share' };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { shared: false, method: 'web-share' };
      }
    }
  }

  // Desktop or unsupported browser fallback: download the PDF directly
  pdf.save(fileName);
  return { shared: true, method: 'download-fallback' };
}

/**
 * Shares the member statement PDF file directly via WhatsApp.
 * On mobile/devices supporting Web Share API with files: triggers navigator.share with WhatsApp message text and attached PDF file.
 * Fallback (Desktop/unsupported browsers): Downloads the PDF file locally and opens WhatsApp Web/API directly for that contact number.
 */
export async function shareMemberStatementPdfToWhatsApp(
  data: MemberStatementData,
  mobile: string,
  messageText?: string
): Promise<{ method: 'web-share' | 'whatsapp-web-fallback'; fileName: string }> {
  const { pdf, file, fileName } = await createMemberStatementPdf(data);
  const isTe = data.lang !== 'en';

  const defaultShareText = isTe
    ? `${data.member.name} గారి ఆర్ డి చిట్టి ఖాతా స్టేట్‌మెంట్ వివరాలు.`
    : `${data.member.name}'s RD Chitti Statement.`;
  const shareText = messageText || defaultShareText;

  // 1. If mobile browser supports Web Share with files, invoke it
  if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: `${data.member.name} - Statement`,
        text: shareText
      });
      return { method: 'web-share', fileName };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { method: 'web-share', fileName };
      }
      console.warn('Web share failed, proceeding to fallback:', err);
    }
  }

  // 2. Fallback: Save PDF locally and open WhatsApp Web with that phone number
  pdf.save(fileName);
  const cleanMobile = mobile.replace(/\D/g, '');
  const phoneParam = cleanMobile.startsWith('91') ? cleanMobile : `91${cleanMobile}`;
  const waUrl = `https://wa.me/${phoneParam}?text=${encodeURIComponent(shareText)}`;
  window.open(waUrl, '_blank');

  return { method: 'whatsapp-web-fallback', fileName };
}
