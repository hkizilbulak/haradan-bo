'use client'
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Container, Form, Row, Spinner } from 'react-bootstrap';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { PageHeading } from '@/widgets';
import { useAuth } from '@/context/AuthContext';
import { profileService } from '@/services/profile.service';
import { getErrorMessage } from '@/helpers/HelperUtils';
import {
  formatPhoneDisplayTR,
  isValidOptionalPhoneTR,
  PHONE_INVALID_MESSAGE,
  toCanonicalPhoneTR,
} from '@/helpers/phone';
import { toast } from 'react-toastify';
import StatusBadge from '@/components/StatusBadge';
import { getUserRoleText, getUserStatusText } from '@/helpers/EnumUtils';

type ProfileForm = {
  firstName: string;
  lastName: string;
  phone: string;
};

export default function Profile() {
  const { session, refreshSession } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(session?.user ?? null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    profileService.getMe()
      .then((data) => {
        if (!cancelled) {
          setProfile(data);
          setLoadError(null);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(getErrorMessage(error));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const validationSchema = Yup.object().shape({
    firstName: Yup.string().required('Ad zorunludur'),
    lastName: Yup.string().required('Soyad zorunludur'),
    phone: Yup.string()
      .nullable()
      .test('phone-tr', PHONE_INVALID_MESSAGE, (value) => isValidOptionalPhoneTR(value)),
  });

  const initialValues: ProfileForm = {
    firstName: profile?.firstName ?? '',
    lastName: profile?.lastName ?? '',
    phone: formatPhoneDisplayTR(profile?.phone),
  };

  return (
    <Container fluid className="p-3 lg:p-6">
      <Row>
        <Col lg={12}>
          <PageHeading heading="Profilim" showCreateButton={false} />
        </Col>
      </Row>

      {loading && (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {!loading && loadError && (
        <Alert variant="danger">{loadError}</Alert>
      )}

      {!loading && profile && (
        <Row>
          <Col xl={8} lg={10} md={12}>
            <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: 16 }}>
              <Card.Body className="p-4">
                <div className="d-flex justify-content-between align-items-start mb-4">
                  <div>
                    <h5 className="fw-bold mb-1">{profile.firstName} {profile.lastName}</h5>
                    <div className="text-muted small">{profile.email}</div>
                  </div>
                  <div className="d-flex gap-2">
                    <StatusBadge status={profile.status} />
                    <span className="badge bg-light text-dark border">{getUserRoleText(profile.role)}</span>
                  </div>
                </div>

                <Alert variant="light" className="border small mb-4">
                  E-posta, rol ve hesap durumu bu ekrandan değiştirilemez. Yalnızca ad, soyad ve telefon güncellenebilir.
                </Alert>

                <Formik
                  enableReinitialize
                  initialValues={initialValues}
                  validationSchema={validationSchema}
                  onSubmit={async (values, helpers) => {
                    try {
                      const updated = await profileService.updateMe({
                        firstName: values.firstName.trim(),
                        lastName: values.lastName.trim(),
                        phone: toCanonicalPhoneTR(values.phone) ?? null,
                      });
                      setProfile(updated);
                      await refreshSession();
                      toast.success('Profil güncellendi');
                    } catch (error) {
                      toast.error(getErrorMessage(error));
                    } finally {
                      helpers.setSubmitting(false);
                    }
                  }}
                >
                  {({ handleSubmit, handleChange, setFieldValue, values, errors, touched, isSubmitting, isValid }) => (
                    <Form noValidate onSubmit={handleSubmit}>
                      <Row className="g-3">
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Ad</Form.Label>
                            <Form.Control
                              name="firstName"
                              value={values.firstName}
                              onChange={handleChange}
                              isInvalid={touched.firstName && !!errors.firstName}
                            />
                            <Form.Control.Feedback type="invalid">{errors.firstName}</Form.Control.Feedback>
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Soyad</Form.Label>
                            <Form.Control
                              name="lastName"
                              value={values.lastName}
                              onChange={handleChange}
                              isInvalid={touched.lastName && !!errors.lastName}
                            />
                            <Form.Control.Feedback type="invalid">{errors.lastName}</Form.Control.Feedback>
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>E-posta</Form.Label>
                            <Form.Control value={profile.email} disabled />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Telefon</Form.Label>
                            <Form.Control
                              name="phone"
                              value={values.phone}
                              onChange={(e) => {
                                void setFieldValue('phone', formatPhoneDisplayTR(e.target.value));
                              }}
                              placeholder="532 123 45 67"
                              isInvalid={touched.phone && !!errors.phone}
                            />
                            <Form.Control.Feedback type="invalid">{errors.phone}</Form.Control.Feedback>
                            <Form.Text muted>Baştaki 0 yazılmaz.</Form.Text>
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Rol</Form.Label>
                            <Form.Control value={getUserRoleText(profile.role)} disabled />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Durum</Form.Label>
                            <Form.Control value={getUserStatusText(profile.status)} disabled />
                          </Form.Group>
                        </Col>
                      </Row>
                      <div className="mt-4">
                        <Button
                          type="submit"
                          variant="primary"
                          disabled={!isValid || isSubmitting}
                        >
                          {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
                        </Button>
                      </div>
                    </Form>
                  )}
                </Formik>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </Container>
  );
}
