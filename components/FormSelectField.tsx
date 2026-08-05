import React from "react";
import { Form, InputGroup, Col } from "react-bootstrap";
import { Field } from "formik";

type IProps = {
    as?: typeof Col;
    md?: number;
    controlId?: string;
    label?: string;
    name: string;
    type?: string;
    inputGroupPrepend?: boolean;
    children: React.JSX.Element;
    handleChange?: (e: React.ChangeEvent<any>) => void
}

const FormSelectField = ({
    as,
    md,
    controlId,
    label,
    name,
    inputGroupPrepend,
    children,
    handleChange
}: IProps) => {
    return (
        <Field name={name}>
            {({ field, form }: FieldProps) => {
                const isInvalid = form.touched[field.name] && form.errors[field.name];
                return (
                    <Form.Group as={as} md={md} controlId={controlId} className={`mb-3`}>
                        {label && <Form.Label>{label}</Form.Label>}
                        <InputGroup>
                            {inputGroupPrepend}
                            {handleChange &&
                                <Form.Select
                                    {...field}
                                    isInvalid={isInvalid}
                                    onChange={handleChange}
                                >
                                    {children}
                                </Form.Select>}
                            {!handleChange &&
                                <Form.Select
                                    {...field}
                                    isInvalid={isInvalid}
                                >
                                    {children}
                                </Form.Select>}
                            <Form.Control.Feedback type="invalid">
                                {form.errors[field.name]}
                            </Form.Control.Feedback>
                        </InputGroup>
                    </Form.Group>
                );
            }}
        </Field >
    );
};

export default FormSelectField;