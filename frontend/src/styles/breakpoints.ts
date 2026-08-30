// frontend/src/styles/breakpoints.ts
export const breakpoints = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
  large: 1200,
};

export const mediaQueries = {
  mobile: `(max-width: ${breakpoints.mobile}px)`,
  tablet: `(max-width: ${breakpoints.tablet}px)`,
  desktop: `(min-width: ${breakpoints.desktop}px)`,
  large: `(min-width: ${breakpoints.large}px)`,
};
