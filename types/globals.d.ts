export { }

declare global {
    interface ISearchParams {
        [key: string]: string | string[] | undefined
    }

    interface IMenuProps {
        id: string;
        title?: string;
        name?: string;
        icon?: string;
        link?: string;
        grouptitle?: boolean;
        children?: IMenuProps[];
        badge?: string;
        badgecolor?: string;
    }

    interface FieldProps<V = any> {
        field: FieldInputProps<V>;
        form: FormikProps<V>;
        meta: FieldMetaProps<V>;
    }
}