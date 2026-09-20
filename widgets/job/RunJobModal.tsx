"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Button, Form, Spinner } from 'react-bootstrap';
import { Job } from '@/models/job-models';

type RunMode = 'now' | 'past';

interface RunJobModalProps {
  show: boolean;
  job: Job;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (referenceDate?: string, pageNumber?: number) => void;
}

function formatDateForDisplay(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}.${month}.${year}`;
  }
  return dateStr;
}

function todayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function RunJobModal({
  show,
  job,
  loading = false,
  onClose,
  onConfirm,
}: RunJobModalProps) {
  const [runMode, setRunMode] = useState<RunMode>('now');
  const [referenceDate, setReferenceDate] = useState('');
  const [pageNumber, setPageNumber] = useState('');

  const supportsPastDate = Boolean(job.supports_reference_date || job.supportsReferenceDate);
  const isTjkJob =
    job.key === 'TJK_SYNC' ||
    job.job_key === 'TJK_SYNC' ||
    job.jobType === 'TJK_SYNC' ||
    job.job_type === 'TJK_SYNC';
  const supportsPageNumber = Boolean(
    job.supports_page_number !== undefined
      ? job.supports_page_number
      : job.supportsPageNumber !== undefined
      ? job.supportsPageNumber
      : isTjkJob
  );

  useEffect(() => {
    if (show) {
      setRunMode('now');
      setReferenceDate('');
      setPageNumber('');
    }
  }, [show, job?.id]);

  const confirmDisabled = useMemo(() => {
    if (loading) return true;
    if (runMode === 'past') {
      if (!referenceDate) return true;
    }
    if (supportsPageNumber && pageNumber.trim() !== '') {
      const p = parseInt(pageNumber, 10);
      if (isNaN(p) || p < 0) return true;
    }
    return false;
  }, [loading, runMode, referenceDate, supportsPageNumber, pageNumber]);

  const message = useMemo(() => {
    const parsedPage = supportsPageNumber && pageNumber.trim() !== '' ? parseInt(pageNumber, 10) : 0;
    const pageSuffix = parsedPage > 0 ? ` (${parsedPage}. sayfadan başlayarak)` : '';

    if (runMode === 'past' && referenceDate) {
      return `"${job.name}" görevi ${formatDateForDisplay(referenceDate)} tarihi için${pageSuffix} çalıştırılacak. Devam etmek istediğinizden emin misiniz?`;
    }
    return `"${job.name}" görevi şimdi${pageSuffix} çalıştırılacak. Devam etmek istediğinizden emin misiniz?`;
  }, [job.name, runMode, referenceDate, supportsPageNumber, pageNumber]);

  const handleConfirm = () => {
    if (confirmDisabled) return;
    const parsedPage = supportsPageNumber && pageNumber.trim() !== '' ? parseInt(pageNumber, 10) : undefined;
    const validPage = parsedPage !== undefined && !isNaN(parsedPage) && parsedPage >= 0 ? parsedPage : undefined;
    if (runMode === 'past') {
      onConfirm(referenceDate, validPage);
      return;
    }
    onConfirm(undefined, validPage);
  };

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton={!loading}>
        <Modal.Title>Görevi Çalıştır</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="mb-3">{message}</p>

        {supportsPastDate && (
          <Form.Group className="mb-3 bg-light p-3 rounded">
            <Form.Check
              type="radio"
              id={`run-mode-now-${job.id}`}
              name="runMode"
              label="Şimdi çalıştır"
              checked={runMode === 'now'}
              onChange={() => setRunMode('now')}
              disabled={loading}
              className="mb-2"
            />
            <Form.Check
              type="radio"
              id={`run-mode-past-${job.id}`}
              name="runMode"
              label="Geçmiş / Referans tarih için çalıştır"
              checked={runMode === 'past'}
              onChange={() => setRunMode('past')}
              disabled={loading}
              className="mb-2"
            />
            {runMode === 'past' && (
              <div className="mt-2">
                <Form.Label className="small fw-bold">Referans Tarihi</Form.Label>
                <Form.Control
                  type="date"
                  name="reference_date"
                  value={referenceDate}
                  onChange={(e) => setReferenceDate(e.target.value)}
                  max={todayISO()}
                  required
                  disabled={loading}
                />
              </div>
            )}
          </Form.Group>
        )}

        {supportsPageNumber && (
          <div className="bg-light p-3 rounded">
            <Form.Label className="small fw-bold">Başlangıç Sayfa Numarası (PageNumber)</Form.Label>
            <Form.Control
              type="number"
              min={0}
              step={1}
              placeholder="0 (Varsayılan: baştan başlar)"
              value={pageNumber}
              onChange={(e) => setPageNumber(e.target.value)}
              disabled={loading}
            />
            <Form.Text className="text-muted small">
              Senkronizasyonun başlayacağı sayfa numarası (0-tabanlı). Boş bırakılırsa 0 kabul edilir.
            </Form.Text>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          Vazgeç
        </Button>
        <Button variant="success" onClick={handleConfirm} disabled={confirmDisabled}>
          {loading ? (
            <>
              <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
              Çalıştırılıyor...
            </>
          ) : (
            'Çalıştır'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
