"use client"
import React, { useState } from 'react';
import Loading from '@/components/Loading';
import PrepareTable from '@/components/PrepareTable';
import StatusBadge from '@/components/StatusBadge';
import { formatDateForText } from '@/helpers/DateUtils';
import { capitalizeSentence, getErrorMessage } from '@/helpers/HelperUtils';
import { getUserRoleText } from '@/helpers/EnumUtils';
import useApi from '@/hooks/useApi';
import useModal from '@/hooks/useModal';
import { UserRequest, UserResponse } from '@/models';
import { userService } from '@/services';
import { PageHeading } from '@/widgets';
import UserFilter from '@/widgets/user/UserFilter';
import UserModal from '@/widgets/user/UserModal';
import { Col, Row, Container } from 'react-bootstrap';
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

export default function Users() {
  const [{ data, isLoading, handleFilter, handlePageChange, refetch }] = useApi<UserResponse>({ service: userService });
  const { isModalOpen, openModal, closeModal, modalContent } = useModal();
  const [openFilter, setOpenFilter] = useState(false);

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

      {isLoading && <Loading />}

      {!isLoading && <PrepareTable
        headItems={headItems}
        content={content}
        page={data?.page}
        onHandlePageChange={(page) => handlePageChange(page)} />}
    </Container>
  );
}
