import { Error } from "@/models/common";
import { AxiosError } from 'axios';

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

export function getErrorMessage(error: any): string {
    const axiosError = (error as AxiosError<Error | { message?: string }>);
    if (axiosError.response?.status === 502) {
        return "Backend servisine erişilemiyor (502 Bad Gateway). Lütfen backend uygulamasının (haradan-be) çalıştığından emin olun.";
    }
    const errorData = (axiosError.response?.data as any);
    if (errorData !== undefined && errorData !== null) {
        if (errorData.errorMessage) return errorData.errorMessage;
        if (errorData.message) return errorData.message;
    }
    return "Beklenmeyen hata oluştu: " + (axiosError.message || "Bilinmeyen hata");
}

export function formatMoney(amountMinor?: number, currency?: string) {
    if (amountMinor === undefined || amountMinor === null || currency === undefined || currency === null) {
        return '-';
    }

    return `${(amountMinor / 100).toFixed(2)} ${currency}`;
}