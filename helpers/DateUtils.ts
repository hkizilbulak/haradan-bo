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
