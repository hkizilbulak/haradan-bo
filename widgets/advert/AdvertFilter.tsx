import { Col, Form, Row } from 'react-bootstrap';
import { EntityStatusEnum } from '@/models/enums';
import { useFormik } from 'formik';
import PrepareOption, { OptionTypes } from '@/components/PrepareOption';
import { appendOperator } from '@/helpers/HelperUtils';

export type IAdvertFilterForm = {
    status?: EntityStatusEnum;
}

const initialValues: IAdvertFilterForm = {};

type IProps = {
    onFilter: (values: string) => void
}

export default function AdvertFilter({ onFilter }: IProps) {

    const formik = useFormik({
        initialValues,
        onSubmit: values => {
            let filter = '';

            if (values.status && (values.status as string) !== '') {
                filter = appendOperator(filter, `status==${values.status}`)
            }
            onFilter(filter)
        },
    });

    return <Form noValidate onSubmit={formik.handleSubmit} className={'mb-3'}>
        <Row>
            <Form.Group as={Col} md={3}>
                <Form.Select
                    name="status"
                    onChange={(e) => {
                        formik.handleChange(e)
                        formik.submitForm()
                    }}
                    value={formik.values.status || ''}
                >
                    <PrepareOption enumType={OptionTypes.ENTITY_STATUS_OPTION} />
                </Form.Select>
            </Form.Group>
        </Row>
    </Form>
}
