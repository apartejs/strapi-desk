import { useIntl } from 'react-intl';
import { getTranslation } from '../utils/getTranslation';
import en from '../translations/en.json';

type Key = keyof typeof en;

/** The desk's words, in the team member's language, with English as the fallback. */
export function useWords() {
  const { formatMessage, formatDate, formatTime } = useIntl();
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

  return { t, when, time };
}
