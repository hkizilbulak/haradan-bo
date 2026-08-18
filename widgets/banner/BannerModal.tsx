import { Alert, Button, Col, Form, Offcanvas, Spinner } from 'react-bootstrap';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { useState } from 'react';
import { BannerRequest, BannerResponse } from '@/models';
import { mediaService } from '@/services/media.service';
import { buildMediaUrl } from '@/contants/urls';
import { getErrorMessage } from '@/helpers/HelperUtils';
import { optimizeBannerImage } from '@/helpers/imageAutoFit';
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
    description: 'Ana sayfadaki öne çıkanlar altı yatay reklam kartında veya üstteki hero slayt alanında gösterilir.',
    aspect: 'Yatay reklam kartında görsel sağda yer alır. Hero alanında ise geniş slayt formatında sunulur.',
  },
  LISTING_DETAIL: {
    title: 'İlan Detay',
    description: 'İlan detay sayfasındaki 16:9 tanıtım alanında gösterilir.',
    aspect: 'İlan detay sayfalarında 16:9 formatında görsel kart olarak sunulur.',
  },
  SEARCH: {
    title: 'Arama Sonuçları',
    description: 'Arama sonuçları arasındaki kompakt tanıtım şeridinde gösterilir.',
    aspect: 'Arama listeleme ekranında 3:1 kompakt yatay şerit olarak sunulur.',
  },
} as const;

type IProps = {
  selectedBanner?: BannerResponse;
  onClose: () => void;
  onHandleSave: (value: BannerRequest) => void;
};

