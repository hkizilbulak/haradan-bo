'use client'
import { Row, Col, Container } from 'react-bootstrap';
import { PageHeading } from '@/widgets'

const Billing = () => {
  return (
    <Container fluid className="p-6">
      {/* Page Heading */}
      <PageHeading heading="Billing" />

      <Row className="mt-6">
        <Col xl={{ span: 8, offset: 2 }} lg={{ span: 10, offset: 1 }} md={12} xs={12}>
          <Row>
          </Row>
        </Col>
      </Row>
    </Container>
  )
}

export default Billing