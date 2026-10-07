const fs = require('fs');
const file = 'src/components/views/MembersView.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
  /let result = enrichedMembers\.filter\(m => \s*m\.name\.toLowerCase\(\)\.includes\(searchTerm\.toLowerCase\(\)\) \|\| \s*m\.memberNumber\.includes\(searchTerm\) \|\|\s*\(m\.mobile && m\.mobile\.includes\(searchTerm\)\)\s*\);/,
  `let result = enrichedMembers.filter(m => 
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        m.memberNumber.includes(searchTerm) ||
        (m.mobile && m.mobile.includes(searchTerm))
      );
      if (searchTerm) {
        result.sort((a, b) => {
          if (a.memberNumber === searchTerm && b.memberNumber !== searchTerm) return -1;
          if (b.memberNumber === searchTerm && a.memberNumber !== searchTerm) return 1;
          return 0;
        });
      }`
);

c = c.replace(
  /<input \s*type="text" \s*className="input-compact" \s*style=\{\{ paddingLeft: '32px', width: '100%' \}\}\s*placeholder=\{t\('searchHint'\)\}\s*value=\{searchTerm\}\s*onChange=\{\(e\) => setSearchTerm\(e\.target\.value\)\}\s*\/>/,
  `<input 
                type="text" 
                className="input-compact" 
                style={{ paddingLeft: '32px', paddingRight: searchTerm ? '32px' : '10px', width: '100%' }}
                placeholder={t('searchHint')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <X 
                  size={16} 
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', cursor: 'pointer' }} 
                  onClick={() => setSearchTerm('')} 
                />
              )}`
);

fs.writeFileSync(file, c, 'utf8');
