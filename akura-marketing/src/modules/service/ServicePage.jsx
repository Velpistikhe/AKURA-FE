import ServiceCatalogPage from './ServiceCatalogPage'
import { serviceService } from '../../services/serviceService'

function ServicePage() {
  return (
    <ServiceCatalogPage
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
