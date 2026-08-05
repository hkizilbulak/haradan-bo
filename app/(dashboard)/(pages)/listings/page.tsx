"use client"
import Loading from '@/components/Loading';
import PrepareTable from '@/components/PrepareTable';
import StatusBadge from '@/components/StatusBadge';
import useApi from '@/hooks/useApi';
import { ModerationAdvertResponse } from '@/models';
import { advertService } from '@/services';
import { PageHeading } from '@/widgets';
import AdvertFilter from '@/widgets/advert/AdvertFilter';
import { Col, Row, Container } from 'react-bootstrap';

const headItems = [
  'Başlık',
  'Yayın Tarihi',
  'Silinme Tarihi',
  'Kategorı',
  'Sahip',
  'Durum',
  'Versiyon',
  ''
]

export default function Adverts() {

  const [{ data, isLoading, handleFilter, handlePageChange, }] = useApi<ModerationAdvertResponse>({ service: advertService });

  const content = data?.content?.map((advert) => (
    <tr key={advert.identifier}>
      <td>{advert.title}</td>
      <td>{advert.publishedAt ? new Date(advert.publishedAt).toLocaleString('tr-TR') : ''}</td>
      <td>{advert.deletedAt ? new Date(advert.deletedAt).toLocaleString('tr-TR') : ''}</td>
      <td>{advert.categoryId}</td>
      <td>{advert.ownerUserId}</td>
      <td><StatusBadge status={advert.status} /></td>
      <td>{advert.version}</td>
      <td></td>
    </tr>));

  return (

    <Container fluid className="p-3 lg:p-6">
      <Row>
        <Col lg={12} md={12} sm={12}>
          <PageHeading heading='İlanlar' showCreateButton={false} />
        </Col>
      </Row>

      <AdvertFilter onFilter={(values: string) => handleFilter(values)} />

      {isLoading && <Loading />}

      {!isLoading && <PrepareTable headItems={headItems} content={content} page={data?.page} onHandlePageChange={(page) => handlePageChange(page)} />}

    </Container>

  );


}
