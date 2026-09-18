// Swagger reserves inactive service, quotation, contract and price lists for ADMIN.
export const canViewInactiveCatalog = (user) => user?.role === 'ADMIN'

export const activeScopes = (scopes = []) => scopes.filter((scope) => scope.revoked !== true)
