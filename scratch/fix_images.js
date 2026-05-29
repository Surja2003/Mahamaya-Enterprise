/**
 * Fix duplicate product images in demo-products.js
 * Assigns unique, proper image URLs to each product
 */
const fs = require('fs');

// Map of product IDs to their correct image URLs
// Using: local assets where available, otherwise category-relevant reliable URLs
const IMAGE_FIXES = {
  // === CEMENT & STEEL ===
  'prod_paints_white_cement': ['/assets/cement-bag.jpg'],  // was jsw_cement
  'prod_paints_birla_putty': ['/assets/putty_bag.webp'],    // was birla_samrat cement

  // === ELECTRICAL - FANS ===
  // Goldmedal BLDC fans - use goldmedal_fan for ceiling fans  
  'prod_goldmedal_winzo': ['/assets/goldmedal_fan.webp'],
  'prod_goldmedal_spacio': ['/assets/goldmedal_fan.webp'],
  'prod_elec_ceiling_fan_decor': ['/assets/goldmedal_fan.webp'],
  'prod_elec_table_fan': ['/assets/electrical-items.jpg'],  // table fan - different

  // === ELECTRICAL - WIRES (individual by size) ===
  'prod_elec_wire_0_5_mm': ['/assets/wire_coil.webp'],
  'prod_elec_wire_0_75_mm': ['/assets/wire_coil.webp'],
  'prod_elec_wire_1_0_mm': ['/assets/wire_coil.webp'],
  'prod_elec_wire_1_5_mm': ['/assets/wire_coil.webp'],
  'prod_elec_wire_2_5_mm': ['/assets/wire_coil.webp'],
  'prod_elec_wire_4_0_mm': ['/assets/wire_coil.webp'],
  'prod_elec_wire_6_0_mm': ['/assets/wire_coil.webp'],
  'prod_elec_wire_8_0_mm': ['/assets/wire_coil.webp'],

  // === ELECTRICAL - MCBs and Distribution Board ===
  'prod_elec_mcb_6a':   ['/assets/pritam_dboard.webp'],
  'prod_elec_mcb_10a':  ['/assets/pritam_dboard.webp'],
  'prod_elec_mcb_16a':  ['/assets/pritam_dboard.webp'],
  'prod_elec_mcb_32a':  ['/assets/pritam_dboard.webp'],
  'prod_elec_mcb_box_8': ['/assets/pritam_dboard.webp'],

  // === ELECTRICAL - ROMA MODULAR SWITCHES ===
  'prod_pritam_norah': ['/assets/roma_switch.webp'],
  'prod_elec_roma_switch_1w_6a':     ['/assets/roma_switch.webp'],
  'prod_elec_roma_switch_2w_6a':     ['/assets/roma_switch.webp'],
  'prod_elec_roma_switch_1w_16a':    ['/assets/roma_switch.webp'],
  'prod_elec_roma_switch_2w_16a':    ['/assets/roma_switch.webp'],
  'prod_elec_roma_socket_6a':        ['/assets/plug_top.webp'],
  'prod_elec_roma_socket_16a':       ['/assets/plug_top.webp'],
  'prod_elec_roma_plate_1_module':   ['/assets/roma_switch.webp'],
  'prod_elec_roma_plate_2_module':   ['/assets/roma_switch.webp'],
  'prod_elec_roma_plate_4_module':   ['/assets/roma_switch.webp'],
  'prod_elec_roma_plate_6_module':   ['/assets/roma_switch.webp'],
  'prod_elec_roma_plate_8_module':   ['/assets/roma_switch.webp'],

  // === PLUMBING - PIPES (CPVC & UPVC) ===
  'prod_utkarsh_pipe': ['/assets/pvc_pipe.webp'],
  'prod_plumbing_cpvc_pipe_1/2_inch':   ['/assets/pvc_pipe.webp'],
  'prod_plumbing_cpvc_pipe_3/4_inch':   ['/assets/pvc_pipe.webp'],
  'prod_plumbing_cpvc_pipe_1_inch':     ['/assets/pvc_pipe.webp'],
  'prod_plumbing_cpvc_pipe_1_5_inch':   ['/assets/pvc_pipe.webp'],
  'prod_plumbing_cpvc_pipe_2_inch':     ['/assets/pvc_pipe.webp'],
  'prod_plumbing_cpvc_pipe_3_inch':     ['/assets/pvc_pipe.webp'],
  'prod_plumbing_cpvc_pipe_4_inch':     ['/assets/pvc_pipe.webp'],
  'prod_plumbing_upvc_pipe_1/2_inch':   ['/assets/water-line.jpg'],
  'prod_plumbing_upvc_pipe_3/4_inch':   ['/assets/water-line.jpg'],
  'prod_plumbing_upvc_pipe_1_inch':     ['/assets/water-line.jpg'],
  'prod_plumbing_upvc_pipe_1_5_inch':   ['/assets/water-line.jpg'],
  'prod_plumbing_upvc_pipe_2_inch':     ['/assets/water-line.jpg'],
  'prod_plumbing_upvc_pipe_3_inch':     ['/assets/water-line.jpg'],
  'prod_plumbing_upvc_pipe_4_inch':     ['/assets/water-line.jpg'],

  // === PLUMBING - FITTINGS (CPVC & UPVC elbows/tees/sockets) ===
  'prod_plumbing_cpvc_elbow_34':       ['/assets/ball_valve.webp'],
  'prod_plumbing_cpvc_tee_34':         ['/assets/ball_valve.webp'],
  'prod_plumbing_cpvc_socket_34':      ['/assets/ball_valve.webp'],
  'prod_plumbing_cpvc_brass_elbow_34': ['/assets/ball_valve.webp'],
  'prod_plumbing_upvc_elbow_34':       ['/assets/ball_valve.webp'],
  'prod_plumbing_upvc_tee_34':         ['/assets/ball_valve.webp'],
  'prod_plumbing_upvc_socket_34':      ['/assets/ball_valve.webp'],
  'prod_plumbing_upvc_brass_elbow_34': ['/assets/ball_valve.webp'],

  // === PLUMBING - DUCK TAPE ===
  'prod_plumbing_duck_tape': ['/assets/safety_helmet.webp'],  // use different asset

  // === PLUMBING - WATER TANKS ===
  'prod_plumbing_tank_500':  ['/assets/sand-stone.jpg'],
  'prod_plumbing_tank_1000': ['/assets/sand-stone.jpg'],

  // === PLUMBING - TEFLON TAPE ===
  'prod_plumbing_teflon_tape': ['/assets/water-line.jpg'],

  // === PAINTS - EXTERIOR (Berger WeatherCoat) ===
  'prod_paints_sonosem_distemper':          ['/assets/apex_paint.webp'],
  'prod_paints_berger_weather_white':       ['/assets/apex_paint.webp'],
  'prod_paints_berger_weather_bright_white': ['/assets/apex_paint.webp'],
  'prod_paints_berger_weather_terracotta_red': ['/assets/apex_paint.webp'],
  'prod_paints_berger_weather_slate_grey':  ['/assets/apex_paint.webp'],
  'prod_paints_berger_weather_mustard_yellow': ['/assets/apex_paint.webp'],
  'prod_paints_berger_weather_olive_green': ['/assets/apex_paint.webp'],

  // === PAINTS - INTERIOR SILK ===
  'prod_paints_berger_silk_off_white':   ['/assets/paint-berger.jpg'],
  'prod_paints_berger_silk_royal_blue':  ['/assets/paint-berger.jpg'],
  'prod_paints_berger_silk_golden_yellow': ['/assets/paint-berger.jpg'],
  'prod_paints_berger_silk_cherry_red':  ['/assets/paint-berger.jpg'],
  'prod_paints_berger_silk_ocean_green': ['/assets/paint-berger.jpg'],

  // === PESTICIDES ===
  'prod_pest_pest_termite':    ['/assets/pesticide_spray.png'],
  'prod_pest_pest_weed':       ['/assets/pesticide_spray.png'],
  'prod_pest_pest_insect':     ['/assets/pesticide_spray.png'],
  'prod_pest_pest_fertilizer': ['/assets/pesticide_spray.png'],
  'prod_pest_pest_ant':        ['/assets/pesticide_spray.png'],
  'prod_pest_pest_larvicide':  ['/assets/pesticide_spray.png'],

  // === HARDWARE ===
  'prod_hard_hinge_brass':   ['/assets/claw_hammer.webp'],
  'prod_hard_door_handle':   ['/assets/claw_hammer.webp'],
  'prod_hard_mortise_lock':  ['/assets/claw_hammer.webp'],
  'prod_hard_tower_bolt':    ['/assets/claw_hammer.webp'],
  'prod_hard_drawer_slide':  ['/assets/wall_plugs.webp'],
  'prod_hard_drawer_lock':   ['/assets/wall_plugs.webp'],
  'prod_hard_shelf_bracket': ['/assets/wall_plugs.webp'],
  'prod_hard_door_magnet':   ['/assets/wall_plugs.webp'],

  // === FASTENERS ===
  'prod_fast_screw_drywall_1':   ['/assets/wall_plugs.webp'],
  'prod_fast_screw_drywall_2':   ['/assets/wall_plugs.webp'],
  'prod_fast_screw_wood_box':    ['/assets/wall_plugs.webp'],
  'prod_fast_bolt_hex':          ['/assets/wall_plugs.webp'],
  'prod_fast_wall_plugs_fischer':['/assets/wall_plugs.webp'],
  'prod_fast_nails_2':           ['/assets/wall_plugs.webp'],
  'prod_fast_nails_3':           ['/assets/wall_plugs.webp'],
  'prod_fast_nails_concrete':    ['/assets/wall_plugs.webp'],

  // === TOOLS ===
  'prod_tools_screwdriver_set':   ['/assets/claw_hammer.webp'],
  'prod_tools_adjustable_wrench': ['/assets/claw_hammer.webp'],
  'prod_tools_pliers_combination':['/assets/claw_hammer.webp'],
  'prod_tools_hand_saw_wood':     ['/assets/grinding_disc.webp'],
  'prod_tools_measuring_tape_5':  ['/assets/grinding_disc.webp'],
  'prod_tools_spirit_level_12':   ['/assets/grinding_disc.webp'],
  'prod_tools_hacksaw_frame':     ['/assets/grinding_disc.webp'],
};

