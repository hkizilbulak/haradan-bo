import { Col, Form, Row } from 'react-bootstrap';
import { ModerationAdvertStatus } from '@/models';
import { useFormik } from 'formik';
import { appendOperator } from '@/helpers/HelperUtils';

export type IAdvertFilterForm = {
    status?: ModerationAdvertStatus;
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
                    <option value="">Tüm durumlar</option>
                    <option value="DRAFT">Taslak</option>
                    <option value="PENDING_REVIEW">İnceleme Bekliyor</option>
                    <option value="CHANGES_REQUESTED">Düzeltme İstendi</option>
                    <option value="PUBLISHED">Yayınlandı</option>
                    <option value="REJECTED">Reddedildi</option>
                    <option value="SUSPENDED">Askıya Alındı</option>
                    <option value="SOLD">Satıldı</option>
                    <option value="ARCHIVED">Arşivlendi</option>
                </Form.Select>
            </Form.Group>
        </Row>
    </Form>
}
