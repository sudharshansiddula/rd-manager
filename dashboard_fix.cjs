const fs = require('fs');
const file = 'src/components/views/MembersView.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
  /const stats = useMemo\(\(\) => \{\s*return filtered\.reduce\(\(acc, m\) => \{\s*acc\.totalMembers\+\+;\s*if \(m\.status === 'ACTIVE'\) \{\s*acc\.activeMembers\+\+;\s*acc\.totalSaved \+= \(m\.paidMonths \* m\.monthlyContribution\);\s*if \(m\.pendingMonths > 0\) acc\.pendingMembers\+\+;\s*\}/m,
  `const stats = useMemo(() => {
      return filtered.reduce((acc, m) => {
        acc.totalMembers++;
        acc.totalSaved += (m.paidMonths * m.monthlyContribution);
        if (m.pendingMonths > 0 && !m.isCompleted) acc.pendingMembers++;
        if (m.status === 'ACTIVE') {
          acc.activeMembers++;
        }`
);

c = c.replace(
  /<span className=\"summary-value\">\{stats\.activeMembers\} <span style=\{\{ fontSize: \`calc\(14px \* var\(--text-scale, 1\)\)\`, color: 'var\(--text-muted\)' \}\}>\/ \{stats\.totalMembers\}<\/span><\/span>/,
  `<span className="summary-value">{filtered.length} <span style={{ fontSize: \`calc(14px * var(--text-scale, 1))\`, color: 'var(--text-muted)' }}>/ {enrichedMembers.length}</span></span>`
);

fs.writeFileSync(file, c, 'utf8');
