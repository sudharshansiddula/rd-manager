const fs = require('fs');

const file = 'src/components/views/SettingsView.tsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

const startIndex = lines.findIndex(l => l.includes('{/* Screen Zoom Section */}'));
const endIndex = lines.findIndex((l, i) => i > startIndex && l.includes('Advanced / Data Import Section')) - 1;

if (startIndex !== -1 && endIndex !== -1) {
    // Extract the block
    const block = lines.slice(startIndex, endIndex);
    
    // Remove the block from original position
    lines.splice(startIndex, endIndex - startIndex);
    
    // Find where to insert (before the closing div of App Settings Card)
    // The App Settings Card ends before "{/* Members Settings Card */}"
    const insertIndex = lines.findIndex(l => l.includes('{/* Members Settings Card */}')) - 1;
    
    if (insertIndex !== -1) {
        lines.splice(insertIndex, 0, ...block);
        fs.writeFileSync(file, lines.join('\n'));
        console.log('Successfully moved Screen Zoom and Text Size sections.');
    } else {
        console.log('Could not find insert index');
    }
} else {
    console.log('Could not find start or end index');
}
