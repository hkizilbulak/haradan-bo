function toDate(date?: string | number[]): Date | null {
    if (typeof date === 'string' && date !== '') {
        const parsed = new Date(date);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    if (Array.isArray(date) && date.length >= 3) {
        const [year, month, day] = date;
        return new Date(year, month - 1, day);
    }

    return null;
}

export function formatDate(date?: string | number[]) {
    const parsed = toDate(date);
    if (!parsed) {
        return "";
    }

    return parsed.toLocaleDateString("fr-CA", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDateForText(date?: string | number[]) {
    const parsed = toDate(date);
    if (!parsed) {
        return "";
    }

    return parsed.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function getTodayArr() {
    const date = new Date();
    return [date.getFullYear(), date.getMonth(), date.getDate()];
}

export function formatDateTimeForText(date?: string | number[]) {
    const parsed = toDate(date);
    if (!parsed) {
        return '';
    }

    return parsed.toLocaleString('en-GB');
}

/**
 * Convert a datetime-local form value (browser local wall clock) to RFC3339
 * for OpenAPI `format: date-time` / Go `time.Time` payloads.
 * Empty/optional values return undefined (no invalid Date).
 */
export function toApiDateTime(localDateTimeValue?: string | null): string | undefined {
    if (localDateTimeValue == null) {
        return undefined;
    }
    const trimmed = localDateTimeValue.trim();
    if (!trimmed) {
        return undefined;
    }

    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
        throw new Error('Geçersiz tarih/saat değeri.');
    }

    return parsed.toISOString();
}

/**
 * Convert an API RFC3339 timestamp to a datetime-local input value in the
 * browser's local timezone (not a naive UTC slice).
 */
export function toDateTimeLocalValue(iso?: string | null): string {
    if (iso == null || iso === '') {
        return '';
    }

    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) {
        return '';
    }

    const pad = (value: number) => String(value).padStart(2, '0');
    return [
        parsed.getFullYear(),
        '-',
        pad(parsed.getMonth() + 1),
        '-',
        pad(parsed.getDate()),
        'T',
        pad(parsed.getHours()),
        ':',
        pad(parsed.getMinutes()),
    ].join('');
}

/**
 * Convert an ISO timestamp or date string to YYYY-MM-DD for <input type="date">
 * in the browser's local timezone.
 */
export function toDateInputValue(iso?: string | null): string {
    if (iso == null || iso === '') {
        return '';
    }

    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) {
        return '';
    }

    const pad = (value: number) => String(value).padStart(2, '0');
    return [
        parsed.getFullYear(),
        '-',
        pad(parsed.getMonth() + 1),
        '-',
        pad(parsed.getDate()),
    ].join('');
}

/**
 * Convert a date string (YYYY-MM-DD or ISO) to the start of that day (00:00:00 local time)
 * in UTC RFC3339 format for API payloads.
 */
export function toApiDateStart(dateValue?: string | null): string | undefined {
    if (dateValue == null) return undefined;
    const trimmed = dateValue.trim();
    if (!trimmed) return undefined;

    if (trimmed.includes('T')) {
        const parsed = new Date(trimmed);
        return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
    }

    const parts = trimmed.split('-').map(Number);
    if (parts.length >= 3 && !parts.some(isNaN)) {
        const [year, month, day] = parts;
        const d = new Date(year, month - 1, day, 0, 0, 0, 0);
        return d.toISOString();
    }

    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

/**
 * Convert a date string (YYYY-MM-DD or ISO) to the end of that day (23:59:59.999 local time)
 * in UTC RFC3339 format for API payloads.
 */
export function toApiDateEnd(dateValue?: string | null): string | undefined {
    if (dateValue == null) return undefined;
    const trimmed = dateValue.trim();
    if (!trimmed) return undefined;

    if (trimmed.includes('T')) {
        const parsed = new Date(trimmed);
        return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
    }

    const parts = trimmed.split('-').map(Number);
    if (parts.length >= 3 && !parts.some(isNaN)) {
        const [year, month, day] = parts;
        const d = new Date(year, month - 1, day, 23, 59, 59, 999);
        return d.toISOString();
    }

    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}
