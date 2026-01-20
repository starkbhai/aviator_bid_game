import Aviator from "@/components/pages/Aviator";
import Image from "next/image";
import { ToastContainer } from "react-toastify";

export default function Home() {
  return (
    <div>
      <Aviator />
      <ToastContainer
        position="top-right"
        autoClose={2000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
}
