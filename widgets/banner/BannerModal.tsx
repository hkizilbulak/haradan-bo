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
  placement: 'HOMEPAGE_HERO',
  title: '',
  altText: '',
  targetUrl: '',
  expectedVersion: undefined,
};

const placementContext: Record<string, { title: string; description: string; aspect: string }> = {
  HOMEPAGE_HERO: {
    title: 'Ana Sayfa — Hero Slayt',
    description: 'Kategori menüsünün sağında yer alan vitrin alanı. Solda etiket, başlık ve buton; sağda at görseli yer alır.',
    aspect: 'Önerilen Görsel Boyutu: 1200×600 px (~16:9 / 4:3 oran).',
  },
  HOMEPAGE_PROMO: {
    title: 'Ana Sayfa — Yatay Reklam',
    description: 'Öne çıkan ilanların altındaki yatay kampanya şeridi. Solunda indirim/başlık/açıklama; sağında kampanya görseli yer alır.',
    aspect: 'Önerilen Görsel Boyutu: 600×400 px (~3:2 / 16:9 oran).',
  },
  HOMEPAGE: {
    title: 'Ana Sayfa',
    description: 'Ana sayfa genel banner alanı.',
    aspect: 'Önerilen Boyut: 1200×600 px veya 600×400 px.',
  },
  LISTING_DETAIL: {
    title: 'İlan Detay',
    description: 'İlan detay sayfasındaki tanıtım alanında gösterilir.',
    aspect: 'Önerilen Görsel Boyutu: 1200×675 px (16:9 oran).',
  },
  SEARCH: {
    title: 'Arama Sonuçları',
    description: 'Arama sonuçları listelemesi arasındaki kompakt tanıtım şeridinde gösterilir.',
    aspect: 'Önerilen Görsel Boyutu: 1200×160 px (~7.4:1 yatay arama şeridi).',
  },
};

type IProps = {
  selectedBanner?: BannerResponse;
  onClose: () => void;
  onHandleSave: (value: BannerRequest) => void;
};

