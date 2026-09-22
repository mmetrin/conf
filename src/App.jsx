import { Hero } from "./components/Hero.jsx";
import { Programme } from "./components/Programme.jsx";
import { Registration } from "./components/Registration.jsx";
import { StageOverlay } from "./components/StageOverlay.jsx";
import { Footer } from "./components/Footer.jsx";
import { useSceneRuntime } from "./hooks/useSceneRuntime.js";
export default function App() {
  useSceneRuntime();
  return (
    <>
      <StageOverlay />
      <main>
        <Hero />
        <Programme />
        <Registration />
        <Footer />
      </main>
    </>
  );
}
