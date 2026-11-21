import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled, { type DefaultTheme } from 'styled-components';
import { css, keyframes } from './css';
import { Cross as CrossIcon, Search as SearchIcon } from './icons';

/**
 * The desk's own pieces, drawn with the admin's theme (its colours, shadows and radius), so they
 * follow the light and the dark theme like every component of the design system.
 */

/** The desk: the list, the conversation and the visitor, in one panel. */
export const Panel = styled.div`
  display: grid;
  grid-template-columns: 340px minmax(0, 1fr) 300px;
  height: calc(100vh - 190px);
  min-height: 520px;
  background: ${({ theme }) => theme.colors.neutral0};
  border: 1px solid ${({ theme }) => theme.colors.neutral150};
  border-radius: 8px;
  box-shadow: ${({ theme }) => theme.shadows.tableShadow};
  overflow: hidden;

  &[data-open='false'] {
    grid-template-columns: 340px minmax(0, 1fr);
  }

  @media (max-width: 1400px) {
    grid-template-columns: 320px minmax(0, 1fr);
    &[data-open='false'] {
      grid-template-columns: 320px minmax(0, 1fr);
    }
    [data-visitor-panel] {
      display: none;
    }
  }

  @media (max-width: 900px) {
    grid-template-columns: minmax(0, 1fr);
    &[data-open='false'] {
      grid-template-columns: minmax(0, 1fr);
    }
    &[data-open='true'] [data-list-column],
    &[data-open='false'] [data-center-column] {
      display: none;
    }
  }
`;

export const Column = styled.section<{ $border?: 'end' | 'start' }>`
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  ${({ $border, theme }) =>
    $border === 'end'
      ? css`
          border-inline-end: 1px solid ${theme.colors.neutral150};
        `
      : $border === 'start'
        ? css`
            border-inline-start: 1px solid ${theme.colors.neutral150};
          `
        : ''}
`;

export const Scroll = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
`;

type Tone = 'neutral' | 'primary' | 'warning' | 'success';

/** A round badge: the person's initials, or an icon for the assistant. */
export const Avatar = styled.span<{ $size?: number; $tone?: Tone }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: ${({ $size = 36 }) => $size}px;
  height: ${({ $size = 36 }) => $size}px;
  border-radius: 50%;
  font-size: ${({ $size = 36 }) => Math.round($size * 0.36)}px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.02em;
  background: ${({ theme, $tone = 'neutral' }) => theme.colors[$tone === 'neutral' ? 'neutral150' : (`${$tone}100` as const)]};
  color: ${({ theme, $tone = 'neutral' }) => theme.colors[$tone === 'neutral' ? 'neutral700' : (`${$tone}600` as const)]};

  svg {
    width: 50%;
    height: 50%;
  }
`;

/** "Marie Dupont" → "MD", "Guest" → "G". */
export const initials = (name: string) =>
  name
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('') || '?';

/** Tabs drawn as one segmented control, as the support inboxes do. */
export const Segmented = styled.div`
  display: flex;
  gap: 2px;
  padding: 3px;
  border-radius: 6px;
  background: ${({ theme }) => theme.colors.neutral100};
`;

export const Segment = styled.button<{ $active: boolean }>`
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 0;
  padding: 7px 8px;
  border: 0;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  color: ${({ theme, $active }) => ($active ? theme.colors.neutral800 : theme.colors.neutral600)};
  background: ${({ theme, $active }) => ($active ? theme.colors.neutral0 : 'transparent')};
  box-shadow: ${({ theme, $active }) => ($active ? theme.shadows.filterShadow : 'none')};

  &:hover {
    color: ${({ theme }) => theme.colors.neutral800};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary600};
    outline-offset: 1px;
  }
`;

