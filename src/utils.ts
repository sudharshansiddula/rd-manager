export const formatCurrency = (amount: number | string | undefined | null): string => {
  if (amount === undefined || amount === null) return '0';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0';
  
  // Format as Indian Currency (e.g., 1000000 -> 10,00,000)
  return num.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  });
};

export const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    }
  } catch {
    // fallback
  }
  return dateStr;
};

export interface WhatsAppMessageData {
  name: string;
  totalDue: number;
  rdDue: number;
  monthlyContribution: number;
  pendingRDMonths: number;
  loanPrincipal: number;
  totalLoanTaken: number;
  loanDisbursementDate?: string;
  loanInterestRate: number;
  pendingLoanMonths: number;
  loanInterestDue: number;
  lateFee: number;
  lateFineRate: number;
  lateFineMultiplier: number;
}

export const DEFAULT_WHATSAPP_TEMPLATE_TE = `*ఆర్ డి చిట్టి*

_నమస్కారం {name} గారు,_

*ప్రస్తుత బకాయిల వివరాలు:*
━━━━━━━━━━━━━━━━━━━━
*కట్టాల్సిన మొత్తం: ₹{totalDue} రూపాయలు*
_(పొదుపు ₹{rdDue} + వడ్డీ ₹{loanInterestDue} + లేట్ ఫైన్ ₹{lateFee} = ₹{totalDue})_
━━━━━━━━━━━━━━━━━━━━

*గణన వివరాలు:*
• *బాకీ ఉన్న పొదుపు:* ₹{rdMonthly} నెల పొదుపు x {pendingRDMonths} నెలలు = *₹{rdDue}*
• *బాకీ ఉన్న వడ్డీ:* ₹{loanPrincipal} మిగిలిన లోన్ అసలు x {loanInterestRate}% వడ్డీ రేటు x {pendingLoanMonths} నెలలు = *₹{loanInterestDue}*
• *లేట్ ఫైన్:* (₹{rdDue} బాకీ ఉన్న పొదుపు + ₹{loanInterestDue} బాకీ ఉన్న వడ్డీ) x {lateFineRate}% ఆలస్య రుసుము రేటు x {lateFineMonths} నెలలు = *₹{lateFee}*

• *మిగిలిన లోన్ అసలు:* *₹{loanPrincipal}* _(మొత్తం అప్పు: ₹{totalLoanTaken}, తేదీ: {loanDate})_
━━━━━━━━━━━━━━━━━━━━

_దయచేసి గమనించి త్వరగా చెల్లించగలరు._
*ధన్యవాదాలు!*`;

export const DEFAULT_WHATSAPP_TEMPLATE_EN = `*RD Chitti*

_Hello {name},_

*Current Dues Summary:*
━━━━━━━━━━━━━━━━━━━━
*Total Amount to Pay: ₹{totalDue}*
_(Savings ₹{rdDue} + Interest ₹{loanInterestDue} + Late Fine ₹{lateFee} = ₹{totalDue})_
━━━━━━━━━━━━━━━━━━━━

*Calculation Breakdown:*
• *Pending Savings:* ₹{rdMonthly} Monthly Savings x {pendingRDMonths} months = *₹{rdDue}*
• *Pending Interest:* ₹{loanPrincipal} Remaining Loan Principal x {loanInterestRate}% Interest Rate x {pendingLoanMonths} months = *₹{loanInterestDue}*
• *Late Fine:* (₹{rdDue} Pending Savings + ₹{loanInterestDue} Pending Interest) x {lateFineRate}% Late Fee Rate x {lateFineMonths} months = *₹{lateFee}*

• *Remaining Loan Principal:* *₹{loanPrincipal}* _(Total Loan: ₹{totalLoanTaken}, Date: {loanDate})_
━━━━━━━━━━━━━━━━━━━━

_Please pay at the earliest convenience._
*Thank you!*`;

export const DEFAULT_WHATSAPP_TEMPLATE = DEFAULT_WHATSAPP_TEMPLATE_TE;

