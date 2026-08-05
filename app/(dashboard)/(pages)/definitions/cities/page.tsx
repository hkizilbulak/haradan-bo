"use client";
import { useState } from "react";
import { cityService } from "@/services";
import { PageHeading } from "@/widgets";
import { Col, Row, Container } from "react-bootstrap";
import { CityRequest, CityResponse } from "@/models";
import CityFilter from "@/widgets/definitions/city/CityFilter";
import CityModal from "@/widgets/definitions/city/CityModal";
import DeleteModal from "@/components/DeleteModal";
import useApi from "@/hooks/useApi";
import useModal from "@/hooks/useModal";
import Loading from "@/components/Loading";
import PrepareTable from "@/components/PrepareTable";
import { SearchParams } from "@/models/common";

const headItems = ["İl Kodu", "İl Adı", "Ülke Kodu", ""];

const initialParameters = {
  filter: "",
  pageRequest: {
    page: 0,
    size: 10,
    sort: [{ direction: "ASC", property: "name" }],
  },
} as SearchParams<CityResponse>;

export default function Cities() {
  const [{ data, isLoading, handleFilter, handlePageChange, refetch }] =
    useApi<CityResponse>({ service: cityService, params: initialParameters });
  const { isModalOpen, openModal, closeModal, modalContent } = useModal();
  const [openFilter, setOpenFilter] = useState(false);

  const openCityModal = (city?: CityResponse) => {
    openModal(
      <CityModal
        selectedCity={city}
        onClose={closeModal}
        onHandleSave={handleSave}
      />
    );
  };

  const openDeleteModal = (city?: CityResponse) => {
    openModal(
      <DeleteModal
        onClose={closeModal}
        onHandleDelete={() => handleDelete(city)}
      />
    );
  };

  const handleSave = async (values: CityRequest) => {
    if (values.identifier !== undefined && values.identifier !== "") {
      await cityService.update(values);
    } else {
      await cityService.save(values);
    }
    closeModal();
    refetch();
  };

  const handleDelete = async (city?: CityResponse) => {
    if (city?.identifier) {
      await cityService._delete(city?.identifier);
    }
    closeModal();
    refetch();
  };

  const content = data?.content?.map((city) => (
    <tr key={city.identifier}>
      <td>{city.identifier}</td>
      <td>{city.name}</td>
      <td>{city.countryCode}</td>
      <td>
        <a
          className="font-medium text-cyan-600 me-5"
          onClick={() => openCityModal(city)}
        >
          <i className={`fe fe-edit`}></i>
        </a>{" "}
        <a
          className="font-medium text-danger-600 me-5"
          onClick={() => openDeleteModal(city)}
        >
          <i className={`fe fe-trash`}></i>
        </a>
      </td>
    </tr>
  ));

  return (
    <Container fluid className="p-3 lg:p-6">
      <Row>
        <Col lg={12} md={12} sm={12}>
          <PageHeading
            heading="İller"
            createButtonText="İl Ekle"
            onCreate={() => openCityModal(undefined)}
            onToggleFilter={() => setOpenFilter(!openFilter)}
          />
        </Col>
      </Row>

      {openFilter && (
        <CityFilter onFilter={(values: string) => handleFilter(values)} />
      )}

      {isModalOpen && modalContent}

      {isLoading && <Loading />}

      {!isLoading && (
        <PrepareTable
          headItems={headItems}
          content={content}
          page={data?.page}
          onHandlePageChange={(page) => handlePageChange(page)}
        />
      )}
    </Container>
  );
}
