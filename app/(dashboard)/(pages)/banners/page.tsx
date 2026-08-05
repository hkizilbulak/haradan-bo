"use client"
import { useState } from "react";
import Loading from '@/components/Loading';
import PrepareTable from '@/components/PrepareTable';
import StatusBadge from '@/components/StatusBadge';
import { formatDateForText } from '@/helpers/DateUtils';
import { getBannerTypeEnumText } from '@/helpers/EnumUtils';
import useApi from '@/hooks/useApi';
import useModal from '@/hooks/useModal';
import { BannerRequest, BannerResponse } from '@/models';
import { bannerService } from '@/services';
import { PageHeading } from '@/widgets';
import BannerFilter from '@/widgets/banner/BannerFilter';
import BannerModal from '@/widgets/banner/BannerModal';
import { Col, Row, Container } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { getErrorMessage } from "@/helpers/HelperUtils";

const headItems = [
  'Başlık',
  'Oluşturulma Tarihi',
  'Baş. Tarihi',
  'Bit. Tarihi',
  'Tipi',
  'Durum',
  ''
]

export default function Banners() {

  const [{ data, isLoading, handleFilter, handlePageChange, refetch }] = useApi<BannerResponse>({ service: bannerService });
  const { isModalOpen, openModal, closeModal, modalContent } = useModal();
  const [openFilter, setOpenFilter] = useState(false);

  const openBannerModal = (banner?: BannerResponse) => {
    openModal(<BannerModal selectedBanner={banner} onClose={closeModal} onHandleSave={handleSave} />)
  }

  const handleSave = async (values: BannerRequest) => {
    try {
      if (values.identifier !== undefined && values.identifier !== '') {
        await bannerService.update(values);
      } else {
        await bannerService.save(values);
      }
      closeModal()
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const content = data?.content?.map((banner) => (
    <tr key={banner.identifier}>
      <td>{banner.name}</td>
      <td>{formatDateForText(banner.createDate)}</td>
      <td>{formatDateForText(banner.startDate)}</td>
      <td>{formatDateForText(banner.endDate)}</td>
      <td>{getBannerTypeEnumText(banner.type)}</td>
      <td><StatusBadge status={banner.status} /></td>
      <td>
        <a
          className="font-medium text-cyan-600 me-5"
          onClick={() => openBannerModal(banner)}>
          <i className={`fe fe-edit`}></i>
        </a><a
          className="font-medium text-cyan-600 me-5"
          onClick={() => openBannerModal(banner)}>
          <i className={`fe fe-image`}></i>
        </a></td>
    </tr>));

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

      {!isLoading && <PrepareTable headItems={headItems} content={content} page={data?.page} onHandlePageChange={(page) => handlePageChange(page)} />}

    </Container>

  );

}
