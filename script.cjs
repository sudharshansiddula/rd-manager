const fs = require('fs');
const file = 'src/components/views/MembersView.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /<div className="summary-grid">([\s\S]*?)<\/div>\s*\{\/\* Top Action Bar \*\/\}/m;
const match = content.match(regex);
if (match) {
  let gridContent = match[1];
  let cards = gridContent.split('<div className="summary-card">').filter(c => c.trim().length > 0);
  
  let newCards = [];
  
  let pendingCard = cards.find(c => c.includes('pendingMembers'));
  let otherCards = cards.filter(c => !c.includes('pendingMembers'));

  newCards.push(otherCards[0]);
  newCards.push(pendingCard);
  newCards.push(otherCards[1]);
  newCards.push(otherCards[2]);
  newCards.push(otherCards[3]);
  newCards.push(otherCards[4]);
  newCards.push(otherCards[5]);

  let newGridContent = '\n          <div className="summary-card">' + newCards.join('<div className="summary-card">') + '        ';
  content = content.replace(gridContent, newGridContent);
  fs.writeFileSync(file, content);
  console.log('done');
} else {
  console.log('not found');
}
