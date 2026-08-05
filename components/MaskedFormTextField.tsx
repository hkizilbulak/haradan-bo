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
    inputAs?: any;
    format?: string;
    mask?: string;
    allowEmptyFormatting?: boolean;
}

const MaskedFormTextField = ({
    as,
    md,
    controlId,
    label,
    name,
    type,
    inputGroupPrepend,
    disabled = false,
    inputAs,
    format = "0(###) ### ####",
    mask = " ",
    allowEmptyFormatting = true,
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
                                as={inputAs}
                                mask={mask}
                                format={format}
                                allowEmptyFormatting={allowEmptyFormatting}
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

export default MaskedFormTextField;