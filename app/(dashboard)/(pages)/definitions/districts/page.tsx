"use client";
import { SearchParams } from "@/models/common";
import { PageHeading } from "@/widgets";
import { useEffect, useState } from "react";
import { Col, Row, Container } from "react-bootstrap";
import { DistrictRequest, DistrictResponse } from "@/models";
import DistrictFilter from "@/widgets/definitions/district/DistrictFilter";
import DistrictModal from "@/widgets/definitions/district/DistrictModal";
import { CityResponse } from "@/models/response/city-response.model";
import DeleteModal from "@/components/DeleteModal";
import useApi from "@/hooks/useApi";
import useModal from "@/hooks/useModal";
import Loading from "@/components/Loading";
import PrepareTable from "@/components/PrepareTable";
import { cityService, districtService } from "@/services";

const headItems = ["İlçe Kodu", "İlçe Adı", "İl Adı", ""];

const initialParameters = {
  filter: "",
  pageRequest: {
    page: 0,
    size: 10,
    sort: [{ direction: "ASC", property: "city.name" }],
  },
} as SearchParams<DistrictResponse>;

export default function Districts() {
  const [{ data, isLoading, handleFilter, handlePageChange, refetch }] =
    useApi<DistrictResponse>({
      service: districtService,
      params: initialParameters,
    });
  const { isModalOpen, openModal, closeModal, modalContent } = useModal();
  const [cities, setCities] = useState<CityResponse[]>([]);
  const [openFilter, setOpenFilter] = useState(false);

  const openDistrictModal = (district?: DistrictResponse) => {
    openModal(
      <DistrictModal
        cities={cities}
        selectedDistrict={district}
        onClose={closeModal}
        onHandleSave={handleSave}
      />
    );
  };

  const openDeleteModal = (district?: DistrictResponse) => {
    openModal(
      <DeleteModal
        onClose={closeModal}
        onHandleDelete={() => handleDelete(district)}
      />
    );
  };

  const handleSave = async (values: DistrictRequest) => {
    if (values.identifier !== undefined && values.identifier !== "") {
      await districtService.update(values);
    } else {
      await districtService.save(values);
    }
    closeModal();
    refetch();
  };

  const handleDelete = async (district?: DistrictResponse) => {
    if (district?.identifier) {
      await districtService._delete(district?.identifier);
    }
    closeModal();
    refetch();
  };

  const fetchCities = async () => {
    const cityParameters: SearchParams<CityResponse> = {
      pageRequest: {
        page: 0,
        size: 100,
        sort: [{ direction: "ASC", property: "cityCode" }],
      },
    };

    const response = await cityService.search(cityParameters);

    if (response && response.content) {
      setCities(response.content as Array<CityResponse>);
    }
  };

  useEffect(() => {
    fetchCities();
  }, []);

  const content = data?.content?.map((district) => (
    <tr key={district.identifier}>
      <td>{district.identifier}</td>
      <td>{district.name}</td>
      <td>{district.city?.name}</td>
      <td>
        <a
          className="font-medium text-cyan-600 me-5"
          onClick={() => openDistrictModal(district)}
        >
          <i className={`fe fe-edit`}></i>
        </a>{" "}
        <a
          className="font-medium text-danger-600 me-5"
          onClick={() => openDeleteModal(district)}
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
            heading="İlçeler"
            createButtonText="İlçe Ekle"
            onCreate={() => openDistrictModal(undefined)}
            onToggleFilter={() => setOpenFilter(!openFilter)}
          />
        </Col>
      </Row>

      {openFilter && (
        <DistrictFilter
          cities={cities}
          onFilter={(values: string) => handleFilter(values)}
        />
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
