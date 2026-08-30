import { Tabs } from '../../components/global'
import ItemPage from '../item/ItemPage'
import ServicePage from './ServicePage'
import './ServiceMaintenancePage.css'

function ServiceMaintenancePage() {
  return (
    <div className="service-maintenance-page">
      <Tabs
        initialKey="services"
        items={[
          { key: 'services', label: 'Service', children: <ServicePage /> },
          { key: 'items', label: 'Item', children: <ItemPage /> },
        ]}
      />
    </div>
  )
}

export default ServiceMaintenancePage
