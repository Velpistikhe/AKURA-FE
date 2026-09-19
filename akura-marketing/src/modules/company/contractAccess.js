export const canAdministerContracts = (user) => ['ADMIN', 'APP_MANAGER'].includes(user?.role)
export const canApproveContract = (user, contract) => canAdministerContracts(user) && contract?.isActive === true && contract.status === 'CREATE'
export const canCreateContractPrice = (user) => user?.section === 'MARKETING'
export const canEditContractPrice = (user) => user?.role === 'ADMIN' && user?.section === 'MARKETING'
export const canManageCompanyContracts = (user) => canAdministerContracts(user) || canCreateContractPrice(user)
