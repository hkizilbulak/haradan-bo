import React, { useCallback, useEffect, useRef } from 'react';
import { Button, Card, Col, Form, Row, Dropdown } from 'react-bootstrap';
import { useFormik } from 'formik';
import { appendOperator } from '@/helpers/HelperUtils';
import { UserRole } from '@/models';

export type IUserFilterForm = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  status?: 'ACTIVE' | 'CLOSED' | 'DISABLED' | '';
  role?: UserRole | '';
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
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const formik = useFormik({
    initialValues,
    onSubmit: () => {},
  });

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      const values = formik.values;
      let filter = '';

      if (values.firstName && values.firstName.trim().length >= 2) {
        filter = appendOperator(filter, `firstName==*${values.firstName.trim()}*`);
      }
      if (values.lastName && values.lastName.trim().length >= 2) {
        filter = appendOperator(filter, `lastName==*${values.lastName.trim()}*`);
      }
      if (values.email && values.email.trim().length >= 2) {
        filter = appendOperator(filter, `email==*${values.email.trim()}*`);
      }
      if (values.phone && values.phone.trim().length >= 2) {
        filter = appendOperator(filter, `phone==*${values.phone.trim()}*`);
      }
      if (values.status) {
        filter = appendOperator(filter, `status==${values.status}`);
      }
      if (values.role) {
        filter = appendOperator(filter, `role==${values.role}`);
      }

      onFilter(filter);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formik.values]);



  const handleReset = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
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
                onChange={formik.handleChange}
                value={formik.values.firstName ?? ''}
                placeholder="İsim ile ara"
              />
            </Form.Group>

            <Form.Group as={Col} md={4} lg={2}>
              <Form.Label className="small fw-semibold text-secondary mb-1">Soyisim</Form.Label>
              <Form.Control
                size="sm"
                name="lastName"
                onChange={formik.handleChange}
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
                onChange={formik.handleChange}
                value={formik.values.email ?? ''}
                placeholder="E-posta ile ara"
              />
            </Form.Group>

            <Form.Group as={Col} md={4} lg={2}>
              <Form.Label className="small fw-semibold text-secondary mb-1">Telefon</Form.Label>
              <Form.Control
                size="sm"
                name="phone"
                onChange={formik.handleChange}
                value={formik.values.phone ?? ''}
                placeholder="Telefon ile ara"
              />
            </Form.Group>

            <Form.Group as={Col} md={4} lg={2}>
              <Form.Label className="small fw-semibold text-secondary mb-1">Rol</Form.Label>
              <Dropdown>
                <Dropdown.Toggle className={`w-100 text-start d-flex justify-content-between align-items-center shadow-none bg-white form-control form-control-sm ${!formik.values.role ? 'text-muted' : 'text-secondary'}`}>
                  <span className="text-truncate">
                    {formik.values.role === 'admin' ? 'Yönetici' :
                     formik.values.role === 'CALL_CENTER' ? 'Çağrı Merkezi' :
                     formik.values.role === 'user' ? 'Kullanıcı' : 'Tüm Roller'}
                  </span>
                </Dropdown.Toggle>
                <Dropdown.Menu className="w-100 shadow-sm border-0" style={{ fontSize: '0.875rem' }}>
                  <Dropdown.Item onClick={() => formik.setFieldValue('role', '')}>Tüm Roller</Dropdown.Item>
                  <Dropdown.Item onClick={() => formik.setFieldValue('role', 'admin')}>Yönetici</Dropdown.Item>
                  <Dropdown.Item onClick={() => formik.setFieldValue('role', 'CALL_CENTER')}>Çağrı Merkezi</Dropdown.Item>
                  <Dropdown.Item onClick={() => formik.setFieldValue('role', 'user')}>Kullanıcı</Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </Form.Group>

            <Form.Group as={Col} md={4} lg={2}>
              <Form.Label className="small fw-semibold text-secondary mb-1">Durum</Form.Label>
              <Dropdown>
                <Dropdown.Toggle className={`w-100 text-start d-flex justify-content-between align-items-center shadow-none bg-white form-control form-control-sm ${!formik.values.status ? 'text-muted' : 'text-secondary'}`}>
                  <span className="text-truncate">
                    {formik.values.status === 'ACTIVE' ? 'Aktif' :
                     formik.values.status === 'CLOSED' ? 'Kapalı' :
                     formik.values.status === 'DISABLED' ? 'Pasif' : 'Tüm Durumlar'}
                  </span>
                </Dropdown.Toggle>
                <Dropdown.Menu className="w-100 shadow-sm border-0" style={{ fontSize: '0.875rem' }}>
                  <Dropdown.Item onClick={() => formik.setFieldValue('status', '')}>Tüm Durumlar</Dropdown.Item>
                  <Dropdown.Item onClick={() => formik.setFieldValue('status', 'ACTIVE')}>Aktif</Dropdown.Item>
                  <Dropdown.Item onClick={() => formik.setFieldValue('status', 'CLOSED')}>Kapalı</Dropdown.Item>
                  <Dropdown.Item onClick={() => formik.setFieldValue('status', 'DISABLED')}>Pasif</Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
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
