import { Col, Form, Row } from 'react-bootstrap';
import { ChannelTypeEnum, EntityStatusEnum } from '@/models/enums';
import { useFormik } from 'formik';
import PrepareOption, { OptionTypes } from '@/components/PrepareOption';
import { appendOperator } from '@/helpers/HelperUtils';

export type IUserFilterForm = {
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
    status?: EntityStatusEnum;
    channel?: ChannelTypeEnum;
}

const initialValues: IUserFilterForm = { status: EntityStatusEnum.ACTIVE };

type IProps = {
    onFilter: (values: string) => void
}

export default function UserFilter({ onFilter }: IProps) {

    const formik = useFormik({
        initialValues,
        onSubmit: values => {
            let filter = '';

            if (values.firstName && (values.firstName as string) !== '') {
                filter = appendOperator(filter, `firstName=='*${values.firstName.trim()}*'`)
            }


            if (values.lastName && (values.lastName as string) !== '') {
                filter = appendOperator(filter, `lastName=='*${values.lastName.trim()}*'`)
            }


            if (values.email && (values.email as string) !== '') {
                filter = appendOperator(filter, `email=='*${values.email.trim()}*'`)
            }


            if (values.phoneNumber && (values.phoneNumber as string) !== '') {
                filter = appendOperator(filter, `phoneNumber=='*${values.phoneNumber.trim()}*'`)
            }

            if (values.status && (values.status as string) !== '') {
                filter = appendOperator(filter, `status==${values.status}`)
            }

            if (values.channel && (values.channel as string) !== '') {
                filter = appendOperator(filter, `channel==${values.channel}`)
            }

            onFilter(filter)
        },
    });



    return <Form noValidate onSubmit={formik.handleSubmit}>
        <Row>
            <Form.Group as={Col} md={2} className={'mb-3'}>
                <Form.Control
                    name="firstName"
                    onChange={(e) => {
                        formik.handleChange(e)
                        formik.submitForm()
                    }}
                    value={formik.values.firstName}
                    placeholder={'Ad'}
                />
            </Form.Group>
            <Form.Group as={Col} md={2} className={'mb-3'}>
                <Form.Control
                    name="lastName"
                    onChange={(e) => {
                        formik.handleChange(e)
                        formik.submitForm()
                    }}
                    value={formik.values.lastName}
                    placeholder={'Soyad'}
                />
            </Form.Group>
            <Form.Group as={Col} md={2} className={'mb-3'}>
                <Form.Control
                    name="email"
                    onChange={(e) => {
                        formik.handleChange(e)
                        formik.submitForm()
                    }}
                    value={formik.initialValues.email}
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
            <Form.Group as={Col} md={2} className={'mb-3'}>
                <Form.Select
                    name="channel"
                    onChange={(e) => {
                        formik.handleChange(e)
                        formik.submitForm()
                    }}
                    value={formik.values.channel}
                >
                    <PrepareOption enumType={OptionTypes.CHANNEL_TYPE_OPTION} />
                </Form.Select>
            </Form.Group>
        </Row>
    </Form>
}