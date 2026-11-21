import { useIntl } from 'react-intl';
import { getTranslation } from '../utils/getTranslation';
import en from '../translations/en.json';

type Key = keyof typeof en;

/** The desk's words, in the team member's language, with English as the fallback. */
export function useWords() {
  const { formatMessage, formatDate, formatTime, formatRelativeTime } = useIntl();
  const t = (key: Key, values?: Record<string, string | number>) =>
    formatMessage({ id: getTranslation(key), defaultMessage: en[key] }, values) as string;

  /** "14:05" today, "Yesterday" before, a date further back. */
  const when = (iso: string | null | undefined) => {
    if (!iso) return '';
    const date = new Date(iso);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return formatTime(date, { hour: '2-digit', minute: '2-digit' });
    if (date.toDateString() === yesterday.toDateString()) return t('yesterday');
    return formatDate(date, { day: 'numeric', month: 'short', year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
  };

  const time = (iso: string) => formatTime(new Date(iso), { hour: '2-digit', minute: '2-digit' });

  /** "now", "3 min. ago", "2 hr. ago", "4 days ago", then the date. */
  const ago = (iso: string | null | undefined) => {
    if (!iso) return '';
    const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (seconds < 60) return t('now');
    if (seconds < 3600) return formatRelativeTime(-Math.floor(seconds / 60), 'minute', { style: 'narrow' });
    if (seconds < 86400) return formatRelativeTime(-Math.floor(seconds / 3600), 'hour', { style: 'narrow' });
    if (seconds < 7 * 86400) return formatRelativeTime(-Math.floor(seconds / 86400), 'day', { style: 'narrow' });
    return when(iso);
  };

  /** The day a part of the conversation was written: "Today", "Yesterday", "21 November 2026". */
  const day = (iso: string) => {
    const date = new Date(iso);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return t('today');
    if (date.toDateString() === yesterday.toDateString()) return t('yesterday');
    return formatDate(date, { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const date = (iso: string) => formatDate(new Date(iso), { day: 'numeric', month: 'short', year: 'numeric' });

  return { t, when, time, ago, day, date };
}
