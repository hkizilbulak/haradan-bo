"use client";
import { Row, Col, Card, Form, Button, Alert } from "react-bootstrap";
import useMounted from "@/hooks/useMounted";
import { useAuth, useSession } from "@/context/AuthContext";
import { Formik } from "formik";
import * as Yup from "yup";
import FormTextField from "@/components/FormTextField";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { getErrorMessage } from "@/helpers/HelperUtils";
import { useRouter } from "next/navigation";

interface FormData {
  email: string;
  password: string;
}

const SignIn = () => {
  const hasMounted = useMounted();
  const { data: session } = useSession();
  const { signIn } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (session?.user.role === "admin" && session.user.status === "ACTIVE") {
      router.replace("/");
    }
  }, [router, session]);

  const initialValues: FormData = {
    email: "", //"huseyinkizilbulak76@hotmail.com",
    password: "", //"haraa",
  };

  const validationSchema = Yup.object().shape({
    email: Yup.string()
      .required("E-posta adresi zorunludur")
      .email("Geçersiz E-posta adresi"),
    password: Yup.string().required("Şifre zorunludur"),
  });

  const handleSubmit = async (values: FormData) => {
    const { email, password } = values;
    setError(null);
    try {
      await signIn("credentials", {
        email,
        password,
        callbackUrl: "/",
      });
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      toast.error(errorMsg);
    }
  };

  return (
    <Row className="align-items-center justify-content-center g-0 min-vh-100">
      <Col xxl={4} lg={6} md={8} xs={12} className="py-8 py-xl-0">
        <Card className="smooth-shadow-md">
          <Card.Body className="p-6">
            <div className="d-flex justify-content-center align-items-center mb-6">
              <p className="h3 fw-bold">Giriş Yap</p>
            </div>
            {error && (
              <Alert variant="danger" onClose={() => setError(null)} dismissible>
                {error}
              </Alert>
            )}
            {hasMounted && (
              <Formik
                initialValues={initialValues}
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
              >
                {({ handleSubmit, isValid, isSubmitting }) => (
                  <Form noValidate onSubmit={handleSubmit}>
                    <FormTextField
                      as={Col}
                      md={12}
                      controlId="validationEmail"
                      label="E-posta Adresi"
                      type="text"
                      name="email"
                    />
                    <FormTextField
                      as={Col}
                      md={12}
                      controlId="validationPassword"
                      label="Şifreniz"
                      type="password"
                      name="password"
                    />
                    <div className="d-grid">
                      <Button
                        disabled={!isValid || isSubmitting}
                        variant="primary"
                        as="input"
                        size="lg"
                        type="submit"
                        value="Giriş Yap"
                      />
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

export default SignIn;
