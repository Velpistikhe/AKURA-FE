export const canAdministerContracts = (user) => ['ADMIN', 'APP_MANAGER'].includes(user?.role)
export const canApproveContract = (user, contract) => canAdministerContracts(user) && contract?.isActive === true && contract.status === 'CREATE'
