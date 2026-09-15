import { Button, Card, Col, Form, Row, Dropdown } from 'react-bootstrap';
import { useFormik } from 'formik';
import { appendOperator } from '@/helpers/HelperUtils';
import { CommentStatus } from '@/services/comment.service';
import { useState } from 'react';

export type ICommentFilterForm = {
  advertTitle?: string;
  startDate?: string;
  endDate?: string;
  statuses?: CommentStatus[];
};

const initialValues: ICommentFilterForm = {
  advertTitle: '',
  startDate: '',
  endDate: '',
  statuses: [],
};

type IProps = {
  onFilter: (values: ICommentFilterForm) => void;
};

export default function CommentFilter({ onFilter }: IProps) {
  const formik = useFormik({
    initialValues,
    onSubmit: (values) => {
      onFilter(values);
    },
  });

  const handleReset = () => {
    formik.resetForm();
    onFilter(initialValues);
  };

  const toggleStatus = (status: CommentStatus) => {
    const currentStatuses = formik.values.statuses || [];
    let newStatuses;
    if (currentStatuses.includes(status)) {
      newStatuses = currentStatuses.filter((s) => s !== status);
    } else {
      newStatuses = [...currentStatuses, status];
    }
    formik.setFieldValue('statuses', newStatuses);
    setTimeout(() => formik.submitForm(), 0);
  };

  const getStatusText = (status: CommentStatus) => {
    switch (status) {
      case 'PENDING':
        return 'Onay Bekleyenler';
      case 'PUBLISHED':
        return 'Onaylananlar';
      case 'REJECTED':
        return 'Reddedilenler';
      default:
        return status;
    }
  };

  return (
    <Card className="mb-4 shadow-sm border-0 bg-light">
      <Card.Body className="p-3">
        <Form noValidate onSubmit={formik.handleSubmit}>
          <Row className="g-2">
            <Form.Group as={Col} md={4} lg={3}>
              <Form.Label className="small fw-semibold text-secondary mb-1">İlan Adı</Form.Label>
              <Form.Control
                size="sm"
                name="advertTitle"
                onChange={(e) => {
                  formik.handleChange(e);
                  formik.submitForm();
                }}
                value={formik.values.advertTitle ?? ''}
                placeholder="İlan adı ile ara"
              />
            </Form.Group>

            <Form.Group as={Col} md={4} lg={3}>
              <Form.Label className="small fw-semibold text-secondary mb-1">Statü</Form.Label>
              <Dropdown>
                <Dropdown.Toggle variant="white" className={`w-100 text-start d-flex justify-content-between align-items-center shadow-none bg-white form-control form-control-sm ${(formik.values.statuses || []).length === 0 ? 'text-muted' : 'text-secondary'}`}>
                  <span className="text-truncate">
                    {(formik.values.statuses || []).length === 0 
                      ? 'Tüm Durumlar' 
                      : (formik.values.statuses || []).map(getStatusText).join(', ')}
                  </span>
                </Dropdown.Toggle>
                <Dropdown.Menu className="w-100 shadow-sm border-0" style={{ fontSize: '0.875rem' }}>
                  <Dropdown.Item 
                    active={(formik.values.statuses || []).includes('PENDING')}
                    onClick={(e) => { e.preventDefault(); toggleStatus('PENDING'); }}
                  >
                    Onay Bekleyenler
                  </Dropdown.Item>
                  <Dropdown.Item 
                    active={(formik.values.statuses || []).includes('PUBLISHED')}
                    onClick={(e) => { e.preventDefault(); toggleStatus('PUBLISHED'); }}
                  >
                    Onaylananlar
                  </Dropdown.Item>
                  <Dropdown.Item 
                    active={(formik.values.statuses || []).includes('REJECTED')}
                    onClick={(e) => { e.preventDefault(); toggleStatus('REJECTED'); }}
                  >
                    Reddedilenler
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </Form.Group>

            <Form.Group as={Col} md={2} lg={2}>
              <Form.Label className="small fw-semibold text-secondary mb-1">Başlangıç Tarihi</Form.Label>
              <Form.Control
                size="sm"
                type="date"
                name="startDate"
                onChange={(e) => {
                  formik.handleChange(e);
                  setTimeout(() => formik.submitForm(), 0);
                }}
                value={formik.values.startDate ?? ''}
              />
            </Form.Group>

            <Form.Group as={Col} md={2} lg={2}>
              <Form.Label className="small fw-semibold text-secondary mb-1">Bitiş Tarihi</Form.Label>
              <Form.Control
                size="sm"
                type="date"
                name="endDate"
                onChange={(e) => {
                  formik.handleChange(e);
                  setTimeout(() => formik.submitForm(), 0);
                }}
                value={formik.values.endDate ?? ''}
              />
            </Form.Group>

            <Col xs={12} className="d-flex justify-content-end mt-2">
              <Button size="sm" variant="outline-secondary" onClick={handleReset}>
                Filtreleri Temizle
              </Button>
            </Col>
          </Row>
        </Form>
      </Card.Body>
    </Card>
  );
}
