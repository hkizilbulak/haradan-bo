"use client";
import PrepareTableHead from "@/components/PrepareTableHead";
import StatusBadge from "@/components/StatusBadge";
import { getPropertyTypeEnumText } from "@/helpers/EnumUtils";
import { PropertyRequest, PropertyResponse } from "@/models";
import { SearchParams } from "@/models/common";
import { propertyService } from "@/services";
import { PageHeading } from "@/widgets";
import PropertyFilter from "@/widgets/property/PropertyFilter";
import PropertyModal from "@/widgets/property/PropertyModal";
import { useEffect, useState } from "react";
import { Col, Row, Table, Container } from "react-bootstrap";

const headItems = [
  "ID",
  "Ad",
  "Tip",
  "Zorunlu Mu",
  "Aramada Gözükecek Mi",
  "Durum",
  "",
];

export default function Properties() {
  const [properties, setProperties] = useState<PropertyResponse[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<PropertyResponse>();
  const [show, setShow] = useState(false);

  const [parameters, setParameters] = useState<SearchParams<PropertyResponse>>({
    filter: "",
    pageRequest: {
      page: 0,
      size: 10,
      sort: [{ direction: "ASC", property: "name" }],
    },
  });

  const fetchProperties = async () => {
    const response = await propertyService.search(parameters);

    if (response.content) {
      setProperties(response.content as Array<PropertyResponse>);
    }
  };

  const handleFilter = (filter: string) => {
    setParameters({
      ...parameters,
      filter,
    });
  };

  const handleModalClose = () => {
    setSelectedProperty(undefined);
    setShow(false);
  };

  const openPropertyModal = (property?: PropertyResponse) => {
    setSelectedProperty(property);
    setShow(true);
  };

  const handleSave = async (values: PropertyRequest) => {
    console.log(values);
    if (values.identifier !== undefined && values.identifier !== "") {
      await propertyService.update(values);
    } else {
      await propertyService.save(values);
    }
    fetchProperties();
    setSelectedProperty(undefined);
    setShow(false);
  };

  useEffect(() => {
    console.log("parameters:", parameters);

    fetchProperties();
  }, [parameters]);

  return (
    <Container fluid className="p-3 lg:p-6">
      <Row>
        <Col lg={12} md={12} sm={12}>
          <PageHeading
            heading="Özellikler"
            createButtonText="Özellik Ekle"
            onCreate={() => openPropertyModal(undefined)}
          />
        </Col>
      </Row>

      <PropertyFilter onFilter={(values: string) => handleFilter(values)} />

      <PropertyModal
        selectedProperty={selectedProperty}
        show={show}
        onHandleClose={handleModalClose}
        onHandleSave={handleSave}
      />

      <Table responsive hover className="text-nowrap">
        <PrepareTableHead headItems={headItems} />
        <tbody>
          {properties?.map((property) => {
            return (
              <tr key={property.identifier}>
                <td>{property.identifier}</td>
                <td>{property.name}</td>
                <td>{getPropertyTypeEnumText(property.type)}</td>
                <td>{property.mandatory ? "Evet" : "Hayır"}</td>
                <td>{property.searchParam ? "Evet" : "Hayır"}</td>
                <td>
                  <StatusBadge status={property.status} />
                </td>
                <td>
                  <a
                    className="font-medium text-cyan-600 me-5"
                    onClick={() => openPropertyModal(property)}
                  >
                    <i className={`fe fe-edit`}></i>
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </Container>
  );
}
