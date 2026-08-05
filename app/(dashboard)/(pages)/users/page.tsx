"use client"
import React, { useState } from 'react';
import Loading from '@/components/Loading';
import PrepareTable from '@/components/PrepareTable';
import StatusBadge from '@/components/StatusBadge';
import { formatDateForText } from '@/helpers/DateUtils';
import { getChannelTypeEnumText } from '@/helpers/EnumUtils';
import { capitalizeSentence, getErrorMessage } from '@/helpers/HelperUtils';
import useApi from '@/hooks/useApi';
import useModal from '@/hooks/useModal';
import { UserRequest, UserResponse } from '@/models';
import { userService } from '@/services';
import { PageHeading } from '@/widgets';
import UserFilter from '@/widgets/user/UserFilter';
import UserModal from '@/widgets/user/UserModal';
import { Col, Row, Container } from 'react-bootstrap';
import { PatternFormat } from 'react-number-format';
import { toast } from 'react-toastify';

const headItems = [
  'Ad Soyad',
  'Üyelik Tarihi',
  'E-posta Adresi',
  'Telefon No',
  'Kanal',
  'Durum',
  ''
]

export default function Users() {
  const [{ data, isLoading, handleFilter, handlePageChange, refetch }] = useApi<UserResponse>({ service: userService });
  const { isModalOpen, openModal, closeModal, modalContent } = useModal();
  const [openFilter, setOpenFilter] = useState(false);

  const openUserModal = (user?: UserResponse) => {
    openModal(<UserModal selectedUser={user} onClose={closeModal} onHandleSave={handleSave} />)
  }

  const handleSave = async (values: UserRequest) => {
    try {
      if (values.identifier !== undefined && values.identifier !== '') {
        await userService.update(values);
      } else {
        await userService.save(values);
      }
      closeModal()
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error))
    }

  }

  const content = data?.content?.map((user) => (
    <tr key={user.identifier}>
      <td>{capitalizeSentence(user.firstName + ' ' + user.lastName)}</td>
      <td>{formatDateForText(user.createDate)}</td>
      <td>{user.email}</td>
      <td><PatternFormat value={user.phoneNumber} displayType="text" format="0(###) ### ####" /></td>
      <td>{getChannelTypeEnumText(user.channel)}</td>
      <td><StatusBadge status={user.status} /></td>
      <td>
        <a
          className="font-medium text-cyan-600 me-5 cp"
          onClick={() => openUserModal(user)}>
          <i className={`fe fe-edit`}></i>
        </a></td>
    </tr >));

  return (

    <Container fluid className="p-3 lg:p-6">
      <Row>
        <Col lg={12} md={12} sm={12}>
          <PageHeading
            heading='Kullanıcılar'
            createButtonText='Kullanıcı Ekle'
            onCreate={() => openUserModal(undefined)}
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
