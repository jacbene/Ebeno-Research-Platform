// src/theme.ts (simplifié, on utilise maintenant le contexte)
export const theme = {
  spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px', xxl: '48px' },
  borderRadius: { sm: '4px', md: '8px', lg: '12px', xl: '16px' },
  shadows: { sm: '0 1px 3px rgba(0,0,0,0.12)', md: '0 4px 12px rgba(0,0,0,0.08)', lg: '0 8px 24px rgba(0,0,0,0.12)', xl: '0 12px 48px rgba(0,0,0,0.16)' },
  typography: { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontSize: { xs: '12px', sm: '14px', md: '16px', lg: '20px', xl: '24px', xxl: '32px' }, fontWeight: { normal: 400, medium: 500, semibold: 600, bold: 700 } },
};
 

export type Theme = typeof theme;
export default theme;
