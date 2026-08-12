import React, { useState } from 'react';
import { Modal, Form, Button, Alert } from 'react-bootstrap';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import { userService } from '@/services';
import { formatPhoneDisplayTR, isValidOptionalPhoneTR, PHONE_INVALID_MESSAGE, toCanonicalPhoneTR } from '@/helpers/phone';
import { getErrorMessage } from '@/helpers/HelperUtils';

type IProps = {
  onClose: () => void;
  onCreated: () => void;
};

export default function UserCreateModal({ onClose, onCreated }: IProps) {
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  const validationSchema = Yup.object().shape({
    firstName: Yup.string().required('İsim zorunludur'),
    lastName: Yup.string().required('Soyisim zorunludur'),
    email: Yup.string().email('Geçerli bir e-posta giriniz').required('E-posta zorunludur'),
    phone: Yup.string().test('phone', PHONE_INVALID_MESSAGE, (v) => isValidOptionalPhoneTR(v)),
    role: Yup.string().oneOf(['user', 'admin']).required('Rol zorunludur'),
  });

  const generatePassword = (email: string) => {
    const prefix = email.split('@')[0] || 'kullanici';
    return `${prefix}123`;
  };

  return (
    <Modal show={true} onHide={onClose} centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title className="h5 mb-0">Kullanıcı Ekle</Modal.Title>
      </Modal.Header>
      <Formik
        initialValues={{
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          role: 'user' as 'user' | 'admin',
        }}
        validationSchema={validationSchema}
        onSubmit={async (values, helpers) => {
          setDuplicateError(null);
          try {
            const cleanEmail = values.email.trim();
            const cleanPhone = values.phone ? toCanonicalPhoneTR(values.phone) : null;

            // Duplicate checks
            const { emailExists, phoneExists } = await userService.checkDuplicate(cleanEmail, cleanPhone);

            if (emailExists) {
              setDuplicateError('Bu e-posta adresi zaten kayıtlıdır.');
              helpers.setSubmitting(false);
              return;
            }

            if (phoneExists) {
              setDuplicateError('Bu telefon numarası zaten kayıtlıdır.');
              helpers.setSubmitting(false);
              return;
            }

            const generatedPassword = generatePassword(cleanEmail);

            await userService.create({
              firstName: values.firstName.trim(),
              lastName: values.lastName.trim(),
              email: cleanEmail,
              phone: cleanPhone || undefined,
              role: values.role,
            });

            toast.success(
              `Kullanıcı başarıyla oluşturuldu! Hoş geldiniz maili ve oluşturulan şifre (${generatedPassword}) e-posta adresine gönderilmiştir.`
            );
            onCreated();
            onClose();
          } catch (error) {
            toast.error(getErrorMessage(error));
          } finally {
            helpers.setSubmitting(false);
          }
        }}
      >
        {({ handleSubmit, handleChange, setFieldValue, values, errors, touched, isValid, isSubmitting }) => (
          <Form noValidate onSubmit={handleSubmit}>
            <Modal.Body className="p-4">
              {duplicateError && <Alert variant="danger" className="py-2 small">{duplicateError}</Alert>}

              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold small">İsim</Form.Label>
                <Form.Control
                  name="firstName"
                  value={values.firstName}
                  onChange={handleChange}
                  isInvalid={touched.firstName && !!errors.firstName}
                  placeholder="Kullanıcı adı"
                />
                <Form.Control.Feedback type="invalid">{errors.firstName}</Form.Control.Feedback>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold small">Soyisim</Form.Label>
                <Form.Control
                  name="lastName"
                  value={values.lastName}
                  onChange={handleChange}
                  isInvalid={touched.lastName && !!errors.lastName}
                  placeholder="Kullanıcı soyadı"
                />
                <Form.Control.Feedback type="invalid">{errors.lastName}</Form.Control.Feedback>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold small">E-posta</Form.Label>
                <Form.Control
                  type="email"
                  name="email"
                  value={values.email}
                  onChange={(e) => {
                    setDuplicateError(null);
                    handleChange(e);
                  }}
                  isInvalid={touched.email && !!errors.email}
                  placeholder="ornek@domain.com"
                />
                <Form.Control.Feedback type="invalid">{errors.email}</Form.Control.Feedback>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold small">Telefon</Form.Label>
                <Form.Control
                  type="tel"
                  name="phone"
                  value={values.phone}
                  placeholder="532 123 45 67"
                  onChange={(e) => {
                    setDuplicateError(null);
                    setFieldValue('phone', formatPhoneDisplayTR(e.target.value));
                  }}
                  isInvalid={touched.phone && !!errors.phone}
                />
                <Form.Text muted className="small">Örnek: 5XX XXX XX XX</Form.Text>
                <Form.Control.Feedback type="invalid">{errors.phone}</Form.Control.Feedback>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold small">Rol</Form.Label>
                <Form.Select name="role" value={values.role} onChange={handleChange}>
                  <option value="user">Kullanıcı</option>
                  <option value="admin">Yönetici</option>
                </Form.Select>
              </Form.Group>

              <Alert variant="info" className="py-2 small mb-0">
                <div className="fw-semibold mb-1">Otomatik Şifre Bilgilendirmesi</div>
                Şifre e-postanın ön eki ve 123 birleştirilerek otomatik oluşturulacak (ör. {values.email ? generatePassword(values.email) : 'kullanici123'}) ve e-posta ile gönderilecektir.
              </Alert>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
                İptal
              </Button>
              <Button variant="primary" type="submit" disabled={!isValid || isSubmitting}>
                {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            </Modal.Footer>
          </Form>
        )}
      </Formik>
    </Modal>
  );
}
