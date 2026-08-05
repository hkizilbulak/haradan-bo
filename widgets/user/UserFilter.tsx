import { Col, Form, Row } from 'react-bootstrap';
import { useFormik } from 'formik';
import { appendOperator } from '@/helpers/HelperUtils';

export type IUserFilterForm = {
  q?: string;
  status?: 'ACTIVE' | 'CLOSED' | 'DISABLED';
  role?: 'admin' | 'user';
}

const initialValues: IUserFilterForm = { status: 'ACTIVE' };

type IProps = {
  onFilter: (values: string) => void;
}

export default function UserFilter({ onFilter }: IProps) {
  const formik = useFormik({
    initialValues,
    onSubmit: values => {
      let filter = '';

      if (values.q && values.q.trim() !== '') {
        filter = appendOperator(filter, `q==*${values.q.trim()}*`);
      }

      if (values.status && values.status !== '') {
        filter = appendOperator(filter, `status==${values.status}`);
      }

      if (values.role && values.role !== '') {
        filter = appendOperator(filter, `role==${values.role}`);
      }

      onFilter(filter);
    },
  });

  return (
    <Form noValidate onSubmit={formik.handleSubmit}>
      <Row>
        <Form.Group as={Col} md={4} className={'mb-3'}>
          <Form.Control
            name="q"
            onChange={(e) => {
              formik.handleChange(e);
              formik.submitForm();
            }}
            value={formik.values.q ?? ''}
            placeholder={'Ara'}
          />
        </Form.Group>
        <Form.Group as={Col} md={4} className={'mb-3'}>
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
            <option value="CLOSED">Kapalı</option>
            <option value="DISABLED">Pasif</option>
          </Form.Select>
        </Form.Group>
        <Form.Group as={Col} md={4} className={'mb-3'}>
          <Form.Select
            name="role"
            onChange={(e) => {
              formik.handleChange(e);
              formik.submitForm();
            }}
            value={formik.values.role ?? ''}
          >
            <option value="">Rol</option>
            <option value="admin">Yönetici</option>
            <option value="user">Kullanıcı</option>
          </Form.Select>
        </Form.Group>
      </Row>
    </Form>
  );
}
