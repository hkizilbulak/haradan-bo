import { Col, Form, Row } from 'react-bootstrap';
import { useFormik } from 'formik';
import { appendOperator } from '@/helpers/HelperUtils';
import { CityResponse } from '@/models/response/city-response.model';

export type DistrictFilter = {
    name?: string;
    cityId?: string;
}

const initialValues: DistrictFilter = {};

type IProps = {
    cities: CityResponse[];
    onFilter: (values: string) => void
}

export default function DistrictFilter({ cities = [], onFilter }: IProps) {

    const formik = useFormik({
        initialValues,
        onSubmit: values => {
            let filter = '';

            if (values.name && (values.name as string) !== '') {
                filter = appendOperator(filter, `name=='*${values.name.trim()}*'`)
            }
            if (values.cityId && (values.cityId as string) !== '') {
                filter = appendOperator(filter, `city.identifier==${values.cityId}`)
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
                    placeholder={'İlçe Adı'}
                />
            </Form.Group>
            <Form.Group as={Col} md={3} className={'mb-3'}>
                <Form.Select
                    name="cityId"
                    onChange={(e) => {
                        formik.handleChange(e)
                        formik.submitForm()
                    }}
                    value={formik.initialValues.cityId}
                >
                    <option key={0} value={''}>{'İl Seçiniz'}</option>
                    {cities?.map((city: CityResponse) => {
                        return <option key={city.identifier} value={city.identifier}>{city.name}</option>
                    })}
                </Form.Select>
            </Form.Group>
        </Row>
    </Form>
}