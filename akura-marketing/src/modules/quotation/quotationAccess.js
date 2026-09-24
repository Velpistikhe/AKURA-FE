export const canManageQuotations = (user) => user?.section === 'MARKETING'
export const canApproveQuotations = (user) => canManageQuotations(user) && user?.role === 'ADMIN'
