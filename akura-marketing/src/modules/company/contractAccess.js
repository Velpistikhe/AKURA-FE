import { businessDate, canReceiveContractPrices } from './contractPriceModel.js'

export const CONTRACT_STATUSES = ['DRAFT', 'SUBMITTED', 'REJECTED', 'APPROVED', 'TERMINATED', 'REVISED']
const available = (contract) => Boolean(contract) && contract.isDeleted !== true
export const canAdministerContracts = (user) => user?.role === 'ADMIN' && user?.section === 'MARKETING'
export const canManageCompanyContracts = (user) => user?.section === 'MARKETING' && ['USER', 'ADMIN'].includes(user.role)
export const canApproveContract = (user, contract) => canAdministerContracts(user) && available(contract) && contract.status === 'SUBMITTED'
export const canRejectContract = canApproveContract
export const canSubmitContract = (user, contract) => canManageCompanyContracts(user) && available(contract) && contract.status === 'DRAFT'
export const canUpdateContract = (user, contract) => user?.section === 'MARKETING' && available(contract)
  && (['DRAFT', 'REJECTED'].includes(contract.status) || (contract.status === 'APPROVED' && canAdministerContracts(user)))
export const canCancelContract = (user, contract) => user?.section === 'MARKETING' && available(contract) && ['DRAFT', 'REJECTED'].includes(contract.status)
export const canTerminateContract = (user, contract) => canAdministerContracts(user) && available(contract) && contract.status === 'APPROVED'
export const canReviseContract = (user, contract, today = businessDate()) => user?.section === 'MARKETING' && available(contract) && contract.status === 'APPROVED' && contract.effectiveUntil > today
export const canCreateContractPrice = (user, contract) => user?.section === 'MARKETING' && canReceiveContractPrices(contract)
  && (['DRAFT', 'REJECTED'].includes(contract.status) || canAdministerContracts(user))
export const canEditContractPrice = canCreateContractPrice
export const canDeleteContractPrice = canCreateContractPrice
export const blocksContractCreation = (contract) => available(contract) && ['DRAFT', 'REJECTED'].includes(contract.status)
