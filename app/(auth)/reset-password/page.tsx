"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, Col, Form, Row } from "react-bootstrap";
import { Formik } from "formik";
import * as Yup from "yup";

import FormTextField from "@/components/FormTextField";

interface FormData {
  password: string;
  passwordConfirmation: string;
}

const validationSchema = Yup.object().shape({
  password: Yup.string()
    .min(8, "Şifre en az 8 karakter olmalıdır")
    .required("Yeni şifre zorunludur"),
  passwordConfirmation: Yup.string()
    .oneOf([Yup.ref("password")], "Şifreler eşleşmiyor")
    .required("Şifre tekrarı zorunludur"),
});

const ResetPassword = () => {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [tokenReady, setTokenReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token")?.trim() ?? "");
    setTokenReady(true);
  }, []);

  const handleSubmit = async (values: FormData) => {
    setError(null);
    const response = await fetch("/api/v1/auth/password/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword: values.password }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(
        body?.error?.message ??
          body?.message ??
          "Şifre bağlantısı geçersiz veya süresi dolmuş.",
      );
      return;
    }

    setSuccess(true);
    window.setTimeout(() => router.replace("/login"), 1200);
  };

  return (
    <Row className="align-items-center justify-content-center g-0 min-vh-100">
      <Col xxl={4} lg={6} md={8} xs={12} className="py-8 py-xl-0">
        <Card className="smooth-shadow-md">
          <Card.Body className="p-6">
            <div className="d-flex justify-content-center align-items-center mb-6">
              <p className="h3 fw-bold">Şifrenizi Belirleyin</p>
            </div>
            {tokenReady && !token && (
              <Alert variant="danger">Şifre bağlantısı geçersiz.</Alert>
            )}
            {error && <Alert variant="danger">{error}</Alert>}
            {success && (
              <Alert variant="success">
                Şifreniz kaydedildi. Giriş sayfasına yönlendiriliyorsunuz.
              </Alert>
            )}
            {tokenReady && token && !success && (
              <Formik<FormData>
                initialValues={{ password: "", passwordConfirmation: "" }}
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
              >
                {({ handleSubmit, isValid, isSubmitting }) => (
                  <Form noValidate onSubmit={handleSubmit}>
                    <FormTextField
                      as={Col}
                      md={12}
                      controlId="newPassword"
                      label="Yeni Şifre"
                      type="password"
                      name="password"
                    />
                    <FormTextField
                      as={Col}
                      md={12}
                      controlId="passwordConfirmation"
                      label="Yeni Şifre Tekrarı"
                      type="password"
                      name="passwordConfirmation"
                    />
                    <div className="d-grid">
                      <Button
                        disabled={!isValid || isSubmitting}
                        variant="primary"
                        size="lg"
                        type="submit"
                      >
                        Şifreyi Kaydet
                      </Button>
                    </div>
                  </Form>
                )}
              </Formik>
            )}
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default ResetPassword;
