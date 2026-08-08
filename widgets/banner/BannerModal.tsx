import { Alert, Button, Col, Form, Offcanvas, Spinner } from 'react-bootstrap';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { useState } from 'react';
import { BannerRequest, BannerResponse } from '@/models';
import { mediaService } from '@/services/media.service';
import { buildMediaUrl } from '@/contants/urls';
import { getErrorMessage } from '@/helpers/HelperUtils';
import { toast } from 'react-toastify';

const initialValues: BannerRequest = {
  identifier: '',
  assetId: '',
  placement: 'HOMEPAGE',
  title: '',
  altText: '',
  targetUrl: '',
  expectedVersion: undefined,
};

const placementContext = {
  HOMEPAGE: {
    title: 'Ana Sayfa',
    description: 'Ana sayfadaki geniş tanıtım alanında gösterilir.',
    aspect: 'Geniş yatay görsel önerilir (yaklaşık 16:6).',
  },
  LISTING_DETAIL: {
    title: 'İlan Detay',
    description: 'İlan detay sayfasındaki tanıtım alanında gösterilir.',
    aspect: 'Yatay görsel önerilir (yaklaşık 16:9).',
  },
  SEARCH: {
    title: 'Arama',
    description: 'Arama sonuçları arasındaki tanıtım alanında gösterilir.',
    aspect: 'Geniş yatay görsel önerilir (yaklaşık 3:1).',
  },
} as const;

type IProps = {
  selectedBanner?: BannerResponse;
  onClose: () => void;
  onHandleSave: (value: BannerRequest) => void;
};

export default function BannerModal({ selectedBanner, onClose, onHandleSave }: IProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState<'UPLOADING' | 'PROCESSING'>('UPLOADING');

  const validationSchema = Yup.object().shape({
    assetId: Yup.string().required('Görsel zorunludur'),
    placement: Yup.string().required('Yerleşim zorunludur'),
  });

  const values: BannerRequest = selectedBanner
    ? {
        identifier: selectedBanner.identifier ?? selectedBanner.id ?? '',
        expectedVersion: selectedBanner.version,
        assetId: selectedBanner.assetId,
        placement: selectedBanner.placement,
        title: selectedBanner.title ?? '',
        altText: selectedBanner.altText ?? '',
        targetUrl: selectedBanner.targetUrl ?? '',
        sortOrder: selectedBanner.sortOrder,
      }
    : initialValues;

  return (
    <Offcanvas show={true} onHide={onClose} scroll={true} placement={'end'}>
      <Offcanvas.Header closeButton>
        <Offcanvas.Title>{selectedBanner ? 'Banner Düzenle' : 'Yeni Banner Ekle'}</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
        <Formik initialValues={values} validationSchema={validationSchema} onSubmit={onHandleSave}>
          {({ handleSubmit, handleChange, values, setFieldValue, isValid, isSubmitting }) => (
            <Form noValidate onSubmit={handleSubmit}>
              {(() => {
                const context = placementContext[values.placement];
                return (
                  <Alert variant="light" className="border">
                    <strong>{context.title}</strong>
                    <div>{context.description}</div>
                    <div className="small text-muted">{context.aspect}</div>
                  </Alert>
                );
              })()}
              <Form.Group as={Col} md={12} className="mb-3">
                <Form.Label>Yerleşim</Form.Label>
                <Form.Select name="placement" value={values.placement} onChange={handleChange} disabled={!!selectedBanner}>
                  <option value="HOMEPAGE">Ana Sayfa</option>
                  <option value="LISTING_DETAIL">İlan Detay</option>
                  <option value="SEARCH">Arama</option>
                </Form.Select>
                {selectedBanner && (
                  <Form.Text muted>Yerleşim oluşturma sonrası değiştirilemez.</Form.Text>
                )}
                {!selectedBanner && (
                  <Form.Text muted>Yeni banner ilgili yerleşimin sonuna eklenir. Sıra listeden düzenlenir.</Form.Text>
                )}
              </Form.Group>
              <Form.Group as={Col} md={12} className="mb-3">
                <Form.Label>Görsel Yükle</Form.Label>
                <Form.Control
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploading}
                  onChange={async (event) => {
                    const input = event.currentTarget as unknown as HTMLInputElement;
                    const file = input.files?.[0];
                    if (!file) {
                      return;
                    }
                    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
                      toast.error('Yalnızca JPEG, PNG veya WebP görseller yüklenebilir.');
                      input.value = '';
                      return;
                    }
                    setUploading(true);
                    setUploadStage('UPLOADING');
                    try {
                      const status = await mediaService.uploadAdminAsset(file, { onStageChange: setUploadStage });
                      await setFieldValue('assetId', status.assetId);
                      toast.success('Görsel yüklendi');
                    } catch (error) {
                      toast.error(getErrorMessage(error));
                    } finally {
                      setUploading(false);
                      input.value = '';
                    }
                  }}
                />
                {uploading && (
                  <div className="mt-2 d-flex align-items-center gap-2 text-muted">
                    <Spinner size="sm" animation="border" />
                    <span>{uploadStage === 'UPLOADING' ? 'Görsel yükleniyor…' : 'Görsel işleniyor ve önizleme hazırlanıyor…'}</span>
                  </div>
                )}
              </Form.Group>
              {values.assetId && (
                <div className="mb-3">
                  <Form.Label>Önizleme</Form.Label>
                  <div className="border rounded overflow-hidden bg-dark d-flex align-items-center justify-content-center" style={{ aspectRatio: '16 / 6' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={buildMediaUrl(values.assetId, 'BANNER')}
                      alt={values.altText || values.title || 'Banner önizleme'}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                </div>
              )}
              <Form.Group as={Col} md={12} className="mb-3">
                <Form.Label>Başlık</Form.Label>
                <Form.Control name="title" value={values.title ?? ''} onChange={handleChange} />
              </Form.Group>
              <Form.Group as={Col} md={12} className="mb-3">
                <Form.Label>Alt Metin</Form.Label>
                <Form.Control name="altText" value={values.altText ?? ''} onChange={handleChange} />
              </Form.Group>
              <Form.Group as={Col} md={12} className="mb-3">
                <Form.Label>Yönlendirme URL</Form.Label>
                <Form.Control name="targetUrl" value={values.targetUrl ?? ''} onChange={handleChange} />
              </Form.Group>
              <Button
                disabled={!isValid || isSubmitting || uploading}
                variant="primary"
                as="input"
                type="submit"
                value={selectedBanner ? 'Güncelle' : 'Ekle'}
              />
            </Form>
          )}
        </Formik>
      </Offcanvas.Body>
    </Offcanvas>
  );
}
