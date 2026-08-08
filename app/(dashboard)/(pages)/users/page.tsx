"use client"
import React, { useState } from 'react';
import Loading from '@/components/Loading';
import PrepareTable from '@/components/PrepareTable';
import StatusBadge from '@/components/StatusBadge';
import { formatDateForText, formatDateTimeForText } from '@/helpers/DateUtils';
import { capitalizeSentence, getErrorMessage } from '@/helpers/HelperUtils';
import { formatPhoneDisplayTR, isValidOptionalPhoneTR, PHONE_INVALID_MESSAGE, toCanonicalPhoneTR } from '@/helpers/phone';
import { getUserRoleText } from '@/helpers/EnumUtils';
import useCursorApi from '@/hooks/useCursorApi';
import useModal from '@/hooks/useModal';
import { UserRequest, UserResponse } from '@/models';
import { userService } from '@/services';
import { SecurityEvent } from '@/services/user.service';
import { PageHeading } from '@/widgets';
import UserFilter from '@/widgets/user/UserFilter';
import UserModal from '@/widgets/user/UserModal';
import CursorPagination from '@/components/CursorPagination';
import { Col, Row, Container, Badge, Offcanvas, Table, Button, Alert, Form } from 'react-bootstrap';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import axios from 'axios';

const headItems = [
  'Ad Soyad',
  'E-posta',
  'Rol',
  'Durum',
  'E-posta Doğrulandı',
  'Üyelik Tarihi',
  ''
];

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

const eventTypeVariant = (type: string) => {
  if (type.includes('FAILURE') || type.includes('REJECTED') || type.includes('REPLAY')) return 'danger';
  if (type.includes('REVOKED')) return 'warning';
  if (type.includes('SUCCESS') || type.includes('VERIFICATION')) return 'success';
  return 'info';
};

