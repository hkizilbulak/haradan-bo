import { Col, Modal, Form, Button, Row } from 'react-bootstrap';
import FormTextField from '@/components/FormTextField';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { copyMatchingKeyValues } from '@/helpers/HelperUtils';
import { DistrictRequest, DistrictResponse } from '@/models';
import { CityResponse } from '@/models/response/city-response.model';
import FormSelectField from '@/components/FormSelectField';

const initialValues: DistrictRequest = {
    identifier: '',
    name: '',
    cityId: '',
    districtCode: '',
};

type IProps = {
    cities: CityResponse[];
    selectedDistrict?: DistrictResponse;
    onClose: () => void;
    onHandleSave: (value: DistrictRequest) => void;

}

export default function DistrictModal({ cities = [], selectedDistrict, onClose, onHandleSave }: IProps) {


    const validationSchema = Yup.object().shape({
        districtCode: Yup.string()
            .required('İlçe Kodu zorunludur'),
        name: Yup.string()
            .required('İlçe Adı zorunludur'),
        cityId: Yup.string()
            .required('İl zorunludur'),
    });

    const handleSubmit = async (values: DistrictRequest) => {
        onHandleSave(values)
    }

    const isNew = !selectedDistrict?.identifier;
    const initialValuesCopy = Object.assign({}, initialValues);
    const district = isNew ? initialValues : { ...copyMatchingKeyValues(initialValuesCopy, selectedDistrict), cityId: selectedDistrict.city.identifier };

    return (
        <Modal show={true} onHide={onClose} size="lg">
            <Formik
                initialValues={district}
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
            >
                {({ handleSubmit,
                    isValid,
                    isSubmitting }) => {

                    return <Form noValidate onSubmit={handleSubmit}>
                        <Modal.Header closeButton>
                            <Modal.Title>{isNew ? "Yeni İlçe Ekle" : "İlçe Düzenle"}</Modal.Title>
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
                                    controlId="validationDistrictCode"
                                    label="İlçe Kodu"
                                    type="text"
                                    name="districtCode"
                                />
                                <FormTextField
                                    as={Col}
                                    md={4}
                                    controlId="validationName"
                                    label="İlçe Adı"
                                    type="text"
                                    name="name"
                                />
                                <FormSelectField
                                    as={Col}
                                    md={4}
                                    controlId="validationCity"
                                    label="İl"
                                    type="select"
                                    name="cityId"
                                >
                                    <>
                                        <option key={0} value={''}>{'İl Seçiniz'}</option>
                                        {cities?.map((city: CityResponse) => {
                                            return <option key={city.identifier} value={city.identifier}>{city.name}</option>
                                        })}
                                    </>
                                </FormSelectField>
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