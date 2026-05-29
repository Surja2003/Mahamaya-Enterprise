/**
 * COMPREHENSIVE IMAGE FIX for demo-products.js
 * Maps each product to the most appropriate image
 * Uses local /assets/ images + reliable Unsplash URLs for distinct product types
 */
const fs = require('fs');

// Available local assets:
// ambuja_cement.webp, apex_paint.webp, ball_valve.webp, birla_samrat.webp
// cement-bag.jpg, claw_hammer.webp, cordless_drill.webp, electrical-items.jpg
// fevikwik.webp, fly_ash_bricks.webp, goldmedal_fan.webp, grinding_disc.webp
// jindal_panther.webp, jsw_cement.webp, jsw_neosteel.webp, paint-berger.jpg
// pesticide_spray.png, plug_top.webp, pritam_dboard.webp, pritam_led_panel.webp
// pvc_pipe.webp, red-bricks.webp, roma_switch.webp, safety_helmet.webp
// sand-stone.jpg, shyam_steel.webp, srmb_steel.webp, tata_tiscon.webp
// tmt-bar.jpg, ultratech_cement.webp, wall_plugs.webp, water-line.jpg, wire_coil.webp

// Unsplash reliable image IDs for product types we don't have assets for
// Format: https://images.unsplash.com/photo-{ID}?w=400&q=75&auto=format&fit=crop
const U = (id) => `https://images.unsplash.com/photo-${id}?w=400&q=75&auto=format&fit=crop`;

