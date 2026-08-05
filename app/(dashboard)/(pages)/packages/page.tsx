"use client"
import { Button, Col, Container, Form, Offcanvas, Row } from 'react-bootstrap';
import { Formik } from 'formik';
import * as Yup from 'yup';
import Loading from '@/components/Loading';
import PrepareTable from '@/components/PrepareTable';
import StatusBadge from '@/components/StatusBadge';
import { formatDateTimeForText } from '@/helpers/DateUtils';
import { formatMoney, getErrorMessage } from '@/helpers/HelperUtils';
import useApi from '@/hooks/useApi';
import useModal from '@/hooks/useModal';
import { packageService, PackageRequest, PackageResponse } from '@/services/package.service';
import { PageHeading } from '@/widgets';
import { toast } from 'react-toastify';

const headItems = ['Kod', 'Ad', 'Fiyat', 'Sıra', 'Durum', 'Oluşturulma', ''];

const initialValues: PackageRequest = {
  code: '',
  displayName: '',
  description: '',
  badgeText: '',
  benefitsText: '',
  amountMinor: undefined,
  currencyCode: 'TRY',
  defaultDurationDays: null,
  allowsUrgent: false,
  showcaseEligible: false,
  searchPriority: 0,
  broadcastOnPublish: false,
  isActive: true,
  sortOrder: 0,
};

function PackageModal({ selectedPackage, onClose, onSave }: { selectedPackage?: PackageResponse; onClose: () => void; onSave: (value: PackageRequest) => void; }) {
  const isNew = !selectedPackage?.code;
  const values: PackageRequest = selectedPackage ? {
    identifier: selectedPackage.code,
    expectedVersion: selectedPackage.version,
    code: selectedPackage.code,
    displayName: selectedPackage.displayName,
    description: selectedPackage.description ?? '',
    badgeText: selectedPackage.badgeText ?? '',
    benefitsText: selectedPackage.benefits?.join('\n') ?? '',
    amountMinor: selectedPackage.displayPrice?.amountMinor,
    currencyCode: selectedPackage.displayPrice?.currency ?? selectedPackage.currencyCode,
    defaultDurationDays: selectedPackage.defaultDurationDays ?? null,
    allowsUrgent: selectedPackage.allowsUrgent,
    showcaseEligible: selectedPackage.showcaseEligible,
    searchPriority: selectedPackage.searchPriority,
    broadcastOnPublish: selectedPackage.broadcastOnPublish,
    isActive: selectedPackage.isActive,
    sortOrder: selectedPackage.sortOrder,
  } : initialValues;

  const schema = Yup.object().shape({
    code: Yup.string().required('Kod zorunludur'),
    displayName: Yup.string().required('Ad zorunludur'),
    benefitsText: Yup.string().required('En az bir fayda yazın'),
    currencyCode: Yup.string().required('Para birimi zorunludur'),
    searchPriority: Yup.number().required('Arama önceliği zorunludur'),
    sortOrder: Yup.number().required('Sıra zorunludur'),
  });

  return (
    <Offcanvas show={true} onHide={onClose} scroll placement="end">
      <Offcanvas.Header closeButton>
        <Offcanvas.Title>{isNew ? 'Yeni Paket' : 'Paket Düzenle'}</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
        <Formik initialValues={values} validationSchema={schema} onSubmit={onSave}>
          {({ handleSubmit, handleChange, values, isValid, isSubmitting }) => (
            <Form noValidate onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Kod</Form.Label>
                <Form.Control name="code" value={values.code ?? ''} onChange={handleChange} disabled={!isNew} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Ad</Form.Label>
                <Form.Control name="displayName" value={values.displayName} onChange={handleChange} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Açıklama</Form.Label>
                <Form.Control name="description" value={values.description ?? ''} onChange={handleChange} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Rozet</Form.Label>
                <Form.Control name="badgeText" value={values.badgeText ?? ''} onChange={handleChange} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Faydalar</Form.Label>
                <Form.Control as="textarea" rows={4} name="benefitsText" value={values.benefitsText} onChange={handleChange} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Fiyat Minor</Form.Label>
                <Form.Control type="number" name="amountMinor" value={values.amountMinor ?? ''} onChange={handleChange} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Para Birimi</Form.Label>
                <Form.Control name="currencyCode" value={values.currencyCode} onChange={handleChange} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Varsayılan Süre</Form.Label>
                <Form.Control type="number" name="defaultDurationDays" value={values.defaultDurationDays ?? ''} onChange={handleChange} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Check type="checkbox" name="allowsUrgent" label="Acil ilan" checked={values.allowsUrgent} onChange={handleChange} />
                <Form.Check type="checkbox" name="showcaseEligible" label="Öne çıkarılabilir" checked={values.showcaseEligible} onChange={handleChange} />
                <Form.Check type="checkbox" name="broadcastOnPublish" label="Yayınlanınca yayınla" checked={values.broadcastOnPublish} onChange={handleChange} />
                <Form.Check type="checkbox" name="isActive" label="Aktif" checked={values.isActive} onChange={handleChange} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Arama Önceliği</Form.Label>
                <Form.Control type="number" name="searchPriority" value={values.searchPriority} onChange={handleChange} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Sıra</Form.Label>
                <Form.Control type="number" name="sortOrder" value={values.sortOrder} onChange={handleChange} />
              </Form.Group>
              <Button disabled={!isValid || isSubmitting} variant="primary" as="input" type="submit" value={isNew ? 'Ekle' : 'Güncelle'} />
            </Form>
          )}
        </Formik>
      </Offcanvas.Body>
    </Offcanvas>
  );
}

export default function PackagesPage() {
  const [{ data, isLoading, refetch }] = useApi<PackageResponse>({
    service: packageService,
    params: {
      filter: '',
      pageRequest: { page: 0, size: 100, sort: [{ direction: 'ASC', property: 'sortOrder' }] },
    },
  });
  const { isModalOpen, openModal, closeModal, modalContent } = useModal();

  const openPackageModal = (pkg?: PackageResponse) => {
    openModal(<PackageModal selectedPackage={pkg} onClose={closeModal} onSave={handleSave} />);
  };

  const handleSave = async (values: PackageRequest) => {
    try {
      if (values.code && values.identifier) {
        await packageService.update(values);
      } else {
        await packageService.create(values);
      }
      closeModal();
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const content = data?.content?.map((pkg) => (
    <tr key={pkg.code}>
      <td>{pkg.code}</td>
      <td>{pkg.displayName}</td>
      <td>{formatMoney(pkg.displayPrice?.amountMinor, pkg.displayPrice?.currency ?? pkg.currencyCode)}</td>
      <td>{pkg.sortOrder}</td>
      <td><StatusBadge status={pkg.isActive ? 'ACTIVE' : 'INACTIVE'} /></td>
      <td>{formatDateTimeForText(pkg.createdAt)}</td>
      <td>
        <a className="font-medium text-cyan-600 me-5 cp" onClick={() => openPackageModal(pkg)}>
          <i className="fe fe-edit"></i>
        </a>
      </td>
    </tr>
  ));

  return (
    <Container fluid className="p-3 lg:p-6">
      <Row>
        <Col lg={12}>
          <PageHeading heading="Paketler" createButtonText="Paket Ekle" onCreate={() => openPackageModal(undefined)} />
        </Col>
      </Row>
      {isModalOpen && modalContent}
      {isLoading && <Loading />}
      {!isLoading && <PrepareTable headItems={headItems} content={content} page={data?.page} onHandlePageChange={() => undefined} />}
    </Container>
  );
}
