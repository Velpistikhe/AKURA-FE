import CatalogPage from '../catalog/CatalogPage'
import { serviceService } from '../../services/serviceService'

function ServicePage() {
  return (
    <CatalogPage
      entityLabel="Service"
      entityLabelLower="service"
      dataKey="services"
      service={serviceService}
      canDelete
      canDeleteScope
      supportsMaintenance
    />
  )
}

export default ServicePage
