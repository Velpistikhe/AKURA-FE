import { App, Card, Typography } from "./components/global";
import AppRoute from "./routes/AppRoute";
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

function MarketingApp({ currentUser, pathname = window.location.pathname, navigate = (path) => window.location.assign(path) }) {
  return (
    <App>
      <AppRoute currentUser={currentUser} pathname={pathname} navigate={navigate} fallback={<MarketingOverview />} />
    </App>
  );
}

export default MarketingApp;
