"use client"
import React, { useState, useEffect, useCallback } from 'react';
import { Alert, Badge, Button, Container, Row, Col, Tabs, Tab, Modal, Card } from 'react-bootstrap';
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

  const fetchComments = useCallback(async (status: CommentStatus, pageIndex: number, limit: number) => {
    setIsLoading(true);
    try {
      const data = await commentService.getComments(status, pageIndex + 1, limit);
      setComments(data.items || []);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComments(activeTab, 0, 50);
  }, [activeTab, fetchComments]);

  const handleApprove = async (id: string) => {
    try {
      await commentService.approveComment(id);
      toast.success('Yorum onaylandı');
      fetchComments(activeTab, 0, 50);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleReject = async (id: string) => {
    try {
      await commentService.rejectComment(id);
      toast.success('Yorum reddedildi');
      fetchComments(activeTab, 0, 50);
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
      fetchComments(activeTab, 0, 50);
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
      <td className="text-center">
        <div className="d-flex flex-wrap gap-2 justify-content-center align-items-center">
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
          <Button 
            size="sm" 
            variant="outline-danger" 
            className="d-flex align-items-center justify-content-center"
            style={{ width: '32px', height: '32px', padding: 0 }}
            title="Sil"
            onClick={() => requestDelete(cmt.id)}
          >
            <i className="fe fe-trash-2"></i>
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
        <Card className="border-0 shadow-sm rounded-3 overflow-hidden mb-3">
          <PrepareTable
            headItems={headItems}
            content={content}
            page={undefined}
            onHandlePageChange={() => undefined}
          />
        </Card>
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
