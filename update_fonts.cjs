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
    if (file.endsWith('.tsx')) {
        let content = fs.readFileSync(file, 'utf8');
        let newContent = content.replace(/fontSize:\s*['"](\d+)px['"]/g, 'fontSize: `calc($1px * var(--text-scale, 1))`');
        if (content !== newContent) {
            fs.writeFileSync(file, newContent);
            console.log('Updated ' + file);
        }
    } else if (file.endsWith('.css')) {
        let content = fs.readFileSync(file, 'utf8');
        let newContent = content.replace(/font-size:\s*(\d+)px/g, 'font-size: calc($1px * var(--text-scale, 1))');
        if (content !== newContent) {
            fs.writeFileSync(file, newContent);
            console.log('Updated CSS ' + file);
        }
    }
});
