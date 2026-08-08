/** Friendly schedule helpers for 6-field cron used by the worker: sec min hour dom month dow. */

export type FriendlySchedule = {
  everyDay: boolean;
  /** 0=Sun … 6=Sat (standard cron DOW). */
  days: number[];
  hour: number;
  minute: number;
};

const DAY_LABELS_TR = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'] as const;

export const CRON_DAY_OPTIONS = DAY_LABELS_TR.map((label, value) => ({ value, label }));

function parseIntField(field: string): number | null {
  if (!/^\d+$/.test(field)) {
    return null;
  }
  return Number(field);
}

/**
 * Parse a simple daily or weekday-list cron into a friendly schedule.
 * Matches: sec=0, dom=*, month=*, hour/minute numeric, dow=* or comma list.
 */
export function parseFriendlyCron(expression?: string | null): FriendlySchedule | null {
  if (!expression) {
    return null;
  }
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 6) {
    return null;
  }
  const [sec, min, hour, dom, month, dow] = parts;
  if (sec !== '0' || dom !== '*' || month !== '*') {
    return null;
  }
  const minute = parseIntField(min);
  const hourNum = parseIntField(hour);
  if (minute === null || hourNum === null || minute < 0 || minute > 59 || hourNum < 0 || hourNum > 23) {
    return null;
  }
  if (dow === '*') {
    return { everyDay: true, days: [0, 1, 2, 3, 4, 5, 6], hour: hourNum, minute };
  }
  const days = dow.split(',').map((d) => parseIntField(d.trim()));
  if (days.some((d) => d === null || d! < 0 || d! > 6)) {
    return null;
  }
  const unique = Array.from(new Set(days as number[])).sort((a, b) => a - b);
  if (unique.length === 0) {
    return null;
  }
  return {
    everyDay: unique.length === 7,
    days: unique,
    hour: hourNum,
    minute,
  };
}

/** Build 6-field cron: always second=0, day-of-month=*, month=*. */
export function buildCronFromFriendly(schedule: FriendlySchedule): string {
  const minute = Math.max(0, Math.min(59, Math.floor(schedule.minute)));
  const hour = Math.max(0, Math.min(23, Math.floor(schedule.hour)));
  const days = schedule.everyDay
    ? '*'
    : Array.from(new Set(schedule.days.filter((d) => d >= 0 && d <= 6)))
        .sort((a, b) => a - b)
        .join(',');
  const dow = days === '' ? '*' : days;
  return `0 ${minute} ${hour} * * ${dow}`;
}

export function formatTimeInput(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function parseTimeInput(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }
  return { hour, minute };
}

export function defaultFriendlySchedule(): FriendlySchedule {
  return { everyDay: true, days: [0, 1, 2, 3, 4, 5, 6], hour: 9, minute: 0 };
}
