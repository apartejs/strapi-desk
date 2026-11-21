/**
 * styled-components' `css` and `keyframes`, without importing them.
 *
 * Strapi 4 compiles a plugin's admin with babel-plugin-styled-components, which reads
 * `styled.css` and `styled.keyframes` in a CommonJS build (ours) as a styled element named
 * "css", and calls `.withConfig()` on it: the page throws before it draws. Neither helper is
 * needed for what the desk does with them:
 *
 * - an interpolation may be an array, which styled-components 5 and 6 both flatten, functions
 *   of the props included: `css` only has to interleave the strings and the values;
 * - the one animation is a rule of the document's own, written once.
 */
/** What styled-components takes in a template: typed loosely, as each version types it its own way. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Interpolation = any;

export const css = (strings: TemplateStringsArray, ...values: Interpolation[]): Interpolation =>
  strings.flatMap((part, index) => (index < values.length ? [part, values[index]] : [part]));

/** A keyframes rule under a name of the desk's, added to the document the first time it is asked for. */
export const keyframes = (name: string, body: string): string => {
  const id = `aparte-desk-${name}`;
  if (typeof document !== 'undefined' && !document.getElementById(id)) {
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `@keyframes ${id} { ${body} }`;
    document.head.appendChild(style);
  }
  return id;
};
