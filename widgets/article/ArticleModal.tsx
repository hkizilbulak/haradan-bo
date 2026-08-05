import { Col, Modal, Form, Button, Row } from 'react-bootstrap';
import FormTextField from '@/components/FormTextField';
import { ArticleTypeEnum, EntityStatusEnum } from '@/models/enums';
import FormSelectField from '@/components/FormSelectField';
import { Formik } from 'formik';
import * as Yup from 'yup';
import PrepareOption, { OptionTypes } from '@/components/PrepareOption';
import { copyMatchingKeyValues } from '@/helpers/HelperUtils';
import { ArticleRequest, ArticleResponse } from '@/models';

const initialValues: ArticleRequest = {
    identifier: '',
    type: ArticleTypeEnum.CORPORATE_ADVERT,
    orderId: 0,
    status: EntityStatusEnum.ACTIVE,
    title: '',
    summary: '',
    article: ''
};

type IProps = {
    selectedArticle?: ArticleResponse;
    onClose: () => void;
    onHandleSave: (value: ArticleRequest) => void;

}

export default function ArticleModal({ selectedArticle, onClose, onHandleSave }: IProps) {


    const validationSchema = Yup.object().shape({
        title: Yup.string()
            .required('Başlık zorunludur'),
        type: Yup.string()
            .required('Tür zorunludur'),
        summary: Yup.string()
            .required('Başlangıç tarihi zorunludur'),
        status: Yup.string()
            .required('Statü zorunludur'),
        article: Yup.string()
            .required('Statü zorunludur')
    });

    const handleSubmit = async (values: ArticleRequest) => {
        onHandleSave(values)
    }

    const isNew = !selectedArticle?.identifier;
    const initialValuesCopy = Object.assign({}, initialValues);
    const article = isNew ? initialValues : copyMatchingKeyValues(initialValuesCopy, selectedArticle);

    return (
        <Modal show={true} onHide={onClose} size="lg">
            <Formik
                initialValues={article}
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
            >
                {({ handleSubmit,
                    isValid,
                    isSubmitting }) => {

                    return <Form noValidate onSubmit={handleSubmit}>
                        <Modal.Header closeButton>
                            <Modal.Title>{isNew ? "Yeni Yazı Ekle" : "Yazı Düzenle"}</Modal.Title>
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
                                    md={12}
                                    controlId="validationName"
                                    label="Başlık"
                                    type="text"
                                    name="title"
                                />
                            </Row>
                            <Row>
                                <FormTextField
                                    as={Col}
                                    md={12}
                                    controlId="validationSummary"
                                    label="Özet"
                                    type="text"
                                    name="summary"
                                />
                            </Row>
                            <Row>
                                <FormSelectField
                                    as={Col}
                                    md={4}
                                    controlId="validationType"
                                    label="Tür"
                                    type="select"
                                    name="type"
                                >
                                    <PrepareOption enumType={OptionTypes.ARTICLE_TYPE_OPTION} />
                                </FormSelectField>
                                <FormSelectField
                                    as={Col}
                                    md={4}
                                    controlId="validationStatu"
                                    label="Statü"
                                    type="text"
                                    name="status"
                                >
                                    <PrepareOption enumType={OptionTypes.ENTITY_STATUS_OPTION} />
                                </FormSelectField>
                                <FormTextField
                                    as={Col}
                                    md={4}
                                    controlId="validationOrderId"
                                    label="Sıra"
                                    type="number"
                                    name="orderId"
                                />
                            </Row>
                            <Row>

                                <FormTextField
                                    as={Col}
                                    md={12}
                                    controlId="validationArticle"
                                    label="İçerik"
                                    type="text"
                                    name="article"
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
        </Modal >
    );
}