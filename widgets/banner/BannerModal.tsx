import { Button, Col, Form, Offcanvas } from 'react-bootstrap';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { BannerRequest, BannerResponse } from '@/models';

const initialValues: BannerRequest = {
  identifier: '',
  assetId: '',
  placement: 'HOMEPAGE',
  title: '',
  altText: '',
  targetUrl: '',
  sortOrder: 0,
  expectedVersion: undefined,
};

type IProps = {
  selectedBanner?: BannerResponse;
  onClose: () => void;
  onHandleSave: (value: BannerRequest) => void;
};

export default function BannerModal({ selectedBanner, onClose, onHandleSave }: IProps) {
  const validationSchema = Yup.object().shape({
    assetId: Yup.string().required('Asset zorunludur'),
    placement: Yup.string().required('Yerleşim zorunludur'),
    sortOrder: Yup.number().min(0).required('Sıra zorunludur'),
  });

  const values: BannerRequest = selectedBanner
    ? {
        identifier: selectedBanner.identifier ?? '',
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
          {({ handleSubmit, handleChange, values, isValid, isSubmitting }) => (
            <Form noValidate onSubmit={handleSubmit}>
              <Form.Group as={Col} md={12} className="mb-3">
                <Form.Label>ID</Form.Label>
                <Form.Control type="text" value={values.identifier ?? ''} disabled />
              </Form.Group>
              <Form.Group as={Col} md={12} className="mb-3">
                <Form.Label>Yerleşim</Form.Label>
                <Form.Select name="placement" value={values.placement} onChange={handleChange}>
                  <option value="HOMEPAGE">Ana Sayfa</option>
                  <option value="LISTING_DETAIL">İlan Detay</option>
                  <option value="SEARCH">Arama</option>
                </Form.Select>
              </Form.Group>
              <Form.Group as={Col} md={12} className="mb-3">
                <Form.Label>Asset ID</Form.Label>
                <Form.Control name="assetId" value={values.assetId} onChange={handleChange} />
              </Form.Group>
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
              <Form.Group as={Col} md={12} className="mb-3">
                <Form.Label>Sıra</Form.Label>
                <Form.Control type="number" name="sortOrder" value={values.sortOrder} onChange={handleChange} />
              </Form.Group>
              <Button
                disabled={!isValid || isSubmitting}
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
