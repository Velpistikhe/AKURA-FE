export const WORK_ORDER_STATUSES = ['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELED']
export const canAccessWorkOrders = (user) => Boolean(user?.isActive && user.officeBranchId
  && (['ADMIN', 'APP_MANAGER'].includes(user.role) || user.section === 'FIELD_SERVICE'))
