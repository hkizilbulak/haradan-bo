import { Col, Form, Row } from 'react-bootstrap';
import { useFormik } from 'formik';
import { appendOperator } from '@/helpers/HelperUtils';

export type CityFilter = {
    name?: string;
}

const initialValues: CityFilter = {};

type IProps = {
    onFilter: (values: string) => void
}

export default function CityFilter({ onFilter }: IProps) {

    const formik = useFormik({
        initialValues,
        onSubmit: values => {
            let filter = '';

            if (values.name && (values.name as string) !== '') {
                filter = appendOperator(filter, `name=='*${values.name.trim()}*'`)
            }
            onFilter(filter)
        },
    });



    return <Form noValidate onSubmit={formik.handleSubmit}>
        <Row>
            <Form.Group as={Col} md={3} className={'mb-3'}>
                <Form.Control
                    name="name"
                    onChange={(e) => {
                        formik.handleChange(e)
                        formik.submitForm()
                    }}
                    value={formik.initialValues.name}
                    placeholder={'İl Adı'}
                />
            </Form.Group>
        </Row>
    </Form>
}