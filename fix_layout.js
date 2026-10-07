const fs = require('fs');
const file = 'src/components/views/MembersView.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /<div className="summary-grid">([\s\S]*?)<\/div>\s*\{\/\* Top Action Bar \*\/\}/m;
const match = content.match(regex);
if (match) {
  let gridContent = match[1];
  let cards = gridContent.split(/<div className="summary-card">/g).filter(c => c.trim().length > 0);
  
  // cards[0] is totalMembers
  // cards[1] is totalSavedAmount
  // cards[2] is activeLoans
  // cards[3] is totalDueInterest
  // cards[4] is pendingMembers
  // cards[5] is totalAmountToPay
  // cards[6] is netProfit

  let newCards = [];
  
  let pendingCard = cards.find(c => c.includes('pendingMembers'));
  let otherCards = cards.filter(c => !c.includes('pendingMembers'));

  newCards.push(otherCards[0]); // totalMembers
  newCards.push(pendingCard);
  newCards.push(otherCards[1]); // totalSavedAmount
  newCards.push(otherCards[2]); // activeLoans
  newCards.push(otherCards[3]); // totalDueInterest
  newCards.push(otherCards[4]); // totalAmountToPay
  newCards.push(otherCards[5]); // netProfit

  let newGridContent = '\\n          <div className="summary-card">' + newCards.join('<div className="summary-card">') + '        ';
  content = content.replace(gridContent, newGridContent);
  fs.writeFileSync(file, content);
  console.log('done');
} else {
  console.log('not found');
}
