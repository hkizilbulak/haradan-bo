"use client"
import { useState } from "react";
import DeleteModal from '@/components/DeleteModal';
import Loading from '@/components/Loading';
import PrepareTable from '@/components/PrepareTable';
import useApi from '@/hooks/useApi';
import useModal from '@/hooks/useModal';
import { SearchParams } from '@/models/common';
import { StableRequest, StableResponse } from '@/models';
import { stableService } from '@/services';
import { PageHeading } from '@/widgets';
import StableFilter from '@/widgets/stable/StableFilter';
import StableModal from '@/widgets/stable/StableModal';
import { Col, Row, Container } from 'react-bootstrap';
import { PatternFormat } from 'react-number-format';
import { toast } from 'react-toastify';
import { getErrorMessage } from "@/helpers/HelperUtils";

const headItems = [
  'Hara Adı',
  'Sorumlu Kişi',
  'Telefon No',
  'Adres',
  'Notlar',
  ''
]

const initialParameters = {
  filter: '',
  pageRequest: {
    page: 0,
    size: 10,
    sort: [{ direction: 'ASC', property: 'name' }],
  }
} as SearchParams<StableResponse>;

export default function Stables() {

  const [{ data, isLoading, handleFilter, handlePageChange, refetch }] = useApi<StableResponse>({ service: stableService, params: initialParameters });
  const { isModalOpen, openModal, closeModal, modalContent } = useModal();
  const [openFilter, setOpenFilter] = useState(false);

  const openStableModal = (stable?: StableResponse) => {
    openModal(<StableModal selectedStable={stable} onClose={closeModal} onHandleSave={handleSave} />)
  }

  const openDeleteModal = (stable?: StableResponse) => {
    openModal(<DeleteModal onClose={closeModal} onHandleDelete={() => handleDelete(stable)} />)
  }

  const handleSave = async (values: StableRequest) => {
    try {
      if (values.identifier !== undefined && values.identifier !== '') {
        await stableService.update(values);
      } else {
        await stableService.save(values);
      }
      closeModal()
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const handleDelete = async (stable?: StableResponse) => {
    try {
      if (stable?.identifier) {
        await stableService._delete(stable?.identifier);
      }
      closeModal();
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }


  const content = data?.content?.map((stable) => (
    <tr key={stable.identifier}>
      <td>{stable.name}</td>
      <td>{stable.contactName}</td>
      <td><PatternFormat value={stable.phoneNumber} displayType="text" format="0(###) ### ####" /></td>
      <td>{stable.address}</td>
      <td>{stable.note}</td>
      <td>
        <a
          className="font-medium text-cyan-600 me-5 cp"
          onClick={() => openStableModal(stable)}>
          <i className={`fe fe-edit`}></i>
        </a><a
          className="font-medium text-danger-600 me-5 cp"
          onClick={() => openDeleteModal(stable)}>
          <i className={`fe fe-trash`}></i></a></td>
    </tr>));

  return (

    <Container fluid className="p-3 lg:p-6">
      <Row>
        <Col lg={12} md={12} sm={12}>
          <PageHeading
            heading='Haralar'
            createButtonText='Hara Ekle'
            onCreate={() => openStableModal(undefined)}
            onToggleFilter={() => setOpenFilter(!openFilter)} />
        </Col>
      </Row>

      {openFilter && <StableFilter onFilter={(values: string) => handleFilter(values)} />}

      {isModalOpen && modalContent}

      {isLoading && <Loading />}

      {!isLoading && <PrepareTable headItems={headItems} content={content} page={data?.page} onHandlePageChange={(page) => handlePageChange(page)} />}

    </Container>

  );


}
