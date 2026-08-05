"use client"
import Loading from '@/components/Loading';
import PrepareTable from '@/components/PrepareTable';
import StatusBadge from '@/components/StatusBadge';
import { formatDateForText } from '@/helpers/DateUtils';
import useApi from '@/hooks/useApi';
import useModal from '@/hooks/useModal';
import { AdvertResponse } from '@/models';
import { advertService } from '@/services';
import { PageHeading } from '@/widgets';
import AdvertFilter from '@/widgets/advert/AdvertFilter';
import { Col, Row, Table, Container } from 'react-bootstrap';

const headItems = [
  'İlan Tarihi',
  'Başlık',
  'İlan No',
  'Kategori',
  'İlan Sahibi',
  'Durum',
  ''
]

export default function Adverts() {

  const [{ data, isLoading, handleFilter, handlePageChange, }] = useApi<AdvertResponse>({ service: advertService });
  const { isModalOpen, openModal, closeModal, modalContent } = useModal();

  const content = data?.content?.map((advert) => (
    <tr key={advert.identifier}>
      <td>{formatDateForText(advert.createDate)}</td>
      <td>{advert.title}</td>
      <td>{advert.advertNo}</td>
      <td>{advert.category?.name}</td>
      <td>{advert.user ? `${advert.user.firstName || ''} ${advert.user.lastName || ''}` : ''}</td>
      <td><StatusBadge status={advert.status} /></td>
      <td>
      </td>
    </tr>));

  return (

    <Container fluid className="p-3 lg:p-6">
      <Row>
        <Col lg={12} md={12} sm={12}>
          <PageHeading heading='İlanlar' showCreateButton={false} />
        </Col>
      </Row>

      <AdvertFilter onFilter={(values: string) => handleFilter(values)} />

      {isModalOpen && modalContent}

      {isLoading && <Loading />}

      {!isLoading && <PrepareTable headItems={headItems} content={content} page={data?.page} onHandlePageChange={(page) => handlePageChange(page)} />}

    </Container>

  );


}
