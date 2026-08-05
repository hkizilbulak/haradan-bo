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
import { useState } from "react";
import Link from 'next/link';
import { Container, Row, Col, Card, Image, Modal, Button, Form, Badge } from 'react-bootstrap';

export default function PostAd() {
  const [step, setstep] = useState(1);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    age: "",
    email: ""
  })

  const nextStep = () => {
    setstep(step + 1);
  };

  const prevStep = () => {
    setstep(step - 1);
  };

  const handleInputData = input => e => {
    // input value from the form
    const { value } = e.target;

    //updating for data state taking previous state and then adding new value to create new object
    setFormData(prevState => ({
      ...prevState,
      [input]: value
    }));
  }

  return (

    <Container fluid className="p-3 lg:p-6">
      <Row>
        <Col lg={12} md={12} sm={12}>
          <PageHeading heading='İlan Ver' showCreateButton={false} />
        </Col>
      </Row>
      <Row className="mt-6">
        <Col xl={{ span: 8, offset: 2 }} lg={{ span: 10, offset: 1 }} md={12} xs={12}>
          <Row>
            {step === 1 && <Col md={{ span: 6, offset: 3 }} className="custom-margin">
              adsa
            </Col>}
          </Row>
        </Col>
      </Row>
    </Container>

  );


}
