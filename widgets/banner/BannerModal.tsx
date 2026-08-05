import { Col, Form, Button, Offcanvas } from 'react-bootstrap';
import FormTextField from '@/components/FormTextField';
import { BannerTypeEnum, EntityStatusEnum } from '@/models/enums';
import FormSelectField from '@/components/FormSelectField';
import { formatDate, getTodayArr } from '@/helpers/DateUtils';
import { Formik } from 'formik';
import * as Yup from 'yup';
import PrepareOption, { OptionTypes } from '@/components/PrepareOption';
import { copyMatchingKeyValues } from '@/helpers/HelperUtils';
import { BannerRequest, BannerResponse } from '@/models';

const initialValues: BannerRequest = {
    identifier: '',
    description: '',
    type: BannerTypeEnum.CORPORATE_ADVERT,
    startDate: getTodayArr(),
    endDate: getTodayArr(),
    name: '',
    orderId: 0,
    price: 0,
    status: EntityStatusEnum.ACTIVE,
    url: ''
};

type IProps = {
    selectedBanner?: BannerResponse;
    onClose: () => void;
    onHandleSave: (value: BannerRequest) => void;

}

export default function BannerModal({ selectedBanner, onClose, onHandleSave }: IProps) {


    const validationSchema = Yup.object().shape({
        name: Yup.string()
            .required('Başlık zorunludur'),
        type: Yup.string()
            .required('Tür zorunludur'),
        startDate: Yup.string()
            .required('Başlangıç tarihi zorunludur'),
        endDate: Yup.string()
            .required('Bitiş tarihi zorunludur'),
        orderId: Yup.string()
            .required('Sıra no zorunludur'),
        price: Yup.string()
            .required('Fiyat zorunludur'),
        status: Yup.string()
            .required('Statü zorunludur')
    });

    const handleSubmit = async (values: BannerRequest) => {
        onHandleSave(values)
    }

    const isNew = !selectedBanner?.identifier;
    const initialValuesCopy = Object.assign({}, initialValues);
    let banner = isNew ? initialValues : copyMatchingKeyValues(initialValuesCopy, selectedBanner);
    banner = { ...banner, startDate: formatDate(banner.startDate), endDate: formatDate(banner.endDate) }

    return (
        <Offcanvas show={true} onHide={onClose} scroll={true} placement={'end'}>
            <Offcanvas.Header closeButton>
                <Offcanvas.Title>{isNew ? "Yeni Banner Ekle" : "Banner Düzenle"}</Offcanvas.Title>
            </Offcanvas.Header>
            <Offcanvas.Body>
                <Formik
                    initialValues={banner}
                    validationSchema={validationSchema}
                    onSubmit={handleSubmit}
                >
                    {({ handleSubmit,
                        isValid,
                        isSubmitting,
                    }) => {

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
                                label="Başlık"
                                type="text"
                                name="name"
                            />
                            <FormSelectField
                                as={Col}
                                md={12}
                                controlId="validationType"
                                label="Tür"
                                type="select"
                                name="type"
                            >
                                <PrepareOption enumType={OptionTypes.BANNER_TYPE_OPTION} />
                            </FormSelectField>

                            <FormTextField
                                as={Col}
                                md={12}
                                controlId="validationStartDate"
                                label="Başlangıç Tarihi"
                                type="date"
                                name="startDate"
                            />
                            <FormTextField
                                as={Col}
                                md={12}
                                controlId="validationEndDate"
                                label="Bitiş Tarihi"
                                type="date"
                                name="endDate"
                            />
                            <FormTextField
                                as={Col}
                                md={12}
                                controlId="validationOrderNo"
                                label="Sıra"
                                type="number"
                                name="orderId"
                            />
                            <FormTextField
                                as={Col}
                                md={12}
                                controlId="validationPrice"
                                label="Fiyat"
                                type="number"
                                name="price"
                            />

                            <FormTextField
                                as={Col}
                                md={12}
                                controlId="validationUrl"
                                label="Bağlantı Adresi"
                                type="text"
                                name="url"
                            />
                            <FormSelectField
                                as={Col}
                                md={12}
                                controlId="validationStatu"
                                label="Statü"
                                type="text"
                                name="status"
                            >
                                <PrepareOption enumType={OptionTypes.ENTITY_STATUS_OPTION} />
                            </FormSelectField>

                            <FormTextField
                                as={Col}
                                md={12}
                                controlId="validationDescription"
                                label="Açıklama"
                                type="text"
                                name="description"
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
        </Offcanvas>);
}