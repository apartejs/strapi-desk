import styled, { css } from 'styled-components';

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
  font-size: 1.3rem;
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
  font-size: 1.1rem;
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
  font-size: 1.2rem;
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
  max-width: min(32rem, 100%);
  padding: 10px 14px;
  border-radius: 14px;
  font-size: 1.4rem;
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
            background: ${theme.colors.buttonPrimary600};
            color: ${theme.colors.buttonNeutral0};
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
  font-size: 1.2rem;
  line-height: 1.5;
  text-align: center;

  strong {
    color: ${({ theme }) => theme.colors.neutral800};
    font-weight: 600;
  }
`;

/** A note of the team, which the visitor and the assistant never read. */
export const NoteCard = styled.div`
  max-width: min(32rem, 100%);
  padding: 10px 14px;
  border: 1px solid ${({ theme }) => theme.colors.warning200};
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.warning100};
  color: ${({ theme }) => theme.colors.neutral800};
  font-size: 1.4rem;
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
`;

export const DayLabel = styled.div`
  align-self: center;
  padding: 4px 0;
  font-size: 1.1rem;
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
  font-size: 1.4rem;
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
