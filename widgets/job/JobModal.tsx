"use client";
import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { Job } from '@/models/job-models';
import { jobService } from '@/services/job.service';
import { getErrorMessage } from '@/helpers/HelperUtils';

interface JobModalProps {
  show: boolean;
  job?: Job | null;
  onHide: () => void;
  onSave: () => void;
}

function inferJobType(key: string): string {
  const upper = (key || '').toUpperCase();
  if (upper.includes('PACKAGE') || upper.includes('EXPIRY')) {
    return 'PACKAGE_EXPIRY_SCAN';
  }
  if (upper.includes('MEDIA') || upper.includes('RECONCILE')) {
    return 'MEDIA_RECONCILE';
  }
  return 'TJK_SYNC';
}

const JobModal = ({ show, job, onHide, onSave }: JobModalProps) => {
  const isEdit = Boolean(job);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    key: '',
    name: '',
    description: '',
    cron_expression: '0 0 9 * * *',
    is_active: true,
    timeout_second: 3600,
    supports_reference_date: true,
    supports_page_number: true,
  });

  useEffect(() => {
    if (show) {
      if (job) {
        setFormData({
          key: job.key || job.job_key || '',
          name: job.name || '',
          description: job.description || '',
          cron_expression: job.cron_expression || job.cronExpression || '0 0 9 * * *',
          is_active: (job.is_active !== undefined ? job.is_active : job.isActive) ?? true,
          timeout_second: job.timeout_seconds || job.timeoutSeconds || job.timeout_second || 3600,
          supports_reference_date: (job.supports_reference_date !== undefined ? job.supports_reference_date : job.supportsReferenceDate) ?? false,
          supports_page_number: (job.supports_page_number !== undefined ? job.supports_page_number : job.supportsPageNumber) ?? false,
        });
      } else {
        setFormData({
          key: '',
          name: '',
          description: '',
          cron_expression: '0 0 9 * * *',
          is_active: true,
          timeout_second: 3600,
          supports_reference_date: true,
          supports_page_number: true,
        });
      }
    }
  }, [show, job]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type } = target;
    const checked = target.checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value ? parseInt(value, 10) : 0,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEdit && job) {
        await jobService.updateJob(job.id, {
          expected_version: job.version,
          cron_expression: formData.cron_expression,
          is_active: formData.is_active,
          timeout_seconds: formData.timeout_second,
          supports_reference_date: formData.supports_reference_date,
          supports_page_number: formData.supports_page_number,
        });
        toast.success('Görev başarıyla güncellendi');
      } else {
        const key = formData.key.trim().toUpperCase();
        await jobService.createJob({
          key,
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          jobType: inferJobType(key),
          cronExpression: formData.cron_expression.trim(),
          isActive: formData.is_active,
          timeoutSeconds: formData.timeout_second,
          supportsReferenceDate: formData.supports_reference_date,
          supportsPageNumber: formData.supports_page_number,
        });
        toast.success('Yeni görev başarıyla oluşturuldu');
      }
      onSave();
      onHide();
    } catch (error: any) {
      const msg = getErrorMessage(error) || (isEdit ? 'Güncelleme sırasında hata oluştu' : 'Görev oluşturulurken hata oluştu');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>{isEdit ? `Görevi Düzenle: ${job?.name}` : 'Yeni Görev Tanımla'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {!isEdit && (
            <>
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">İş Anahtarı (Key) <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="text"
                  name="key"
                  placeholder="Örn: TJK_SYNC_MANUAL veya TJK_SYNC_DAILY"
                  value={formData.key}
                  onChange={handleChange}
                  required
                />
                <Form.Text className="text-muted">
                  Benzersiz görev anahtarı (Büyük harf ve alt çizgi önerilir).
                </Form.Text>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">Görev Adı <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="text"
                  name="name"
                  placeholder="Örn: Günlük TJK Senkronizasyonu"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">Açıklama</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  name="description"
                  placeholder="Görevin amacı hakkında kısa açıklama..."
                  value={formData.description}
                  onChange={handleChange}
                />
              </Form.Group>
            </>
          )}

          {isEdit && (
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">İş Anahtarı (Job Key)</Form.Label>
              <Form.Control
                type="text"
                value={job?.job_key || job?.key || ''}
                disabled
              />
              <Form.Text className="text-muted">Job key değiştirilemez.</Form.Text>
            </Form.Group>
          )}

          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold">Cron İfadesi <span className="text-danger">*</span></Form.Label>
            <Form.Control
              type="text"
              name="cron_expression"
              value={formData.cron_expression}
              onChange={handleChange}
              required
            />
            <Form.Text className="text-muted">
              6 alanlı cron formatı (saniye dahil). Örn: <code>0 0 9 * * *</code> (Her sabah 09:00:00) veya <code>0 */30 * * * *</code> (Her 30 dakikada bir).
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold">Timeout Süresi (Saniye) <span className="text-danger">*</span></Form.Label>
            <Form.Control
              type="number"
              name="timeout_second"
              value={formData.timeout_second}
              onChange={handleNumberChange}
              required
              min="1"
              max="86400"
            />
            <Form.Text className="text-muted">
              Maksimum çalışma süresi. Bu süreyi aşarsa görev zaman aşımına uğratılır (Varsayılan 3600 sn = 1 saat).
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Check
              type="switch"
              id="supports_ref_date_switch"
              label="Referans Tarih Desteklesin mi? (Geçmişe yönelik manuel çalıştırma izni)"
              name="supports_reference_date"
              checked={formData.supports_reference_date}
              onChange={handleChange}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Check
              type="switch"
              id="supports_page_number_switch"
              label="Sayfa Numarası Desteklesin mi? (Belirli sayfadan başlatma izni)"
              name="supports_page_number"
              checked={formData.supports_page_number}
              onChange={handleChange}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Check
              type="switch"
              id="is_active_switch"
              label="Aktif / Pasif (Zamanlanmış otomatik tetikleme açık olsun mu?)"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={loading}>
            İptal
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? (isEdit ? 'Kaydediliyor...' : 'Oluşturuluyor...') : (isEdit ? 'Kaydet' : 'Görevi Oluştur')}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default JobModal;
