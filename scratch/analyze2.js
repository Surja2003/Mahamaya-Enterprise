const fs = require('fs');
const src = fs.readFileSync('frontend/demo-products.js', 'utf8');

// Find all products with their IDs, names, categories and images
const products = [];
const idMatches = [...src.matchAll(/"id":\s*"([^"]+)"/g)];
const nameMatches = [...src.matchAll(/"name":\s*"([^"]+)"/g)];
const catMatches = [...src.matchAll(/"category":\s*"([^"]+)"/g)];
const imgMatches = [...src.matchAll(/"images":\s*\[([\s\S]*?)\]/g)];

console.log('Total products by ID:', idMatches.length);

// Find duplicate images
const imageMap = {};
imgMatches.forEach((m, i) => {
  const imgs = [...m[1].matchAll(/"([^"]+)"/g)].map(x => x[1]);
  imgs.forEach(img => {
    if (!imageMap[img]) imageMap[img] = [];
    imageMap[img].push(idMatches[i] ? idMatches[i][1] : 'unknown_'+i);
  });
});

console.log('\nImages used by multiple products:');
Object.entries(imageMap).forEach(([img, ids]) => {
  if (ids.length > 1) {
    console.log(`  ${img}: ${ids.join(', ')}`);
  }
});

// Count images per product
const productData = [];
let pidx = 0;
const sections = src.split(/"id":/);
sections.slice(1).forEach((sec, i) => {
  const id = sec.match(/"([^"]+)"/)?.[1];
  const name = sec.match(/"name":\s*"([^"]+)"/)?.[1];
  const cat = sec.match(/"category":\s*"([^"]+)"/)?.[1];
  const imgs = [...(sec.match(/"images":\s*\[([\s\S]*?)\]/) || ['',''])[1].matchAll(/"([^"]+)"/g)].map(x=>x[1]);
  productData.push({ id, name, cat, imgs });
});

console.log('\nProducts with no/placeholder images:');
productData.forEach(p => {
  if (!p.imgs.length || p.imgs.every(i => i.includes('placeholder'))) {
    console.log(`  [${p.cat}] ${p.id}: ${p.name}`);
  }
});

console.log('\nTotal:', productData.length);
