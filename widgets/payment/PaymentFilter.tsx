import { Col, Form, Row } from 'react-bootstrap';
import { EntityStatusEnum } from '@/models/enums';
import { useFormik } from 'formik';
import PrepareOption, { OptionTypes } from '@/components/PrepareOption';
import { appendOperator } from '@/helpers/HelperUtils';

export type IPaymentFilterForm = {
    status?: EntityStatusEnum;
    productId?: string;
    userName?: string;
    userEmail?: string;
}

const initialValues: IPaymentFilterForm = {};

type IProps = {
    onFilter: (values: string) => void
}

export default function PaymentFilter({ onFilter }: IProps) {

    const formik = useFormik({
        initialValues,
        onSubmit: values => {
            let filter = '';
            if (values.productId && (values.productId.trim() as string) !== '') {
                filter = appendOperator(filter, `productId=='*${values.productId.trim()}*'`)
            }
            if (values.userName && (values.userName.trim() as string) !== '') {
                filter = appendOperator(filter, `userName=='*${values.userName.trim()}*'`)
            }
            if (values.userEmail && (values.userEmail.trim() as string) !== '') {
                filter = appendOperator(filter, `userEmail=='*${values.userEmail.trim()}*'`)
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
                <Form.Control
                    name="productId"
                    onChange={(e) => {
                        formik.handleChange(e)
                        formik.submitForm()
                    }}
                    value={formik.initialValues.productId}
                    placeholder={'İlan ID'}
                />
            </Form.Group>
            <Form.Group as={Col} md={3} className={'mb-3'}>
                <Form.Control
                    name="userName"
                    onChange={(e) => {
                        formik.handleChange(e)
                        formik.submitForm()
                    }}
                    value={formik.initialValues.userName}
                    placeholder={'Ad Soyad'}
                />
            </Form.Group>
            <Form.Group as={Col} md={3} className={'mb-3'}>
                <Form.Control
                    name="userEmail"
                    onChange={(e) => {
                        formik.handleChange(e)
                        formik.submitForm()
                    }}
                    value={formik.initialValues.userEmail}
                    placeholder={'E-posta Adresi'}
                />
            </Form.Group>
            <Form.Group as={Col} md={3} className={'mb-3'}>
                <Form.Select
                    name="status"
                    onChange={(e) => {
                        formik.handleChange(e)
                        formik.submitForm()
                    }}
                    value={formik.initialValues.status}
                >
                    <PrepareOption enumType={OptionTypes.ENTITY_STATUS_OPTION} />
                </Form.Select>
            </Form.Group>

        </Row>
    </Form>
}