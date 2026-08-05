'use client'
import { Col, Row, Image, Container } from 'react-bootstrap';
import { Fragment } from 'react';
import Link from 'next/link';
import useMounted from '@/hooks/useMounted';

const NotFound = () => {
  const hasMounted = useMounted();
  return (
    <Fragment>
      {hasMounted &&
        <Container>
          <Row >
            <Col sm={12}>
              <div className="text-center">
                <div className="mb-3">
                  <Image src="/images/error/404-error-img.png" alt="" className="img-fluid" />
                </div>
                <h1 className="display-4 fw-bold">Aradığın sayfa bulunamadı.</h1>
                <Link href="/" className="btn btn-primary">
                  Anasayfa
                </Link>
              </div>
            </Col>
          </Row>
        </Container>
      }
    </Fragment>
  );
};


export default NotFound;


