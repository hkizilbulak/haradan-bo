import { Col, Form, Row } from 'react-bootstrap';
import { BannerTypeEnum, EntityStatusEnum } from '@/models/enums';
import { useFormik } from 'formik';
import PrepareOption, { OptionTypes } from '@/components/PrepareOption';
import { appendOperator } from '@/helpers/HelperUtils';

export type IBannerFilterForm = {
    type?: BannerTypeEnum;
    status?: EntityStatusEnum;
}

const initialValues: IBannerFilterForm = { status: EntityStatusEnum.ACTIVE };

type IProps = {
    onFilter: (values: string) => void
}

export default function BannerFilter({ onFilter }: IProps) {

    const formik = useFormik({
        initialValues,
        onSubmit: values => {
            let filter = '';
            if (values.type && (values.type as string) !== '') {
                filter = appendOperator(filter, `type==${values.type}`);
            }

            if (values.status && (values.status as string) !== '') {
                filter = appendOperator(filter, `status==${values.status}`)
            }
            onFilter(filter)
        },
    });



    return <Form noValidate onSubmit={formik.handleSubmit}>
        <Row>
            <Form.Group as={Col} md={3} className={'mb-3'}>
                <Form.Select
                    name="type"
                    onChange={(e) => {
                        formik.handleChange(e)
                        formik.submitForm()
                    }}
                    value={formik.values.type}
                >
                    <PrepareOption enumType={OptionTypes.BANNER_TYPE_OPTION} />
                </Form.Select>
            </Form.Group>
            <Form.Group as={Col} md={3} className={'mb-3'}>
                <Form.Select
                    name="status"
                    onChange={(e) => {
                        formik.handleChange(e)
                        formik.submitForm()
                    }}
                    value={formik.values.status}
                >
                    <PrepareOption enumType={OptionTypes.ENTITY_STATUS_OPTION} />
                </Form.Select>
            </Form.Group>
        </Row>
    </Form>
}