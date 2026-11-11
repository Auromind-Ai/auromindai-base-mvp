import { Dimensions, useWindowDimensions } from 'react-native';

const { width: INITIAL_WIDTH, height: INITIAL_HEIGHT } = Dimensions.get('window');

/**
 * Standard base reference: iPhone 13 / 14 / 15 / 16 (390 x 844)
 * Any device with width >= 385 AND height >= 720 is considered normal/large.
 * Smaller devices (e.g. iPhone SE 2nd/3rd gen at 375x667, iPhone SE 1st gen at 320x568,
 * compact Androids at 360x740 or 360x640) will scale down text and containers.
 */
export const SCREEN_WIDTH = INITIAL_WIDTH;
export const SCREEN_HEIGHT = INITIAL_HEIGHT;

export const isSmallDevice = INITIAL_WIDTH < 385 || INITIAL_HEIGHT < 720;
export const isShortDevice = INITIAL_HEIGHT < 720;
export const isExtraSmallDevice = INITIAL_WIDTH < 350 || INITIAL_HEIGHT < 600;

/**
 * Scales font sizes responsively:
 * - On normal / larger screens: Returns the EXACT original size untouched.
 * - On smaller devices (iPhone SE): Scales down proportionally (~8% to 14%)
 *   so headings and text do not look oversized or break layouts.
 */
export function scaleFont(size: number): number {
  if (!isSmallDevice) {
    return size;
  }
  if (isExtraSmallDevice) {
    if (size <= 11) return Math.max(9.5, size - 1);
    if (size <= 13) return Math.max(10.5, size - 1.5);
    if (size <= 16) return Math.max(12, size - 2.5);
    if (size <= 22) return Math.max(15, size - 3.5);
    if (size <= 28) return Math.max(18, size - 4.5);
    return Math.round(size * 0.82);
  }
  // Standard small device (iPhone SE 2nd/3rd gen: 375 x 667)
  if (size <= 11) return size;
  if (size <= 13) return size - 1;
  if (size <= 16) return size - 1.5;
  if (size <= 22) return size - 2.5;
  if (size <= 28) return size - 3.5;
  return Math.round(size * 0.86);
}

/**
 * Scales container paddings, margins, gaps, and corner radii:
 * - On normal / larger screens: Returns the EXACT original size untouched.
 * - On smaller devices (iPhone SE): Proportionally trims excessive paddings
 *   so containers fit comfortably within the viewport.
 */
export function scaleContainer(size: number): number {
  if (!isSmallDevice) {
    return size;
  }
  if (isExtraSmallDevice) {
    if (size <= 6) return size;
    if (size <= 10) return Math.max(5, size - 3);
    if (size <= 16) return Math.max(8, size - 4);
    if (size <= 22) return Math.max(12, size - 6);
    if (size <= 32) return Math.max(16, size - 8);
    if (size <= 48) return Math.max(22, size - 14);
    return Math.round(size * 0.72);
  }
  // Standard small device (iPhone SE 2nd/3rd gen: 375 x 667)
  if (size <= 6) return size;
  if (size <= 10) return size - 2;
  if (size <= 16) return size - 3;
  if (size <= 22) return size - 4;
  if (size <= 32) return size - 6;
  if (size <= 48) return size - 10;
  return Math.round(size * 0.80);
}

/**
 * Scales vertical heights for buttons, inputs, avatar circles, icon containers:
 * - On normal / larger screens: Returns the EXACT original size untouched.
 * - On smaller devices (iPhone SE): Adjusts heights so forms and lists don't overflow.
 */
export function scaleHeight(size: number): number {
  if (!isSmallDevice) {
    return size;
  }
  if (isExtraSmallDevice) {
    if (size <= 24) return size;
    if (size <= 36) return Math.max(26, size - 5);
    if (size <= 44) return Math.max(32, size - 6);
    if (size <= 54) return Math.max(38, size - 8);
    if (size <= 64) return Math.max(46, size - 10);
    return Math.round(size * 0.82);
  }
  // Standard small device (iPhone SE 2nd/3rd gen: 375 x 667)
  if (size <= 24) return size;
  if (size <= 36) return size - 3;
  if (size <= 44) return size - 4;
  if (size <= 50) return size - 5;
  if (size <= 60) return size - 6;
  return Math.round(size * 0.88);
}

/**
 * Scales horizontal widths for fixed-width components:
 * - On normal / larger screens: Returns the EXACT original size untouched.
 * - On smaller devices (iPhone SE): Scales width to avoid horizontal overflow.
 */
export function scaleWidth(size: number): number {
  if (!isSmallDevice) {
    return size;
  }
  const ratio = Math.min(INITIAL_WIDTH / 390, 1);
  return Math.round(size * ratio);
}

/**
 * General purpose moderate scale:
 */
export function moderateScale(size: number, factor = 0.5): number {
  if (!isSmallDevice) {
    return size;
  }
  const ratio = INITIAL_WIDTH / 390;
  return Math.round(size + (size * ratio - size) * factor);
}

/**
 * Hook version that recalculates if window dimensions change dynamically:
 */
export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const small = width < 385 || height < 720;
  const extraSmall = width < 350 || height < 600;
  const short = height < 720;

  return {
    width,
    height,
    isSmallDevice: small,
    isShortDevice: short,
    isExtraSmallDevice: extraSmall,
    scaleFont: (size: number) => {
      if (!small) return size;
      if (extraSmall) {
        if (size <= 11) return Math.max(9.5, size - 1);
        if (size <= 13) return Math.max(10.5, size - 1.5);
        if (size <= 16) return Math.max(12, size - 2.5);
        if (size <= 22) return Math.max(15, size - 3.5);
        if (size <= 28) return Math.max(18, size - 4.5);
        return Math.round(size * 0.82);
      }
      if (size <= 11) return size;
      if (size <= 13) return size - 1;
      if (size <= 16) return size - 1.5;
      if (size <= 22) return size - 2.5;
      if (size <= 28) return size - 3.5;
      return Math.round(size * 0.86);
    },
    scaleContainer: (size: number) => {
      if (!small) return size;
      if (extraSmall) {
        if (size <= 6) return size;
        if (size <= 10) return Math.max(5, size - 3);
        if (size <= 16) return Math.max(8, size - 4);
        if (size <= 22) return Math.max(12, size - 6);
        if (size <= 32) return Math.max(16, size - 8);
        if (size <= 48) return Math.max(22, size - 14);
        return Math.round(size * 0.72);
      }
      if (size <= 6) return size;
      if (size <= 10) return size - 2;
      if (size <= 16) return size - 3;
      if (size <= 22) return size - 4;
      if (size <= 32) return size - 6;
      if (size <= 48) return size - 10;
      return Math.round(size * 0.80);
    },
    scaleHeight: (size: number) => {
      if (!small) return size;
      if (extraSmall) {
        if (size <= 24) return size;
        if (size <= 36) return Math.max(26, size - 5);
        if (size <= 44) return Math.max(32, size - 6);
        if (size <= 54) return Math.max(38, size - 8);
        if (size <= 64) return Math.max(46, size - 10);
        return Math.round(size * 0.82);
      }
      if (size <= 24) return size;
      if (size <= 36) return size - 3;
      if (size <= 44) return size - 4;
      if (size <= 50) return size - 5;
      if (size <= 60) return size - 6;
      return Math.round(size * 0.88);
    },
    scaleWidth: (size: number) => {
      if (!small) return size;
      const ratio = Math.min(width / 390, 1);
      return Math.round(size * ratio);
    },
  };
}
