"use client"
import React, { useState } from 'react';
import Loading from '@/components/Loading';
import PrepareTable from '@/components/PrepareTable';
import StatusBadge from '@/components/StatusBadge';
import { formatDateForText, formatDateTimeForText } from '@/helpers/DateUtils';
import { capitalizeSentence, getErrorMessage } from '@/helpers/HelperUtils';
import { getUserRoleText } from '@/helpers/EnumUtils';
import useApi from '@/hooks/useApi';
import useModal from '@/hooks/useModal';
import { UserRequest, UserResponse } from '@/models';
import { userService } from '@/services';
import { SecurityEvent } from '@/services/user.service';
import { PageHeading } from '@/widgets';
import UserFilter from '@/widgets/user/UserFilter';
import UserModal from '@/widgets/user/UserModal';
import { Col, Row, Container, Badge, Modal, Table, Button } from 'react-bootstrap';
import { toast } from 'react-toastify';

const headItems = [
  'Ad Soyad',
  'E-posta',
  'Rol',
  'Durum',
  'E-posta Doğrulandı',
  'Üyelik Tarihi',
  ''
];

function SecurityEventsModal({ userId, userName, onClose }: { userId: string; userName: string; onClose: () => void }) {
  const [items, setItems] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    setLoading(true);
    userService.getSecurityEvents(userId)
      .then(setItems)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [userId]);

  const eventTypeText = (type: string) => {
    const map: Record<string, string> = {
      LOGIN_SUCCESS: 'Giriş Başarılı',
      LOGIN_FAILURE: 'Giriş Başarısız',
      LOGOUT: 'Çıkış',
      SESSION_REVOKED: 'Oturum Sonlandırıldı',
      ALL_SESSIONS_REVOKED: 'Tüm Oturumlar Sonlandırıldı',
      REFRESH_REPLAY_DETECTED: 'Yenileme Tekrarı Algılandı',
      PASSWORD_CHANGE: 'Şifre Değişikliği',
      PASSWORD_RESET: 'Şifre Sıfırlama',
      EMAIL_VERIFICATION: 'E-posta Doğrulama',
      EMAIL_CHANGE: 'E-posta Değişikliği',
      ROLE_CHANGE: 'Rol Değişikliği',
      ACCOUNT_STATUS_CHANGE: 'Hesap Durumu Değişikliği',
      BO_CONTEXT_REJECTED: 'BO Bağlamı Reddedildi',
    };
    return map[type] ?? type;
  };

  const eventTypeVariant = (type: string) => {
    if (type.includes('FAILURE') || type.includes('REJECTED') || type.includes('REPLAY')) return 'danger';
    if (type.includes('REVOKED')) return 'warning';
    if (type.includes('SUCCESS') || type.includes('VERIFICATION')) return 'success';
    return 'info';
  };

  return (
    <Modal show onHide={onClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{userName} — Güvenlik Logları</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        {loading && <Loading />}
        {!loading && items.length === 0 && <p className="text-muted">Güvenlik kaydı bulunamadı.</p>}
        {!loading && items.length > 0 && (
          <Table striped bordered hover size="sm">
            <thead>
              <tr>
                <th>Olay</th>
                <th>Bağlam</th>
                <th>Tarih</th>
              </tr>
            </thead>
            <tbody>
              {items.map((event) => (
                <tr key={event.id}>
                  <td><Badge bg={eventTypeVariant(event.eventType)}>{eventTypeText(event.eventType)}</Badge></td>
                  <td>{event.clientContext ?? '-'}</td>
                  <td>{formatDateTimeForText(event.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Kapat</Button>
      </Modal.Footer>
    </Modal>
  );
}

export default function Users() {
  const [{ data, isLoading, handleFilter, handlePageChange, refetch }] = useApi<UserResponse>({ service: userService });
  const { isModalOpen, openModal, closeModal, modalContent } = useModal();
  const [openFilter, setOpenFilter] = useState(false);
  const [securityUser, setSecurityUser] = useState<UserResponse | null>(null);

  const openUserModal = (user?: UserResponse) => {
    openModal(<UserModal selectedUser={user} onClose={closeModal} onHandleSave={handleSave} />);
  };

  const handleSave = async (values: UserRequest) => {
    if (!values.identifier) {
      return;
    }

    try {
      if (values.newRole !== values.expectedCurrentRole) {
        await userService.changeRole(values.identifier, values);
      }

      if (values.newStatus !== values.expectedCurrentStatus) {
        await userService.changeStatus(values.identifier, values);
      }

      closeModal();
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const content = data?.content?.map((user) => (
    <tr key={user.identifier}>
      <td>{capitalizeSentence(user.firstName + ' ' + user.lastName)}</td>
      <td>{user.email}</td>
      <td>{getUserRoleText(user.role)}</td>
      <td><StatusBadge status={user.status} /></td>
      <td>{user.emailVerified ? 'Evet' : 'Hayır'}</td>
      <td>{formatDateForText(user.createDate)}</td>
      <td>
        <a
          className="font-medium text-cyan-600 me-5 cp"
          onClick={() => openUserModal(user)}>
          <i className={`fe fe-edit`}></i>
        </a>
        <a className="font-medium text-cyan-600 cp" onClick={() => setSecurityUser(user)}>
          <i className="fe fe-shield"></i>
        </a>
      </td>
    </tr>
  ));

  return (
    <Container fluid className="p-3 lg:p-6">
      <Row>
        <Col lg={12} md={12} sm={12}>
          <PageHeading
            heading='Kullanıcılar'
            showCreateButton={false}
            onToggleFilter={() => setOpenFilter(!openFilter)} />
        </Col>
      </Row>

      {openFilter && <UserFilter onFilter={(values: string) => handleFilter(values)} />}

      {isModalOpen && modalContent}
      {securityUser && <SecurityEventsModal userId={securityUser.identifier!} userName={`${securityUser.firstName} ${securityUser.lastName}`} onClose={() => setSecurityUser(null)} />}

      <PrepareTable
        headItems={headItems}
        content={content}
        isLoading={isLoading}
        page={data?.page}
        onHandlePageChange={(page) => handlePageChange(page)} />

    </Container>
  );
}
