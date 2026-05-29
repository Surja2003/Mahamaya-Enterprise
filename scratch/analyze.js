const fs = require('fs');
const src = fs.readFileSync('frontend/demo-products.js', 'utf8');
// Extract product count
const prods = src.match(/"id":/g);
console.log('product count:', prods ? prods.length : 0);
// Extract categories
const catMatches = [...src.matchAll(/"category":\s*"([^"]+)"/g)];
const cats = {};
catMatches.forEach(m => { cats[m[1]] = (cats[m[1]] || 0) + 1; });
console.log('CATEGORIES:', JSON.stringify(cats, null, 2));
// Check for images  
const noImgLines = [];
const lines = src.split('\n');
let currentId = '';
lines.forEach((l, i) => {
  const idMatch = l.match(/"id":\s*"([^"]+)"/);
  if (idMatch) currentId = idMatch[1];
  if (l.includes('placeholder') || (l.includes('"images"') && lines[i+1] && lines[i+1].includes('[]'))) {
    noImgLines.push(currentId);
  }
});
console.log('Products with placeholder images:', [...new Set(noImgLines)]);
