// js/utils.js

/**
 * Вычисляет яркость HEX-цвета
 */
export function getLuminance(hex) {
  hex = hex.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Затемняет или осветляет HEX-цвет
 */
export function shadeColor(color, percent) {
  let R = parseInt(color.substring(1, 3), 16);
  let G = parseInt(color.substring(3, 5), 16);
  let B = parseInt(color.substring(5, 7), 16);
  R = parseInt(R * (1.0 + percent)); G = parseInt(G * (1.0 + percent)); B = parseInt(B * (1.0 + percent));
  R = (R < 255) ? R : 255; G = (G < 255) ? G : 255; B = (B < 255) ? B : 255;
  R = (R > 0) ? R : 0; G = (G > 0) ? G : 0; B = (B > 0) ? B : 0;
  const RR = ((R.toString(16).length == 1) ? "0" + R.toString(16) : R.toString(16));
  const GG = ((G.toString(16).length == 1) ? "0" + G.toString(16) : G.toString(16));
  const BB = ((B.toString(16).length == 1) ? "0" + B.toString(16) : B.toString(16));
  return "#" + RR + GG + BB;
}