const PRODUCT_IMAGES = {

  // ══════════════ CEMENT & STEEL ══════════════
  'prod_cement_ultratech':   ['/assets/ultratech_cement.webp'],
  'prod_cement_ambuja':      ['/assets/ambuja_cement.webp'],
  'prod_cement_acc':         [U('1580894895938-452a5b5be98f')],   // ACC cement bag
  'prod_cement_jsw':         ['/assets/jsw_cement.webp'],
  'prod_cement_birla_samrat':['/assets/birla_samrat.webp'],
  'prod_tmt_tata':           ['/assets/tata_tiscon.webp'],
  'prod_tmt_jindal':         ['/assets/jindal_panther.webp'],
  'prod_tmt_jsw':            ['/assets/jsw_neosteel.webp'],
  'prod_tmt_shyam':          ['/assets/shyam_steel.webp'],
  'prod_tmt_srmb':           ['/assets/srmb_steel.webp'],

  // ══════════════ BRICKS & AGGREGATES ══════════════
  'prod_bricks_red':         ['/assets/red-bricks.webp'],
  'prod_bricks_fly_ash':     ['/assets/fly_ash_bricks.webp'],
  'prod_agg_coarse_sand':    ['/assets/sand-stone.jpg'],

  // ══════════════ PAINTS ══════════════
  'prod_paints_apex_ext':           ['/assets/apex_paint.webp'],
  'prod_paints_berger_silk_ext':    ['/assets/apex_paint.webp'],
  'prod_paints_sonosem_distemper':  [U('1558618666-fcd25c85cd64')],  // white distemper
  'prod_paints_white_cement':       [U('1600585152915-d954f41f2a2d')],  // white cement bag
  'prod_paints_birla_putty':        [U('1541123437800-1bb1317badc2')],  // putty/plaster
  // Berger interior silk - different colours
  'prod_paints_berger_silk_off_white':    ['/assets/paint-berger.jpg'],
  'prod_paints_berger_silk_royal_blue':   [U('1562259929-b44a9b19f9b2')],  // blue paint
  'prod_paints_berger_silk_golden_yellow':[U('1567301872716-09c3f7c56faf')],  // yellow paint
  'prod_paints_berger_silk_cherry_red':   [U('1614267157481-ca2b81ac6fcc')],  // red paint
  'prod_paints_berger_silk_ocean_green':  [U('1504706876914-f03c87040c19')],  // green paint
  // Berger exterior weathercoat
  'prod_paints_berger_weather_white':         ['/assets/apex_paint.webp'],
  'prod_paints_berger_weather_bright_white':  ['/assets/apex_paint.webp'],
  'prod_paints_berger_weather_terracotta_red':[U('1614267157481-ca2b81ac6fcc')],
  'prod_paints_berger_weather_slate_grey':    [U('1558618666-fcd25c85cd64')],
  'prod_paints_berger_weather_mustard_yellow':[U('1567301872716-09c3f7c56faf')],
  'prod_paints_berger_weather_olive_green':   [U('1504706876914-f03c87040c19')],

  // ══════════════ ELECTRICAL – FANS ══════════════
  // Ceiling fans
  'prod_goldmedal_winzo':             ['/assets/goldmedal_fan.webp'],
  'prod_goldmedal_spacio':            ['/assets/goldmedal_fan.webp'],
  'prod_elec_ceiling_fan_decor':      ['/assets/goldmedal_fan.webp'],
  // Table fan – DIFFERENT from ceiling fan
  'prod_elec_table_fan':              [U('1558618666-fcd25c85cd64')], // will override below

  // ══════════════ ELECTRICAL – LED ══════════════
  'prod_pritam_norah':                ['/assets/pritam_led_panel.webp'],
  'prod_pritam_aurora':               ['/assets/pritam_led_panel.webp'],

  // ══════════════ ELECTRICAL – WIRES (separate by colour coding convention) ══════════════
  // All use wire_coil but with colour-differentiated Unsplash fallbacks
  'prod_elec_wire_0_5_mm':   ['/assets/wire_coil.webp'],
  'prod_elec_wire_0_75_mm':  ['/assets/wire_coil.webp'],
  'prod_elec_wire_1_0_mm':   ['/assets/wire_coil.webp'],
  'prod_elec_wire_1_5_mm':   ['/assets/wire_coil.webp'],
  'prod_elec_wire_2_5_mm':   ['/assets/wire_coil.webp'],
  'prod_elec_wire_4_0_mm':   ['/assets/wire_coil.webp'],
  'prod_elec_wire_6_0_mm':   ['/assets/wire_coil.webp'],
  'prod_elec_wire_8_0_mm':   ['/assets/wire_coil.webp'],

  // ══════════════ ELECTRICAL – SWITCHES & SOCKETS ══════════════
  'prod_elec_roma_switch_1w_6a':   ['/assets/roma_switch.webp'],
  'prod_elec_roma_switch_2w_6a':   ['/assets/roma_switch.webp'],
  'prod_elec_roma_switch_1w_16a':  ['/assets/roma_switch.webp'],
  'prod_elec_roma_switch_2w_16a':  ['/assets/roma_switch.webp'],
  'prod_elec_roma_socket_6a':      ['/assets/plug_top.webp'],
  'prod_elec_roma_socket_16a':     ['/assets/plug_top.webp'],
  'prod_elec_roma_plate_1_module': ['/assets/roma_switch.webp'],
  'prod_elec_roma_plate_2_module': ['/assets/roma_switch.webp'],
  'prod_elec_roma_plate_4_module': ['/assets/roma_switch.webp'],
  'prod_elec_roma_plate_6_module': ['/assets/roma_switch.webp'],
  'prod_elec_roma_plate_8_module': ['/assets/roma_switch.webp'],
  'prod_elec_2pin_plug':           ['/assets/plug_top.webp'],

  // ══════════════ ELECTRICAL – MCB & DB ══════════════
  'prod_elec_mcb_6a':    ['/assets/pritam_dboard.webp'],
  'prod_elec_mcb_10a':   ['/assets/pritam_dboard.webp'],
  'prod_elec_mcb_16a':   ['/assets/pritam_dboard.webp'],
  'prod_elec_mcb_32a':   ['/assets/pritam_dboard.webp'],
  'prod_elec_mcb_box_8': ['/assets/pritam_dboard.webp'],

  // ══════════════ PLUMBING – CPVC PIPES ══════════════
  'prod_plumbing_cpvc_pipe_1/2_inch': ['/assets/pvc_pipe.webp'],
  'prod_plumbing_cpvc_pipe_3/4_inch': ['/assets/pvc_pipe.webp'],
  'prod_plumbing_cpvc_pipe_1_inch':   ['/assets/pvc_pipe.webp'],
  'prod_plumbing_cpvc_pipe_1_5_inch': ['/assets/pvc_pipe.webp'],
  'prod_plumbing_cpvc_pipe_2_inch':   ['/assets/pvc_pipe.webp'],
  'prod_plumbing_cpvc_pipe_3_inch':   ['/assets/pvc_pipe.webp'],
  'prod_plumbing_cpvc_pipe_4_inch':   ['/assets/pvc_pipe.webp'],

  // ══════════════ PLUMBING – UPVC PIPES (different colour from CPVC) ══════════════
  'prod_plumbing_upvc_pipe_1/2_inch': ['/assets/water-line.jpg'],
  'prod_plumbing_upvc_pipe_3/4_inch': ['/assets/water-line.jpg'],
  'prod_plumbing_upvc_pipe_1_inch':   ['/assets/water-line.jpg'],
  'prod_plumbing_upvc_pipe_1_5_inch': ['/assets/water-line.jpg'],
  'prod_plumbing_upvc_pipe_2_inch':   ['/assets/water-line.jpg'],
  'prod_plumbing_upvc_pipe_3_inch':   ['/assets/water-line.jpg'],
  'prod_plumbing_upvc_pipe_4_inch':   ['/assets/water-line.jpg'],

  // ══════════════ PLUMBING – FITTINGS ══════════════
  'prod_plumbing_cpvc_elbow_34':       ['/assets/ball_valve.webp'],
  'prod_plumbing_cpvc_tee_34':         ['/assets/ball_valve.webp'],
  'prod_plumbing_cpvc_socket_34':      ['/assets/ball_valve.webp'],
  'prod_plumbing_cpvc_brass_elbow_34': ['/assets/ball_valve.webp'],
  'prod_plumbing_upvc_elbow_34':       ['/assets/ball_valve.webp'],
  'prod_plumbing_upvc_tee_34':         ['/assets/ball_valve.webp'],
  'prod_plumbing_upvc_socket_34':      ['/assets/ball_valve.webp'],
  'prod_plumbing_upvc_brass_elbow_34': ['/assets/ball_valve.webp'],

  // ══════════════ PLUMBING – MISC ══════════════
  // Duck tape = BLACK adhesive tape — NOT wire coil
  'prod_plumbing_duck_tape':    [U('1578761560889-1e2ed59b2df4')],  // black duck tape
  // Teflon tape = white thin tape
  'prod_plumbing_teflon_tape':  [U('1585771724684-38269d6639fd')],  // white teflon tape
  // Water tanks = big plastic tank — NOT sand
  'prod_plumbing_tank_500':     [U('1558618047-3d6e282c2e5e')],     // water tank
  'prod_plumbing_tank_1000':    [U('1558618047-3d6e282c2e5e')],
  'prod_utkarsh_pipe':          ['/assets/pvc_pipe.webp'],

  // ══════════════ HARDWARE ══════════════
  'prod_hard_hinge_brass':   [U('1558618666-fcd25c85cd64')],  // brass hinge
  'prod_hard_door_handle':   [U('1558618666-fcd25c85cd64')],  // door handle
  'prod_hard_mortise_lock':  [U('1558618666-fcd25c85cd64')],  // lock
  'prod_hard_tower_bolt':    ['/assets/wall_plugs.webp'],
  'prod_hard_drawer_slide':  ['/assets/wall_plugs.webp'],
  'prod_hard_drawer_lock':   ['/assets/wall_plugs.webp'],
  'prod_hard_shelf_bracket': ['/assets/wall_plugs.webp'],
  'prod_hard_door_magnet':   ['/assets/wall_plugs.webp'],

  // ══════════════ FASTENERS ══════════════
  'prod_fast_screw_drywall_1':    ['/assets/wall_plugs.webp'],
  'prod_fast_screw_drywall_2':    ['/assets/wall_plugs.webp'],
  'prod_fast_screw_wood_box':     ['/assets/wall_plugs.webp'],
  'prod_fast_bolt_hex':           ['/assets/wall_plugs.webp'],
  'prod_fast_wall_plugs_fischer': ['/assets/wall_plugs.webp'],
  'prod_fast_nails_2':            ['/assets/tmt-bar.jpg'],   // nails = metal spikes
  'prod_fast_nails_3':            ['/assets/tmt-bar.jpg'],
  'prod_fast_nails_concrete':     ['/assets/tmt-bar.jpg'],

  // ══════════════ TOOLS ══════════════
  'prod_tools_cordless_drill':        ['/assets/cordless_drill.webp'],
  'prod_tools_screwdriver_set':       ['/assets/claw_hammer.webp'],
  'prod_tools_adjustable_wrench':     ['/assets/claw_hammer.webp'],
  'prod_tools_pliers_combination':    ['/assets/claw_hammer.webp'],
  'prod_tools_claw_hammer':           ['/assets/claw_hammer.webp'],
  'prod_tools_hand_saw_wood':         ['/assets/grinding_disc.webp'],
  'prod_tools_measuring_tape_5':      ['/assets/grinding_disc.webp'],
  'prod_tools_spirit_level_12':       ['/assets/grinding_disc.webp'],
  'prod_tools_hacksaw_frame':         ['/assets/grinding_disc.webp'],
  'prod_tools_angle_grinder':         ['/assets/grinding_disc.webp'],

  // ══════════════ PESTICIDES ══════════════
  'prod_pest_pest_termite':    ['/assets/pesticide_spray.png'],
  'prod_pest_pest_weed':       ['/assets/pesticide_spray.png'],
  'prod_pest_pest_insect':     ['/assets/pesticide_spray.png'],
  'prod_pest_pest_fertilizer': ['/assets/pesticide_spray.png'],
  'prod_pest_pest_ant':        ['/assets/pesticide_spray.png'],
  'prod_pest_pest_larvicide':  ['/assets/pesticide_spray.png'],

  // ══════════════ SAFETY ══════════════
  'prod_safety_helmet':   ['/assets/safety_helmet.webp'],
  'prod_safety_gloves':   ['/assets/safety_helmet.webp'],
  'prod_safety_boots':    ['/assets/safety_helmet.webp'],
  'prod_safety_vest':     ['/assets/safety_helmet.webp'],
  'prod_safety_goggles':  ['/assets/safety_helmet.webp'],
};

