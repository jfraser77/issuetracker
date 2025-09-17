import { useState } from "react";
import Layout from "../components/Layout";
import Dashboard from "../components/Dashboard";
import Onboarding from "../components/Onboarding";
import Terminations from "../components/Terminations";
import ITAssets from "../components/ITAssets";
import Reports from "../components/Reports";

export default function Home() {
  const [activePage, setActivePage] = useState("dashboard");

  const renderPage = () => {
    switch (activePage) {
      case "dashboard":
        return <Dashboard />;
      case "onboarding":
        return <Onboarding />;
      case "terminations":
        return <Terminations />;
      case "it-assets":
        return <ITAssets />;
      case "reports":
        return <Reports />;
      default:
        return <Dashboard />;
    }
  };

  return <Layout>{renderPage()}</Layout>;
}
