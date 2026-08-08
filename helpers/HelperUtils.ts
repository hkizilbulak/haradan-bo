import { ApiErrorResponse } from "@/models/common";
import { AxiosError } from 'axios';
import { formatMoneyInput, parseMoneyInput, SUPPORTED_MONEY_FRACTION_DIGITS } from './money';

export { formatMoneyInput, parseMoneyInput, SUPPORTED_MONEY_FRACTION_DIGITS } from './money';

export function copyMatchingKeyValues(target: any, source: any) {
    Object.keys(target).forEach(key => {
        if (source[key] !== undefined)
            target[key] = source[key];
    });
    return target;
}

export function appendOperator(text: string, appendText: string, operator: string = ';') {
    if (text === '') return text.concat(appendText)
    return text.concat(operator).concat(appendText)
}

export function capitalizeSentence(sentence: string) {
    return sentence.toLocaleLowerCase('tr-TR').replace(/(?:^|\s|,|;|!|:|-|\.|\?)[a-z0-9ğçşüöı]/g, letter => letter.toUpperCase());
}

function firstFieldError(data?: ApiErrorResponse | null): string | undefined {
    const field = data?.fieldErrors?.find((item) => item?.message)?.message;
    if (field) {
        return field;
    }
    return data?.details?.find((item) => item?.message)?.message;
}

export function getErrorMessage(error: unknown): string {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    const status = axiosError.response?.status;
    const errorData = axiosError.response?.data;

    if (status === 502) {
        return "Backend servisine şu anda ulaşılamıyor. Lütfen daha sonra tekrar deneyin.";
    }
    if (status === 503) {
        return "Bu işlem için gerekli hizmet şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.";
    }
    if (status === 401) {
        return errorData?.message || "Oturumunuz geçersiz veya süresi dolmuş. Lütfen tekrar giriş yapın.";
    }
    if (status === 403) {
        return errorData?.message || "Bu işlem için yetkiniz bulunmuyor.";
    }
    if (status === 404) {
        return errorData?.message || "İstenen kayıt bulunamadı.";
    }
    if (status === 409) {
        return "Bu kayıt başka bir işlemle güncellendi. Güncel bilgiler yeniden yüklendi.";
    }
    if (status === 422 || status === 400) {
        return firstFieldError(errorData) || errorData?.message || errorData?.errorMessage || "Gönderilen bilgiler geçersiz.";
    }
    if (status === 429) {
        return errorData?.message || "Çok fazla istek gönderildi. Lütfen kısa süre sonra tekrar deneyin.";
    }
    if (status && status >= 500) {
        return "Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.";
    }

    if (errorData) {
        if (errorData.errorMessage) return errorData.errorMessage;
        if (errorData.message) return errorData.message;
        const nested = firstFieldError(errorData);
        if (nested) return nested;
    }

    if (error instanceof Error && error.message.trim()) {
        return error.message;
    }

    return "Beklenmeyen bir hata oluştu.";
}

export function formatMoney(amountMinor?: number, currency?: string) {
    if (amountMinor === undefined || amountMinor === null || currency === undefined || currency === null) {
        return '-';
    }

    try {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency,
        }).format(amountMinor / 100);
    } catch {
        return `${(amountMinor / 100).toFixed(2)} ${currency}`;
    }
}

/**
 * BO/BE packages use ISO-4217 currency codes (`^[A-Z]{3}$`) with 2 fraction digits
 * for display/input conversion (TRY and other common 2-decimal currencies).
 * Do not apply *100 blindly for exotic fraction-digit currencies — BE Money is
 * integer amountMinor + 3-letter currency without per-currency exponent metadata.
 */
/** Convert major decimal string/number to minor integer (e.g. 199,90 TRY → 19990). */
export function toAmountMinor(major: string | number | undefined | null): number | undefined {
    const parsed = parseMoneyInput(major === undefined || major === null ? null : String(major));
    return parsed.kind === 'valid' ? parsed.amountMinor : undefined;
}

export function fromAmountMinor(amountMinor?: number | null): string {
    return formatMoneyInput(amountMinor);
}

/** Allows only same-origin relative paths for post-login navigation. */
export function resolveSafeInternalPath(callbackUrl?: string | null): string | null {
    if (!callbackUrl) {
        return null;
    }

    const trimmed = callbackUrl.trim();
    if (!trimmed) {
        return null;
    }

    if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.includes('\\')) {
        return trimmed;
    }

    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const url = new URL(trimmed, window.location.origin);
        if (url.origin !== window.location.origin) {
            return null;
        }
        return `${url.pathname}${url.search}${url.hash}`;
    } catch {
        return null;
    }
}
