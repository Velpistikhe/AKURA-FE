import assert from 'node:assert/strict'
import { test } from 'node:test'
import { canApproveQuotations, canManageQuotations } from '../src/modules/quotation/quotationAccess.js'

test('Role or menu access cannot grant quotation writes outside Marketing', () => {
  for (const section of ['FINANCE', 'HRD_MANAGEMENT', 'FIELD_SERVICE', null, undefined]) {
    for (const role of ['ADMIN', 'APP_MANAGER', 'USER', null]) {
      assert.equal(canManageQuotations({ section, role, menus: [{ key: 'marketing', items: [{ key: 'quotations' }] }] }), false)
    }
  }
})

test('Missing profiles deny writes; Marketing section grants writes independently of role', () => {
  assert.equal(canManageQuotations(), false)
  assert.equal(canManageQuotations(null), false)
  assert.equal(canManageQuotations({}), false)
  for (const role of ['ADMIN', 'USER']) assert.equal(canManageQuotations({ section: 'MARKETING', role }), true)
})

test('Quotation approval requires both Marketing section and ADMIN role', () => {
  for (const section of ['MARKETING', 'FINANCE', 'HRD_MANAGEMENT', 'FIELD_SERVICE', null, undefined]) {
    for (const role of ['ADMIN', 'APP_MANAGER', 'USER', null, undefined]) {
      assert.equal(canApproveQuotations({ section, role }), section === 'MARKETING' && role === 'ADMIN')
    }
  }
  for (const user of [undefined, null, {}]) assert.equal(canApproveQuotations(user), false)
})
