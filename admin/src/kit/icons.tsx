import type { SVGProps } from 'react';

/**
 * The desk's icons, drawn here rather than imported: @strapi/icons is not the same package in
 * Strapi 4 and in Strapi 5, and this admin is one build for both.
 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number | string };

const icon = (...paths: string[]) => {
  const Icon = ({ size = '16px', ...props }: IconProps) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable={false}
      {...props}
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
  return Icon;
};

export const Bell = icon('M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9', 'M10.3 21a1.94 1.94 0 0 0 3.4 0');
export const Lightning = icon('M13 2 3 14h9l-1 8 10-12h-9l1-8z');
export const Chat = icon('M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z');
export const User = icon('M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M4 21a8 8 0 0 1 16 0');
export const Archive = icon('M4 4h16a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z', 'M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8', 'M10 12h4');
export const ArrowLeft = icon('M19 12H5', 'M12 19l-7-7 7-7');
export const ArrowRight = icon('M5 12h14', 'M12 5l7 7-7 7');
export const HandBack = icon('M3 12a9 9 0 0 1 15-6.7L21 8', 'M21 3v5h-5', 'M21 12a9 9 0 0 1-15 6.7L3 16', 'M3 21v-5h5');
export const Sparkle = icon('M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z', 'M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z');
export const Lock = icon('M7 11h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2z', 'M8 11V7a4 4 0 0 1 8 0v4');
export const Check = icon('M20 6 9 17l-5-5');
export const Send = icon('M22 2 11 13', 'M22 2l-7 20-4-9-9-4z');
export const Search = icon('M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z', 'm21 21-4.3-4.3');
export const Cross = icon('M18 6 6 18', 'M6 6l12 12');
export const Plus = icon('M12 5v14', 'M5 12h14');
export const Pencil = icon('M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z');
export const Trash = icon('M3 6h18', 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6', 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2');

/** The menu's icon: filled, as the admin's menu colours its icons by their fill. */
export const Headset = (props: SVGProps<SVGSVGElement>) => (
  <svg width="16px" height="16px" viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable={false} {...props}>
    <path d="M12 3a9 9 0 0 0-9 9v6a3 3 0 0 0 3 3h1a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H5v-1a7 7 0 0 1 14 0v1h-2a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h1a3 3 0 0 0 3-3v-6a9 9 0 0 0-9-9z" />
  </svg>
);
