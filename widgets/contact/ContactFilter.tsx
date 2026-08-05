import { Col, Form, Row } from 'react-bootstrap';
import { EntityStatusEnum } from '@/models/enums';
import { useFormik } from 'formik';
import PrepareOption, { OptionTypes } from '@/components/PrepareOption';
import { appendOperator } from '@/helpers/HelperUtils';

export type IContactFilterForm = {
    status?: EntityStatusEnum;
    name?: string;
    message?: string;
    email?: string;
    phoneNumber?: string;
}

const initialValues: IContactFilterForm = { status: EntityStatusEnum.ACTIVE };

type IProps = {
    onFilter: (values: string) => void
}

export default function ContactFilter({ onFilter }: IProps) {

    const formik = useFormik({
        initialValues,
        onSubmit: values => {
            let filter = '';
            if (values.name && (values.name.trim() as string) !== '') {
                filter = appendOperator(filter, `name=='*${values.name.trim()}*'`)
            }
            if (values.message && (values.message.trim() as string) !== '') {
                filter = appendOperator(filter, `message=='*${values.message.trim()}*'`)
            }
            if (values.email && (values.email.trim() as string) !== '') {
                filter = appendOperator(filter, `email=='*${values.email.trim()}*'`)
            }
            if (values.phoneNumber && (values.phoneNumber.trim() as string) !== '') {
                filter = appendOperator(filter, `phoneNumber=='*${values.phoneNumber.trim()}*'`)
            }
            if (values.status && (values.status as string) !== '') {
                filter = appendOperator(filter, `status==${values.status}`)
            }
            onFilter(filter)
        },
    });



    return <Form noValidate onSubmit={formik.handleSubmit}>
        <Row>
            <Form.Group as={Col} md={2} className={'mb-3'}>
                <Form.Control
                    name="name"
                    onChange={(e) => {
                        formik.handleChange(e)
                        formik.submitForm()
                    }}
                    value={formik.values.name}
                    placeholder={'Ad Soyad'}
                />
            </Form.Group>
            <Form.Group as={Col} md={2} className={'mb-3'}>
                <Form.Control
                    name="message"
                    onChange={(e) => {
                        formik.handleChange(e)
                        formik.submitForm()
                    }}
                    value={formik.values.message}
                    placeholder={'Mesaj'}
                />
            </Form.Group>
            <Form.Group as={Col} md={2} className={'mb-3'}>
                <Form.Control
                    name="email"
                    onChange={(e) => {
                        formik.handleChange(e)
                        formik.submitForm()
                    }}
                    value={formik.values.email}
                    placeholder={'E-posta Adresi'}
                />
            </Form.Group>
            <Form.Group as={Col} md={2} className={'mb-3'}>
                <Form.Control
                    name="phoneNumber"
                    onChange={(e) => {
                        formik.handleChange(e)
                        formik.submitForm()
                    }}
                    value={formik.values.phoneNumber}
                    placeholder={'Telefon No'}
                />
            </Form.Group>
            <Form.Group as={Col} md={2} className={'mb-3'}>
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