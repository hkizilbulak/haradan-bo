"use client";
import React, { useEffect, useState } from "react";
import { Card, Form, Button, Alert, InputGroup } from "react-bootstrap";
import useMounted from "@/hooks/useMounted";
import { useAuth, useSession } from "@/context/AuthContext";
import { Formik } from "formik";
import * as Yup from "yup";
import { toast } from "react-toastify";
import { getErrorMessage } from "@/helpers/HelperUtils";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface FormData {
  email: string;
  password: string;
}

const SignIn = () => {
  const hasMounted = useMounted();
  const { data: session } = useSession();
  const { signIn } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (session?.user.role === "admin" && session.user.status === "ACTIVE") {
      router.replace("/");
    }
  }, [router, session]);

  const initialValues: FormData = {
    email: "",
    password: "",
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
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 99999,
        backgroundColor: "#070a0f",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflowY: "auto",
        padding: 0,
        margin: 0,
      }}
    >
      <div style={{ width: "100%", maxWidth: "430px" }}>
        <Card
          className="login-card"
          style={{
            outline: "none",
          }}
        >
          <Card.Body style={{ padding: "2.8rem 2.2rem" }}>
            {/* Logo Header */}
            <div className="text-center" style={{ marginBottom: "2rem" }}>
              <div
                style={{
                  fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
                  lineHeight: 1,
                }}
              >
                <div
                  style={{
                    fontSize: "2.6rem",
                    fontWeight: 900,
                    letterSpacing: "3px",
                    color: "#00c6fb",
                    textTransform: "uppercase",
                    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
                    textShadow: "0 0 30px rgba(0, 198, 251, 0.2), 0 0 60px rgba(0, 198, 251, 0.08)",
                  }}
                >
                  HARADAN
                </div>
              </div>
            </div>

            {error && (
              <Alert
                variant="danger"
                className="py-2 text-center small mb-3"
                style={{
                  backgroundColor: "rgba(239, 68, 68, 0.2)",
                  color: "#fca5a5",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  borderRadius: "8px",
                }}
                onClose={() => setError(null)}
                dismissible
              >
                {error}
              </Alert>
            )}

            {hasMounted && (
              <Formik
                initialValues={initialValues}
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
              >
                {({ handleSubmit, handleChange, values, errors, touched, isValid, isSubmitting }) => (
                  <Form noValidate onSubmit={handleSubmit} className="d-flex flex-column gap-3">
                    {/* E-posta Input */}
                    <div>
                      <label
                        className="small fw-semibold mb-1 d-block"
                        style={{ color: "#94a3b8", fontSize: "0.85rem" }}
                      >
                        E-posta <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <Form.Control
                        type="email"
                        name="email"
                        value={values.email}
                        onChange={handleChange}
                        isInvalid={touched.email && Boolean(errors.email)}
                        placeholder="admin@haradan.com"
                        style={{
                          backgroundColor: "#e2ebf8",
                          color: "#0f172a",
                          border: "none",
                          borderRadius: "8px",
                          padding: "0.65rem 0.9rem",
                          fontSize: "0.92rem",
                          fontWeight: 500,
                        }}
                      />
                      {touched.email && errors.email && (
                        <div className="text-danger small mt-1" style={{ fontSize: "0.8rem" }}>
                          {errors.email}
                        </div>
                      )}
                    </div>

                    {/* Şifre Input */}
                    <div>
                      <label
                        className="small fw-semibold mb-1 d-block"
                        style={{ color: "#94a3b8", fontSize: "0.85rem" }}
                      >
                        Şifre <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <InputGroup>
                        <Form.Control
                          type={showPassword ? "text" : "password"}
                          name="password"
                          value={values.password}
                          onChange={handleChange}
                          isInvalid={touched.password && Boolean(errors.password)}
                          placeholder="••••••••"
                          style={{
                            backgroundColor: "#e2ebf8",
                            color: "#0f172a",
                            border: "none",
                            borderTopLeftRadius: "8px",
                            borderBottomLeftRadius: "8px",
                            padding: "0.65rem 0.9rem",
                            fontSize: "0.92rem",
                            fontWeight: 500,
                          }}
                        />
                        <Button
                          type="button"
                          variant="light"
                          onClick={() => setShowPassword(!showPassword)}
                          style={{
                            backgroundColor: "#e2ebf8",
                            border: "none",
                            borderTopRightRadius: "8px",
                            borderBottomRightRadius: "8px",
                            color: "#64748b",
                            padding: "0 0.8rem",
                          }}
                        >
                          <i className={showPassword ? "fe fe-eye-off" : "fe fe-eye"}></i>
                        </Button>
                      </InputGroup>
                      {touched.password && errors.password && (
                        <div className="text-danger small mt-1" style={{ fontSize: "0.8rem" }}>
                          {errors.password}
                        </div>
                      )}
                    </div>

                    {/* Şifremi Unuttum Link */}
                    <div className="text-end" style={{ marginTop: "-4px" }}>
                      <Link
                        href="/reset-password"
                        className="small text-decoration-none"
                        style={{ color: "#64748b", fontSize: "0.82rem" }}
                      >
                        Şifremi Unuttum
                      </Link>
                    </div>

                    {/* Giriş Yap Button */}
                    <div className="d-grid mt-2">
                      <Button
                        disabled={!isValid || isSubmitting}
                        type="submit"
                        style={{
                          background: "linear-gradient(135deg, #7c5cfc 0%, #a855f7 100%)",
                          border: "none",
                          borderRadius: "8px",
                          padding: "0.7rem",
                          fontSize: "0.95rem",
                          fontWeight: 600,
                          boxShadow: "0 4px 14px rgba(124, 92, 252, 0.35)",
                          color: "#ffffff",
                          transition: "all 0.2s ease",
                        }}
                      >
                        {isSubmitting ? "Giriş Yapılıyor..." : "Giriş Yap"}
                      </Button>
                    </div>
                  </Form>
                )}
              </Formik>
            )}
          </Card.Body>
        </Card>
      </div>
    </div>
  );
};

export default SignIn;
