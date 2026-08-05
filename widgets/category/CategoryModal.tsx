import { Col, Modal, Form, Button, Row } from 'react-bootstrap';
import FormTextField from '@/components/FormTextField';
import { EntityStatusEnum } from '@/models/enums';
import FormSelectField from '@/components/FormSelectField';
import { Formik } from 'formik';
import * as Yup from 'yup';
import PrepareOption, { OptionTypes } from '@/components/PrepareOption';
import { copyMatchingKeyValues } from '@/helpers/HelperUtils';
import { CategoryRequest, CategoryResponse } from '@/models';

const initialValues: CategoryRequest = {
    identifier: '',
    name: '',
    parentId: '',
    orderId: 0,
    price: 0,
    status: EntityStatusEnum.ACTIVE,
};

type IProps = {
    selectedCategory?: CategoryResponse;
    show: boolean;
    onHandleClose: () => void;
    onHandleSave: (value: CategoryRequest) => void;

}

export default function CategoryModal({ selectedCategory, show = false, onHandleClose, onHandleSave }: IProps) {


    const validationSchema = Yup.object().shape({
        name: Yup.string()
            .required('Başlık zorunludur'),
        status: Yup.string()
            .required('Statü zorunludur')
    });

    const handleSubmit = async (values: CategoryRequest) => {
        onHandleSave(values)
    }

    if (!show) return null

    const isNew = !selectedCategory?.identifier;
    const initialValuesCopy = Object.assign({}, initialValues);
    const category = isNew ? initialValues : copyMatchingKeyValues(initialValuesCopy, selectedCategory);

    return (
        <Modal show={show} onHide={onHandleClose} size="lg">
            <Formik
                initialValues={category}
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
            >
                {({ handleSubmit,
                    isValid,
                    isSubmitting }) => {

                    return <Form noValidate onSubmit={handleSubmit}>
                        <Modal.Header closeButton>
                            <Modal.Title>{isNew ? "Yeni Kategori Ekle" : "Kategori Düzenle"}</Modal.Title>
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
                                <FormTextField
                                    as={Col}
                                    md={6}
                                    controlId="validationParentId"
                                    label="Üst Kategori"
                                    type="text"
                                    name="parentId"
                                />
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
                                <FormTextField
                                    as={Col}
                                    md={6}
                                    controlId="validationPrice"
                                    label="Kategori Ücreti"
                                    type="text"
                                    name="price"
                                />
                            </Row>
                            <Row>
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