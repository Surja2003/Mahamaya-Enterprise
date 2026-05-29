/**
 * Fix Berger paint images (currently showing Asian Paints APEX - rivals!)
 * Fix white cement image (currently same as JSW grey cement)
 * Fix broken Unsplash colour images
 */
const fs = require('fs');
let src = fs.readFileSync('frontend/demo-products.js', 'utf8');

// Reliable placehold.co colour images for Berger paint variants
// These are always available and clearly show the paint colour
const fixes = [
  // ─── Berger Silk Exterior (was using Asian Paints apex_paint.webp — WRONG!)
  { id: 'prod_paints_berger_silk_ext',           img: '/assets/berger_weathercoat.png' },
  // ─── Berger Weathercoat Exterior (all were using apex_paint.webp — WRONG!)
  { id: 'prod_paints_berger_weather_white',         img: '/assets/berger_weathercoat.png' },
  { id: 'prod_paints_berger_weather_bright_white',  img: '/assets/berger_weathercoat.png' },
  { id: 'prod_paints_berger_weather_terracotta_red',img: 'https://placehold.co/400x400/c1440e/ffffff?text=Berger+Weathercoat%0ATerracotta+Red' },
  { id: 'prod_paints_berger_weather_slate_grey',    img: 'https://placehold.co/400x400/667788/ffffff?text=Berger+Weathercoat%0ASlate+Grey' },
  { id: 'prod_paints_berger_weather_mustard_yellow',img: 'https://placehold.co/400x400/d4a019/ffffff?text=Berger+Weathercoat%0AMustard+Yellow' },
  { id: 'prod_paints_berger_weather_olive_green',   img: 'https://placehold.co/400x400/5d7a26/ffffff?text=Berger+Weathercoat%0AOlive+Green' },
  // ─── Berger Silk Interior colours (were broken Unsplash URLs)
  { id: 'prod_paints_berger_silk_off_white',    img: '/assets/berger_weathercoat.png' },
  { id: 'prod_paints_berger_silk_royal_blue',   img: 'https://placehold.co/400x400/1a56c4/ffffff?text=Berger+Silk%0ARoyal+Blue' },
  { id: 'prod_paints_berger_silk_golden_yellow',img: 'https://placehold.co/400x400/e6b800/333333?text=Berger+Silk%0AGolden+Yellow' },
  { id: 'prod_paints_berger_silk_cherry_red',   img: 'https://placehold.co/400x400/c0392b/ffffff?text=Berger+Silk%0ACherry+Red' },
  { id: 'prod_paints_berger_silk_ocean_green',  img: 'https://placehold.co/400x400/0d9e4e/ffffff?text=Berger+Silk%0AOcean+Green' },
  // ─── Also fix prod_berger_silk (generic Berger silk)
  { id: 'prod_berger_silk',                     img: '/assets/berger_weathercoat.png' },
  // ─── White cement — should look clearly DIFFERENT from JSW grey cement
  { id: 'prod_paints_white_cement',             img: '/assets/white_cement_bag.png' },
];

let fixed = 0;
fixes.forEach(({ id, img }) => {
  const escapedId = id.replace(/\//g, '\\/');
  // Match: "id": "PRODUCT_ID" ... "images": [ ... ]
  const regex = new RegExp(
    `("id":\\s*"${escapedId}"[\\s\\S]*?)"images":\\s*\\[[^\\]]*?\\]`,
    'g'
  );
  const before = src;
  src = src.replace(regex, `$1"images": [\n        "${img}"\n      ]`);
  if (src !== before) {
    fixed++;
    console.log(`✅ Fixed: ${id} → ${img}`);
  } else {
    console.log(`⚠️  Not found: ${id}`);
  }
});

fs.writeFileSync('frontend/demo-products.js', src, 'utf8');
console.log(`\nDone. Fixed ${fixed}/${fixes.length} products.`);

// Verify no Berger product still uses apex_paint.webp
const apexMatches = [];
const blocks = src.split(/"id":\s*/);
blocks.slice(1).forEach(block => {
  const pid = block.match(/"([^"]+)"/)?.[1];
  const name = block.match(/"name":\s*"([^"]+)"/)?.[1];
  const img = block.match(/"images":\s*\[([\s\S]*?)\]/)?.[1];
  if (img?.includes('apex_paint') && name?.toLowerCase().includes('berger')) {
    apexMatches.push({ pid, name });
  }
});
if (apexMatches.length === 0) {
  console.log('\n✅ No Berger products using Asian Paints apex image anymore!');
} else {
  console.log('\n❌ Still using apex_paint:', apexMatches);
}
