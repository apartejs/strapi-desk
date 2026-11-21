import 'styled-components';

type Scale = 100 | 200 | 500 | 600 | 700;
type Family = 'primary' | 'secondary' | 'alternative' | 'success' | 'warning' | 'danger';
type Neutral = 0 | 100 | 150 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 1000;

/**
 * The part of the admin's theme the desk reads. Strapi 4's design system and Strapi 5's name
 * these the same, so the desk draws with whichever theme the panel provides.
 */
declare module 'styled-components' {
  export interface DefaultTheme {
    colors: Record<`${Family}${Scale}` | `neutral${Neutral}`, string> & Partial<Record<'buttonPrimary500' | 'buttonPrimary600' | 'buttonNeutral0', string>>;
    shadows: Record<'tableShadow' | 'filterShadow' | 'popupShadow' | 'focusShadow', string>;
  }
}
