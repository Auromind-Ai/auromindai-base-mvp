// particlePhysics.js
// Per-frame update for a single particle:
//   1. Compute depth-based radius and opacity from warped Z position
//   2. Apply mouse repulsion impulse
//   3. Spring the screen position toward the projected target
//
// All positional arguments are in screen pixels unless noted.

//  Physics constants ─
const REPEL_R   = 92;   // mouse repulsion radius in px
const REPEL_STR = 12;   // repulsion force magnitude
const SPRING_K  = 0.13; // spring constant: fraction of gap closed per frame
const DAMPING   = 0.70; // velocity damping factor applied each frame

export function computeVisuals(wz, warpAmt, baseR, radius) {
  // Normalise Z depth: back of sphere → 0, front → 1
  const depthN = Math.max(0, Math.min(1, (wz + 1.6) / 3.2));

  let r = baseR * (0.38 + depthN * 0.88) * radius;
  let o = 0.14 + depthN * 0.74;

  // Extra fade for dots behind the sphere centre
  if (wz < -0.4) {
    o *= Math.max(0, (wz + 1.6) / 1.2);
  }

  // Tail dots shrink and fade proportionally to their warp amount
  r *= (1 - warpAmt * 0.52);
  o *= (1 - warpAmt * 0.48);

  return { r, o };
}

export function updateParticle(p, targetX, targetY, mouse) {
  //  Mouse repulsion 
  if (mouse.on) {
    const dxM   = p.sx - mouse.x;
    const dyM   = p.sy - mouse.y;
    const distM = Math.sqrt(dxM * dxM + dyM * dyM);
    if (distM < REPEL_R && distM > 0.5) {
      const f = ((REPEL_R - distM) / REPEL_R) * REPEL_STR;
      p.vx += (dxM / distM) * f;
      p.vy += (dyM / distM) * f;
    }
  }

  //  Spring toward projected target 
  p.vx += (targetX - p.sx) * SPRING_K;
  p.vy += (targetY - p.sy) * SPRING_K;

  //  Damping─
  p.vx *= DAMPING;
  p.vy *= DAMPING;

  //  Integrate 
  p.sx += p.vx;
  p.sy += p.vy;
}