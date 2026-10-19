import { apiRequest } from './api'

// Work Orders are served by the Field Service MFE; Marketing only creates one
// from an approved quotation and needs the branch inspector options for that form.
export const workOrderService = {
  inspectors: () => apiRequest('/fieldservice/options/inspectors'),
}
