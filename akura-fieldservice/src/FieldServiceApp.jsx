import { App, Button, Card, Result, Typography } from './components/global'
import WorkOrderPage from './modules/work-order/WorkOrderPage'
import { resolveFieldServiceRoute } from './routes/fieldServiceRoutes'
import './FieldServiceApp.css'

export default function FieldServiceApp({ currentUser, pathname = window.location.pathname, navigate = (path) => window.location.assign(path) }) {
  const route = resolveFieldServiceRoute(pathname)
  return <App><main className="fieldservice-workspace">
    {route === 'work-orders' ? <WorkOrderPage currentUser={currentUser} /> : route === 'overview' ? <Card className="fieldservice-overview-card">
      <span className="fieldservice-eyebrow">Field Service workspace</span>
      <Typography.Title level={2}>Akura Field Service</Typography.Title>
      <p><Typography.Text tone="secondary">View work orders, schedules, and assigned inspectors for your branch.</Typography.Text></p>
      <Button variant="primary" onClick={() => navigate('/field-service/work-orders')}>Open Work Orders</Button>
    </Card> : <Result status="404" title="Page not available" subTitle="Field Service currently provides read-only work orders." extra={<Button onClick={() => navigate('/field-service/work-orders')}>Back to Work Orders</Button>} />}
  </main></App>
}
