"use client";
import React, { useState } from 'react';
import StatusBadge from '@/components/StatusBadge';
import DeleteModal from '@/components/DeleteModal';
import { formatDateForText } from '@/helpers/DateUtils';
import { capitalizeSentence, getErrorMessage } from '@/helpers/HelperUtils';
import { getUserRoleText } from '@/helpers/EnumUtils';
import useApi from '@/hooks/useApi';
import { UserResponse } from '@/models';
import { userService } from '@/services';
import { PageHeading } from '@/widgets';
import UserFilter from '@/widgets/user/UserFilter';
import UserCreateModal from '@/widgets/user/UserCreateModal';
import UserDetailOffcanvas from '@/widgets/user/UserDetailOffcanvas';
import CustomPagination from '@/components/Pagination';
import { Form } from 'react-bootstrap';
import { Skeleton } from '@/components/Skeleton';
import { Col, Row, Container, Card, Table, Button, Alert } from 'react-bootstrap';
import { Eye, Trash2 } from 'react-feather';
import { toast } from 'react-toastify';

export default function Users() {
  const [{ data, parameters, isLoading, isError, handleFilter, handlePageChange, setParameters, refetch }] = useApi<UserResponse>({
    service: userService,
  });

  const [openFilter, setOpenFilter] = useState(true);
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteUserTarget, setDeleteUserTarget] = useState<UserResponse | null>(null);

  const handleConfirmDelete = async () => {
    if (!deleteUserTarget) return;
    const userId = deleteUserTarget.identifier ?? deleteUserTarget.id;
    try {
      await userService.changeStatus(userId, {
        identifier: userId,
        firstName: deleteUserTarget.firstName,
        lastName: deleteUserTarget.lastName,
        email: deleteUserTarget.email,
        expectedCurrentRole: deleteUserTarget.role,
        newRole: deleteUserTarget.role,
        expectedCurrentStatus: deleteUserTarget.status,
        newStatus: 'DISABLED',
      });
      toast.success('Kullanıcı durumu Pasif olarak güncellendi.');
      setDeleteUserTarget(null);
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const rows = data?.content ?? [];

  return (
    <Container fluid className="page-container">
      <div className="page-heading-wrapper">
        <Row className="mb-3">
          <Col lg={12} md={12} sm={12}>
            <PageHeading
              heading="Kullanıcılar"
              createButtonText="Kullanıcı Ekle"
              onCreate={() => setCreating(true)}
            />
          </Col>
        </Row>
      </div>

      {openFilter && <UserFilter onFilter={(values: string) => handleFilter(values)} />}

      {creating && (
        <UserCreateModal
          onClose={() => setCreating(false)}
          onCreated={() => refetch()}
        />
      )}

      {detailUserId && (
        <UserDetailOffcanvas
          userId={detailUserId}
          onClose={() => setDetailUserId(null)}
          onUpdated={() => refetch()}
        />
      )}

      {deleteUserTarget && (
        <DeleteModal
          onClose={() => setDeleteUserTarget(null)}
          onHandleDelete={handleConfirmDelete}
        />
      )}

      {isError && (
        <Alert variant="danger" className="d-flex justify-content-between align-items-center mb-3">
          <span>Kullanıcılar yüklenirken bir hata oluştu.</span>
          <Button size="sm" variant="outline-danger" onClick={() => refetch()}>Tekrar Dene</Button>
        </Alert>
      )}

      {!isError && (
        <div className="table-wrapper">
          <Card className="border-0 shadow-sm position-relative">
            <Card.Body className="p-0">
              <div className="table-box">
                <div className="table-responsive">
                  <Table hover className="mb-0 align-middle" size="sm">
                    <thead>
                      <tr>
                        <th style={{ width: '25%' }}>AD SOYAD</th>
                        <th style={{ width: '25%' }}>E-POSTA</th>
                        <th style={{ width: '15%' }}>ROL</th>
                        <th style={{ width: '15%' }}>DURUM</th>
                        <th style={{ width: '10%' }}>KAYIT TARİHİ</th>
                        <th className="text-end" style={{ width: '10%' }}>İŞLEMLER</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        Array.from({ length: 5 }).map((_, rowIdx) => (
                          <tr key={`sk-row-${rowIdx}`}>
                            <td><Skeleton width="75%" height="1rem" /></td>
                            <td><Skeleton width="60%" height="1rem" /></td>
                            <td><Skeleton width="50%" height="1rem" /></td>
                            <td><Skeleton width="40%" height="1rem" /></td>
                            <td><Skeleton width="50%" height="1rem" /></td>
                            <td className="text-end"><Skeleton width="60px" height="1rem" /></td>
                          </tr>
                        ))
                      ) : rows.length > 0 ? (
                        rows.map((user) => {
                          const id = user.identifier ?? user.id;
                          return (
                            <tr key={id}>
                              <td className="fw-medium text-dark">
                                {capitalizeSentence(user.firstName + ' ' + user.lastName)}
                              </td>
                              <td>{user.email}</td>
                              <td>{getUserRoleText(user.role)}</td>
                              <td><StatusBadge status={user.status} /></td>
                              <td>{formatDateForText(user.createdAt)}</td>
                              <td className="text-end">
                                <Button
                                  variant="outline-info"
                                  className="me-2 d-inline-flex align-items-center justify-content-center p-0"
                                  style={{ width: '28px', height: '28px' }}
                                  title="Detay"
                                  aria-label="Kullanıcı detayı"
                                  onClick={() => setDetailUserId(id!)}
                                >
                                  <Eye size={14} />
                                </Button>
                                <Button
                                  variant="outline-danger"
                                  className="d-inline-flex align-items-center justify-content-center p-0"
                                  style={{ width: '28px', height: '28px' }}
                                  title="Sil"
                                  aria-label="Kullanıcıyı pasife al"
                                  onClick={() => setDeleteUserTarget(user)}
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="text-center py-4 text-muted">
                            Henüz kullanıcı bulunamadı. Yeni kullanıcı ekleyebilirsiniz.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>
              </div>
            </Card.Body>
          </Card>
        </div>
      )}

      {!isLoading && !isError && rows.length > 0 && (
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-3 mt-3 pt-3">
          <div className="d-flex flex-wrap align-items-center justify-content-center justify-content-md-start gap-2 text-muted small w-100 w-md-auto">
            <span className="text-nowrap fw-medium">Sayfa başına:</span>
            <Form.Select 
              size="sm" 
              className="rounded-2 shadow-none border text-center fw-medium" 
              style={{ width: '85px', minWidth: '85px', display: 'inline-block', cursor: 'pointer' }} 
              value={parameters?.pageRequest?.size || 10} 
              onChange={(e) => setParameters({ ...parameters, pageRequest: { ...parameters.pageRequest, size: Number(e.target.value), page: 0 } })}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </Form.Select>
            <span className="text-nowrap ms-md-2">
              Toplam <strong>{data?.page?.totalElements ?? 0}</strong> kayıt (Sayfa {(parameters?.pageRequest?.page ?? 0) + 1} / {data?.page?.totalPages ?? 1})
            </span>
          </div>
          
          <div className="d-flex justify-content-center align-items-center w-100 w-md-auto overflow-auto">
            <CustomPagination page={data?.page} onPageChange={handlePageChange} />
          </div>
        </div>
      )}
    </Container>
  );
}
