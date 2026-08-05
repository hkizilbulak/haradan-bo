"use client"
import { useState } from "react";
import Loading from '@/components/Loading';
import PrepareTable from '@/components/PrepareTable';
import StatusBadge from '@/components/StatusBadge';
import { formatDateForText } from '@/helpers/DateUtils';
import { getBannerPlacementText, getBannerStatusText } from '@/helpers/EnumUtils';
import { getErrorMessage } from '@/helpers/HelperUtils';
import useApi from '@/hooks/useApi';
import useModal from '@/hooks/useModal';
import { BannerRequest, BannerResponse } from '@/models';
import { bannerService } from '@/services';
import { PageHeading } from '@/widgets';
import BannerFilter from '@/widgets/banner/BannerFilter';
import BannerModal from '@/widgets/banner/BannerModal';
import { Button, Col, Container, Row } from 'react-bootstrap';
import { toast } from 'react-toastify';

const headItems = [
  'Başlık',
  'Yerleşim',
  'Sıra',
  'Durum',
  'Asset Durumu',
  'Oluşturulma Tarihi',
  ''
];

export default function Banners() {
  const [{ data, isLoading, handleFilter, handlePageChange, refetch }] = useApi<BannerResponse>({ service: bannerService });
  const { isModalOpen, openModal, closeModal, modalContent } = useModal();
  const [openFilter, setOpenFilter] = useState(false);

  const openBannerModal = (banner?: BannerResponse) => {
    openModal(<BannerModal selectedBanner={banner} onClose={closeModal} onHandleSave={handleSave} />);
  };

  const handleSave = async (values: BannerRequest) => {
    try {
      if (values.identifier) {
        await bannerService.update(values);
      } else {
        await bannerService.create(values);
      }
      closeModal();
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleToggleStatus = async (banner: BannerResponse) => {
    try {
      await bannerService.setStatus(
        {
          identifier: banner.identifier,
          expectedVersion: banner.version,
          assetId: banner.assetId,
          placement: banner.placement,
          title: banner.title,
          altText: banner.altText,
          targetUrl: banner.targetUrl,
          sortOrder: banner.sortOrder,
        },
        banner.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
      );
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const content = data?.content?.map((banner) => (
    <tr key={banner.identifier}>
      <td>{banner.title || '-'}</td>
      <td>{getBannerPlacementText(banner.placement)}</td>
      <td>{banner.sortOrder}</td>
      <td><StatusBadge status={banner.status} /></td>
      <td>{getBannerStatusText(banner.assetLifecycleStatus)}</td>
      <td>{formatDateForText(banner.createDate)}</td>
      <td>
        <a
          className="font-medium text-cyan-600 me-3"
          onClick={() => openBannerModal(banner)}>
          <i className={`fe fe-edit`}></i>
        </a>
        <Button
          size="sm"
          variant={banner.status === 'ACTIVE' ? 'warning' : 'success'}
          onClick={() => handleToggleStatus(banner)}>
          {banner.status === 'ACTIVE' ? 'Pasife Al' : 'Aktifleştir'}
        </Button>
      </td>
    </tr>
  ));

  return (
    <Container fluid className="p-3 lg:p-6">
      <Row>
        <Col lg={12} md={12} sm={12}>
          <PageHeading
            heading='Bannerlar'
            createButtonText='Banner Ekle'
            onCreate={() => openBannerModal(undefined)}
            onToggleFilter={() => setOpenFilter(!openFilter)} />
        </Col>
      </Row>

      {openFilter && <BannerFilter onFilter={(values: string) => handleFilter(values)} />}

      {isModalOpen && modalContent}

      {isLoading && <Loading />}

      {!isLoading && <PrepareTable
        headItems={headItems}
        content={content}
        page={data?.page}
        onHandlePageChange={(page) => handlePageChange(page)} />}
    </Container>
  );
}
