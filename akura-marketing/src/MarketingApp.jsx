import { App, Typography } from "./components/global";
import AppRoute from "./routes/AppRoute";
import "./MarketingApp.css";

function MarketingOverview() {
  return (
    <section className="marketing-overview">
      <header className="marketing-overview-heading">
        <Typography.Title level={1}>Marketing</Typography.Title>
        <Typography.Text tone="secondary">
          From customer requirements to an inspection ready quotation.
        </Typography.Text>
      </header>
      <ol className="marketing-process">
        <li><h2>Prepare the quotation</h2><p>Bring together customer details, inspection items, quantities, and prices.</p></li>
        <li><h2>Review and approve</h2><p>Follow the quotation status and review changes before approval.</p></li>
        <li><h2>Coordinate the work</h2><p>Use the approved quotation to prepare a work order for inspection.</p></li>
      </ol>
      <p className="marketing-overview-hint">Open your assigned Marketing module from the navigation to begin.</p>
    </section>
  );
}

function MarketingApp({ currentUser, accessToken = '', pathname = window.location.pathname, navigate = (path) => window.location.assign(path) }) {
  return (
    <App>
      <AppRoute currentUser={currentUser} accessToken={accessToken} pathname={pathname} navigate={navigate} fallback={<MarketingOverview />} />
    </App>
  );
}

export default MarketingApp;
