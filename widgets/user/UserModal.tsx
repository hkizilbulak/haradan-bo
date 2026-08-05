import { Button, Col, Form, Offcanvas } from 'react-bootstrap';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { UserRequest, UserResponse } from '@/models';

const initialValues: UserRequest = {
  identifier: '',
  expectedCurrentRole: 'user',
  newRole: 'user',
  expectedCurrentStatus: 'ACTIVE',
  newStatus: 'ACTIVE',
};

type IProps = {
  selectedUser?: UserResponse;
  onClose: () => void;
  onHandleSave: (value: UserRequest) => void;
};

export default function UserModal({ selectedUser, onClose, onHandleSave }: IProps) {
  const validationSchema = Yup.object().shape({
    newRole: Yup.string().required('Rol zorunludur'),
    newStatus: Yup.string().required('Statü zorunludur'),
  });

  const values: UserRequest = selectedUser
    ? {
        identifier: selectedUser.identifier ?? '',
        expectedCurrentRole: selectedUser.role,
        newRole: selectedUser.role,
        expectedCurrentStatus: selectedUser.status,
        newStatus: selectedUser.status,
      }
    : initialValues;

  return (
    <Offcanvas show={true} onHide={onClose} scroll={true} placement={'end'}>
      <Offcanvas.Header closeButton>
        <Offcanvas.Title>Kullanıcı Düzenle</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
        <Formik initialValues={values} validationSchema={validationSchema} onSubmit={onHandleSave}>
          {({ handleSubmit, handleChange, values, isValid, isSubmitting }) => (
            <Form noValidate onSubmit={handleSubmit}>
              <Form.Group as={Col} md={12} className="mb-3">
                <Form.Label>ID</Form.Label>
                <Form.Control type="text" value={values.identifier ?? ''} disabled />
              </Form.Group>
              <Form.Group as={Col} md={12} className="mb-3">
                <Form.Label>Rol</Form.Label>
                <Form.Select name="newRole" value={values.newRole} onChange={handleChange}>
                  <option value="admin">Yönetici</option>
                  <option value="user">Kullanıcı</option>
                </Form.Select>
              </Form.Group>
              <Form.Group as={Col} md={12} className="mb-3">
                <Form.Label>Statü</Form.Label>
                <Form.Select name="newStatus" value={values.newStatus} onChange={handleChange}>
                  <option value="ACTIVE">Aktif</option>
                  <option value="CLOSED">Kapalı</option>
                  <option value="DISABLED">Pasif</option>
                </Form.Select>
              </Form.Group>
              <Button
                disabled={!isValid || isSubmitting}
                variant="primary"
                as="input"
                type="submit"
                value="Kaydet"
              />
            </Form>
          )}
        </Formik>
      </Offcanvas.Body>
    </Offcanvas>
  );
}
