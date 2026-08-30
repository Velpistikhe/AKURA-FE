import CatalogPage from '../catalog/CatalogPage'
import { maintenanceService } from '../../services/maintenanceService'

function MaintenancePage() {
  return (
    <CatalogPage
      entityLabel="Maintenance"
      entityLabelLower="maintenance"
      dataKey="maintenances"
      service={maintenanceService}
      canDelete={false}
    />
  )
}

export default MaintenancePage
