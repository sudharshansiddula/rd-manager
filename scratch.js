const fs = require('fs');
const file = 'src/components/views/MembersView.tsx';
let content = fs.readFileSync(file, 'utf8');

const pendingCardRegex = /\s*<div className="summary-card">[\s\S]*?pendingMembers[\s\S]*?<\/div>\s*<\/div>/g;

let pendingMatch = content.match(pendingCardRegex);

if (pendingMatch) {
  content = content.replace(pendingCardRegex, '');
  const insertIndex = content.indexOf('<div className="summary-card">', content.indexOf('totalMembers')) - 10;
  // wait, finding the right place to insert is tricky.
}
