const fs = require('fs');
const file = 'src/components/views/MembersView.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
  /const \[statusFilter, setStatusFilter\] = useState.*?<.*?>\('ALL'\);/,
  "const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'ALL' | 'LOAN_ACTIVE' | 'RD_PENDING' | 'RD_COMPLETED_FULL' | 'RD_CLOSED_MIDDLE' | 'RD_PAID_UP_TO_DATE'>('ACTIVE');"
);

c = c.replace(
  /if \(statusFilter === 'LOAN_ACTIVE'\) \{[\s\S]*?result = result\.filter\(m => m\.pendingMonths <= 0 && !m\.isCompleted\);\s*\}/,
  `if (statusFilter === 'ACTIVE') {
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
    }`
);

const selectRegex = /<select[\s\S]*?className="input-compact"[\s\S]*?value=\{statusFilter\}[\s\S]*?onChange=\{\(e\) => setStatusFilter\(e\.target\.value as any\)\}[\s\S]*?>[\s\S]*?<\/select>/;

const newSelect = `<select 
              className="input-compact" 
              style={{ width: '220px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="ACTIVE">యాక్టివ్ గా ఉన్న సభ్యులు</option>
              <option value="ALL">అందరు (All)</option>
              <option value="LOAN_ACTIVE">అప్పు ఉన్నవారు</option>
              <option value="RD_PENDING">ఆర్డీ బాకీ ఉన్నవారు</option>
              <option value="RD_COMPLETED_FULL">ఆర్డీ పూర్తి నెలలకి పూర్తయినవారు</option>
              <option value="RD_CLOSED_MIDDLE">ఆర్డీ మధ్యంతరంగా పూర్తయినవారు</option>
              <option value="RD_PAID_UP_TO_DATE">ఆర్డీ ఇప్పటివరకు కట్టినవారు</option>
            </select>`;

c = c.replace(selectRegex, newSelect);

fs.writeFileSync(file, c, 'utf8');
