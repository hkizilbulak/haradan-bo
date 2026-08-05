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

export function getErrorMessage(error: any) {
    const axiosError = (error as AxiosError<Error>);
    const errorData = (axiosError.response?.data);
    if (errorData !== undefined && errorData !== null && errorData.errorCode !== undefined) {
        return errorData.errorMessage
    }
    return "Beklenmeyen hata oluştu: Hata : " + axiosError.message;
}