export const buildWhatsAppMessage = (rawTemplate: string | undefined, data: WhatsAppMessageData): string => {
  let template = rawTemplate && rawTemplate.trim() ? rawTemplate : DEFAULT_WHATSAPP_TEMPLATE_TE;

  const formattedDate = formatDate(data.loanDisbursementDate) || '-';

  // Calculator formula strings matching MemberProfileView Current Dues card with clear descriptive labels
  const rdCalc = `₹${formatCurrency(data.monthlyContribution)} నెల పొదుపు x ${data.pendingRDMonths} నెలలు = ₹${formatCurrency(data.rdDue)}`;
  const loanInterestCalc = `₹${formatCurrency(data.loanPrincipal)} మిగిలిన లోన్ అసలు x ${data.loanInterestRate}% వడ్డీ రేటు x ${data.pendingLoanMonths} నెలలు = ₹${formatCurrency(data.loanInterestDue)}`;
  const lateFeeCalc = `(₹${formatCurrency(data.rdDue)} బాకీ ఉన్న పొదుపు + ₹${formatCurrency(data.loanInterestDue)} బాకీ ఉన్న వడ్డీ) x ${data.lateFineRate}% ఆలస్య రుసుము రేటు x ${data.lateFineMultiplier} నెలలు = ₹${formatCurrency(data.lateFee)}`;
  const totalCalc = `బాకీ ఉన్న పొదుపు ₹${formatCurrency(data.rdDue)} + బాకీ ఉన్న వడ్డీ ₹${formatCurrency(data.loanInterestDue)} + లేట్ ఫైన్ ₹${formatCurrency(data.lateFee)} = ₹${formatCurrency(data.totalDue)}`;
  const loanInfo = data.loanPrincipal > 0 ? `(మొత్తం అప్పు: ₹${formatCurrency(data.totalLoanTaken)}, తేదీ: ${formattedDate})` : '-';
  const loanBalanceInfo = `₹${formatCurrency(data.loanPrincipal)} ${loanInfo}`.trim();

  return template
    .replace(/\{name\}/g, data.name || '')
    .replace(/\{totalDue\}/g, formatCurrency(data.totalDue))
    .replace(/\{totalAmountToPay\}/g, formatCurrency(data.totalDue))
    .replace(/\{rdDue\}/g, formatCurrency(data.rdDue))
    .replace(/\{pendingRD\}/g, formatCurrency(data.rdDue))
    .replace(/\{pendingRDM\}/g, formatCurrency(data.rdDue))
    .replace(/\{rdMonthly\}/g, formatCurrency(data.monthlyContribution))
    .replace(/\{monthlyContribution\}/g, formatCurrency(data.monthlyContribution))
    .replace(/\{pendingRDMonths\}/g, data.pendingRDMonths.toString())
    .replace(/\{rdPendingMonths\}/g, data.pendingRDMonths.toString())
    .replace(/\{loanInterestDue\}/g, formatCurrency(data.loanInterestDue))
    .replace(/\{pendingInterest\}/g, formatCurrency(data.loanInterestDue))
    .replace(/\{loanInterestRate\}/g, data.loanInterestRate.toString())
    .replace(/\{pendingLoanMonths\}/g, data.pendingLoanMonths.toString())
    .replace(/\{loanPendingMonths\}/g, data.pendingLoanMonths.toString())
    .replace(/\{lateFee\}/g, formatCurrency(data.lateFee))
    .replace(/\{lateFineRate\}/g, data.lateFineRate.toString())
    .replace(/\{lateFineMultiplier\}/g, data.lateFineMultiplier.toString())
    .replace(/\{lateFineMonths\}/g, data.lateFineMultiplier.toString())
    .replace(/\{loanPrincipal\}/g, formatCurrency(data.loanPrincipal))
    .replace(/\{remainingPrincipal\}/g, formatCurrency(data.loanPrincipal))
    .replace(/\{totalLoanTaken\}/g, formatCurrency(data.totalLoanTaken))
    .replace(/\{loanDate\}/g, formattedDate)
    .replace(/\{loanDisbursementDate\}/g, formattedDate)
    .replace(/\{loanInfo\}/g, loanInfo)
    .replace(/\{loanBalanceInfo\}/g, loanBalanceInfo)
    .replace(/\{totalCalc\}/g, totalCalc)
    .replace(/\{rdCalc\}/g, rdCalc)
    .replace(/\{loanInterestCalc\}/g, loanInterestCalc)
    .replace(/\{lateFeeCalc\}/g, lateFeeCalc);
};
