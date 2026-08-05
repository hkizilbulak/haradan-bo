import "styles/theme.scss";
import "react-toastify/dist/ReactToastify.css";

import type { Metadata } from "next";
import { NextAuthProvider } from "./providers";
import { ToastContainer } from "react-toastify";

export const metadata: Metadata = {
  title: "Haradan.com Backoffice",
  description: "Haradan.com Backoffice",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-light">
        <NextAuthProvider>{children}</NextAuthProvider>
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </body>
    </html>
  );
}
