
//  Tuneable shape constants 
export const LAT_RINGS  = 20;    // number of latitude bands (0=north pole, 20=south)
export const MAX_DOTS   = 36;    // dot count at the equator ring
export const WARP_EXP   = 1.9;   // exponent shaping tail pull-in curve
export const PULL_STR   = 0.82;  // fraction of distance to convergence point
export const CONV_X     =  1.58; // convergence target X in sphere-radius units
export const CONV_Y     =  0.16; // convergence target Y (slight downward drift)
export const CONV_Z     =  0.0;  // convergence target Z
export const CONV_Z_STR = 0.35;  // Z-axis pull is gentler than X/Y

export function buildParticles() {
  const particles = [];

  for (let li = 0; li <= LAT_RINGS; li++) {
    // phi: polar angle — 0 at north pole, PI at south pole
    const phi    = (li / LAT_RINGS) * Math.PI;
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);

    // Dot count proportional to ring circumference (sin(phi))
    const count = Math.max(1, Math.round(MAX_DOTS * sinPhi));

    for (let di = 0; di < count; di++) {
      // theta: azimuthal angle 0 → 2PI around the ring
      const theta = (di / count) * Math.PI * 2;

      // Unit-sphere 3D position:
      //   x → right,  y → up (negated so north renders at top),  z → toward viewer
      const bx =  Math.cos(theta) * sinPhi;
      const by = -cosPhi;          // negated: y increases upward on screen
      const bz =  Math.sin(theta) * sinPhi;

      // Base dot radius — slightly larger at the equator for a natural depth cue
      const baseR = 1.3 + sinPhi * 1.5;

      particles.push({
        bx, by, bz,    // immutable unit-sphere position
        sx: 0, sy: 0,  // current animated screen position (spring)
        vx: 0, vy: 0,  // screen velocity
        baseR,
      });
    }
  }

  return particles;
}

//  Apply tail warp to a rotated 3D point 
// Called every frame after Y-axis rotation.
// Returns { wx, wy, wz, warpAmt } — warped world coords + raw warp scalar.
export function applyTailWarp(rx, ry, rz) {
  // warpAmt: 0 on left hemisphere, rises to ~1 at far right edge
  const rawWarp = Math.max(0, rx);
  const warpAmt = Math.pow(rawWarp, WARP_EXP);

  const wx = rx + (CONV_X - rx) * warpAmt * PULL_STR;
  const wy = ry + (CONV_Y - ry) * warpAmt * PULL_STR;
  const wz = rz + (CONV_Z - rz) * warpAmt * CONV_Z_STR;

  return { wx, wy, wz, warpAmt };
}