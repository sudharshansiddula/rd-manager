import React, { createContext, useContext, useState, type ReactNode } from 'react';

type Language = 'en' | 'te';

interface Translations {
  [key: string]: {
    en: string;
    te: string;
  };
}

export const translations: Translations = {
  // Sidebar & Layout
  appTitle: { en: 'RD Manager', te: 'RD మేనేజర్' },
  dashboard: { en: 'Dashboard', te: 'డాష్‌బోర్డ్' },
  members: { en: 'Members', te: 'సభ్యులు' },
  transactions: { en: 'History', te: 'లావాదేవీలు' },
  settings: { en: 'Settings', te: 'సెట్టింగ్స్' },
  overview: { en: 'Overview', te: 'ఓవర్‌వ్యూ' },
  membersDir: { en: 'Members Directory', te: 'సభ్యుల జాబితా' },
  langEnglish: { en: 'English', te: 'English' },
  langTelugu: { en: 'Telugu', te: 'తెలుగు' },

  // Member Fields
  memberNo: { en: 'A/c No', te: 'ఖాతా నెం' },
  nameAndMobile: { en: 'Name & Mobile', te: 'పేరు & మొబైల్' },
  name: { en: 'Name', te: 'పేరు' },
  mobile: { en: 'Mobile', te: 'మొబైల్' },
  address: { en: 'Address', te: 'చిరునామా' },
  joinDate: { en: 'Join Date', te: 'చేరిన తేదీ' },
  saving: { en: 'Saving', te: 'పొదుపు' },
  loan: { en: 'Loan', te: 'అప్పు (Loan)' },
  dueInterest: { en: 'Due Interest', te: 'వడ్డీ' },
  rdPaidMonths: { en: 'RD Paid Months', te: 'కట్టిన నెలలు' },
  totalDue: { en: 'Total Due', te: 'మొత్తం బాకీ' },
  monthlyContribution: { en: 'Monthly Sav.', te: 'నెలవారీ పొదుపు' },
  tenureMonths: { en: 'Tenure (Mo)', te: 'నెలలు' },
  maturityAmount: { en: 'Maturity Amt', te: 'చివరిగా ఇచ్చేది' },
  status: { en: 'Status', te: 'స్టేటస్' },
  actions: { en: 'Actions', te: 'చర్యలు' },
  
  // Table Specific
  rdStatus: { en: 'RD Status', te: 'RD స్టేటస్' },
  paidMonths: { en: 'Paid', te: 'కట్టినవి' },
  outOf: { en: 'out of', te: 'మొత్తం' },
  pending: { en: 'Pending', te: 'బాకీ' },
  upToDate: { en: 'Up to date', te: 'పూర్తిగా కట్టారు' },
  completed: { en: 'Completed', te: 'పూర్తయింది' },
  selected: { en: 'Selected', te: 'సెలెక్ట్ చేయబడింది' },
  netProfitLoss: { en: 'Net Profit / Loss', te: 'నికర లాభం / నష్టం' },
  close: { en: 'Close', te: 'క్లోజ్' },
  done: { en: 'Done', te: 'పూర్తయింది' },
  
  // Summary Cards
  totalMembers: { en: 'Members (Active/Total)', te: 'సభ్యులు (యాక్టివ్/మొత్తం)' },
  totalSavedAmount: { en: 'Saved Amount (Active)', te: 'పొదుపు (యాక్టివ్)' },
  activeLoans: { en: 'Active Loans (Count & Amt)', te: 'యాక్టివ్ అప్పులు' },
  totalDueInterest: { en: 'Total Due Interest', te: 'రావాల్సిన వడ్డీ' },
  pendingMembers: { en: 'Pending RD Members', te: 'పెండింగ్ ఉన్న సభ్యులు' },

  // Filters
  filterActive: { en: 'Active Members', te: 'యాక్టివ్ గా ఉన్న సభ్యులు' },
  filterAll: { en: 'All Members', te: 'అందరు (All)' },
  filterLoanActive: { en: 'Active Loan Borrowers', te: 'అప్పు ఉన్నవారు' },
  filterRDPending: { en: 'RD Pending Members', te: 'ఆర్డీ బాకీ ఉన్నవారు' },
  filterRDCompletedFull: { en: 'RD Completed (Full Term)', te: 'ఆర్డీ పూర్తి నెలలకి పూర్తయినవారు' },
  filterRDClosedMiddle: { en: 'RD Premature Closed', te: 'ఆర్డీ మధ్యంతరంగా పూర్తయినవారు' },
  filterRDPaidUpToDate: { en: 'RD Paid Up-to-date', te: 'ఆర్డీ ఇప్పటివరకు కట్టినవారు' },
  totalDueFromMembers: { en: 'Total Due from Members', te: 'సభ్యులు కట్టాల్సిన మొత్తం' },
  
  advancedFilters: { en: 'Filters', te: 'ఫిల్టర్స్' },
  dateFrom: { en: 'Date From', te: 'తేదీ (నుండి)' },
  dateTo: { en: 'Date To', te: 'తేదీ (వరకు)' },
  minAmount: { en: 'Min', te: 'కనిష్ట' },
  maxAmount: { en: 'Max', te: 'గరిష్ట' },
  pendingMonthsRange: { en: 'Pending Months', te: 'పెండింగ్ నెలలు' },
  paidMonthsRange: { en: 'Paid Months', te: 'కట్టిన నెలలు' },
  loanAmountRange: { en: 'Loan Amount', te: 'అప్పు మొత్తం' },
  apply: { en: 'Apply', te: 'అప్లై' },
  clear: { en: 'Clear', te: 'క్లియర్' },
  filterOnlyLateFee: { en: 'Only with Late Fee', te: 'లేట్ ఫైన్ కట్టినవారు' },
  filterRdRange: { en: 'RD Paid Range', te: 'ఆర్డీ చెల్లింపు రేంజ్' },
  filterTotalRange: { en: 'Total Paid Range', te: 'మొత్తం చెల్లింపు రేంజ్' },
  filterInterestRange: { en: 'Interest Paid Range', te: 'వడ్డీ చెల్లింపు రేంజ్' },
  applyFilters: { en: 'Apply Filters', te: 'ఫిల్టర్ అప్లై చేయండి' },
  resetFilters: { en: 'Reset Filters', te: 'రీసెట్ ఫిల్టర్స్' },
  filterWord: { en: 'Filter', te: 'ఫిల్టర్' },
  searchHint: { en: 'Search by Name, A/c No, or Mobile', te: 'పేరు, ఖాతా నెం లేదా మొబైల్ ద్వారా వెతకండి' },

  // Statuses
  active: { en: 'Active', te: 'యాక్టివ్' },
  matured: { en: 'Matured', te: 'మెచ్యూర్డ్' },
  closed: { en: 'Closed', te: 'క్లోజ్డ్' },
  
  // Buttons
  addNew: { en: 'Add New', te: 'కొత్తగా చేర్చు' },
  save: { en: 'Save', te: 'సేవ్ చేయి' },
  cancel: { en: 'Cancel', te: 'రద్దు చేయి' },
  edit: { en: 'Edit', te: 'ఎడిట్' },
  delete: { en: 'Delete', te: 'డిలీట్' },
  viewProfile: { en: 'View Profile', te: 'ప్రొఫైల్ చూడండి' },
  back: { en: 'Back', te: 'వెనక్కి' },

  // Profile Specific
  month: { en: 'Month', te: 'నెల' },
  principalRepayment: { en: 'Principal Repaid', te: 'అసలు జమ' },
  interestOnLoan: { en: 'Interest', te: 'అప్పుపై వడ్డీ' },
  loanOut: { en: 'Loan Out.', te: 'అప్పు ఇచ్చినది' },
  depositorDetails: { en: 'Depositor / Guarantor Details', te: 'జమానతు పేరు, వివరాలు' },
  lateFee: { en: 'Late Fee', te: 'ఆలస్య రుసుము' },
  totalPaid: { en: 'Total Paid', te: 'చెల్లించిన మొత్తం' },
  remainingLoan: { en: 'Balance Loan', te: 'మిగిలిన అప్పు' },
  sno: { en: 'S.No', te: 'వ.సం' },
  updatedAt: { en: 'Date & Time', te: 'తేదీ / సమయం' },
  
  // Transactions View
  totalEntries: { en: 'Total Entries', te: 'మొత్తం ఎంట్రీలు' },
  totalCollectionsFiltered: { en: 'Total Collections (Inwards)', te: 'మొత్తం వసూళ్లు (కలెక్షన్)' },
  totalLoanIssued: { en: 'Total Loan Issued (Outwards)', te: 'మంజూరు చేసిన రుణాలు' },
  searchByPersonOrAc: { en: 'Search by person or A/C...', te: 'పేరు లేదా ఖాతా నెం ద్వారా వెతకండి...' },
  filterToday: { en: 'TODAY', te: 'ఈ రోజు' },
  filterYesterday: { en: 'YESTERDAY', te: 'నిన్న' },
  filterThisWeek: { en: 'THIS WEEK', te: 'ఈ వారం' },
  filterThisMonth: { en: 'THIS MONTH', te: 'ఈ నెల' },
  filterThisYear: { en: 'THIS YEAR', te: 'ఈ సంవత్సరం' },
  filterCustom: { en: 'CUSTOM', te: 'కస్టమ్' },
  dateFromCannotBeLater: { en: 'From Date cannot be later than To Date', te: 'మొదటి తేదీ, చివరి తేదీ కంటే ముందు ఉండాలి' },
  entryDate: { en: 'Entry Date', te: 'నమోదు తేదీ' },
  memberDetails: { en: 'Member Details', te: 'సభ్యుని వివరాలు' },
  memberStatus: { en: 'Member Status', te: 'సభ్యుని స్థితి' },
  entryMonth: { en: 'Entry Month', te: 'నెల' },
  rdPaid: { en: 'RD Paid', te: 'పొదుపు చెల్లింపు' },
  loanIssued: { en: 'Loan Issued', te: 'రుణం మంజూరు' },
  prinPaid: { en: 'Prin. Paid', te: 'అసలు' },
  intPaid: { en: 'Int. Paid', te: 'వడ్డీ' },
  lateFeeHistory: { en: 'Late Fee', te: 'లేట్ ఫైన్' },
  totalPaidHistory: { en: 'Total Paid', te: 'మొత్తం చెల్లింపు' },
  noEntriesFound: { en: 'No entries found for the selected period.', te: 'ఎంచుకున్న కాలానికి ఎటువంటి ఎంట్రీలు లేవు.' },
  acStr: { en: 'A/C', te: 'ఖాతా నెం' },
  monthsPaidTable: { en: 'Months Paid:', te: 'కట్టిన నెలలు:' },
  loanOutTable: { en: 'Loan Out.:', te: 'లోన్ బ్యాలెన్స్:' },
  dueStatusTable: { en: 'Due Status:', te: 'డ్యూ స్టేటస్:' },
  dueAmount: { en: 'Due', te: 'బాకీ' },
  paidTillDate: { en: 'Paid till date', te: 'ఇప్పటి వరకు కట్టారు' },

  // Dashboard Specific
  rdDetails: { en: 'RD Details', te: 'ఆర్డీ వివరాలు' },
  monthlySavingDash: { en: 'Monthly Saving', te: 'నెలసరి పొదుపు' },
  monthsPaidDash: { en: 'Months Paid', te: 'కట్టిన నెలలు' },
  savedSoFar: { en: 'Saved So Far', te: 'సేవ్ చేసిన అమౌంట్' },
  bonusEarned: { en: 'Bonus Earned', te: 'వచ్చిన బోనస్' },
  currentValueVsMaturity: { en: 'Current Value / Maturity Amount', te: 'టోటల్ అమౌంట్ / మెచ్యూరిటీ అమౌంట్' },
  loanDetails: { en: 'Loan Details', te: 'అప్పు వివరాలు' },
  remainingPrincipal: { en: 'Remaining Principal', te: 'మిగిలిన అప్పు' },
  interestDueDash: { en: 'Interest Due', te: 'వడ్డీ బకాయి' },
  currentDues: { en: 'Current Dues', te: 'ప్రస్తుత బకాయిలు' },
  pendingRDM: { en: 'Pending RD', te: 'బాకీ ఉన్న ఆర్డీ' },
  pendingInterest: { en: 'Pending Interest', te: 'బాకీ ఉన్న వడ్డీ' },
  totalAmountToPay: { en: 'Total Amount to Pay', te: 'కట్టాల్సిన టోటల్ అమౌంట్' },
  upTo: { en: 'Up to', te: 'వరకు' },
  months: { en: 'months', te: 'నెలలు' },
  
  // Settlement
  closeAccount: { en: 'Close Account', te: 'ఖాతా ముగించు' },
  prematureClose: { en: 'Close Account Prematurely', te: 'మధ్యాంతరంగా క్లోజ్ చేయుటకు' },
  finalSettlement: { en: 'Final Settlement', te: 'ఫైనల్ సెటిల్మెంట్' },
  totalAmountToPayMember: { en: 'Total to Pay Member', te: 'సభ్యునికి ఇవ్వవలసినది' },
  totalDeductions: { en: 'Total Deductions', te: 'కట్ అయ్యే మొత్తం' },
  netSettlement: { en: 'Net Settlement Amount', te: 'ఫైనల్ అమౌంట్' },
  wePay: { en: 'We have to pay this amount to the member', te: 'మనం సభ్యునికి ఇవ్వవలసిన మొత్తం' },
  memberPays: { en: 'Member has to pay this amount to us', te: 'సభ్యుడు మనకు కట్టాల్సిన మొత్తం' },
  lblSavings: { en: 'Savings', te: 'సేవింగ్స్' },
  lblBonus: { en: 'Bonus', te: 'బోనస్' },
  lblLoan: { en: 'Loan', te: 'అప్పు' },
  lblInterest: { en: 'Interest', te: 'వడ్డీ' },
  lblLateFee: { en: 'Late Fee', te: 'ఆలస్య రుసుము' },
  
  // Settlement Payment Details
  settlementPaymentDetails: { en: 'Settlement Payment Details', te: 'సెటిల్మెంట్ చెల్లింపు వివరాలు' },
  amountPaidToMember: { en: 'Amount Paid to Member', te: 'సభ్యునికి ఇచ్చిన మొత్తం' },
  amountPaidToUs: { en: 'Amount Paid to Us', te: 'సభ్యుడు మనకు ఇచ్చిన మొత్తం' },
  datePaid: { en: 'Date Paid', te: 'చెల్లించిన తేదీ' },

  // Transactions / P&L Card
  transactionsCardTitle: { en: 'Transactions (P&L)', te: 'లావాదేవీలు' },
  transactionsCardTooltipActive: { en: 'Calculates the profit or loss from this member. Earnings = Loan Interest Paid + Late Fees Paid. Loss/Bonus = RD Bonus Given. Profit = Earnings - Bonus.', te: 'ఈ సభ్యునిపై లాభనష్టాల అంచనా. మనకు వచ్చిన ఆదాయం (వడ్డీ + లేట్ ఫైన్) మరియు మనం ఇచ్చిన బోనస్ మధ్య వ్యత్యాసం నికర లాభం/నష్టం.' },
  transactionsCardTooltipSettled: { en: 'Calculates final profit or loss using Cash Flow. Total Cash Received (RD+Repayments) minus Total Cash Given (Loans+Settlement).', te: 'క్యాష్ ఫ్లో ఆధారంగా నికర లాభనష్టాల అంచనా. సంస్థకు వచ్చిన మొత్తం డబ్బు (పొదుపు+అప్పు జమ) నుండి సంస్థ ఇచ్చిన మొత్తం డబ్బు (అప్పు+సెటిల్మెంట్) తీసివేస్తే వచ్చేదే నికర లాభం.' },
  totalEarningsReceived: { en: 'Total Earnings (Int + Late Fee)', te: 'వచ్చిన ఆదాయం (వడ్డీ + రుసుము)' },
  bonusGiven: { en: 'RD Bonus Accrued', te: 'ఇవ్వాల్సిన బోనస్' },
  totalCashReceivedPL: { en: 'Total Cash Received', te: 'వచ్చిన మొత్తం క్యాష్' },
  totalCashGivenPL: { en: 'Total Cash Given', te: 'ఇచ్చిన మొత్తం క్యాష్' },
  netProfit: { en: 'Net Profit', te: 'నికర లాభం' },
  netLoss: { en: 'Net Loss', te: 'నికర నష్టం' },
  
  // RD Interest Calc Modal
  rdInterestCalc: { en: 'RD Interest Calculation', te: 'ఆర్డీ వడ్డీ లెక్కింపు' },
  totalInstPaid: { en: 'Total Installments Paid', te: 'కట్టిన మొత్తం నెలలు' },
  monthNo: { en: '#', te: '#' },
  paymentMonth: { en: 'Month', te: 'నెల' },
  installmentAmt: { en: 'Installment', te: 'నెలసరి పొదుపు' },
  totalContr: { en: 'Total Paid', te: 'చెల్లించిన మొత్తం' },
  monthlyInt: { en: 'Interest', te: 'వడ్డీ' },
  accInt: { en: 'Acc. Interest', te: 'మొత్తం వడ్డీ' },
  closingBal: { en: 'Balance', te: 'బ్యాలెన్స్' },
  
  // WhatsApp Messages
  whatsappDueMessage: {
    en: 'Hello *{name}*,\n\nYour current due details for this month:\n*Total Amount to Pay: Rs.{totalDue}*\n\n_Breakdown:_\n- Pending RD: Rs.{rdDue}\n- Loan Amount: Rs.{loanPrincipal}\n- Pending Loan Interest: Rs.{loanInterestDue}\n- Late Fine: Rs.{lateFee}\n\n_Please pay at the earliest._',
    te: 'నమస్తే *{name}* గారు,\n\nఈ నెలకు గాను మీ బకాయి వివరాలు:\n*చెల్లించాల్సిన మొత్తం: రూ.{totalDue}*\n\n_వివరాలు:_\n- బాకీ ఉన్న ఆర్డీ: రూ.{rdDue}\n- మీ లోన్ అసలు: రూ.{loanPrincipal}\n- బాకీ ఉన్న లోన్ వడ్డీ: రూ.{loanInterestDue}\n- లేట్ ఫైన్: రూ.{lateFee}\n\n_దయచేసి గమనించి చెల్లించగలరు._'
  },
  
  // Settings View
  appSettingsTitle: { en: 'App Settings', te: 'యాప్ సెట్టింగ్స్' },
  defaultStartupScreen: { en: 'Default Startup Screen', te: 'డిఫాల్ట్ స్టార్టప్ స్క్రీన్' },
  chooseStartupScreen: { en: 'Choose which screen should open first when you start the app.', te: 'యాప్ ఓపెన్ చేసినప్పుడు ముందుగా ఏ స్క్రీన్ ఓపెన్ అవ్వాలో ఎంచుకోండి.' },
  membersSettingsTitle: { en: 'Members Settings', te: 'సభ్యుల సెట్టింగ్స్' },
  lateFineConfig: { en: 'Late Fine Configuration', te: 'లేట్ ఫైన్ సెట్టింగ్స్' },
  applyFinePeriodically: { en: 'Apply Fine Periodically', te: 'ఫైన్ విధించే పద్ధతి' },
  daily: { en: 'Daily', te: 'రోజుకు' },
  monthly: { en: 'Monthly', te: 'నెలకు' },
  yearly: { en: 'Yearly', te: 'సంవత్సరానికి' },
  monthlyDueDate: { en: 'Monthly Due Date (Day)', te: 'నెలవారీ గడువు తేదీ (రోజు)' },
  rateOfLateFine: { en: 'Rate of Late Fine (%)', te: 'లేట్ ఫైన్ శాతం (%)' },
  loanInterestRateConfig: { en: 'Rate of Interest on Loans (%)', te: 'అప్పులపై వడ్డీ రేటు (%)' },
  whatsappMessageConfig: { en: 'WhatsApp Message Configuration', te: 'వాట్సాప్ మెసేజ్ సెట్టింగ్స్' },
  resetToDefault: { en: 'Reset to Default', te: 'డిఫాల్ట్ కు మార్చు' },
  whatsappMsgCustomize: { en: 'Customize the message sent to members. Use the following variables to dynamically insert values:', te: 'సభ్యులకు పంపే వాట్సాప్ మెసేజ్ ను మీకు నచ్చిన విధంగా సెట్ చేసుకోండి. కింది వేరియబుల్స్ వాడవచ్చు:' },
  formattingTips: { en: 'Formatting Tips:', te: 'మెసేజ్ స్టైల్స్:' },
  formattingTipsDesc: { en: 'Add * before and after text to make it bold. Add _ before and after for italics.', te: 'అక్షరాలు బొద్దుగా (bold) రావడానికి పదానికి ముందు, వెనక * పెట్టండి. వాలుగా (italics) రావడానికి _ పెట్టండి.' },
  lateFineTooltip: { 
    en: 'Late fine is calculated as a percentage on the total pending RD savings amount plus the pending Loan Interest amount up to this month.\n\nExample: If pending RD is ₹200 and pending Interest is ₹300 (Total ₹500), and rate is 2%, the fine will be ₹10 per delayed month.', 
    te: 'లేట్ ఫైన్ అనగా, ఆ నెలకు కట్టాల్సిన పెండింగ్ పొదుపు మరియు అప్పు వడ్డీ కలిపిన మొత్తం మీద ఒక నిర్దిష్ట శాతంగా లెక్కించబడుతుంది.\n\nఉదాహరణ: పెండింగ్ RD ₹200, వడ్డీ ₹300 (మొత్తం ₹500), మరియు లేట్ ఫైన్ 2% అయితే, నెలకు ₹10 చొప్పున ఫైన్ పడుతుంది.' 
  },
  resetConfirm: { en: 'Are you sure you want to reset the WhatsApp message to its default template?', te: 'వాట్సాప్ మెసేజ్ ను డిఫాల్ట్ ఫార్మాట్ కు మార్చాలనుకుంటున్నారా?' },
  initializingSettings: { en: 'Initializing Settings... Please refresh the page if this persists.', te: 'సెట్టింగ్స్ లోడ్ అవుతున్నాయి... దయచేసి వేచి ఉండండి.' },

  // Tooltips for Dashboard Cards
  rdTooltip: {
    en: 'RD Details Calculation:\n\n• Saved So Far = Monthly Saving × Months Paid\n• Bonus Earned = Calculated based on standard interest formula over the paid months.\n• Current Value = Saved So Far + Bonus Earned.\n\nExample: If Monthly Saving is ₹100 and paid for 10 months, Saved So Far is ₹1,000. Bonus is calculated on this accumulated ₹1,000.',
    te: 'ఆర్డీ వివరాల లెక్కింపు:\n\n• ఇప్పటివరకు పొదుపు = నెలసరి పొదుపు × కట్టిన నెలలు\n• వచ్చిన బోనస్ = కట్టిన నెలల ఆధారంగా వడ్డీ సూత్రంతో లెక్కించబడుతుంది.\n• ప్రస్తుత విలువ = పొదుపు + వచ్చిన బోనస్.\n\nఉదాహరణ: నెలకు ₹100 చొప్పున 10 నెలలు కడితే పొదుపు ₹1,000 అవుతుంది. దీనిపై బోనస్ లెక్కించబడుతుంది.'
  },
  loanTooltip: {
    en: 'Loan Details Calculation:\n\n• Remaining Principal = Total Loan Disbursed - Principal Repaid so far.\n• Interest Due = 2% per month on the Remaining Principal for the unpaid months.\n• Total Amount to Pay = Remaining Principal + Interest Due.\n\nExample: If ₹5,000 is taken, and ₹1,000 is repaid, Remaining is ₹4,000. 2% interest on ₹4,000 is ₹80 per month.',
    te: 'లోన్ వివరాల లెక్కింపు:\n\n• మిగిలిన అసలు = తీసుకున్న మొత్తం లోన్ - ఇప్పటివరకు కట్టిన అసలు.\n• బాకీ ఉన్న వడ్డీ = కట్టని నెలలకు మిగిలిన అసలుపై 2% వడ్డీ చొప్పున.\n• మొత్తం కట్టాల్సినది = మిగిలిన అసలు + వడ్డీ.\n\nఉదాహరణ: ₹5,000 తీసుకుని ₹1,000 కడితే బ్యాలెన్స్ ₹4,000. దీనిపై 2% అంటే నెలకు ₹80 వడ్డీ పడుతుంది.'
  },
  duesTooltip: {
    en: 'Current Dues Calculation (up to current month):\n\n• Pending RD = Unpaid RD installments up to this month.\n• Pending Interest = Unpaid interest on active loans up to this month.\n• Late Fee = Penalty calculated based on settings (e.g. 2% on pending amounts per month of delay).\n• Total Amount to Pay = Pending RD + Pending Interest + Late Fee.',
    te: 'ప్రస్తుత బకాయిల లెక్కింపు (ఈ నెల వరకు):\n\n• పెండింగ్ ఆర్డీ = ఈ నెల వరకు కట్టని ఆర్డీ వాయిదాలు.\n• పెండింగ్ వడ్డీ = ఈ నెల వరకు కట్టని లోన్ వడ్డీ.\n• లేట్ ఫైన్ = సెట్టింగ్స్ లో ఇచ్చిన రేటు (ఉదా: 2%) ఆధారంగా కట్టని బకాయిలపై ఆలస్యపు రుసుము.\n• మొత్తం కట్టాల్సినది = పెండింగ్ ఆర్డీ + పెండింగ్ వడ్డీ + లేట్ ఫైన్.'
  },
  settlementTooltip: {
    en: 'Final Settlement Calculation:\n\n• We Pay Member = Total Saved + Bonus Earned (Current Value).\n• Deductions = Remaining Loan Principal + Pending Interest + Late Fee.\n• Net Settlement = (We Pay Member) - (Deductions).',
    te: 'ఫైనల్ సెటిల్మెంట్ లెక్కింపు:\n\n• మనం ఇవ్వాల్సిన మొత్తం = మొత్తం పొదుపు + వచ్చిన బోనస్ (ప్రస్తుత విలువ).\n• కట్ అయ్యేవి = మిగిలిన లోన్ అసలు + పెండింగ్ వడ్డీ + లేట్ ఫైన్.\n• ఫైనల్ అమౌంట్ = (మనం ఇవ్వాల్సింది) - (కట్ అయ్యేవి).'
  },
  
  // Dashboard Specific
  dashboardTitle: { en: 'Dashboard', te: 'డ్యాష్బోర్డ్' },
  dashboardSubtitle: { en: 'RD Manager Comprehensive Information', te: 'మీ RD మేనేజర్ వ్యవహారాల సమగ్ర సమాచారం' },
  totalMembersCount: { en: 'Total Members', te: 'మొత్తం సభ్యులు' },
  totalRdSavings: { en: 'Total RD Savings', te: 'మొత్తం పొదుపు (RD)' },
  totalLoansIssued: { en: 'Total Loans', te: 'మొత్తం రుణాలు' },
  pendingRdMembers: { en: 'Pending RD Members', te: 'పెండింగ్ RD సభ్యులు' },
  monthlyCollectionChart: { en: 'Monthly RD Collection', te: 'నెలవారీ RD సేకరణ' },
  paymentStatusChart: { en: 'RD Payment Status', te: 'RD చెల్లింపు స్థితి (మొత్తం సభ్యులు)' },
  top5Members: { en: 'Top 5 Members', te: 'టాప్ 5 సభ్యులు' },
  basedOnSavings: { en: 'Based on total savings', te: 'మొత్తం సేకరణ ఆధారంగా' },
  pendingMembersAttention: { en: 'Pending Members', te: 'పెండింగ్ సభ్యులు' },
  recentTransactionsDash: { en: 'Recent Transactions', te: 'ఇటీవల లావాదేవీలు' },
  viewAll: { en: 'View All →', te: 'అన్నీ చూడండి →' },
  activeMembersDash: { en: 'Active Members', te: 'యాక్టివ్ సభ్యులు' },
  completedMembersDash: { en: 'Completed', te: 'పూర్తి చేసిన వారు' },
  thisMonthCollection: { en: 'This Month Col.', te: 'ఈ నెల సేకరణ' },
  lastMonthCollection: { en: 'Last Month Col.', te: 'గత నెల సేకరణ' },
  activeLoansDash: { en: 'Active Loans', te: 'యాక్టివ్ రుణాలు' },
  completedLoansDash: { en: 'Completed Loans', te: 'పూర్తి చేసిన రుణాలు' },
  thisMonthInterest: { en: 'This Month Int.', te: 'ఈ నెల వడ్డీ' },
  totalPendingInterest: { en: 'Total Due', te: 'మొత్తం బకాయి' },
  onTimeDash: { en: 'On Time', te: 'సమయానికి' },
  pendingDash: { en: 'Pending', te: 'పెండింగ్లో' },
  noMembersYet: { en: 'No members registered yet', te: 'ఇంకా సభ్యులు నమోదు కాలేదు' },
  noTransactionsYet: { en: 'No transactions yet', te: 'ఇంకా లావాదేవీలు లేవు' },
  noPendingMembersText: { en: 'No pending members', te: 'పెండింగ్ సభ్యులు లేరు' },
  zoomLabel: { en: 'Screen Zoom', te: 'స్క్రీన్ జూమ్' }
};

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: keyof typeof translations) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('rd_manager_lang');
    return (saved === 'en' || saved === 'te') ? saved : 'te';
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('rd_manager_lang', newLang);
  };

  const t = (key: keyof typeof translations): string => {
    if (!translations[key]) return key as string;
    return translations[key][lang] || translations[key].en;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
