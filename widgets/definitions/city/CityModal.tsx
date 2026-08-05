import { Col, Modal, Form, Button, Row } from 'react-bootstrap';
import FormTextField from '@/components/FormTextField';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { copyMatchingKeyValues } from '@/helpers/HelperUtils';
import { CityRequest, CityResponse } from '@/models';

const initialValues: CityRequest = {
    identifier: '',
    name: '',
    cityCode: '',
    countryCode: 'TR'
};

type IProps = {
    selectedCity?: CityResponse;
    onClose: () => void;
    onHandleSave: (value: CityRequest) => void;

}

export default function CityModal({ selectedCity, onClose, onHandleSave }: IProps) {


    const validationSchema = Yup.object().shape({
        cityCode: Yup.string()
            .required('İl Kodu zorunludur'),
        name: Yup.string()
            .required('İl Adı zorunludur'),
        countryCode: Yup.string()
            .required('Ülke Kodu zorunludur'),
    });

    const handleSubmit = async (values: CityRequest) => {
        onHandleSave(values)
    }

    const isNew = !selectedCity?.identifier;
    const initialValuesCopy = Object.assign({}, initialValues);
    const city = isNew ? initialValues : copyMatchingKeyValues(initialValuesCopy, selectedCity);

    return (
        <Modal show={true} onHide={onClose} size="lg">
            <Formik
                initialValues={city}
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
            >
                {({ handleSubmit,
                    isValid,
                    isSubmitting }) => {

                    return <Form noValidate onSubmit={handleSubmit}>
                        <Modal.Header closeButton>
                            <Modal.Title>{isNew ? "Yeni İl Ekle" : "İl Düzenle"}</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            {!isNew && <Row>
                                <FormTextField
                                    as={Col}
                                    md={12}
                                    disabled={true}
                                    label="ID"
                                    type="text"
                                    name="identifier"
                                /></Row>}
                            <Row>
                                <FormTextField
                                    as={Col}
                                    md={4}
                                    controlId="validationCityCode"
                                    label="İl Kodu"
                                    type="text"
                                    name="cityCode"
                                />
                                <FormTextField
                                    as={Col}
                                    md={4}
                                    controlId="validationName"
                                    label="İl Adı"
                                    type="text"
                                    name="name"
                                />
                                <FormTextField
                                    as={Col}
                                    md={4}
                                    controlId="validationCountryCode"
                                    label="Ülke Kodu"
                                    type="text"
                                    name="countryCode"
                                />
                            </Row>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={onClose}>
                                Kapat
                            </Button>
                            <Button
                                disabled={!isValid || isSubmitting}
                                variant="primary"
                                as="input"
                                type="submit"
                                value={isNew ? "Ekle" : "Güncelle"}
                            />
                        </Modal.Footer>
                    </Form>
                }}
            </Formik>
        </Modal>
    );
}