export default function BannerModal({ selectedBanner, onClose, onHandleSave }: IProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState<'OPTIMIZING' | 'UPLOADING' | 'PROCESSING'>('UPLOADING');

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
    <Offcanvas show={true} onHide={onClose} scroll={true} placement={'end'} style={{ width: 500 }}>
      <Offcanvas.Header closeButton>
        <Offcanvas.Title>{selectedBanner ? 'Banner Düzenle' : 'Yeni Banner Ekle'}</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
        <Formik initialValues={values} validationSchema={validationSchema} onSubmit={onHandleSave}>
          {({ handleSubmit, handleChange, values, setFieldValue, isValid, isSubmitting }) => (
            <Form noValidate onSubmit={handleSubmit}>
              {(() => {
                const context = placementContext[values.placement] || placementContext.HOMEPAGE_HERO;
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
                  <option value="HOMEPAGE_HERO">Ana Sayfa — Hero Slayt</option>
                  <option value="HOMEPAGE_PROMO">Ana Sayfa — Yatay Reklam</option>
                  <option value="LISTING_DETAIL">İlan Detay</option>
                  <option value="SEARCH">Arama Sonuçları</option>
                </Form.Select>
                {selectedBanner && (
                  <Form.Text muted>Yerleşim oluşturma sonrası değiştirilemez.</Form.Text>
                )}
                {!selectedBanner && (
                  <Form.Text muted>Yeni banner ilgili yerleşimin sonuna eklenir. Sıra listeden düzenlenir.</Form.Text>
                )}
              </Form.Group>

              {/* Canlı Görünüm Önizleme - Sürekli Açık */}
              <div className="mb-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <Form.Label className="mb-0 fw-bold">Canlı Görünüm Önizleme</Form.Label>
                  <span className="badge bg-light text-dark border small">Canlı Tasarım</span>
                </div>

                {(values.placement === 'HOMEPAGE_HERO' || values.placement === 'HOMEPAGE') && (
                  <div
                    className="p-3 rounded d-flex align-items-center justify-content-between text-white shadow-sm"
                    style={{ backgroundColor: '#192638', minHeight: 135, gap: 14 }}
                  >
                    <div className="d-flex flex-column gap-2" style={{ flex: 1, minWidth: 0 }}>
                      <span className="text-secondary small">
                        {values.altText || 'Bu haftanın fırsatları'}
                      </span>
                      <h6 className="mb-0 text-white fw-bold" style={{ fontSize: '1rem', lineHeight: '1.2' }}>
                        {values.title || 'Seçkin kısrak ilanları'}
                      </h6>
                      <div>
                        <span className="badge px-3 py-1 text-white small" style={{ backgroundColor: '#e91e63' }}>
                          İlanları gör →
                        </span>
                      </div>
                    </div>
                    <div
                      className="rounded overflow-hidden bg-dark flex-shrink-0 d-flex align-items-center justify-content-center border border-secondary"
                      style={{ width: 140, height: 95 }}
                    >
                      {values.assetId ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={buildMediaUrl(values.assetId, 'BANNER')}
                          alt={values.altText || values.title || 'Hero Görseli'}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div className="text-center text-muted p-2 small">
                          <i className="fe fe-image d-block fs-4 mb-1"></i>
                          <span>Görsel</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {values.placement === 'HOMEPAGE_PROMO' && (() => {
                  const trimmedAlt = values.altText?.trim() ?? '';
                  const hasPercentage = trimmedAlt.startsWith('%');
                  const discountLabel = hasPercentage ? trimmedAlt.split(' ')[0] : null;
                  const promoSubtitle = hasPercentage
                    ? trimmedAlt.substring(discountLabel!.length).trim()
                    : trimmedAlt;

                  return (
                    <div
                      className="p-3 rounded d-flex align-items-center justify-content-between text-white shadow-sm"
                      style={{ backgroundColor: '#192638', minHeight: 110, gap: 12 }}
                    >
                      <div className="d-flex align-items-center gap-2" style={{ flex: 1, minWidth: 0 }}>
                        {discountLabel && (
                          <>
                            <div className="fw-bolder fs-4 text-white">
                              {discountLabel}
                            </div>
                            <div style={{ width: 1, height: 40, borderLeft: '1px dashed #4b5563' }} />
                          </>
                        )}
                        <div className="d-flex flex-column gap-1" style={{ minWidth: 0, flex: 1 }}>
                          <div className="text-white fw-bold text-truncate small" style={{ fontSize: '0.9rem' }}>
                            {values.title || 'AŞIM SEZONU KAMPANYASI'}
                          </div>
                          {promoSubtitle ? (
                            <div className="small text-muted text-truncate" style={{ fontSize: '0.8rem' }}>
                              {promoSubtitle}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <div
                        className="rounded overflow-hidden bg-dark flex-shrink-0 d-flex align-items-center justify-content-center border border-secondary"
                        style={{ width: 115, height: 75 }}
                      >
                        {values.assetId ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={buildMediaUrl(values.assetId, 'BANNER')}
                            alt={values.altText || values.title || 'Yatay Reklam Görseli'}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div className="text-center text-muted p-2 small">
                            <i className="fe fe-image d-block fs-5 mb-1"></i>
                            <span>Görsel</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {values.placement === 'LISTING_DETAIL' && (
                  <div
                    className="border rounded overflow-hidden shadow-sm bg-dark d-flex align-items-center justify-content-center"
                    style={{ width: '100%', aspectRatio: '16 / 9' }}
                  >
                    {values.assetId ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={buildMediaUrl(values.assetId, 'BANNER')}
                        alt={values.altText || values.title || 'İlan Detay Bannerı'}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div className="text-center text-muted p-3">
                        <i className="fe fe-image d-block fs-3 mb-1"></i>
                        <span>İlan Detay Bannerı (16:9)</span>
                      </div>
                    )}
                  </div>
                )}

                {values.placement === 'SEARCH' && (
                  <div
                    className="border rounded overflow-hidden shadow-sm bg-dark d-flex align-items-center justify-content-center"
                    style={{ width: '100%', aspectRatio: '890 / 120' }}
                  >
                    {values.assetId ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={buildMediaUrl(values.assetId, 'BANNER')}
                        alt={values.altText || values.title || 'Arama Bannerı'}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div className="text-center text-muted p-2">
                        <i className="fe fe-image d-block fs-5 mb-1"></i>
                        <span>Arama Sonuçları Şerit Bannerı (7.4:1)</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

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

              <Form.Group as={Col} md={12} className="mb-3">
                <Form.Label>Başlık</Form.Label>
                <Form.Control name="title" value={values.title ?? ''} onChange={handleChange} placeholder="Örn: Aşım Sezonu Kampanyası" />
              </Form.Group>
              <Form.Group as={Col} md={12} className="mb-3">
                <Form.Label>Etiket / Alt Metin</Form.Label>
                <Form.Control name="altText" value={values.altText ?? ''} onChange={handleChange} placeholder="Örn: %20 veya Özel Fırsat" />
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
