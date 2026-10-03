export function getPortfolioFontStack(font) {
  const family = String(font || 'Inter').trim().replace(/["\\]/g, '') || 'Inter';
  return `'${family}', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
}
