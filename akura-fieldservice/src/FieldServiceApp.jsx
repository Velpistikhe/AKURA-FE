import { App, Button, Card, Result, Typography } from './components/global'
import WorkOrderPage from './modules/work-order/WorkOrderPage'
import { resolveFieldServiceRoute } from './routes/fieldServiceRoutes'
import { setAccessToken } from './services/api'
import './FieldServiceApp.css'

export default function FieldServiceApp({ currentUser, accessToken = '', pathname = window.location.pathname, navigate = (path) => window.location.assign(path) }) {
  // Development direct access: the Shell passes the Vercel-issued access token so
  // this MFE can send Authorization: Bearer straight to the local service.
  // Set synchronously (child effects fetch on mount before parent effects run).
  setAccessToken(accessToken)
  const route = resolveFieldServiceRoute(pathname)
  return <App><main className="fieldservice-workspace">
    {route === 'work-orders' ? <WorkOrderPage currentUser={currentUser} /> : route === 'overview' ? <Card className="fieldservice-overview-card">
      <Typography.Title level={1}>Field Service</Typography.Title>
      <p><Typography.Text tone="secondary">Keep branch inspection work organized, from planning to execution.</Typography.Text></p>
      <ul className="fieldservice-overview-scope"><li>Work orders and inspection requirements</li><li>Schedules and assigned inspectors</li><li>Record details, changes, and synchronization</li></ul>
      <Button variant="primary" onClick={() => navigate('/field-service/work-orders')}>Open Work Orders</Button>
    </Card> : <Result status="404" title="Page not available" subTitle="Open Work Orders to view schedules, update work, and review change history." extra={<Button onClick={() => navigate('/field-service/work-orders')}>Back to Work Orders</Button>} />}
  </main></App>
}
