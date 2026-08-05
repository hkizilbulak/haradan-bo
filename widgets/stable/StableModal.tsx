import { Col, Modal, Form, Button, Row, Offcanvas } from 'react-bootstrap';
import FormTextField from '@/components/FormTextField';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { copyMatchingKeyValues } from '@/helpers/HelperUtils';
import { StableRequest, StableResponse } from '@/models';
import { PatternFormat } from 'react-number-format';
import MaskedFormTextField from '@/components/MaskedFormTextField';

const initialValues: StableRequest = {
    identifier: '',
    name: '',
    phoneNumber: '',
    email: '',
    webpage: '',
    contactName: '',
    address: '',
    note: '',
};

type IProps = {
    selectedStable?: StableResponse;
    onClose: () => void;
    onHandleSave: (value: StableRequest) => void;

}

export default function StableModal({ selectedStable, onClose, onHandleSave }: IProps) {


    const validationSchema = Yup.object().shape({
        name: Yup.string()
            .required('Hara adı zorunludur')
    });

    const handleSubmit = async (values: StableRequest) => {
        onHandleSave(values)
    }

    const isNew = !selectedStable?.identifier;
    const initialValuesCopy = Object.assign({}, initialValues);
    const stable = isNew ? initialValues : copyMatchingKeyValues(initialValuesCopy, selectedStable);

    return (
        <Offcanvas show={true} onHide={onClose} scroll={true} placement={'end'}>
            <Offcanvas.Header closeButton>
                <Offcanvas.Title>{isNew ? "Yeni Hara Ekle" : "Hara Düzenle"}</Offcanvas.Title>
            </Offcanvas.Header>
            <Offcanvas.Body>
                <Formik
                    initialValues={stable}
                    validationSchema={validationSchema}
                    onSubmit={handleSubmit}
                >
                    {({ handleSubmit,
                        isValid,
                        isSubmitting }) => {

                        return <Form noValidate onSubmit={handleSubmit}>
                            {!isNew &&
                                <FormTextField
                                    as={Col}
                                    md={12}
                                    disabled={true}
                                    label="ID"
                                    type="text"
                                    name="identifier"
                                />}

                            <FormTextField
                                as={Col}
                                md={12}
                                controlId="validationName"
                                label="Hara Adı"
                                type="text"
                                name="name"
                            />
                            <FormTextField
                                as={Col}
                                md={12}
                                controlId="validationContactName"
                                label="Sorumlu Kişi"
                                type="text"
                                name="contactName"
                            />
                            <MaskedFormTextField
                                as={Col}
                                md={12}
                                controlId="validationPhoneNumber"
                                label="Telefon No"
                                type="text"
                                name="phoneNumber"
                                inputAs={PatternFormat}
                            />
                            <FormTextField
                                as={Col}
                                md={12}
                                controlId="validationEmail"
                                label="E-posta Adresi"
                                type="text"
                                name="email"
                            />
                            <FormTextField
                                as={Col}
                                md={12}
                                controlId="validationWebPage"
                                label="Web Sitesi"
                                type="text"
                                name="webpage"
                            />
                            <FormTextField
                                as={Col}
                                md={12}
                                controlId="validationAdres"
                                label="Adres"
                                type="text"
                                name="address"
                            />
                            <FormTextField
                                as={Col}
                                md={12}
                                controlId="validationNote"
                                label="Notlar"
                                type="text"
                                name="note"
                            />
                            <Button
                                disabled={!isValid || isSubmitting}
                                variant="primary"
                                as="input"
                                type="submit"
                                value={isNew ? "Ekle" : "Güncelle"}
                            />
                        </Form>
                    }}
                </Formik>
            </Offcanvas.Body>
        </Offcanvas>
    );
}