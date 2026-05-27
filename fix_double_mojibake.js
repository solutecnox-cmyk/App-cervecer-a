const fs = require('fs');
const files = [
    'c:/Users/Mauricio Florez/Documents/Aplicacion gestion de inventarios cerveceria/funciones.js',
    'c:/Users/Mauricio Florez/Documents/Aplicacion gestion de inventarios cerveceria/Index.html'
];

const replacements = {
    'ÃƒÂ¡': 'á',
    'ÃƒÂ©': 'é',
    'ÃƒÂ³': 'ó',
    'ÃƒÂº': 'ú',
    'ÃƒÂ±': 'ñ',
    'ÃƒÂ­': 'í',
    'Ã‚Â¿': '¿',
    'Ã‚Â¡': '¡',
    'Ã¢â‚¬â€': '—',
    'Ã¢Å“â€¦': '✅',
    'Ã¢Å¡Â Ã¯Â¸Â': '⚠️',
    'Ã°Å¸â€ Âµ': '🔵',
    'Ã°Å¸Å¸Â¢': '🟢',
    'Ã¢â‚¬â€œ': '–',
    'Ã³': 'ó',
    'Ã¡': 'á',
    'Ã©': 'é',
    'Ã­': 'í',
    'Ãº': 'ú',
    'Ã±': 'ñ',
    'Â¿': '¿',
    'Â¡': '¡'
};

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    for (const [bad, good] of Object.entries(replacements)) {
        content = content.split(bad).join(good);
    }
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Fixed encoding in ${file}`);
}