export const Count = styled.span<{ $strong?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  font-size: 11px;
  font-weight: 600;
  background: ${({ theme, $strong }) => ($strong ? theme.colors.primary600 : theme.colors.neutral200)};
  color: ${({ theme, $strong }) => ($strong ? theme.colors.neutral0 : theme.colors.neutral700)};
`;

/** One conversation in the list. */
export const RowButton = styled.button<{ $active: boolean }>`
  display: flex;
  gap: 12px;
  width: 100%;
  padding: 14px 16px 14px 13px;
  border: 0;
  border-inline-start: 3px solid ${({ theme, $active }) => ($active ? theme.colors.primary600 : 'transparent')};
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral150};
  background: ${({ theme, $active }) => ($active ? theme.colors.primary100 : theme.colors.neutral0)};
  text-align: start;
  cursor: pointer;

  &:hover {
    background: ${({ theme, $active }) => ($active ? theme.colors.primary100 : theme.colors.neutral100)};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary600};
    outline-offset: -2px;
  }
`;

/** A short line with an icon: who holds it, why it waits, that the assistant answers. */
export const Meta = styled.span<{ $tone?: 'neutral' | 'warning' | 'danger' | 'success' }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  max-width: 100%;
  font-size: 12px;
  font-weight: ${({ $tone }) => ($tone && $tone !== 'neutral' ? 600 : 400)};
  color: ${({ theme, $tone = 'neutral' }) => theme.colors[$tone === 'neutral' ? 'neutral600' : (`${$tone}600` as const)]};

  svg {
    flex-shrink: 0;
    width: 12px;
    height: 12px;
  }
  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

/** Why a conversation waits: a soft yellow label. */
export const Reason = styled(Meta)`
  padding: 2px 8px;
  border-radius: 4px;
  background: ${({ theme }) => theme.colors.warning100};
  color: ${({ theme }) => theme.colors.warning700};
`;

/** A message's bubble. */
export const Bubble = styled.div<{ $from: 'visitor' | 'assistant' | 'team' }>`
  max-width: min(320px, 100%);
  padding: 10px 14px;
  border-radius: 14px;
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  ${({ theme, $from }) =>
    $from === 'visitor'
      ? css`
          border: 1px solid ${theme.colors.neutral200};
          background: ${theme.colors.neutral0};
          color: ${theme.colors.neutral800};
          border-end-start-radius: 4px;
        `
      : $from === 'assistant'
        ? css`
            background: ${theme.colors.neutral100};
            color: ${theme.colors.neutral800};
            border-end-end-radius: 4px;
          `
        : css`
            background: ${buttonPrimary(theme)};
            color: ${buttonText(theme)};
            border-end-end-radius: 4px;
          `}
`;

/** What happened, in the middle of the conversation. */
export const EventPill = styled.div`
  align-self: center;
  max-width: 85%;
  padding: 5px 14px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.neutral100};
  color: ${({ theme }) => theme.colors.neutral600};
  font-size: 12px;
  line-height: 1.5;
  text-align: center;

  strong {
    color: ${({ theme }) => theme.colors.neutral800};
    font-weight: 600;
  }
`;

/** A note of the team, which the visitor and the assistant never read. */
export const NoteCard = styled.div`
  max-width: min(320px, 100%);
  padding: 10px 14px;
  border: 1px solid ${({ theme }) => theme.colors.warning200};
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.warning100};
  color: ${({ theme }) => theme.colors.neutral800};
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
`;

export const DayLabel = styled.div`
  align-self: center;
  padding: 4px 0;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.neutral500};
`;

/** The composer's two modes, underlined as tabs. */
export const ModeTab = styled.button<{ $active: boolean; $tone: 'primary' | 'warning' }>`
  padding: 4px 0 8px;
  border: 0;
  border-bottom: 2px solid ${({ theme, $active, $tone }) => ($active ? theme.colors[`${$tone}600`] : 'transparent')};
  background: none;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme, $active }) => ($active ? theme.colors.neutral800 : theme.colors.neutral500)};
  cursor: pointer;

  &:disabled {
    cursor: default;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary600};
    outline-offset: 2px;
  }
`;

/** A plain button that looks like nothing: a row, a card, a link. */
export const Bare = styled.button`
  padding: 0;
  border: 0;
  background: none;
  text-align: start;
  cursor: pointer;
  color: inherit;
  font: inherit;