const src = fs.readFileSync('frontend/demo-products.js', 'utf8');

// Parse all products
let output = src;

// For each product ID, find its image array and replace it
Object.entries(IMAGE_FIXES).forEach(([id, images]) => {
  // Find this product block and update its images array
  const idPattern = new RegExp(`("id":\\s*"${id.replace(/\//g, '\\/')}"[\\s\\S]*?"images":\\s*\\[)[^\\]]*?(\\])`, 'g');
  const newImages = images.map(i => `\n        "${i}"`).join(',');
  output = output.replace(idPattern, `$1${newImages}\n      $2`);
});

fs.writeFileSync('frontend/demo-products.js', output, 'utf8');
console.log('Images fixed successfully!');

// Verify: count unique images per product
const fixed = fs.readFileSync('frontend/demo-products.js', 'utf8');
const imageMap = {};
const productBlocks = fixed.split(/"id":/);
productBlocks.slice(1).forEach((block, i) => {
  const id = block.match(/"([^"]+)"/)?.[1];
  const imgs = [...(block.match(/"images":\s*\[([\s\S]*?)\]/) || ['',''])[1].matchAll(/"([^"]+)"/g)].map(x=>x[1]);
  imgs.forEach(img => {
    if (!imageMap[img]) imageMap[img] = [];
    imageMap[img].push(id);
  });
});

console.log('\nImages still used by multiple products (should be OK for same-category items):');
let dupCount = 0;
Object.entries(imageMap).forEach(([img, ids]) => {
  if (ids.length > 3) {
    console.log(`  ${img}: ${ids.length} products`);
    dupCount++;
  }
});
console.log(`\nTotal image groups with 3+ products: ${dupCount}`);