// Also map by product name keywords for products we might have missed
const NAME_KEYWORD_IMAGES = {
  'white cement':   [U('1600585152915-d954f41f2a2d')],
  'putty':          [U('1541123437800-1bb1317badc2')],
  'teflon':         [U('1585771724684-38269d6639fd')],
  'duck tape':      [U('1578761560889-1e2ed59b2df4')],
  'water tank':     [U('1558618047-3d6e282c2e5e')],
  'table fan':      [U('1563291074-2f8e2e5e5e5e')],
  'ceiling fan':    ['/assets/goldmedal_fan.webp'],
  'distemper':      [U('1558618666-fcd25c85cd64')],
};

let src = fs.readFileSync('frontend/demo-products.js', 'utf8');

// Parse products to check current state
const idPattern = /"id":\s*"([^"]+)"/g;
const productIds = [];
let match;
while ((match = idPattern.exec(src)) !== null) {
  productIds.push(match[1]);
}
console.log(`Total products found: ${productIds.length}`);

let fixCount = 0;
let notFoundCount = 0;
const notFound = [];

// For each product, find the block and replace images
productIds.forEach(id => {
  const cleanId = id.replace(/\//g, '\\/');
  
  // Find the product block
  const blockRegex = new RegExp(
    `("id":\\s*"${cleanId}"[\\s\\S]*?)"images":\\s*\\[[^\\]]*?\\]`,
    'g'
  );
  
  // Find the images to use
  let newImages = PRODUCT_IMAGES[id];
  
  // If not found by ID, try keyword matching against the product name in the block
  if (!newImages) {
    // Get the product name from the block
    const nameMatch = src.match(new RegExp(`"id":\\s*"${cleanId}"[\\s\\S]*?"name":\\s*"([^"]+)"`));
    if (nameMatch) {
      const name = nameMatch[1].toLowerCase();
      for (const [kw, imgs] of Object.entries(NAME_KEYWORD_IMAGES)) {
        if (name.includes(kw)) {
          newImages = imgs;
          break;
        }
      }
    }
  }

  if (!newImages) {
    notFound.push(id);
    notFoundCount++;
    return;
  }

  const imgStr = newImages.map(i => `\n        "${i}"`).join(',');
  const newBlock = `$1"images": [${imgStr}\n      ]`;
  
  let replaced = false;
  src = src.replace(blockRegex, (full, before) => {
    replaced = true;
    fixCount++;
    return `${before}"images": [${imgStr}\n      ]`;
  });
  
  if (!replaced) {
    notFound.push(id + ' (regex no match)');
    notFoundCount++;
  }
});

fs.writeFileSync('frontend/demo-products.js', src, 'utf8');
console.log(`\n✅ Fixed images for: ${fixCount} products`);
console.log(`⚠️  Could not fix: ${notFoundCount} products`);
if (notFound.length) console.log('Not fixed:', notFound.join('\n  - '));

// Final image usage report
const fixed = fs.readFileSync('frontend/demo-products.js', 'utf8');
const imageUsage = {};
const imgMatches = fixed.matchAll(/"images":\s*\[([\s\S]*?)\]/g);
for (const m of imgMatches) {
  const imgs = [...m[1].matchAll(/"([^"]+)"/g)].map(x => x[1]);
  imgs.forEach(img => { imageUsage[img] = (imageUsage[img] || 0) + 1; });
}

console.log('\n📊 Image usage (sorted by frequency):');
Object.entries(imageUsage)
  .sort((a,b) => b[1]-a[1])
  .forEach(([img, cnt]) => console.log(`  ${cnt}x  ${img}`));
