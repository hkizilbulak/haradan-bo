"use client"
import React, { useState, useEffect, useCallback } from 'react';
import { Alert, Badge, Button, Container, Row, Col, Tabs, Tab, Modal } from 'react-bootstrap';
import Loading from '@/components/Loading';
import PrepareTable from '@/components/PrepareTable';
import { formatDateTimeForText } from '@/helpers/DateUtils';
import { commentService, AdvertComment, CommentStatus } from '@/services/comment.service';
import { PageHeading } from '@/widgets';
import { toast } from 'react-toastify';
import { getErrorMessage } from '@/helpers/HelperUtils';

const headItems = ['Tarih', 'Kullanıcı', 'Yorum', 'Durum', 'İşlemler'];

export default function CommentsPage() {
  const [activeTab, setActiveTab] = useState<CommentStatus>('PENDING');
  const [comments, setComments] = useState<AdvertComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);

  const fetchComments = useCallback(async (status: CommentStatus) => {
    setIsLoading(true);
    try {
      // In a real app we might handle pagination. For now, fetch first page.
      const data = await commentService.getComments(status, 1, 50);
      setComments(data.items || []);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComments(activeTab);
  }, [activeTab, fetchComments]);

  const handleApprove = async (id: string) => {
    try {
      await commentService.approveComment(id);
      toast.success('Yorum onaylandı');
      fetchComments(activeTab);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleReject = async (id: string) => {
    try {
      await commentService.rejectComment(id);
      toast.success('Yorum reddedildi');
      fetchComments(activeTab);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const requestDelete = (id: string) => {
    setCommentToDelete(id);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!commentToDelete) return;
    try {
      await commentService.deleteComment(commentToDelete);
      toast.success('Yorum silindi');
      fetchComments(activeTab);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setDeleteModalOpen(false);
      setCommentToDelete(null);
    }
  };

  const content = comments.map((cmt) => (
    <tr key={cmt.id}>
      <td>{formatDateTimeForText(cmt.createdAt)}</td>
      <td>{cmt.authorName || 'Bilinmiyor'}</td>
      <td style={{ maxWidth: '300px', whiteSpace: 'normal' }}>
        {cmt.content}
        {cmt.rating && <div><Badge bg="secondary">Puan: {cmt.rating}/5</Badge></div>}
      </td>
      <td>
        {cmt.status === 'PENDING' && <Badge bg="warning">Onay Bekliyor</Badge>}
        {cmt.status === 'PUBLISHED' && <Badge bg="success">Onaylandı</Badge>}
        {cmt.status === 'REJECTED' && <Badge bg="danger">Reddedildi</Badge>}
      </td>
      <td className="text-nowrap">
        <div className="d-flex flex-wrap gap-1">
          {cmt.status === 'PENDING' && (
            <>
              <Button size="sm" variant="outline-success" onClick={() => handleApprove(cmt.id)}>
                Onayla
              </Button>
              <Button size="sm" variant="outline-danger" onClick={() => handleReject(cmt.id)}>
                Reddet
              </Button>
            </>
          )}
          <Button size="sm" variant="outline-dark" onClick={() => requestDelete(cmt.id)}>
            <i className="fe fe-trash-2"></i> Sil
          </Button>
        </div>
      </td>
    </tr>
  ));

  return (
    <Container fluid className="p-3 lg:p-6">
      <Row>
        <Col lg={12}>
          <PageHeading heading="Yorum Yönetimi" showCreateButton={false} />
        </Col>
      </Row>

      <Row className="mb-3">
        <Col>
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => setActiveTab((k as CommentStatus) || 'PENDING')}
            className="mb-3"
          >
            <Tab eventKey="PENDING" title="Onay Bekleyenler" />
            <Tab eventKey="PUBLISHED" title="Onaylananlar" />
            <Tab eventKey="REJECTED" title="Reddedilenler" />
          </Tabs>
        </Col>
      </Row>

      {isLoading && <Loading />}
      {!isLoading && comments.length === 0 && (
        <Alert variant="light" className="border text-muted">
          Bu sekmede yorum bulunamadı.
        </Alert>
      )}
      {!isLoading && comments.length > 0 && (
        <PrepareTable
          headItems={headItems}
          content={content}
          page={undefined}
          onHandlePageChange={() => undefined}
        />
      )}

      <Modal show={deleteModalOpen} onHide={() => setDeleteModalOpen(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Yorumu Sil</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Bu yorumu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>
            İptal
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            Sil
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
