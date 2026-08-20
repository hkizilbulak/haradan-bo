import React, { useState, useEffect } from 'react';
import { Offcanvas, Form, Button, Table, Badge, Alert, Spinner, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { Info } from 'react-feather';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import { UserResponse, UserRequest } from '@/models';
import { userService, SecurityEvent } from '@/services/user.service';
import { formatDateTimeForText } from '@/helpers/DateUtils';
import { formatPhoneDisplayTR, isValidOptionalPhoneTR, PHONE_INVALID_MESSAGE, toCanonicalPhoneTR } from '@/helpers/phone';
import { getErrorMessage } from '@/helpers/HelperUtils';

type IProps = {
  userId: string;
  onClose: () => void;
  onUpdated: () => void;
};

const eventTypeText = (type: string) => {
  const map: Record<string, string> = {
    LOGIN_SUCCESS: 'Giriş Başarılı',
    LOGIN_FAILURE: 'Giriş Başarısız',
    LOGOUT: 'Çıkış',
    SESSION_REVOKED: 'Oturum Sonlandırıldı',
    ALL_SESSIONS_REVOKED: 'Tüm Oturumlar Sonlandırıldı',
    REFRESH_REPLAY_DETECTED: 'Yenileme Tekrarı Algılandı',
    PASSWORD_CHANGE: 'Şifre Değişikliği',
    PASSWORD_RESET: 'Şifre Sıfırlama / Davet',
    EMAIL_VERIFICATION: 'E-posta Doğrulama',
    EMAIL_CHANGE: 'E-posta Değişikliği',
    ROLE_CHANGE: 'Rol Değişikliği',
    ACCOUNT_STATUS_CHANGE: 'Hesap Durumu Değişikliği',
    BO_CONTEXT_REJECTED: 'BO Bağlamı Reddedildi',
  };
  return map[type] ?? 'Diğer Güvenlik Olayı';
};

const getEventDetails = (event: SecurityEvent): string | null => {
  if (!event.metadata) return null;
  const m = event.metadata;
  if (event.eventType === 'EMAIL_CHANGE') {
    const parts: string[] = [];
    if (m.previousEmail) parts.push(`Eski: ${m.previousEmail}`);
    if (m.newEmail) parts.push(`Yeni: ${m.newEmail}`);
    else if (m.pendingEmail) parts.push(`Talep: ${m.pendingEmail}`);
    return parts.length > 0 ? parts.join('\n') : null;
  }
  if (event.eventType === 'ROLE_CHANGE' && m.newRole) {
    const parts: string[] = [];
    if (m.previousRole) parts.push(`Önceki: ${m.previousRole === 'admin' ? 'Yönetici' : 'Kullanıcı'}`);
    parts.push(`Yeni: ${m.newRole === 'admin' ? 'Yönetici' : 'Kullanıcı'}`);
    return parts.join('\n');
  }
  if (event.eventType === 'ACCOUNT_STATUS_CHANGE' && m.newStatus) {
    const parts: string[] = [];
    if (m.previousStatus) parts.push(`Önceki: ${m.previousStatus}`);
    parts.push(`Yeni: ${m.newStatus}`);
    return parts.join('\n');
  }
  return null;
};

const eventTypeVariant = (type: string) => {
  if (type.includes('FAILURE') || type.includes('REJECTED') || type.includes('REPLAY')) return 'danger';
  if (type.includes('REVOKED')) return 'warning';
  if (type.includes('SUCCESS') || type.includes('VERIFICATION')) return 'success';
  return 'info';
};

export default function UserDetailOffcanvas({ userId, onClose, onUpdated }: IProps) {
  const [detail, setDetail] = useState<UserResponse | null>(null);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState(false);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const data = await userService.getById(userId);
      setDetail(data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    setEventsLoading(true);
    setEventsError(false);
    try {
      const data = await userService.getSecurityEvents(userId);
      setEvents(data);
    } catch {
      setEventsError(true);
    } finally {
      setEventsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    fetchEvents();
  }, [userId]);

  const validationSchema = Yup.object().shape({
    firstName: Yup.string().required('Ad zorunludur'),
    lastName: Yup.string().required('Soyad zorunludur'),
    email: Yup.string().email('Geçerli e-posta girin').required('E-posta zorunludur'),
    phone: Yup.string().test('phone', PHONE_INVALID_MESSAGE, (v) => isValidOptionalPhoneTR(v)),
    newRole: Yup.string().required('Rol zorunludur'),
    newStatus: Yup.string().required('Durum zorunludur'),
  });

  return (
    <Offcanvas show={true} onHide={onClose} placement="end" scroll className="w-100" style={{ maxWidth: 540 }}>
      <Offcanvas.Header closeButton>
        <Offcanvas.Title className="h5 mb-0">Kullanıcı Detay / Düzenleme</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
        {loading && (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
          </div>
        )}

        {!loading && detail && (
          <>
            <Formik
              initialValues={{
                identifier: detail.identifier ?? detail.id,
                firstName: detail.firstName ?? '',
                lastName: detail.lastName ?? '',
                email: detail.email ?? '',
                phone: formatPhoneDisplayTR(detail.phone),
                expectedUpdatedAt: detail.updatedAt,
                expectedCurrentRole: detail.role,
                newRole: detail.role,
                expectedCurrentStatus: detail.status,
                newStatus: detail.status,
              }}
              enableReinitialize
              validationSchema={validationSchema}
              onSubmit={async (values, helpers) => {
                setDuplicateError(null);
                try {
                  const cleanEmail = values.email.trim();
                  const cleanPhone = values.phone ? toCanonicalPhoneTR(values.phone) : null;
                  const currentEmail = (detail.email ?? '').trim().toLowerCase();
                  const currentPhone = detail.phone ? toCanonicalPhoneTR(detail.phone) : null;

                  const emailChanged = cleanEmail.toLowerCase() !== currentEmail;
                  const phoneChanged = cleanPhone !== currentPhone;

                  // Duplicate check if changed
                  if (emailChanged || phoneChanged) {
                    const { emailExists, phoneExists } = await userService.checkDuplicate(
                      emailChanged ? cleanEmail : '',
                      phoneChanged ? cleanPhone : null,
                      detail.id ?? detail.identifier
                    );

                    if (emailChanged && emailExists) {
                      setDuplicateError('Bu e-posta adresi başka bir kullanıcı tarafından kullanılmaktadır.');
                      helpers.setSubmitting(false);
                      return;
                    }

                    if (phoneChanged && phoneExists) {
                      setDuplicateError('Bu telefon numarası başka bir kullanıcı tarafından kullanılmaktadır.');
                      helpers.setSubmitting(false);
                      return;
                    }
                  }

                  const currentExpectedUpdatedAt = detail.updatedAt ?? new Date().toISOString();

                  // Update Profile (FirstName, LastName, Phone)
                  await userService.updateProfile(detail.id ?? detail.identifier, {
                    expectedUpdatedAt: currentExpectedUpdatedAt,
                    firstName: values.firstName.trim(),
                    lastName: values.lastName.trim(),
                    phone: cleanPhone,
                  });

                  // Update Email if changed
                  if (emailChanged) {
                    await userService.requestEmailChange(detail.id ?? detail.identifier, cleanEmail);
                  }

                  // Update Role if changed
                  if (values.newRole !== detail.role) {
                    await userService.changeRole(detail.id ?? detail.identifier, {
                      ...values,
                      expectedCurrentRole: detail.role,
                      newRole: values.newRole as 'admin' | 'user',
                    });
                  }

                  // Update Status if changed
                  if (values.newStatus !== detail.status) {
                    await userService.changeStatus(detail.id ?? detail.identifier, {
                      ...values,
                      expectedCurrentStatus: detail.status,
                      newStatus: values.newStatus as 'ACTIVE' | 'CLOSED' | 'DISABLED',
                    });
                  }

                  toast.success('Kullanıcı bilgileri başarıyla güncellendi.');
                  await Promise.all([fetchDetail(), fetchEvents()]);
                  onUpdated();
                } catch (error) {
                  toast.error(getErrorMessage(error));
                } finally {
                  helpers.setSubmitting(false);
                }
              }}
            >
              {({ handleSubmit, handleChange, setFieldValue, values, errors, touched, isValid, isSubmitting }) => (
                <Form noValidate onSubmit={handleSubmit} className="mb-4">
                  {duplicateError && <Alert variant="danger" className="py-2 small mb-3">{duplicateError}</Alert>}

                  <div className="bg-light p-3 rounded mb-3 border">
                    <h6 className="fw-bold mb-3 text-primary">Kullanıcı Bilgileri</h6>

                    <Form.Group className="mb-3">
                      <Form.Label className="small fw-semibold">Ad</Form.Label>
                      <Form.Control
                        name="firstName"
                        value={values.firstName}
                        onChange={handleChange}
                        isInvalid={touched.firstName && !!errors.firstName}
                      />
                      <Form.Control.Feedback type="invalid">{errors.firstName}</Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label className="small fw-semibold">Soyad</Form.Label>
                      <Form.Control
                        name="lastName"
                        value={values.lastName}
                        onChange={handleChange}
                        isInvalid={touched.lastName && !!errors.lastName}
                      />
                      <Form.Control.Feedback type="invalid">{errors.lastName}</Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label className="small fw-semibold">E-posta</Form.Label>
                      <Form.Control
                        type="email"
                        name="email"
                        value={values.email}
                        onChange={(e) => {
                          setDuplicateError(null);
                          handleChange(e);
                        }}
                        isInvalid={touched.email && !!errors.email}
                      />
                      <Form.Control.Feedback type="invalid">{errors.email}</Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label className="small fw-semibold">Telefon</Form.Label>
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
                      <Form.Control.Feedback type="invalid">{errors.phone}</Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label className="small fw-semibold">Rol</Form.Label>
                      <Form.Select name="newRole" value={values.newRole} onChange={handleChange}>
                        <option value="user">Kullanıcı</option>
                        <option value="admin">Yönetici</option>
                      </Form.Select>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label className="small fw-semibold">Durum</Form.Label>
                      <Form.Select name="newStatus" value={values.newStatus} onChange={handleChange}>
                        <option value="ACTIVE">Aktif</option>
                        <option value="CLOSED">Kapalı</option>
                        <option value="DISABLED">Pasif</option>
                      </Form.Select>
                    </Form.Group>

                    <div className="row g-2 mt-2 pt-2 border-top">
                      <div className="col-6">
                        <span className="small text-muted d-block">Kayıt Tarihi:</span>
                        <span className="small fw-semibold">{formatDateTimeForText(detail.createdAt)}</span>
                      </div>
                      <div className="col-6">
                        <span className="small text-muted d-block">Güncelleme Tarihi:</span>
                        <span className="small fw-semibold">{detail.updatedAt ? formatDateTimeForText(detail.updatedAt) : '—'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="d-flex justify-content-end gap-2 mb-4">
                    <Button variant="primary" type="submit" disabled={!isValid || isSubmitting}>
                      {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
                    </Button>
                  </div>
                </Form>
              )}
            </Formik>

            <hr />

            <div className="mt-4">
              <h6 className="fw-bold mb-3 text-secondary">Güvenlik Geçmişi</h6>
              {eventsLoading && (
                <div className="text-center py-3">
                  <Spinner animation="border" size="sm" variant="secondary" />
                </div>
              )}
              {!eventsLoading && eventsError && (
                <Alert variant="danger" className="py-2 small">
                  Güvenlik geçmişi yüklenemedi.
                </Alert>
              )}
              {!eventsLoading && !eventsError && events.length === 0 && (
                <p className="text-muted small">Güvenlik kaydı bulunamadı.</p>
              )}
              {!eventsLoading && !eventsError && events.length > 0 && (
                <Table striped bordered hover size="sm" responsive className="small">
                  <thead>
                    <tr>
                      <th>Olay</th>
                      <th>Tarih</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event) => {
                      const details = getEventDetails(event);
                      return (
                        <tr key={event.id}>
                          <td>
                            <div className="d-flex align-items-center justify-content-between gap-2">
                              <Badge bg={eventTypeVariant(event.eventType)}>
                                {eventTypeText(event.eventType)}
                              </Badge>
                              {details && (
                                <OverlayTrigger
                                  placement="left"
                                  overlay={
                                    <Tooltip id={`tooltip-${event.id}`} style={{ whiteSpace: 'pre-line', textAlign: 'left' }}>
                                      {details}
                                    </Tooltip>
                                  }
                                >
                                  <Button
                                    variant="light"
                                    size="sm"
                                    className="p-0 text-muted border-0 d-inline-flex align-items-center"
                                    style={{ cursor: 'pointer', background: 'transparent' }}
                                    title="Detayları Görüntüle"
                                  >
                                    <Info size={14} className="text-primary" />
                                  </Button>
                                </OverlayTrigger>
                              )}
                            </div>
                          </td>
                          <td className="text-nowrap">{formatDateTimeForText(event.createdAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              )}
            </div>
          </>
        )}
      </Offcanvas.Body>
    </Offcanvas>
  );
}
