import { Col, Modal, Form, Button, Row } from 'react-bootstrap';
import FormTextField from '@/components/FormTextField';
import { EntityStatusEnum, PropertyTypeEnum } from '@/models/enums';
import FormSelectField from '@/components/FormSelectField';
import { Formik } from 'formik';
import * as Yup from 'yup';
import PrepareOption, { OptionTypes } from '@/components/PrepareOption';
import { copyMatchingKeyValues } from '@/helpers/HelperUtils';
import { PropertyRequest, PropertyResponse } from '@/models';

const initialValues: PropertyRequest = {
    identifier: '',
    name: '',
    categoryId: '',
    parentId: '',
    mandatory: false,
    searchParam: false,
    orderId: 0,
    type: PropertyTypeEnum.TEXT,
    status: EntityStatusEnum.ACTIVE,
};

type IProps = {
    selectedProperty?: PropertyResponse;
    show: boolean;
    onHandleClose: () => void;
    onHandleSave: (value: PropertyRequest) => void;

}

export default function PropertyModal({ selectedProperty, show = false, onHandleClose, onHandleSave }: IProps) {


    const validationSchema = Yup.object().shape({
        name: Yup.string()
            .required('Başlık zorunludur'),
        type: Yup.string()
            .required('Tür zorunludur'),
        status: Yup.string()
            .required('Statü zorunludur')
    });

    const handleSubmit = async (values: PropertyRequest) => {
        onHandleSave(values)
    }

    if (!show) return null

    const isNew = !selectedProperty?.identifier;
    const initialValuesCopy = Object.assign({}, initialValues);
    const property = isNew ? initialValues : copyMatchingKeyValues(initialValuesCopy, selectedProperty);

    return (
        <Modal show={show} onHide={onHandleClose} size="lg">
            <Formik
                initialValues={property}
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
            >
                {({ handleSubmit,
                    isValid,
                    isSubmitting }) => {

                    return <Form noValidate onSubmit={handleSubmit}>
                        <Modal.Header closeButton>
                            <Modal.Title>{isNew ? "Yeni Özellik Ekle" : "Özellik Düzenle"}</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            <Row>
                                <FormTextField
                                    as={Col}
                                    md={6}
                                    controlId="validationName"
                                    label="Ad"
                                    type="text"
                                    name="name"
                                />
                                <FormSelectField
                                    as={Col}
                                    md={6}
                                    controlId="validationType"
                                    label="Tip"
                                    type="select"
                                    name="type"
                                >
                                    <PrepareOption enumType={OptionTypes.PROPERTY_TYPE_OPTION} />
                                </FormSelectField>
                            </Row>
                            <Row>
                                <FormTextField
                                    as={Col}
                                    md={6}
                                    controlId="validationCategory"
                                    label="Kategori"
                                    type="text"
                                    name="categoryId"
                                />
                                <FormTextField
                                    as={Col}
                                    md={6}
                                    controlId="validationParent"
                                    label="Parent"
                                    type="text"
                                    name="parentId"
                                />
                            </Row>
                            <Row>
                                <FormSelectField
                                    as={Col}
                                    md={6}
                                    controlId="validationMandatory"
                                    label="Zorunlu Mu"
                                    type="select"
                                    name="mandatory"
                                >
                                    <PrepareOption enumType={OptionTypes.YES_NO_OPTION} />
                                </FormSelectField>
                                <FormSelectField
                                    as={Col}
                                    md={6}
                                    controlId="validationSearchParam"
                                    label="Aramada Görünecek Mi"
                                    type="select"
                                    name="searchParam"
                                >
                                    <PrepareOption enumType={OptionTypes.YES_NO_OPTION} />
                                </FormSelectField>
                            </Row>
                            <Row>
                                <FormTextField
                                    as={Col}
                                    md={6}
                                    controlId="validationOrderId"
                                    label="Sıra No"
                                    type="text"
                                    name="orderId"
                                />
                                <FormSelectField
                                    as={Col}
                                    md={6}
                                    controlId="validationStatu"
                                    label="Statü"
                                    type="text"
                                    name="status"
                                >
                                    <PrepareOption enumType={OptionTypes.ENTITY_STATUS_OPTION} />
                                </FormSelectField>
                            </Row>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={onHandleClose}>
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