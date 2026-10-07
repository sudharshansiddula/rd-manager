const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            results.push(file);
        }
    });
    return results;
}

const files = walk('src');

files.forEach(file => {
    if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css')) {
        let content = fs.readFileSync(file, 'utf8');
        
        // Replace in TSX/CSS: calc(Xpx * var(--text-scale, 1)) -> calc(Xpx + var(--text-adjust, 0px))
        let newContent = content.replace(/calc\(([^%]+?) \* var\(--text-scale, 1\)\)/g, 'calc($1 + var(--text-adjust, 0px))');
        
        if (content !== newContent) {
            fs.writeFileSync(file, newContent);
            console.log('Updated ' + file);
        }
    }
});
