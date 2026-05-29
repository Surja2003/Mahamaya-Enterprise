const fs = require('fs');
const src = fs.readFileSync('frontend/demo-products.js', 'utf8');

// Parse all product ID + name + category combinations
const products = [];
const blocks = src.split(/"id":/);
blocks.slice(1).forEach(block => {
  const id = block.match(/"([^"]+)"/)?.[1];
  const name = block.match(/"name":\s*"([^"]+)"/)?.[1];
  const cat = block.match(/"category":\s*"([^"]+)"/)?.[1];
  const brand = block.match(/"brand":\s*"([^"]+)"/)?.[1];
  products.push({ id, name, cat, brand });
});

console.log('Total products:', products.length);

// Check for products that seem misplaced based on name vs category
const issues = [];
products.forEach(p => {
  if (!p.cat || !p.name) return;
  const name = p.name.toLowerCase();
  const cat = p.cat;
  
  // Electrical items in wrong category
  if ((name.includes('switch') || name.includes('socket') || name.includes('mcb') || name.includes('fan') || name.includes('wire') || name.includes('plug')) && cat !== 'Electrical') {
    issues.push({ id: p.id, name: p.name, cat, issue: 'Looks electrical but in ' + cat });
  }
  // Plumbing items in wrong category
  if ((name.includes('pipe') || name.includes('valve') || name.includes('tank') || name.includes('elbow') || name.includes('tee') || name.includes('cpvc') || name.includes('upvc')) && cat !== 'Plumbing') {
    issues.push({ id: p.id, name: p.name, cat, issue: 'Looks plumbing but in ' + cat });
  }
  // Paint items in wrong category
  if ((name.includes('cement') || name.includes('putty') || name.includes('paint') || name.includes('emulsion')) && cat === 'Plumbing') {
    issues.push({ id: p.id, name: p.name, cat, issue: 'Paint/cement in Plumbing?' });
  }
});

console.log('\nPotentially misplaced products:');
issues.forEach(i => console.log(`  [${i.cat}] ${i.id}: ${i.name} — ${i.issue}`));

// Check for duplicate product IDs
const ids = products.map(p => p.id);
const dups = ids.filter((id, idx) => ids.indexOf(id) !== idx);
if (dups.length) console.log('\nDuplicate IDs:', dups);
else console.log('\nNo duplicate IDs found ✓');

// Show all categories
const cats = {};
products.forEach(p => { cats[p.cat] = (cats[p.cat] || 0) + 1; });
console.log('\nFinal categories:', JSON.stringify(cats, null, 2));
