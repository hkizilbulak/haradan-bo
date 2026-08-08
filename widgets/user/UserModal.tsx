import { Button, Col, Form, Offcanvas } from 'react-bootstrap';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { UserRequest, UserResponse } from '@/models';
import { formatDateTimeForText } from '@/helpers/DateUtils';
import { getUserRoleText } from '@/helpers/EnumUtils';
import { formatPhoneDisplayTR, isValidOptionalPhoneTR, PHONE_INVALID_MESSAGE } from '@/helpers/phone';

const initialValues: UserRequest = {
  identifier: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  expectedUpdatedAt: undefined,
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
    firstName: Yup.string().required('Ad zorunludur'),
    lastName: Yup.string().required('Soyad zorunludur'),
    email: Yup.string().email('Geçerli e-posta girin').required('E-posta zorunludur'),
    phone: Yup.string().test('phone', PHONE_INVALID_MESSAGE, (v) =>
      isValidOptionalPhoneTR(v),
    ),
    newRole: Yup.string().required('Rol zorunludur'),
    newStatus: Yup.string().required('Durum zorunludur'),
  });

  const values: UserRequest = selectedUser
    ? {
        identifier: selectedUser.identifier ?? selectedUser.id ?? '',
        firstName: selectedUser.firstName ?? '',
        lastName: selectedUser.lastName ?? '',
        email: selectedUser.email ?? '',
        phone: formatPhoneDisplayTR(selectedUser.phone),
        expectedUpdatedAt: selectedUser.updatedAt,
        expectedCurrentRole: selectedUser.role,
        newRole: selectedUser.role,
        expectedCurrentStatus: selectedUser.status,
        newStatus: selectedUser.status,
      }
    : initialValues;

  return (
    <Offcanvas show={true} onHide={onClose} scroll={true} placement={'end'} className="w-100" style={{ maxWidth: 480 }}>
      <Offcanvas.Header closeButton>
        <Offcanvas.Title>Kullanıcı Düzenle</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
        {selectedUser && (
          <div className="mb-3 p-2 bg-light border rounded small text-muted">
            {selectedUser.createdAt && (
              <div><strong>Üyelik:</strong> {formatDateTimeForText(selectedUser.createdAt)}</div>
            )}
            <div><strong>Rol (şu an):</strong> {getUserRoleText(selectedUser.role)}</div>
          </div>
        )}
        <Formik initialValues={values} enableReinitialize validationSchema={validationSchema} onSubmit={onHandleSave}>
          {({ handleSubmit, handleChange, setFieldValue, values, errors, touched, isValid, isSubmitting }) => (
            <Form noValidate onSubmit={handleSubmit}>
              <Form.Group as={Col} md={12} className="mb-3">
                <Form.Label>Ad</Form.Label>
                <Form.Control name="firstName" value={values.firstName} onChange={handleChange} isInvalid={touched.firstName && !!errors.firstName} />
                <Form.Control.Feedback type="invalid">{errors.firstName}</Form.Control.Feedback>
              </Form.Group>
              <Form.Group as={Col} md={12} className="mb-3">
                <Form.Label>Soyad</Form.Label>
                <Form.Control name="lastName" value={values.lastName} onChange={handleChange} isInvalid={touched.lastName && !!errors.lastName} />
                <Form.Control.Feedback type="invalid">{errors.lastName}</Form.Control.Feedback>
              </Form.Group>
              <Form.Group as={Col} md={12} className="mb-3">
                <Form.Label>E-posta</Form.Label>
                <Form.Control type="email" name="email" value={values.email} onChange={handleChange} isInvalid={touched.email && !!errors.email} />
                <Form.Text muted>Değişiklik doğrulama e-postası tamamlandıktan sonra geçerli olur.</Form.Text>
                <Form.Control.Feedback type="invalid">{errors.email}</Form.Control.Feedback>
              </Form.Group>
              <Form.Group as={Col} md={12} className="mb-3">
                <Form.Label>Telefon (opsiyonel)</Form.Label>
                <Form.Control
                  type="tel"
                  name="phone"
                  value={values.phone ?? ''}
                  placeholder="532 123 45 67"
                  onChange={(e) => setFieldValue('phone', formatPhoneDisplayTR(e.target.value))}
                  isInvalid={touched.phone && !!errors.phone}
                />
                <Form.Text muted>Baştaki 0 yazılmaz. Yapıştırma: 05… / +90… kabul edilir.</Form.Text>
                <Form.Control.Feedback type="invalid">{errors.phone}</Form.Control.Feedback>
              </Form.Group>
              <Form.Group as={Col} md={12} className="mb-3">
                <Form.Label>Rol</Form.Label>
                <Form.Select name="newRole" value={values.newRole} onChange={handleChange}>
                  <option value="admin">Yönetici</option>
                  <option value="user">Kullanıcı</option>
                </Form.Select>
              </Form.Group>
              <Form.Group as={Col} md={12} className="mb-3">
                <Form.Label>Durum</Form.Label>
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
