import { useState } from "react";
import Layout from "@/app/components/Layout";
import Dashboard from "@/app/components/Dashboard";
import Onboarding from "@/app/components/Onboarding";
import Terminations from "@/app/components/Terminations";
import ITAssets from "@/app/components/ITAssets";
import Reports from "@/app/components/Reports";

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
