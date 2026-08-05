'use client'
import { Col, Row, Container } from 'react-bootstrap';
import { PageHeading } from '@/widgets'

const Profile = () => {
  return (
    <Container fluid className="p-6">
      {/* Page Heading */}
      <PageHeading heading="Overview" />

      {/* Profile Header  */}

      {/* content */}
      <div className="py-6">
        <Row>

          {/* About Me */}

          <Col xl={6} lg={12} md={12} xs={12} className="mb-6">

            {/* My Team */}
          </Col>
        </Row>
      </div>

    </Container>
  )
}

export default Profile