`;

export const Card = styled(Bare)`
  display: block;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colors.neutral200};
  border-radius: 6px;
  background: ${({ theme }) => theme.colors.neutral0};

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary600};
  }
`;

/** Shown on a narrow screen only: back to the list. */
export const NarrowOnly = styled.div`
  display: none;
  @media (max-width: 900px) {
    display: block;
  }
`;

/* ------------------------------------------------------------------------------------------------
 * The admin's primitives, redrawn: the design system is v1 in Strapi 4 and v2 in Strapi 5, with
 * other components and other props, and this admin is one build for both. The look is the
 * design system's own: the same sizes, the same theme tokens. Every size is in pixels: a rem is
 * 10px in Strapi 5 and in the later Strapi 4 (their root is 62.5%), but 16px in Strapi 4.0.
 * --------------------------------------------------------------------------------------------- */

type Color = keyof DefaultTheme['colors'];

/*
 * The button's own colours (the same in the light and the dark theme) came with the dark theme;
 * Strapi 4.0, light only, draws its buttons with the primary scale and white.
 */
const buttonPrimary = (theme: DefaultTheme) => theme.colors.buttonPrimary600 ?? theme.colors.primary600;
const buttonPrimaryHover = (theme: DefaultTheme) => theme.colors.buttonPrimary500 ?? theme.colors.primary500;
const buttonText = (theme: DefaultTheme) => theme.colors.buttonNeutral0 ?? theme.colors.neutral0;

const VARIANTS = {
  alpha: { size: '32px', line: '40px', weight: 700 },
  beta: { size: '18px', line: '22px', weight: 700 },
  delta: { size: '16px', line: '24px', weight: 600 },
  epsilon: { size: '16px', line: '24px', weight: 400 },
  omega: { size: '14px', line: '20px', weight: 400 },
  pi: { size: '12px', line: '16px', weight: 400 },
  sigma: { size: '11px', line: '16px', weight: 700 },
} as const;

const TextBase = styled.span<{ $variant: keyof typeof VARIANTS; $weight?: number; $color: Color; $ellipsis?: boolean; $align?: string }>`
  margin: 0;
  font-size: ${({ $variant }) => VARIANTS[$variant].size};
  line-height: ${({ $variant }) => VARIANTS[$variant].line};
  font-weight: ${({ $variant, $weight }) => $weight ?? VARIANTS[$variant].weight};
  color: ${({ theme, $color }) => theme.colors[$color]};
  text-align: ${({ $align }) => $align ?? 'inherit'};
  ${({ $variant }) =>
    $variant === 'sigma'
      ? css`
          text-transform: uppercase;
          letter-spacing: 0.04em;
        `
      : ''}
  ${({ $ellipsis }) =>
    $ellipsis
      ? css`
          display: block;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        `
      : ''}
`;

export const Text = ({
  variant = 'omega',
  weight,
  color = 'neutral800',
  tag = 'span',
  ellipsis,
  align,
  children,
  ...rest
}: {
  variant?: keyof typeof VARIANTS;
  weight?: 'regular' | 'semiBold' | 'bold';
  color?: Color;
  tag?: keyof JSX.IntrinsicElements;
  ellipsis?: boolean;
  align?: 'start' | 'center' | 'end';
  children?: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLElement>, 'color'> & { htmlFor?: string }) => (
  <TextBase
    as={tag as never}
    $variant={variant}
    $weight={weight === 'bold' ? 700 : weight === 'semiBold' ? 600 : weight === 'regular' ? 400 : undefined}
    $color={color}
    $ellipsis={ellipsis}
    $align={align}
    {...rest}
  >
    {children}
  </TextBase>
);

/** A flex box, with the gap in pixels. */
export const Flex = styled.div<{ $direction?: 'row' | 'column'; $gap?: number; $align?: string; $justify?: string; $wrap?: boolean; $grow?: boolean }>`
  display: flex;
  flex-direction: ${({ $direction = 'row' }) => $direction};
  gap: ${({ $gap = 0 }) => $gap}px;
  align-items: ${({ $align, $direction = 'row' }) => $align ?? ($direction === 'row' ? 'center' : 'stretch')};
  justify-content: ${({ $justify = 'flex-start' }) => $justify};
  flex-wrap: ${({ $wrap }) => ($wrap ? 'wrap' : 'nowrap')};
  ${({ $grow }) =>
    $grow
      ? css`
          flex: 1;
          min-width: 0;
        `
      : ''}
