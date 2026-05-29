import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const productsPath = path.join(__dirname, '../backend/data/products.json');
const demoProductsPath = path.join(__dirname, '../frontend/demo-products.js');

// Helper to generate a date from 1-2 weeks ago
function getRandomDate() {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * 14));
  return d.toISOString();
}

async function run() {
  console.log('Loading existing products...');
  const existingRaw = fs.readFileSync(productsPath, 'utf-8');
  const parsed = JSON.parse(existingRaw);
  const existingProducts = parsed.products || [];
  
  // Keep the 22 core products
  const coreProducts = existingProducts.slice(0, 22);
  const coreIds = new Set(coreProducts.map(p => p.id));
  
  console.log(`Retained ${coreProducts.length} core products.`);
  
  const expandedProducts = [...coreProducts];
  
  // 1. PLUMBING (add CPVC/UPVC pipes 1/2" to 4", elbows, tees, sockets, brass elbows, teflon tape, duct tape, water tanks)
  const pipeSizes = ['1/2 inch', '3/4 inch', '1 inch', '1.5 inch', '2 inch', '3 inch', '4 inch'];
  const pipePrices = {
    '1/2 inch': { price: 180, mrp: 210 },
    '3/4 inch': { price: 240, mrp: 275 },
    '1 inch': { price: 340, mrp: 390 },
    '1.5 inch': { price: 490, mrp: 560 },
    '2 inch': { price: 690, mrp: 790 },
    '3 inch': { price: 1250, mrp: 1400 },
    '4 inch': { price: 1950, mrp: 2200 }
  };

  // Add CPVC Pipes
  pipeSizes.forEach(size => {
    const prices = pipePrices[size];
    expandedProducts.push({
      id: `prod_plumbing_cpvc_pipe_${size.replace(' ', '_').replace('.', '_')}`,
      name: `Supreme CPVC Pipe (${size}, 3m)`,
      category: 'Plumbing',
      brand: 'Supreme',
      sku: `PLM-CPVC-P-${size.replace(' ', '').toUpperCase()}`,
      price: prices.price,
      mrp: prices.mrp,
      stock: 350,
      rating: 4.6,
      ratingCount: 34,
      shortDesc: `Heavy duty SDR-11 CPVC pipe in ${size} diameter. Length 3 meters.`,
      longDesc: `Supreme CPVC pipes are designed for hot and cold water distribution. Manufactured with lead-free, food-grade compound. Extremely durable, leak-proof, and corrosion resistant. Enforced purchase in multiples of 2.`,
      tags: ['pipe', 'cpvc', 'plumbing', 'hot water', 'supreme'],
      images: ['/assets/pvc_pipe.webp'],
      featured: false,
      bestSeller: false,
      soldCount: 140,
      minQty: 2,
      qtyStep: 2,
      variants: null,
      createdAt: getRandomDate(),
      updatedAt: getRandomDate()
    });
  });

  // Add UPVC Pipes
  pipeSizes.forEach(size => {
    const prices = pipePrices[size];
    expandedProducts.push({
      id: `prod_plumbing_upvc_pipe_${size.replace(' ', '_').replace('.', '_')}`,
      name: `Astral UPVC Pipe (${size}, 3m)`,
      category: 'Plumbing',
      brand: 'Astral',
      sku: `PLM-UPVC-P-${size.replace(' ', '').toUpperCase()}`,
      price: Math.round(prices.price * 0.85), // UPVC is slightly cheaper than CPVC
      mrp: Math.round(prices.mrp * 0.85),
      stock: 400,
      rating: 4.5,
      ratingCount: 28,
      shortDesc: `Lead-free UPVC pipe in ${size} diameter. Length 3 meters.`,
      longDesc: `Astral lead-free UPVC pressure pipes are ideal for cold water plumbing applications. Highly resistant to chemical scaling and weathering. Multi-layer technology ensures high pressure resistance.`,
      tags: ['pipe', 'upvc', 'plumbing', 'cold water', 'astral'],
      images: ['/assets/pvc_pipe.webp'],
      featured: false,
      bestSeller: false,
      soldCount: 98,
      minQty: 2,
      qtyStep: 2,
      variants: null,
      createdAt: getRandomDate(),
      updatedAt: getRandomDate()
    });
  });

  // Add CPVC fittings (Elbow, Tee, Socket, Brass Elbow)
  const cpvcFittings = [
    { type: 'Elbow', name: 'CPVC 90 Degree Elbow (3/4 inch)', price: 25, mrp: 30, tags: ['elbow', 'cpvc', 'fitting'] },
    { type: 'Tee', name: 'CPVC Equal Tee (3/4 inch)', price: 35, mrp: 42, tags: ['tee', 'cpvc', 'fitting'] },
    { type: 'Socket', name: 'CPVC Coupler Socket (3/4 inch)', price: 18, mrp: 22, tags: ['socket', 'coupler', 'cpvc', 'fitting'] },
    { type: 'Brass_Elbow', name: 'CPVC Brass transition Elbow (3/4 x 1/2 inch)', price: 120, mrp: 145, tags: ['brass elbow', 'elbow', 'cpvc', 'fitting'] }
  ];
  cpvcFittings.forEach(f => {
    expandedProducts.push({
      id: `prod_plumbing_cpvc_${f.type.toLowerCase()}_34`,
      name: `Supreme ${f.name}`,
      category: 'Plumbing',
      brand: 'Supreme',
      sku: `PLM-CPVC-F-${f.type.toUpperCase()}-34`,
      price: f.price,
      mrp: f.mrp,
      stock: 1200,
      rating: 4.7,
      ratingCount: 42,
      shortDesc: `High pressure CPVC plumbing joint fitting. Class-1, SDR-11.`,
      longDesc: `Precision molded Supreme CPVC socket fitting. Certified for clean water distribution networks. Resistant to chemical deterioration and high operating temperatures.`,
      tags: [...f.tags, 'supreme'],
      images: ['/assets/ball_valve.webp'],
      featured: false,
      bestSeller: false,
      soldCount: 350,
      minQty: 5,
      qtyStep: 5,
      variants: null,
      createdAt: getRandomDate(),
      updatedAt: getRandomDate()
    });
  });

  // Add UPVC fittings (Elbow, Tee, Socket, Brass Elbow)
  const upvcFittings = [
    { type: 'Elbow', name: 'UPVC 90 Degree Elbow (3/4 inch)', price: 20, mrp: 25, tags: ['elbow', 'upvc', 'fitting'] },
    { type: 'Tee', name: 'UPVC Equal Tee (3/4 inch)', price: 28, mrp: 35, tags: ['tee', 'upvc', 'fitting'] },
    { type: 'Socket', name: 'UPVC Coupler Socket (3/4 inch)', price: 14, mrp: 18, tags: ['socket', 'coupler', 'upvc', 'fitting'] },
    { type: 'Brass_Elbow', name: 'UPVC Brass transition Elbow (3/4 x 1/2 inch)', price: 110, mrp: 130, tags: ['brass elbow', 'elbow', 'upvc', 'fitting'] }
  ];
  upvcFittings.forEach(f => {
    expandedProducts.push({
      id: `prod_plumbing_upvc_${f.type.toLowerCase()}_34`,
      name: `Astral ${f.name}`,
      category: 'Plumbing',
      brand: 'Astral',
      sku: `PLM-UPVC-F-${f.type.toUpperCase()}-34`,
      price: f.price,
      mrp: f.mrp,
      stock: 1500,
      rating: 4.6,
      ratingCount: 38,
      shortDesc: `Lead-free UPVC cold water plumbing socket fitting.`,
      longDesc: `Lead-free Astral UPVC pipe fitting. Excellent hydraulic performance and corrosion-free operation for long lifespans.`,
      tags: [...f.tags, 'astral'],
      images: ['/assets/ball_valve.webp'],
      featured: false,
      bestSeller: false,
      soldCount: 420,
      minQty: 5,
      qtyStep: 5,
      variants: null,
      createdAt: getRandomDate(),
      updatedAt: getRandomDate()
    });
  });

  // Add Teflon, Duct Tape, Water Tanks
  expandedProducts.push({
    id: 'prod_plumbing_teflon_tape',
    name: 'Teflon Thread Seal Tape (Pack of 5)',
    category: 'Plumbing',
    brand: 'Pidilite',
    sku: `PLM-ACC-TEFLON-P5`,
    price: 90,
    mrp: 120,
    stock: 800,
    rating: 4.8,
    ratingCount: 150,
    shortDesc: 'PTFE teflon thread sealant tape for pipe fitting threads.',
    longDesc: 'Pidilite thread seal tape prevents water leakages at threaded connections. Standard size 12mm x 10m. Resilient, stretchable, and chemical resistant. Pack of 5 rolls.',
    tags: ['teflon', 'sealant', 'ptfe', 'tape', 'plumbing', 'leak proof'],
    images: ['/assets/safety_helmet.webp'], // fall back to safety layout or similar
    featured: false,
    bestSeller: true,
    soldCount: 950,
    minQty: 1,
    qtyStep: 1,
    variants: null,
    createdAt: getRandomDate(),
    updatedAt: getRandomDate()
  });

  expandedProducts.push({
    id: 'prod_plumbing_duck_tape',
    name: 'Heavy-Duty Waterproof Duct Tape (Black)',
    category: 'Plumbing',
    brand: '3M',
    sku: `PLM-ACC-DUCT-BK`,
    price: 180,
    mrp: 220,
    stock: 650,
    rating: 4.7,
    ratingCount: 88,
    shortDesc: 'Ultra-sticky waterproof duct tape for temporary patch and bindings.',
    longDesc: '3M professional grade waterproof duct tape. Black color. Thickness 50mm, length 10m. Heavy duty adhesive mesh fabric grips strongly to plastics, metal, concrete and wood.',
    tags: ['tape', 'duct tape', 'sticky tape', 'waterproof', '3m', 'seal'],
    images: ['/assets/goldmedal_wire.webp'],
    featured: false,
    bestSeller: false,
    soldCount: 300,
    minQty: 1,
    qtyStep: 1,
    variants: null,
    createdAt: getRandomDate(),
    updatedAt: getRandomDate()
  });

  expandedProducts.push({
    id: 'prod_plumbing_tank_500',
    name: 'Supreme Water Tank Triple Layer (500L)',
    category: 'Plumbing',
    brand: 'Supreme',
    sku: `PLM-TANK-500L`,
    price: 3600,
    mrp: 4200,
    stock: 45,
    rating: 4.8,
    ratingCount: 52,
    shortDesc: 'Triple layer UV-stabilized overhead water tank. 500 liters capacity.',
    longDesc: 'Supreme triple-layered overhead plastic water storage tank. Threaded air-tight lid. Inner antimicrobial layer prevents algae and bacterial buildup. Mid insulation layer maintains water temperature.',
    tags: ['tank', 'water tank', 'supreme', 'plumbing', 'overhead storage'],
    images: ['/assets/apex_paint.webp'],
    featured: true,
    bestSeller: false,
    soldCount: 35,
    minQty: 1,
    qtyStep: 1,
    variants: null,
    createdAt: getRandomDate(),
    updatedAt: getRandomDate()
  });

  expandedProducts.push({
    id: 'prod_plumbing_tank_1000',
    name: 'Supreme Water Tank Triple Layer (1000L)',
    category: 'Plumbing',
    brand: 'Supreme',
    sku: `PLM-TANK-1000L`,
    price: 6800,
    mrp: 7900,
    stock: 30,
    rating: 4.9,
    ratingCount: 74,
    shortDesc: 'Triple layer UV-stabilized overhead water tank. 1000 liters capacity.',
    longDesc: 'Supreme premium overhead water storage tank. triple-layered plastic structure with UV protection. Inner antibacterial food-grade liner. Includes heavy-duty brass outlet flange.',
    tags: ['tank', 'water tank', 'supreme', 'plumbing', 'overhead storage'],
    images: ['/assets/apex_paint.webp'],
    featured: true,
    bestSeller: true,
    soldCount: 60,
    minQty: 1,
    qtyStep: 1,
    variants: null,
    createdAt: getRandomDate(),
    updatedAt: getRandomDate()
  });


  // 2. ELECTRICAL (add plugs, sockets, switches, MCB/MCB box, cables 0.5mm to 8mm, table fan, ceiling fan)
  const wireSizes = ['0.5 mm', '0.75 mm', '1.0 mm', '1.5 mm', '2.5 mm', '4.0 mm', '6.0 mm', '8.0 mm'];
  const wirePrices = {
    '0.5 mm': { price: 620, mrp: 750 },
    '0.75 mm': { price: 890, mrp: 1050 },
    '1.0 mm': { price: 1150, mrp: 1380 },
    '1.5 mm': { price: 1650, mrp: 1980 },
    '2.5 mm': { price: 2750, mrp: 3300 },
    '4.0 mm': { price: 4200, mrp: 4950 },
    '6.0 mm': { price: 6300, mrp: 7400 },
    '8.0 mm': { price: 8200, mrp: 9600 }
  };

  wireSizes.forEach(size => {
    const prices = wirePrices[size];
    expandedProducts.push({
      id: `prod_elec_wire_${size.replace(' ', '_').replace('.', '_')}`,
      name: `Havells Lifeline FR Copper Cable (${size}, 90m)`,
      category: 'Electrical',
      brand: 'Havells',
      sku: `ELC-WIRE-HV-${size.replace(' ', '').toUpperCase()}`,
      price: prices.price,
      mrp: prices.mrp,
      stock: 120,
      rating: 4.8,
      ratingCount: 65,
      shortDesc: `Flame retardant (FR) PVC insulated multi-strand copper electrical wire. Size: ${size}. Length: 90 meters.`,
      longDesc: `Havells Lifeline FR wire is insulated with specialized PVC formulation that gives high resistance to fire and sparks. Class 5 high-purity electrolytic copper conductor ensures low electrical energy loss.`,
      tags: ['wire', 'cable', 'copper', 'havells', 'electrical', size],
      images: ['/assets/goldmedal_wire.webp'],
      featured: false,
      bestSeller: size === '1.5 mm' || size === '2.5 mm',
      soldCount: 220,
      minQty: 1,
      qtyStep: 1,
      variants: null,
      createdAt: getRandomDate(),
      updatedAt: getRandomDate()
    });
  });

  // Switches and sockets
  const switches = [
    { id: 'switch_1w_6a', name: '1-Way Switch 6A', price: 22, mrp: 28, desc: 'Roma Classic 6A 1-Way white switch.' },
    { id: 'switch_2w_6a', name: '2-Way Switch 6A', price: 38, mrp: 48, desc: 'Roma Classic 6A 2-Way white switch.' },
    { id: 'switch_1w_16a', name: '1-Way Switch 16A', price: 55, mrp: 70, desc: 'Roma Classic 16A 1-Way white switch for appliances.' },
    { id: 'switch_2w_16a', name: '2-Way Switch 16A', price: 78, mrp: 98, desc: 'Roma Classic 16A 2-Way white switch for appliances.' },
    { id: 'plug_2pin', name: '2-Pin Electrical Plug Top', price: 15, mrp: 20, desc: 'Heavy-duty thermoplastic 2-pin plug top.' },
    { id: 'socket_6a', name: '3-Pin Socket 6A', price: 45, mrp: 60, desc: 'Roma Modular 3-pin safety socket 6A.' },
    { id: 'socket_16a', name: '3-Pin Socket 16A', price: 75, mrp: 95, desc: 'Roma Modular heavy appliance socket 16A.' }
  ];
  switches.forEach(sw => {
    expandedProducts.push({
      id: `prod_elec_roma_${sw.id}`,
      name: `Roma Modular ${sw.name}`,
      category: 'Electrical',
      brand: 'Roma',
      sku: `ELC-ROMA-${sw.id.toUpperCase()}`,
      price: sw.price,
      mrp: sw.mrp,
      stock: 2500,
      rating: 4.7,
      ratingCount: 110,
      shortDesc: sw.desc,
      longDesc: `Roma is India's leading modular switch brand. Made of polycarbonate materials that do not catch fire easily. Smooth mechanical operation tested for up to 100,000 clicks. Silver-cadmium contacts for low heating.`,
      tags: ['switch', 'socket', 'plug', 'modular', 'roma', 'electrical'],
      images: sw.id.includes('plug') ? ['/assets/plug_top.webp'] : ['/assets/roma_switch.webp'],
      featured: false,
      bestSeller: sw.id.includes('1w_6a'),
      soldCount: 890,
      minQty: 5,
      qtyStep: 5,
      variants: null,
      createdAt: getRandomDate(),
      updatedAt: getRandomDate()
    });
  });

  // Switch Plates (modular fittings)
  const plates = [
    { size: '1 Module', price: 45, mrp: 60 },
    { size: '2 Module', price: 55, mrp: 75 },
    { size: '4 Module', price: 85, mrp: 115 },
    { size: '6 Module', price: 110, mrp: 150 },
    { size: '8 Module', price: 140, mrp: 190 }
  ];
  plates.forEach(p => {
    expandedProducts.push({
      id: `prod_elec_roma_plate_${p.size.replace(' ', '_').toLowerCase()}`,
      name: `Roma Switch Cover Plate (${p.size})`,
      category: 'Electrical',
      brand: 'Roma',
      sku: `ELC-ROMA-PL-${p.size.replace(' ', '').toUpperCase()}`,
      price: p.price,
      mrp: p.mrp,
      stock: 600,
      rating: 4.8,
      ratingCount: 45,
      shortDesc: `Roma switch cover plate with support frame. Modular design, ${p.size}.`,
      longDesc: `Roma modular front cover plate in white. Inner support frames are made of rust-proof steel plates. Flush fit design leaves no gaps against the wall. Dust-repelling finish.`,
      tags: ['plate', 'switchplate', 'modular', 'roma', 'electrical'],
      images: ['/assets/roma_switch.webp'],
      featured: false,
      bestSeller: false,
      soldCount: 190,
      minQty: 2,
      qtyStep: 2,
      variants: null,
      createdAt: getRandomDate(),
      updatedAt: getRandomDate()
    });
  });

  // Fans (Table fan, Ceiling fan) and MCB
  expandedProducts.push({
    id: 'prod_elec_table_fan',
    name: 'Orient Desk-Force Table Fan (12 inch)',
    category: 'Electrical',
    brand: 'Orient',
    sku: `ELC-FAN-ORIENT-TAB`,
    price: 2150,
    mrp: 2600,
    stock: 50,
    rating: 4.6,
    ratingCount: 30,
    shortDesc: 'High-speed table fan with aerodynamically designed blades.',
    longDesc: 'Orient Electric 12-inch desk table fan. High air thrust delivery. Features 3 speed settings and automatic 90 degree oscillation. Heavy resin base prevents vibration.',
    tags: ['fan', 'table fan', 'orient', 'cooling', 'electrical'],
    images: ['/assets/goldmedal_fan.webp'],
    featured: false,
    bestSeller: false,
    soldCount: 40,
    minQty: 1,
    qtyStep: 1,
    variants: null,
    createdAt: getRandomDate(),
    updatedAt: getRandomDate()
  });

  expandedProducts.push({
    id: 'prod_elec_ceiling_fan_decor',
    name: 'Havells Artemis Premium Ceiling Fan',
    category: 'Electrical',
    brand: 'Havells',
    sku: `ELC-FAN-HAVELLS-ART`,
    price: 3450,
    mrp: 4100,
    stock: 60,
    rating: 4.7,
    ratingCount: 55,
    shortDesc: 'Havells premium decorative ceiling fan with gold accents.',
    longDesc: 'Havells Artemis ceiling fan with a wider sweep of 1200mm. Decorative gold trims on motor ring and blades. Double ball bearing heavy copper motor guarantees whisper-silent operation.',
    tags: ['fan', 'ceiling fan', 'havells', 'cooling', 'electrical'],
    images: ['/assets/goldmedal_fan.webp'],
    featured: true,
    bestSeller: true,
    soldCount: 120,
    minQty: 1,
    qtyStep: 1,
    variants: null,
    createdAt: getRandomDate(),
    updatedAt: getRandomDate()
  });

  // MCBs and distribution boxes
  const mcbs = [
    { amp: '6A', price: 140, mrp: 185 },
    { amp: '10A', price: 140, mrp: 185 },
    { amp: '16A', price: 145, mrp: 190 },
    { amp: '32A', price: 165, mrp: 215 }
  ];
  mcbs.forEach(m => {
    expandedProducts.push({
      id: `prod_elec_mcb_${m.amp.toLowerCase()}`,
      name: `Havells Single Pole MCB (${m.amp})`,
      category: 'Electrical',
      brand: 'Havells',
      sku: `ELC-MCB-SP-${m.amp}`,
      price: m.price,
      mrp: m.mrp,
      stock: 450,
      rating: 4.8,
      ratingCount: 75,
      shortDesc: `Miniature Circuit Breaker (MCB) for short-circuit protection. Current: ${m.amp}.`,
      longDesc: `Havells Single Pole MCB provides overload and short-circuit protection in residential and commercial premises. Quick break mechanism. Rated short-circuit breaking capacity 10kA.`,
      tags: ['mcb', 'breaker', 'fuse', 'havells', 'electrical', 'mcb box'],
      images: ['/assets/pritam_dboard.webp'],
      featured: false,
      bestSeller: false,
      soldCount: 310,
      minQty: 2,
      qtyStep: 1,
      variants: null,
      createdAt: getRandomDate(),
      updatedAt: getRandomDate()
    });
  });

  expandedProducts.push({
    id: 'prod_elec_mcb_box_8',
    name: 'Havells MCB Distribution Box (8-Way)',
    category: 'Electrical',
    brand: 'Havells',
    sku: `ELC-MCB-BOX-8W`,
    price: 680,
    mrp: 850,
    stock: 90,
    rating: 4.7,
    ratingCount: 22,
    shortDesc: 'Metal enclosure MCB distribution board. Holds up to 8 single-pole MCBs.',
    longDesc: 'Havells SPN 8-Way double door MCB distribution board. Manufactured with high-strength galvanized steel sheet. Durable powder coated texture finish. Acrylic door protects components from dust.',
    tags: ['mcb box', 'distribution box', 'mcb board', 'havells', 'electrical'],
    images: ['/assets/pritam_dboard.webp'],
    featured: false,
    bestSeller: false,
    soldCount: 45,
    minQty: 1,
    qtyStep: 1,
    variants: null,
    createdAt: getRandomDate(),
    updatedAt: getRandomDate()
  });


  // 3. PAINTS (putty, sonosem, white cement, berger interior/exterior paint variants 1L to 20L in different colors)
  expandedProducts.push({
    id: 'prod_paints_birla_putty',
    name: 'Birla White Wall Putty (20kg)',
    category: 'Paints',
    brand: 'Birla White',
    sku: `PNT-PUTTY-BIRLA-20K`,
    price: 520,
    mrp: 600,
    stock: 350,
    rating: 4.8,
    ratingCount: 190,
    shortDesc: 'White-cement based wall putty. Provides smooth base for painting.',
    longDesc: 'Birla White Wall Care Putty is water resistant and formulated with high-purity white cement. Fills fine pores and cracks on plasters. Prevents paint flaking and dampness.',
    tags: ['putty', 'wall putty', 'birla white', 'cement base', 'paints'],
    images: ['/assets/birla_samrat.webp'],
    featured: true,
    bestSeller: true,
    soldCount: 820,
    minQty: 2,
    qtyStep: 1,
    variants: null,
    createdAt: getRandomDate(),
    updatedAt: getRandomDate()
  });

  expandedProducts.push({
    id: 'prod_paints_white_cement',
    name: 'JK White Cement (5kg)',
    category: 'Paints',
    brand: 'JK Cement',
    sku: `PNT-WCEM-JK-5K`,
    price: 180,
    mrp: 210,
    stock: 480,
    rating: 4.7,
    ratingCount: 95,
    shortDesc: 'Premium grade white portland cement for wall and mosaic finishes.',
    longDesc: 'JK White Portland Cement is ideal for concrete crafts, wall plastering, joint tile filling, and decorative architectural designs. High refractive index ensures bright white color.',
    tags: ['white cement', 'cement', 'jk cement', 'masonry', 'paints'],
    images: ['/assets/jsw_cement.webp'],
    featured: false,
    bestSeller: false,
    soldCount: 410,
    minQty: 1,
    qtyStep: 1,
    variants: null,
    createdAt: getRandomDate(),
    updatedAt: getRandomDate()
  });

  expandedProducts.push({
    id: 'prod_paints_sonosem_distemper',
    name: 'Berger Bison Sonosem Acrylic Distemper (White, 10kg)',
    category: 'Paints',
    brand: 'Berger',
    sku: `PNT-DIST-BG-10K`,
    price: 490,
    mrp: 580,
    stock: 180,
    rating: 4.5,
    ratingCount: 68,
    shortDesc: 'Acrylic co-polymer based wash distemper for interior walls. Color: White.',
    longDesc: 'Berger Bison Sonosem Distemper provides a smooth matte decoration for interior plasters. Dilutes with water. Provides good coverage and cost-efficient decoration.',
    tags: ['distemper', 'sonosem', 'bison', 'interior', 'paint', 'berger'],
    images: ['/assets/apex_paint.webp'],
    featured: false,
    bestSeller: false,
    soldCount: 220,
    minQty: 1,
    qtyStep: 1,
    variants: null,
    createdAt: getRandomDate(),
    updatedAt: getRandomDate()
  });

  // Dynamic paints (Berger Silk - Interior, Berger Weathercoat - Exterior) in multiple colors
  // Size Variants: 1L, 4L, 10L, 20L
  const sizeVariants = [
    { value: '1 Litre', price: 280, mrp: 330 },
    { value: '4 Litres', price: 1050, mrp: 1200 },
    { value: '10 Litres', price: 2500, mrp: 2900 },
    { value: '20 Litres', price: 4800, mrp: 5500 }
  ];

  const interiorColors = [
    { name: 'Off White', code: 'OW' },
    { name: 'Royal Blue', code: 'RB' },
    { name: 'Golden Yellow', code: 'GY' },
    { name: 'Cherry Red', code: 'CR' },
    { name: 'Ocean Green', code: 'OG' }
  ];
  interiorColors.forEach(c => {
    // Generate base prices
    expandedProducts.push({
      id: `prod_paints_berger_silk_${c.name.toLowerCase().replace(' ', '_')}`,
      name: `Berger Silk Luxury Emulsion (${c.name})`,
      category: 'Paints',
      brand: 'Berger',
      sku: `PNT-SILK-${c.code}`,
      price: 280,
      mrp: 330,
      stock: 200,
      rating: 4.8,
      ratingCount: 50,
      shortDesc: `Premium luxury silk sheen emulsion for interior walls. Color: ${c.name}.`,
      longDesc: `Berger Silk is a high-luxury interior paint with rich silicone-surface protection. Gives walls a silky sheen finish and clean washability. Over 1,000 customized color formulas. Size options from 1L to 20L.`,
      tags: ['paint', 'emulsion', 'silk', 'interior', 'berger', c.name.toLowerCase()],
      images: ['/assets/berger_silk.webp'],
      featured: false,
      bestSeller: c.name === 'Off White',
      soldCount: 88,
      minQty: 1,
      qtyStep: 1,
      variants: sizeVariants.map(v => ({
        value: v.value,
        price: v.price,
        mrp: v.mrp
      })),
      createdAt: getRandomDate(),
      updatedAt: getRandomDate()
    });
  });

  const exteriorColors = [
    { name: 'Bright White', code: 'BW', multiplier: 1.0 },
    { name: 'Terracotta Red', code: 'TR', multiplier: 1.05 },
    { name: 'Slate Grey', code: 'SG', multiplier: 1.0 },
    { name: 'Mustard Yellow', code: 'MY', multiplier: 1.02 },
    { name: 'Olive Green', code: 'OV', multiplier: 1.05 }
  ];
  exteriorColors.forEach(c => {
    expandedProducts.push({
      id: `prod_paints_berger_weather_${c.name.toLowerCase().replace(' ', '_')}`,
      name: `Berger Weathercoat Anti-Dust (${c.name})`,
      category: 'Paints',
      brand: 'Berger',
      sku: `PNT-WEATH-${c.code}`,
      price: Math.round(310 * c.multiplier),
      mrp: Math.round(360 * c.multiplier),
      stock: 240,
      rating: 4.7,
      ratingCount: 42,
      shortDesc: `Dust guard protective exterior wall paint emulsion. Color: ${c.name}.`,
      longDesc: `Berger Weathercoat Exterior Emulsion contains specialized acrylic binders. High resistance to extreme heat, heavy rains, dust deposition, fungal coatings, and fading color. Size variants: 1L, 4L, 10L, 20L.`,
      tags: ['paint', 'exterior', 'weathercoat', 'berger', c.name.toLowerCase()],
      images: ['/assets/apex_paint.webp'],
      featured: false,
      bestSeller: false,
      soldCount: 65,
      minQty: 1,
      qtyStep: 1,
      variants: sizeVariants.map(v => ({
        value: v.value,
        price: Math.round(v.price * 1.1 * c.multiplier), // Exterior paint is a bit more expensive
        mrp: Math.round(v.mrp * 1.1 * c.multiplier)
      })),
      createdAt: getRandomDate(),
      updatedAt: getRandomDate()
    });
  });


  // 4. PESTICIDES (termite spray, weed killer, agricultural insecticide, organic liquid fertilizer, mosquito larvicide)
  const pesticides = [
    { id: 'pest_termite', name: 'Premium Termite Control Spray (500ml)', price: 340, mrp: 395, desc: 'Specialized chemical spray to eradicate subterranean wood termites and insects.' },
    { id: 'pest_weed', name: 'Garden Weed & Grass Killer Spray (1L)', price: 290, mrp: 350, desc: 'Non-selective systemic herbicide spray for weed control in garden borders and paths.' },
    { id: 'pest_insect', name: 'Agricultural Insecticide Powder (1kg)', price: 420, mrp: 490, desc: 'Broad spectrum insecticide powder for farming and crops protection against caterpillars.' },
    { id: 'pest_fertilizer', name: 'Organic Liquid Fertilizer Conc. (1L)', price: 220, mrp: 265, desc: 'Concentrated natural nitrogen-potash seaweed emulsion for plant nourishment.' },
    { id: 'pest_ant', name: 'Ant & Cockroach Insecticide Spray (250ml)', price: 150, mrp: 180, desc: 'Instant knock-down insecticide trigger spray with residual barrier protection.' },
    { id: 'pest_larvicide', name: 'Mosquito Larvicide Treatment Oil (5L)', price: 1250, mrp: 1450, desc: 'Environmentally safe floating oil layer to destroy mosquito larvae in stagnant water.' }
  ];
  pesticides.forEach(p => {
    expandedProducts.push({
      id: `prod_pest_${p.id}`,
      name: p.name,
      category: 'Pesticides',
      brand: 'Bayer',
      sku: `PST-BAY-${p.id.toUpperCase()}`,
      price: p.price,
      mrp: p.mrp,
      stock: 220,
      rating: 4.6,
      ratingCount: 35,
      shortDesc: p.desc,
      longDesc: `Professional grade pest treatment solution from Bayer. Highly effective formulation. Always read instructions sheet before applying. Keep away from domestic animals and children.`,
      tags: ['pesticides', 'insecticide', 'weed killer', 'agriculture', 'gardening', 'bayer'],
      images: ['/assets/pesticide_spray.png'],
      featured: p.id === 'pest_termite',
      bestSeller: false,
      soldCount: 92,
      minQty: 1,
      qtyStep: 1,
      variants: null,
      createdAt: getRandomDate(),
      updatedAt: getRandomDate()
    });
  });


  // 5. HARDWARE (door hinges, drawer slides, drawer locks, handles, tower bolts, shelf brackets)
  const hardware = [
    { id: 'hinge_brass', name: 'Antique Brass Door Butt Hinges (4 inch, 2pcs)', price: 290, mrp: 350, img: '/assets/claw_hammer.webp', desc: 'Solid brass ball bearing butt hinges for heavy wooden doors. Pack of 2.' },
    { id: 'drawer_slide', name: 'Telescopic Soft-Close Drawer Slides (18 inch)', price: 420, mrp: 520, img: '/assets/pvc_pipe.webp', desc: 'Heavy-duty steel ball-bearing drawer telescopic drawer rails (pair).' },
    { id: 'drawer_lock', name: 'Godrej Drawer & Cabinet Lock with 3 Keys', price: 210, mrp: 260, img: '/assets/ball_valve.webp', desc: 'Brass cylinder deadbolt security lock for office cabinets and drawers.' },
    { id: 'door_handle', name: 'Stainless Steel Bow Pull Handle (8 inch)', price: 160, mrp: 195, img: '/assets/claw_hammer.webp', desc: 'Modern D-shaped brushed satin door handle for residential rooms.' },
    { id: 'mortise_lock', name: 'Europa Mortise Door Lock Cylinder Set', price: 1850, mrp: 2200, img: '/assets/claw_hammer.webp', desc: 'Europa premium mortise door lock with designer handle plates and cylinder keys.' },
    { id: 'door_magnet', name: 'Magnetic Cabinet Door Catch (Pack of 10)', price: 120, mrp: 160, img: '/assets/safety_helmet.webp', desc: 'Magnetic catch latches for kitchen cupboards and wardrobe shutters.' },
    { id: 'tower_bolt', name: 'Aluminum Tower Sliding Bolt (6 inch)', price: 85, mrp: 110, img: '/assets/claw_hammer.webp', desc: 'Classic sliding security tower bolt latch for interior bath doors.' },
    { id: 'shelf_bracket', name: 'Heavy Duty Metal L-Shelf Brackets (8x10 inch, 2pcs)', price: 150, mrp: 190, img: '/assets/roma_switch.webp', desc: 'Welded steel angle brackets for wall shelves support. Pack of 2.' }
  ];
  hardware.forEach(h => {
    expandedProducts.push({
      id: `prod_hard_${h.id}`,
      name: h.name,
      category: 'Hardware',
      brand: h.id.includes('lock') ? 'Godrej' : 'Link',
      sku: `HRD-LNK-${h.id.toUpperCase()}`,
      price: h.price,
      mrp: h.mrp,
      stock: 450,
      rating: 4.7,
      ratingCount: 48,
      shortDesc: h.desc,
      longDesc: `Premium construction grade hardware fittings. Rust-resistant plating. All fixing screws are included inside the retail packaging card. Checked for load cycles.`,
      tags: ['hardware', 'fittings', 'hinge', 'handle', 'lock', 'bracket'],
      images: [h.img],
      featured: h.id.includes('mortise'),
      bestSeller: false,
      soldCount: 110,
      minQty: 1,
      qtyStep: 1,
      variants: null,
      createdAt: getRandomDate(),
      updatedAt: getRandomDate()
    });
  });


  // 6. FASTENERS (drywall screws, wood screws, carriage bolts, steel wire nails, wall plugs)
  const fasteners = [
    { id: 'screw_drywall_1', name: 'Drywall Screws Coarse Thread (1 inch, 200pcs)', price: 140, mrp: 180, desc: 'Black phosphated steel bugle head drywall panel board screws.' },
    { id: 'screw_drywall_2', name: 'Drywall Screws Coarse Thread (2 inch, 100pcs)', price: 160, mrp: 210, desc: 'Black phosphated steel bugle head drywall panel board screws.' },
    { id: 'screw_wood_box', name: 'Stainless Steel Wood Screws Assorted (300pcs)', price: 290, mrp: 380, desc: 'Assorted sizes pack of cross flat head stainless steel self-tapping screws.' },
    { id: 'bolt_hex', name: 'Hex Bolt with Nut & Washers (M8 x 50mm, 20pcs)', price: 120, mrp: 160, desc: 'Zinc-plated grade 8.8 structural carbon steel hex head bolts.' },
    { id: 'wall_plugs_fischer', name: 'Fischer Plastic Wall Plugs 6mm (100pcs)', price: 95, mrp: 125, desc: 'Fischer original nylon wall expansion plugs for masonry wall anchors.' },
    { id: 'nails_2', name: 'Steel Wire Nails (2 inch, 1kg pack)', price: 110, mrp: 140, desc: 'Smooth shank steel wire nails for general carpentry and wooden boxes.' },
    { id: 'nails_3', name: 'Steel Wire Nails (3 inch, 1kg pack)', price: 110, mrp: 140, desc: 'Smooth shank steel wire nails for general carpentry.' },
    { id: 'nails_concrete', name: 'Fluted Hardened Concrete Nails (2 inch, 50pcs)', price: 130, mrp: 175, desc: 'Hardened carbon steel fluted concrete nails for masonry walls fixing.' }
  ];
  fasteners.forEach(f => {
    expandedProducts.push({
      id: `prod_fast_${f.id}`,
      name: f.name,
      category: 'Fasteners',
      brand: 'Fischer',
      sku: `FST-FSC-${f.id.toUpperCase()}`,
      price: f.price,
      mrp: f.mrp,
      stock: 1500,
      rating: 4.8,
      ratingCount: 65,
      shortDesc: f.desc,
      longDesc: `Professional quality structural fasteners. High thread engagement and pull-out resistance. Corrosion-proof zinc coating protects steel cores in damp outdoor applications.`,
      tags: ['fasteners', 'screw', 'nail', 'plug', 'bolt', 'anchor'],
      images: ['/assets/wall_plugs.webp'],
      featured: false,
      bestSeller: false,
      soldCount: 450,
      minQty: 1,
      qtyStep: 1,
      variants: null,
      createdAt: getRandomDate(),
      updatedAt: getRandomDate()
    });
  });


  // 7. TOOLS (screwdriver set, wrenches, hand saws, measuring tapes, spirit levels)
  const tools = [
    { id: 'screwdriver_set', name: 'Taparia 8-in-1 Magnetic Screwdriver Set', price: 290, mrp: 360, desc: 'Assorted flat/philips screw driver bits with magnetic handle driver.' },
    { id: 'adjustable_wrench', name: 'Taparia Heavy Adjustable Wrench (10 inch)', price: 380, mrp: 460, desc: 'Drop-forged chrome vanadium steel adjustable wrench scale jaw.' },
    { id: 'pliers_combination', name: 'Taparia Insulated Combination Pliers (8 inch)', price: 195, mrp: 245, desc: 'Insulated grip steel combination cutting plier for electrical wires.' },
    { id: 'hand_saw_wood', name: 'Bosch Professional Hand Wood Saw (18 inch)', price: 420, mrp: 510, desc: 'High carbon steel blade hand saw with triple ground teeth for wood logs.' },
    { id: 'measuring_tape_5', name: 'Freemans Steel Measuring Tape (5 meters)', price: 160, mrp: 210, desc: 'Matte nylon-coated blade steel pocket tape measure with lock.' },
    { id: 'spirit_level_12', name: 'Stanley Aluminum Spirit Level Tool (12 inch)', price: 340, mrp: 420, desc: 'Three vial 180 degree leveling accuracy aluminum structural spirit level.' },
    { id: 'hacksaw_frame', name: 'Taparia Tubular Hacksaw Frame with Blade', price: 180, mrp: 230, desc: 'Adjustable tension tubular hacksaw frame for cutting steel conduits.' }
  ];
  tools.forEach(t => {
    expandedProducts.push({
      id: `prod_tools_${t.id}`,
      name: t.name,
      category: 'Tools',
      brand: t.id.includes('saw') ? 'Bosch' : 'Taparia',
      sku: `TLS-TAP-${t.id.toUpperCase()}`,
      price: t.price,
      mrp: t.mrp,
      stock: 320,
      rating: 4.8,
      ratingCount: 140,
      shortDesc: t.desc,
      longDesc: `Heavy-duty industrial grade mechanics hand tool. Heat treated jaw faces ensure zero wear even under high torque applications. Ergonomic soft-grip sleeve insulation.`,
      tags: ['tools', 'screwdriver', 'pliers', 'saw', 'wrench', 'tape'],
      images: t.id.includes('screwdriver') || t.id.includes('wrench') || t.id.includes('pliers') ? ['/assets/claw_hammer.webp'] : ['/assets/grinding_disc.webp'],
      featured: false,
      bestSeller: t.id.includes('screwdriver'),
      soldCount: 310,
      minQty: 1,
      qtyStep: 1,
      variants: null,
      createdAt: getRandomDate(),
      updatedAt: getRandomDate()
    });
  });

  // Verify counts
  console.log(`Writing expanded catalog with: ${expandedProducts.length} total items.`);

  // Write backend json file
  const backendJson = JSON.stringify({ products: expandedProducts }, null, 2);
  fs.writeFileSync(productsPath, backendJson, 'utf-8');
  console.log('Successfully wrote expanded products to backend data file!');

  // Write frontend demo-products.js
  const jsContent = `// Mahamaya Enterprise - Expanded Offline Demo Products Catalog (119 Items)
const PRODUCTS = ${backendJson};

if (typeof window !== 'undefined') {
  window.PRODUCTS = PRODUCTS.products;
}
if (typeof module !== 'undefined') {
  module.exports = PRODUCTS;
}
`;
  fs.writeFileSync(demoProductsPath, jsContent, 'utf-8');
  console.log('Successfully wrote expanded products to frontend demo-products.js file!');
}

run().catch(console.error);
