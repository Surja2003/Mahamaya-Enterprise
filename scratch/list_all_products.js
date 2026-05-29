const fs = require('fs');
const src = fs.readFileSync('frontend/demo-products.js', 'utf8');

// Find the actual IDs for unfixed products
const notFixedKeywords = ['birla', 'first', 'flyash', 'river_sand', 'berger_silk', 'goldmedal_wire', 'pritam_led', 'pritam_dboard', 'power_tool', 'roma_plug_2pin'];

const productBlocks = src.split(/"id":\s*/);
productBlocks.slice(1).forEach(block => {
  const id = block.match(/"([^"]+)"/)?.[1];
  const name = block.match(/"name":\s*"([^"]+)"/)?.[1];
  const img = block.match(/"images":\s*\[([\s\S]*?)\]/)?.[1];
  const firstImg = img?.match(/"([^"]+)"/)?.[1];
  if (id) {
    console.log(`ID: "${id}" | Name: "${name}" | Img: ${firstImg}`);
  }
});
