import { useEffect } from "react";
import { Programme } from "./Programme.jsx";
import { Registration } from "./Registration.jsx";
import { Footer } from "./Footer.jsx";

export default function BelowFold() {
  useEffect(() => {
    window.dispatchEvent(new window.Event("lower-content-ready"));
  }, []);
  return (
    <>
      <Programme />
      <Registration />
      <Footer />
    </>
  );
}
