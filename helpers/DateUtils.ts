export function formatDate(date?: number[]) {
    if (date?.length !== 3) {
        return "";
    }

    return new Date(date[0], date[1] - 1, date[2]).toLocaleDateString("fr-CA", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export function formatDateForText(date?: number[]) {
    if (date?.length !== 3) {
        return "";
    }

    return new Date(date[0], date[1] - 1, date[2]).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export function getTodayArr() {
    const date = new Date();
    return [date.getFullYear(), date.getMonth(), date.getDate()];
}

export function formatDateTimeForText(date?: string | number[]) {
    if (typeof date === 'string' && date !== '') {
        return new Date(date).toLocaleString('en-GB');
    }

    if (Array.isArray(date) && date.length === 3) {
        const [year, month, day] = date;
        return new Date(year, month - 1, day).toLocaleString('en-GB');
    }

    return '';
}