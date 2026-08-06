import { Col, Form, Row } from 'react-bootstrap';
import { useFormik } from 'formik';
import { appendOperator } from '@/helpers/HelperUtils';

export type IBannerFilterForm = {
  placement?: 'HOMEPAGE' | 'LISTING_DETAIL' | 'SEARCH';
  status?: 'ACTIVE' | 'INACTIVE';
}

const initialValues: IBannerFilterForm = { status: 'ACTIVE' };

type IProps = {
  onFilter: (values: string) => void;
}

export default function BannerFilter({ onFilter }: IProps) {
  const formik = useFormik({
    initialValues,
    onSubmit: values => {
      let filter = '';

      if (values.placement) {
        filter = appendOperator(filter, `placement==${values.placement}`);
      }

      if (values.status) {
        filter = appendOperator(filter, `status==${values.status}`);
      }

      onFilter(filter);
    },
  });

  return (
    <Form noValidate onSubmit={formik.handleSubmit}>
      <Row>
        <Form.Group as={Col} md={6} className={'mb-3'}>
          <Form.Select
            name="placement"
            onChange={(e) => {
              formik.handleChange(e);
              formik.submitForm();
            }}
            value={formik.values.placement ?? ''}
          >
            <option value="">Yerleşim</option>
            <option value="HOMEPAGE">Ana Sayfa</option>
            <option value="LISTING_DETAIL">İlan Detay</option>
            <option value="SEARCH">Arama</option>
          </Form.Select>
        </Form.Group>
        <Form.Group as={Col} md={6} className={'mb-3'}>
          <Form.Select
            name="status"
            onChange={(e) => {
              formik.handleChange(e);
              formik.submitForm();
            }}
            value={formik.values.status ?? ''}
          >
            <option value="">Durum</option>
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Pasif</option>
          </Form.Select>
        </Form.Group>
      </Row>
    </Form>
  );
}