`;

export const Divider = styled.hr`
  width: 100%;
  height: 1px;
  margin: 0;
  border: 0;
  background: ${({ theme }) => theme.colors.neutral150};
`;

type ButtonVariant = 'default' | 'secondary' | 'tertiary' | 'danger' | 'danger-light' | 'ghost';

const BUTTON: Record<ButtonVariant, (theme: DefaultTheme) => ReturnType<typeof css>> = {
  default: (theme) => css`
    background: ${buttonPrimary(theme)};
    border-color: ${buttonPrimary(theme)};
    color: ${buttonText(theme)};
    &:hover:not(:disabled) {
      background: ${buttonPrimaryHover(theme)};
      border-color: ${buttonPrimaryHover(theme)};
    }
  `,
  secondary: (theme) => css`
    background: ${theme.colors.primary100};
    border-color: ${theme.colors.primary200};
    color: ${theme.colors.primary700};
    &:hover:not(:disabled) {
      background: ${theme.colors.neutral0};
    }
  `,
  tertiary: (theme) => css`
    background: ${theme.colors.neutral0};
    border-color: ${theme.colors.neutral200};
    color: ${theme.colors.neutral800};
    &:hover:not(:disabled) {
      background: ${theme.colors.neutral100};
    }
  `,
  danger: (theme) => css`
    background: ${theme.colors.danger600};
    border-color: ${theme.colors.danger600};
    color: ${buttonText(theme)};
    &:hover:not(:disabled) {
      background: ${theme.colors.danger500};
    }
  `,
  'danger-light': (theme) => css`
    background: ${theme.colors.danger100};
    border-color: ${theme.colors.danger200};
    color: ${theme.colors.danger700};
    &:hover:not(:disabled) {
      background: ${theme.colors.neutral0};
    }
  `,
  ghost: (theme) => css`
    background: transparent;
    border-color: transparent;
    color: ${theme.colors.neutral800};
    &:hover:not(:disabled) {
      background: ${theme.colors.neutral100};
    }
  `,
};

const ButtonBase = styled.button<{ $variant: ButtonVariant; $size: 'S' | 'M' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-shrink: 0;
  height: ${({ $size }) => ($size === 'S' ? '32px' : '36px')};
  padding: 0 ${({ $size }) => ($size === 'S' ? '12px' : '16px')};
  border: 1px solid transparent;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  ${({ theme, $variant }) => BUTTON[$variant](theme)}

  &:disabled {
    cursor: not-allowed;
    background: ${({ theme }) => theme.colors.neutral150};
    border-color: ${({ theme }) => theme.colors.neutral200};
    color: ${({ theme }) => theme.colors.neutral600};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary600};
    outline-offset: 2px;
  }
  svg {
    width: 14px;
    height: 14px;
  }
`;

