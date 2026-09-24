import { useEffect } from "react";
import { Programme } from "../Programme/Programme.jsx";
import { Registration } from "../Registration/Registration.jsx";
import { Footer } from "../Footer/Footer.jsx";

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
