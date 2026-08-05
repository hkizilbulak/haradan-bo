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
    disabled?: boolean;
}

const FormTextField = ({
    as,
    md,
    controlId,
    label,
    name,
    type,
    inputGroupPrepend,
    disabled = false,
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
                            <Form.Control
                                {...field}
                                type={type}
                                disabled={disabled}
                                isInvalid={isInvalid}
                            />
                            <Form.Control.Feedback type="invalid">
                                {form.errors[field.name]}
                            </Form.Control.Feedback>
                        </InputGroup>
                    </Form.Group>
                );
            }}
        </Field>
    );
};

export default FormTextField;