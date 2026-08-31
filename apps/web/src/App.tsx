import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/layout";
import { AboutPage } from "./pages/about-page";
import { HomePage } from "./pages/home-page";

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
      </Route>
    </Routes>
  );
}