export const Button = ({
  variant = 'default',
  size = 'M',
  startIcon,
  endIcon,
  loading,
  children,
  type = 'button',
  ...rest
}: {
  variant?: ButtonVariant;
  size?: 'S' | 'M';
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  loading?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <ButtonBase type={type} $variant={variant} $size={size} aria-busy={loading || undefined} {...rest} disabled={rest.disabled || loading}>
    {loading ? <Spinner $size={14} /> : startIcon}
    {children}
    {endIcon}
  </ButtonBase>
);

export const IconButton = ({ label, children, ...rest }: { label: string; children: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <ButtonBase type="button" $variant="ghost" $size="S" aria-label={label} title={label} style={{ padding: 0, width: '32px' }} {...rest}>
    {children}
  </ButtonBase>
);

const fieldStyle = css`
  width: 100%;
  padding: 0 16px;
  border: 1px solid ${({ theme }: { theme: DefaultTheme }) => theme.colors.neutral200};
  border-radius: 4px;
  background: ${({ theme }: { theme: DefaultTheme }) => theme.colors.neutral0};
  color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.neutral800};
  font: inherit;
  font-size: 14px;
  line-height: 20px;

  &::placeholder {
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.neutral500};
  }
  &:focus {
    outline: none;
    border-color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.primary600};
    box-shadow: ${({ theme }: { theme: DefaultTheme }) => theme.colors.primary600} 0 0 0 2px;
  }
`;

export const Input = styled.input`
  ${fieldStyle}
  height: 40px;
`;

export const TextArea = styled.textarea`
  ${fieldStyle}
  display: block;
  min-height: 105px;
  padding: 12px 16px;
  resize: vertical;
`;

export const Select = styled.select`
  ${fieldStyle}
  height: 40px;
  padding-inline-end: 32px;
  appearance: none;
  background-image: linear-gradient(45deg, transparent 50%, currentColor 50%), linear-gradient(135deg, currentColor 50%, transparent 50%);
  background-position: calc(100% - 18px) 50%, calc(100% - 13px) 50%;
  background-size: 5px 5px;
  background-repeat: no-repeat;
`;

export const Label = ({ htmlFor, children, hint }: { htmlFor: string; children: React.ReactNode; hint?: string }) => (
  <Flex $direction="column" $gap={4} style={{ paddingBottom: 4 }}>
    <Text tag="label" variant="pi" weight="bold" htmlFor={htmlFor}>
      {children}
    </Text>
    {hint ? (
      <Text variant="pi" color="neutral600">
        {hint}
      </Text>
    ) : null}
  </Flex>
);

/** A search field, with its icon and a button that clears it. */
const SearchWrap = styled.div`
  position: relative;
  svg {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    color: ${({ theme }) => theme.colors.neutral500};
  }
  > svg {
    inset-inline-start: 12px;
  }
  input {
    height: 36px;
    padding-inline: 36px;
  }
`;

export const SearchField = ({ value, onChange, placeholder, clearLabel }: { value: string; onChange: (value: string) => void; placeholder: string; clearLabel: string }) => (
  <SearchWrap>
    <SearchIcon />
    <Input type="search" value={value} placeholder={placeholder} aria-label={placeholder} onChange={(event) => onChange(event.target.value)} />
    {value ? (
      <Bare type="button" aria-label={clearLabel} onClick={() => onChange('')} style={{ position: 'absolute', insetInlineEnd: 10, top: 0, bottom: 0 }}>
        <CrossIcon />
      </Bare>
    ) : null}
  </SearchWrap>
);

const spin = keyframes('spin', 'to { transform: rotate(360deg); }');

export const Spinner = styled.span<{ $size?: number }>`
  display: inline-block;
  flex-shrink: 0;
  width: ${({ $size = 24 }) => $size}px;
  height: ${({ $size = 24 }) => $size}px;
  border: 2px solid ${({ theme }) => theme.colors.neutral200};
  border-top-color: ${({ theme }) => theme.colors.primary600};
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

/* The dialog: one panel over the page, closed by Escape or its buttons. */

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(33, 33, 52, 0.4);
`;

const DialogPanel = styled.div<{ $width: string }>`
  display: flex;
  flex-direction: column;
  width: ${({ $width }) => $width};
  max-width: 100%;
  max-height: calc(100vh - 32px);
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.neutral0};
  box-shadow: ${({ theme }) => theme.shadows.popupShadow};
  overflow: hidden;
`;

const DialogBar = styled.div<{ $at: 'top' | 'bottom' }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  background: ${({ theme, $at }) => ($at === 'top' ? theme.colors.neutral100 : theme.colors.neutral100)};
  border-${({ $at }) => ($at === 'top' ? 'bottom' : 'top')}: 1px solid ${({ theme }) => theme.colors.neutral150};
`;

export const Dialog = ({
  open,
  onClose,
  title,
  children,
  footer,
  width = '560px',
  closeLabel,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  width?: string;
  closeLabel: string;
}) => {
  const panel = useRef<HTMLDivElement>(null);
  // The latest onClose, read by the listener: an effect that depended on it would run again at
  // every render of the parent, and take the focus back to the first field while one types.
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open) return;
    const before = document.activeElement as HTMLElement | null;
    const first = panel.current?.querySelector<HTMLElement>('input, textarea, select, button:not([data-close])');
    first?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close.current();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      before?.focus?.();
    };
  }, [open]);
  if (!open) return null;
  return createPortal(
    <Overlay onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <DialogPanel ref={panel} $width={width} role="dialog" aria-modal="true" aria-label={title}>
        <DialogBar $at="top">
          <Text variant="omega" weight="bold" tag="h2" style={{ flex: 1 }}>
            {title}
          </Text>
          <IconButton label={closeLabel} onClick={onClose} data-close>
            <CrossIcon />
          </IconButton>
        </DialogBar>
        <div style={{ padding: '24px 20px', overflowY: 'auto' }}>{children}</div>
        <DialogBar $at="bottom" style={{ justifyContent: 'space-between' }}>
          {footer}
        </DialogBar>
      </DialogPanel>
    </Overlay>,
    document.body
  );
};

/** "Are you sure?" before what cannot be undone at once. */
export const Confirm = ({
  open,
  onClose,
  onConfirm,
  title,
  children,
  confirm,
  cancel,
  danger,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: React.ReactNode;
  confirm: string;
  cancel: string;
  danger?: boolean;
}) => (
  <Dialog
    open={open}
    onClose={onClose}
    title={title}
    width="420px"
    closeLabel={cancel}
    footer={
      <>
        <Button variant="tertiary" onClick={onClose}>
          {cancel}
        </Button>
        <Button
          variant={danger ? 'danger-light' : 'default'}
          onClick={() => {
            onClose();
            onConfirm();
          }}
        >
          {confirm}
        </Button>
      </>
    }
  >
    <Text tag="p" align="center" style={{ display: 'block' }}>
      {children}
    </Text>
  </Dialog>
);

/* A notice at the top of the page, for what failed. */

const ToastBox = styled.div`
  position: fixed;
  top: 46px;
  left: 50%;
  z-index: 1100;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: min(500px, calc(100vw - 32px));
  padding: 12px 16px;
  border: 1px solid ${({ theme }) => theme.colors.danger200};
  border-radius: 4px;
  background: ${({ theme }) => theme.colors.danger100};
  box-shadow: ${({ theme }) => theme.shadows.filterShadow};
`;

export const useToast = () => {
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 6000);
    return () => clearTimeout(timer);
  }, [message]);
  const node = message
    ? createPortal(
        <ToastBox role="alert">
          <Text variant="omega" color="danger700">
            {message}
          </Text>
          <Bare type="button" aria-label="×" onClick={() => setMessage(null)}>
            <CrossIcon />
          </Bare>
        </ToastBox>,
        document.body
      )
    : null;
  return { toast: setMessage, toastNode: node };
};

/** The page's head, as the admin's pages draw theirs. */
export const PageHeader = ({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) => (
  <Flex $justify="space-between" $align="flex-start" $gap={16} $wrap style={{ padding: '40px 56px 24px' }}>
    <Flex $direction="column" $gap={4} $align="flex-start" style={{ minWidth: 0 }}>
      <Text variant="alpha" tag="h1">
        {title}
      </Text>
      {subtitle ? (
        <Text variant="epsilon" color="neutral600" tag="p">
          {subtitle}
        </Text>
      ) : null}
    </Flex>
    {actions ? <Flex $gap={8}>{actions}</Flex> : null}
  </Flex>
);
