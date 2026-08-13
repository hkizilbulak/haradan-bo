import { Button, Card, Col, Form, Row } from 'react-bootstrap';
import { useFormik } from 'formik';
import { appendOperator } from '@/helpers/HelperUtils';

export type IUserFilterForm = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  status?: 'ACTIVE' | 'CLOSED' | 'DISABLED' | '';
  role?: 'admin' | 'user' | '';
};

const initialValues: IUserFilterForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  status: '',
  role: '',
};

type IProps = {
  onFilter: (values: string) => void;
};

export default function UserFilter({ onFilter }: IProps) {
  const formik = useFormik({
    initialValues,
    onSubmit: (values) => {
      let filter = '';

      if (values.firstName && values.firstName.trim() !== '') {
        filter = appendOperator(filter, `firstName==*${values.firstName.trim()}*`);
      }
      if (values.lastName && values.lastName.trim() !== '') {
        filter = appendOperator(filter, `lastName==*${values.lastName.trim()}*`);
      }
      if (values.email && values.email.trim() !== '') {
        filter = appendOperator(filter, `email==*${values.email.trim()}*`);
      }
      if (values.phone && values.phone.trim() !== '') {
        filter = appendOperator(filter, `phone==*${values.phone.trim()}*`);
      }
      if (values.status) {
        filter = appendOperator(filter, `status==${values.status}`);
      }
      if (values.role) {
        filter = appendOperator(filter, `role==${values.role}`);
      }

      onFilter(filter);
    },
  });

  const handleReset = () => {
    formik.resetForm();
    onFilter('');
  };

  return (
    <Card className="mb-4 shadow-sm border-0 bg-light">
      <Card.Body className="p-3">
        <Form noValidate onSubmit={formik.handleSubmit}>
          <Row className="g-2">
            <Form.Group as={Col} md={4} lg={2}>
              <Form.Label className="small fw-semibold text-secondary mb-1">İsim</Form.Label>
              <Form.Control
                size="sm"
                name="firstName"
                onChange={(e) => {
                  formik.handleChange(e);
                  formik.submitForm();
                }}
                value={formik.values.firstName ?? ''}
                placeholder="İsim ile ara"
              />
            </Form.Group>

            <Form.Group as={Col} md={4} lg={2}>
              <Form.Label className="small fw-semibold text-secondary mb-1">Soyisim</Form.Label>
              <Form.Control
                size="sm"
                name="lastName"
                onChange={(e) => {
                  formik.handleChange(e);
                  formik.submitForm();
                }}
                value={formik.values.lastName ?? ''}
                placeholder="Soyisim ile ara"
              />
            </Form.Group>

            <Form.Group as={Col} md={4} lg={2}>
              <Form.Label className="small fw-semibold text-secondary mb-1">E-posta</Form.Label>
              <Form.Control
                size="sm"
                type="email"
                name="email"
                onChange={(e) => {
                  formik.handleChange(e);
                  formik.submitForm();
                }}
                value={formik.values.email ?? ''}
                placeholder="E-posta ile ara"
              />
            </Form.Group>

            <Form.Group as={Col} md={4} lg={2}>
              <Form.Label className="small fw-semibold text-secondary mb-1">Telefon</Form.Label>
              <Form.Control
                size="sm"
                name="phone"
                onChange={(e) => {
                  formik.handleChange(e);
                  formik.submitForm();
                }}
                value={formik.values.phone ?? ''}
                placeholder="Telefon ile ara"
              />
            </Form.Group>

            <Form.Group as={Col} md={4} lg={2}>
              <Form.Label className="small fw-semibold text-secondary mb-1">Rol</Form.Label>
              <Form.Select
                size="sm"
                name="role"
                onChange={(e) => {
                  formik.handleChange(e);
                  formik.submitForm();
                }}
                value={formik.values.role ?? ''}
              >
                <option value="">Tüm Roller</option>
                <option value="admin">Yönetici</option>
                <option value="user">Kullanıcı</option>
              </Form.Select>
            </Form.Group>

            <Form.Group as={Col} md={4} lg={2}>
              <Form.Label className="small fw-semibold text-secondary mb-1">Durum</Form.Label>
              <Form.Select
                size="sm"
                name="status"
                onChange={(e) => {
                  formik.handleChange(e);
                  formik.submitForm();
                }}
                value={formik.values.status ?? ''}
              >
                <option value="">Tüm Durumlar</option>
                <option value="ACTIVE">Aktif</option>
                <option value="CLOSED">Kapalı</option>
                <option value="DISABLED">Pasif</option>
              </Form.Select>
            </Form.Group>

            <Col xs={12} className="d-flex justify-content-end mt-2">
              <Button size="sm" variant="outline-secondary" onClick={handleReset}>
                Filtreleri Temizle
              </Button>
            </Col>
          </Row>
        </Form>
      </Card.Body>
    </Card>
  );
}