function UserDetailPanel({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<UserResponse | null>(null);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState(false);
  const [resending, setResending] = useState(false);

  React.useEffect(() => {
    setLoading(true);
    userService.getById(userId)
      .then(setDetail)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));

    setEventsLoading(true);
    setEventsError(false);
    userService.getSecurityEvents(userId)
      .then(setEvents)
      .catch(() => setEventsError(true))
      .finally(() => setEventsLoading(false));
  }, [userId]);

  const handleResendInvitation = async () => {
    if (resending) {
      return;
    }
    setResending(true);
    try {
      const result = await userService.resendInvitation(userId);
      if (result.invitationEmailSent) {
        toast.success('Davet e-postası gönderildi.');
      } else {
        toast.warning('Davet e-postası gönderilemedi.');
      }
      if (result.email || result.firstName) {
        setDetail((prev) => (prev ? { ...prev, ...result, status: result.status ?? prev.status } : prev));
      }
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      const code = axios.isAxiosError(error)
        ? (error.response?.data as { code?: string } | undefined)?.code
        : undefined;
      if (status === 503 || code === 'DEPENDENCY_UNAVAILABLE') {
        toast.error('E-posta gönderimi şu anda kullanılamıyor. Kullanıcı bilgileri etkilenmedi; daha sonra yeniden deneyebilirsiniz.');
      } else {
        toast.error(getErrorMessage(error));
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <Offcanvas show onHide={onClose} placement="end" scroll className="w-100" style={{ maxWidth: 480 }}>
      <Offcanvas.Header closeButton>
        <Offcanvas.Title>Kullanıcı Detayı</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
        {loading && <Loading />}
        {!loading && detail && (
          <>
            <dl className="row small mb-4">
              <dt className="col-4 text-muted">Ad</dt>
              <dd className="col-8">{detail.firstName}</dd>
              <dt className="col-4 text-muted">Soyad</dt>
              <dd className="col-8">{detail.lastName}</dd>
              <dt className="col-4 text-muted">E-posta</dt>
              <dd className="col-8">{detail.email}</dd>
              <dt className="col-4 text-muted">Telefon</dt>
              <dd className="col-8">{detail.phone ? formatPhoneDisplayTR(detail.phone) : '—'}</dd>
              <dt className="col-4 text-muted">Rol</dt>
              <dd className="col-8">{getUserRoleText(detail.role)}</dd>
              <dt className="col-4 text-muted">Durum</dt>
              <dd className="col-8"><StatusBadge status={detail.status} /></dd>
              <dt className="col-4 text-muted">E-posta doğrulandı</dt>
              <dd className="col-8">{detail.emailVerified ? 'Evet' : 'Hayır'}</dd>
              <dt className="col-4 text-muted">Aktif oturum</dt>
              <dd className="col-8">{detail.activeSessionCount ?? 0}</dd>
              <dt className="col-4 text-muted">Oluşturulma</dt>
              <dd className="col-8">{formatDateTimeForText(detail.createdAt)}</dd>
              {detail.updatedAt && (
                <>
                  <dt className="col-4 text-muted">Güncelleme</dt>
                  <dd className="col-8">{formatDateTimeForText(detail.updatedAt)}</dd>
                </>
              )}
            </dl>

            {detail.status === 'ACTIVE' && (
              <Alert variant="info" className="py-2 small">
                <div className="mb-2">
                  Aktif kullanıcıya şifre kurulum / davet e-postasını yeniden gönderebilirsiniz.
                </div>
                <Button
                  size="sm"
                  variant="outline-primary"
                  disabled={resending}
                  onClick={() => void handleResendInvitation()}
                >
                  {resending ? 'Gönderiliyor...' : 'Daveti Yeniden Gönder'}
                </Button>
              </Alert>
            )}

            <h6 className="mb-2">Güvenlik Geçmişi</h6>
            {eventsLoading && <Loading />}
            {!eventsLoading && eventsError && (
              <Alert variant="danger" className="py-2 small">Güvenlik geçmişi yüklenemedi.</Alert>
            )}
            {!eventsLoading && !eventsError && events.length === 0 && (
              <p className="text-muted small">Güvenlik kaydı bulunamadı.</p>
            )}
            {!eventsLoading && !eventsError && events.length > 0 && (
              <Table striped bordered hover size="sm">
                <thead>
                  <tr>
                    <th>Olay</th>
                    <th>Tarih</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id}>
                      <td><Badge bg={eventTypeVariant(event.eventType)}>{eventTypeText(event.eventType)}</Badge></td>
                      <td>{formatDateTimeForText(event.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </>
        )}
      </Offcanvas.Body>
    </Offcanvas>
  );
}

function CreateUserOffcanvas({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const schema = Yup.object().shape({
    firstName: Yup.string().required('Ad zorunludur'),
    lastName: Yup.string().required('Soyad zorunludur'),
    email: Yup.string().email('Geçerli e-posta girin').required('E-posta zorunludur'),
    phone: Yup.string().test('phone', PHONE_INVALID_MESSAGE, (v) =>
      isValidOptionalPhoneTR(v),
    ),
    role: Yup.string().oneOf(['user', 'admin']).required('Rol zorunludur'),
  });

  return (
    <Offcanvas show onHide={onClose} placement="end" scroll>
      <Offcanvas.Header closeButton>
        <Offcanvas.Title>Yeni Kullanıcı</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
        <Alert variant="light" className="border small">
          Kalıcı parola belirlenmez. Kullanıcıya şifre kurulum e-postası gönderilir (e-posta sağlayıcısı yapılandırılmışsa).
        </Alert>
        <Formik
          initialValues={{ firstName: '', lastName: '', email: '', phone: '', role: 'user' as 'user' | 'admin' }}
          validationSchema={schema}
          onSubmit={async (values, helpers) => {
            try {
              const result = await userService.create({
                firstName: values.firstName.trim(),
                lastName: values.lastName.trim(),
                email: values.email.trim(),
                phone: toCanonicalPhoneTR(values.phone),
                role: values.role,
              });
              if (result.invitationEmailSent) {
                toast.success('Davet e-postası gönderildi.');
              } else {
                toast.warning('Kullanıcı oluşturuldu ancak davet e-postası gönderilemedi.');
              }
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
              <Form.Group className="mb-3">
                <Form.Label>Ad</Form.Label>
                <Form.Control name="firstName" value={values.firstName} onChange={handleChange} isInvalid={touched.firstName && !!errors.firstName} />
                <Form.Control.Feedback type="invalid">{errors.firstName}</Form.Control.Feedback>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Soyad</Form.Label>
                <Form.Control name="lastName" value={values.lastName} onChange={handleChange} isInvalid={touched.lastName && !!errors.lastName} />
                <Form.Control.Feedback type="invalid">{errors.lastName}</Form.Control.Feedback>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>E-posta</Form.Label>
                <Form.Control type="email" name="email" value={values.email} onChange={handleChange} isInvalid={touched.email && !!errors.email} />
                <Form.Control.Feedback type="invalid">{errors.email}</Form.Control.Feedback>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Telefon (opsiyonel)</Form.Label>
                <Form.Control
                  type="tel"
                  name="phone"
                  value={values.phone}
                  placeholder="532 123 45 67"
                  onChange={(e) => setFieldValue('phone', formatPhoneDisplayTR(e.target.value))}
                  isInvalid={touched.phone && !!errors.phone}
                />
                <Form.Text muted>Baştaki 0 yazılmaz. Yapıştırma: 05… / +90… kabul edilir.</Form.Text>
                <Form.Control.Feedback type="invalid">{errors.phone}</Form.Control.Feedback>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Rol</Form.Label>
                <Form.Select name="role" value={values.role} onChange={handleChange}>
                  <option value="user">Kullanıcı</option>
                  <option value="admin">Yönetici</option>
                </Form.Select>
              </Form.Group>
              <Button disabled={!isValid || isSubmitting} variant="primary" type="submit">
                {isSubmitting ? 'Oluşturuluyor...' : 'Oluştur'}
              </Button>
            </Form>
          )}
        </Formik>
      </Offcanvas.Body>
    </Offcanvas>
  );
}

export default function Users() {
  const [{ data, isLoading, isError, handleFilter, refetch, goNext, goPrev, canGoPrev, canGoNext, pageIndex }] = useCursorApi<UserResponse>({
    service: userService,
    pageSize: 10,
  });
  const { isModalOpen, openModal, closeModal, modalContent } = useModal();
  const [openFilter, setOpenFilter] = useState(false);
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const openUserModal = async (user?: UserResponse) => {
    if (!user?.identifier && !user?.id) {
      openModal(<UserModal selectedUser={user} onClose={closeModal} onHandleSave={handleSave} />);
      return;
    }
    const userId = user.identifier ?? user.id!;
    try {
      const detail = await userService.getById(userId);
      openModal(<UserModal selectedUser={detail} onClose={closeModal} onHandleSave={handleSave} />);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleSave = async (values: UserRequest) => {
    const userId = values.identifier;
    if (!userId) {
      toast.error('Kullanıcı bilgileri alınamadı. Sayfayı yenileyip tekrar deneyin.');
      return;
    }

    try {
      const detail = await userService.getById(userId);
      const expectedUpdatedAt = detail.updatedAt;
      if (!expectedUpdatedAt) {
        toast.error('Güncel kullanıcı bilgileri alınamadı. Sayfayı yenileyip tekrar deneyin.');
        return;
      }
      await userService.updateProfile(userId, {
        expectedUpdatedAt,
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        phone: toCanonicalPhoneTR(values.phone) ?? null,
      });

      const emailChanged = values.email.trim().toLowerCase() !== (detail.email ?? '').trim().toLowerCase();
      if (emailChanged) {
        await userService.requestEmailChange(userId, values.email.trim());
        toast.success('Profil güncellendi. Yeni e-posta için doğrulama gönderildi.');
      }

      const afterProfile = await userService.getById(userId);
      if (values.newRole !== values.expectedCurrentRole) {
        await userService.changeRole(userId, {
          ...values,
          expectedCurrentRole: afterProfile.role,
        });
      }

      const afterRole = values.newRole !== values.expectedCurrentRole
        ? await userService.getById(userId)
        : afterProfile;
      if (values.newStatus !== values.expectedCurrentStatus) {
        await userService.changeStatus(userId, {
          ...values,
          expectedCurrentStatus: afterRole.status,
        });
      }

      if (!emailChanged) {
        toast.success('Kullanıcı güncellendi');
      }
      closeModal();
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const rows = data?.content ?? [];
  const content = rows.map((user) => {
    const id = user.identifier ?? user.id;
    return (
      <tr key={id}>
        <td>{capitalizeSentence(user.firstName + ' ' + user.lastName)}</td>
        <td>{user.email}</td>
        <td>{getUserRoleText(user.role)}</td>
        <td><StatusBadge status={user.status} /></td>
        <td>{user.emailVerified ? 'Evet' : 'Hayır'}</td>
        <td>{formatDateForText(user.createdAt)}</td>
        <td className="d-flex flex-wrap gap-1">
          <Button
            size="sm"
            variant="outline-secondary"
            title="Detay"
            aria-label="Kullanıcı detayı"
            onClick={() => setDetailUserId(id!)}
          >
            Detay
          </Button>
          <Button
            size="sm"
            variant="outline-primary"
            title="Düzenle"
            aria-label="Kullanıcı düzenle"
            onClick={() => openUserModal(user)}
          >
            Düzenle
          </Button>
        </td>
      </tr>
    );
  });

  return (
    <Container fluid className="p-3 lg:p-6">
      <Row>
        <Col lg={12} md={12} sm={12}>
          <PageHeading
            heading="Kullanıcılar"
            createButtonText="Kullanıcı Ekle"
            onCreate={() => setCreating(true)}
            onToggleFilter={() => setOpenFilter(!openFilter)}
          />
        </Col>
      </Row>

      {openFilter && <UserFilter onFilter={(values: string) => handleFilter(values)} />}

      {isModalOpen && modalContent}
      {creating && <CreateUserOffcanvas onClose={() => setCreating(false)} onCreated={() => refetch()} />}
      {detailUserId && <UserDetailPanel userId={detailUserId} onClose={() => setDetailUserId(null)} />}

      {isError && (
        <Alert variant="danger" className="d-flex justify-content-between align-items-center">
          <span>Kullanıcılar yüklenirken bir hata oluştu.</span>
          <Button size="sm" variant="outline-danger" onClick={() => refetch()}>Tekrar Dene</Button>
        </Alert>
      )}

      {!isError && (
        <PrepareTable
          headItems={headItems}
          content={content}
          isLoading={isLoading}
          page={undefined}
          onHandlePageChange={() => undefined}
        />
      )}
      {!isLoading && !isError && rows.length === 0 && (
        <Alert variant="light" className="border text-muted">Henüz kullanıcı bulunamadı. Yeni kullanıcı ekleyebilirsiniz.</Alert>
      )}
      {!isLoading && !isError && rows.length > 0 && (
        <CursorPagination
          canGoPrev={canGoPrev}
          canGoNext={canGoNext}
          onPrev={goPrev}
          onNext={goNext}
          pageIndex={pageIndex}
        />
      )}
    </Container>
  );
}
