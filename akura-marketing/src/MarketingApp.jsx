import { App, Card, Typography } from "./components/global";
import CompanyPage from "./modules/company/CompanyPage";
import ServiceMaintenancePage from "./modules/service/ServiceMaintenancePage";
import "./MarketingApp.css";

function MarketingOverview() {
  return (
    <section className="marketing-overview">
      <Card className="marketing-overview-card">
        <span className="marketing-overview-eyebrow">Marketing workspace</span>
        <Typography.Title level={2}>Akura Marketing</Typography.Title>
        <Typography.Text tone="secondary">
          Select a Marketing module from the navigation to start managing data.
        </Typography.Text>
        <div className="marketing-overview-decoration" aria-hidden="true" />
      </Card>
    </section>
  );
}

function MarketingApp({ pathname = window.location.pathname }) {
  const normalizedPath = pathname.replace(/\/+$/, "");
  const endsWithAny = (...paths) =>
    paths.some((path) => normalizedPath.endsWith(path));
  let content = <MarketingOverview />;

  if (endsWithAny("/marketing/manage-company", "/marketing/companies")) {
    content = <CompanyPage />;
  } else if (
    endsWithAny(
      "/service",
      "/services",
      "/marketing/manage-service",
      "/marketing/manage-services",
      "/marketing/manage-maintenance",
      "/marketing/manage-maintenances",
      "/marketing/maintenance",
      "/marketing/maintenances",
    )
  ) {
    content = <ServiceMaintenancePage />;
  }

  return <App>{content}</App>;
}

export default MarketingApp;