export default function BannerModal({ selectedBanner, onClose, onHandleSave }: IProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState<'OPTIMIZING' | 'UPLOADING' | 'PROCESSING'>('UPLOADING');
  const [homepagePreviewMode, setHomepagePreviewMode] = useState<'HORIZONTAL_AD' | 'HERO_SLIDER'>('HORIZONTAL_AD');

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
                    setUploadStage('OPTIMIZING');
                    try {
                      const optimizedFile = await optimizeBannerImage(file);
                      setUploadStage('UPLOADING');
                      const status = await mediaService.uploadAdminAsset(optimizedFile, { onStageChange: setUploadStage });
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
                    <span>
                      {uploadStage === 'OPTIMIZING'
                        ? 'Görsel optimize ediliyor…'
                        : uploadStage === 'UPLOADING'
                        ? 'Görsel yükleniyor…'
                        : 'Görsel işleniyor ve önizleme hazırlanıyor…'}
                    </span>
                  </div>
                )}
              </Form.Group>
              {values.assetId && (
                <div className="mb-3">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <Form.Label className="mb-0">Canlı Görünüm Önizleme</Form.Label>
                    {values.placement === 'HOMEPAGE' && (
                      <div className="btn-group btn-group-sm" role="group">
                        <button
                          type="button"
                          className={`btn ${homepagePreviewMode === 'HORIZONTAL_AD' ? 'btn-primary' : 'btn-outline-secondary'}`}
                          onClick={() => setHomepagePreviewMode('HORIZONTAL_AD')}
                        >
                          Yatay Reklam
                        </button>
                        <button
                          type="button"
                          className={`btn ${homepagePreviewMode === 'HERO_SLIDER' ? 'btn-primary' : 'btn-outline-secondary'}`}
                          onClick={() => setHomepagePreviewMode('HERO_SLIDER')}
                        >
                          Hero Slayt
                        </button>
                      </div>
                    )}
                  </div>

                  {values.placement === 'HOMEPAGE' && homepagePreviewMode === 'HORIZONTAL_AD' && (
                    <div className="border rounded overflow-hidden shadow-sm bg-dark" style={{ width: '100%', aspectRatio: '6 / 1' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={buildMediaUrl(values.assetId, 'BANNER')}
                        alt={values.altText || values.title || 'Yatay Reklam Afişi'}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  )}

                  {values.placement === 'HOMEPAGE' && homepagePreviewMode === 'HERO_SLIDER' && (
                    <div
                      className="p-3 border rounded d-flex align-items-center justify-content-between text-white shadow-sm"
                      style={{ backgroundColor: '#161c24', minHeight: 120, gap: 16 }}
                    >
                      <div className="d-flex flex-column gap-2" style={{ flex: 1, minWidth: 0 }}>
                        <span className="badge bg-secondary align-self-start small text-uppercase">
                          {values.altText || 'Hipodrom hazırlığı'}
                        </span>
                        <h6 className="mb-0 text-white fw-bold">
                          {values.title || 'Satılık yarış atları'}
                        </h6>
                        <div>
                          <span className="badge bg-primary px-3 py-1 small">İlanları gör →</span>
                        </div>
                      </div>
                      <div
                        className="rounded overflow-hidden bg-dark flex-shrink-0 d-flex align-items-center justify-content-center border border-secondary"
                        style={{ width: 140, height: 95 }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={buildMediaUrl(values.assetId, 'BANNER')}
                          alt={values.altText || values.title || 'Hero Görseli'}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                    </div>
                  )}

                  {values.placement === 'LISTING_DETAIL' && (
                    <div
                      className="border rounded text-white overflow-hidden shadow-sm"
                      style={{ backgroundColor: '#1e2430' }}
                    >
                      <div
                        className="d-flex align-items-center justify-content-center bg-dark"
                        style={{ aspectRatio: '16 / 9', width: '100%', overflow: 'hidden' }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={buildMediaUrl(values.assetId, 'BANNER')}
                          alt={values.altText || values.title || 'İlan Detay Bannerı'}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                      <div className="p-2 d-flex align-items-center justify-content-between">
                        <span className="small fw-semibold text-truncate">{values.title || 'İlan Detay Tanıtımı'}</span>
                        {values.altText && <span className="badge bg-secondary small">{values.altText}</span>}
                      </div>
                    </div>
                  )}

                  {values.placement === 'SEARCH' && (
                    <div
                      className="border rounded text-white overflow-hidden p-2 d-flex align-items-center justify-content-between shadow-sm"
                      style={{ backgroundColor: '#1a1f2c', minHeight: 70, gap: 12 }}
                    >
                      <div className="d-flex flex-column gap-1" style={{ flex: 1, minWidth: 0 }}>
                        <div className="d-flex align-items-center gap-2">
                          <span className="badge bg-info text-dark small">{values.altText || 'Sponsorlu'}</span>
                          <strong className="text-truncate small">{values.title || 'Arama Sonuçları Bannerı'}</strong>
                        </div>
                        <div className="text-muted small text-truncate">{values.targetUrl || 'Detaylar için tıklayın'}</div>
                      </div>
                      <div
                        className="rounded overflow-hidden bg-dark flex-shrink-0 d-flex align-items-center justify-content-center border border-secondary"
                        style={{ width: 100, height: 50 }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={buildMediaUrl(values.assetId, 'BANNER')}
                          alt={values.altText || values.title || 'Arama Bannerı'}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
              <Form.Group as={Col} md={12} className="mb-3">
                <Form.Label>Başlık</Form.Label>
                <Form.Control name="title" value={values.title ?? ''} onChange={handleChange} placeholder="Örn: Aşım Sezonu Kampanyası" />
              </Form.Group>
              <Form.Group as={Col} md={12} className="mb-3">
                <Form.Label>Etiket / Alt Metin</Form.Label>
                <Form.Control name="altText" value={values.altText ?? ''} onChange={handleChange} placeholder="Örn: Özel Fırsat" />
              </Form.Group>
              <Form.Group as={Col} md={12} className="mb-3">
                <Form.Label>Yönlendirme URL</Form.Label>
                <Form.Control name="targetUrl" value={values.targetUrl ?? ''} onChange={handleChange} placeholder="Örn: /categories/satilik-yaris-ati" />
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
