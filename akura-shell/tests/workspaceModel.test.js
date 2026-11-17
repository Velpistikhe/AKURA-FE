import assert from 'node:assert/strict'
import test from 'node:test'
import { branchLabel, buildWorkspaceGroups } from '../src/modules/dashboard/workspaceModel.js'

test('workspace links include only assigned menus and retain server order without mutating input', () => {
  const menus = [
    { key: '/marketing/', order: 2, hasItem: true, items: [{ key: 'quotations', label: 'Quotations' }] },
    { key: 'finance', order: 1, hasItem: true, items: [{ key: 'finance_quotations', label: 'Quotation review', order: 2 }, { key: 'taxes', label: 'Tax', order: 1 }] },
    { key: 'unregistered-app', label: 'Unavailable', hasItem: false },
  ]
  const original = structuredClone(menus)
  const groups = buildWorkspaceGroups(menus)
  assert.deepEqual(groups.map(({ key }) => key), ['finance', 'marketing'])
  assert.deepEqual(groups.flatMap(({ links }) => links.map(({ path }) => path)), ['/finance/taxes', '/finance/finance_quotations', '/marketing/quotations'])
  assert.deepEqual(menus, original)
  assert.ok(!groups.some(({ key }) => key === 'app_manager'))
})

test('empty, unavailable, duplicate and unlabelled menus do not invent destinations', () => {
  assert.deepEqual(buildWorkspaceGroups(null), [])
  assert.deepEqual(buildWorkspaceGroups([{ key: 'marketing', hasItem: true }]), [])
  const groups = buildWorkspaceGroups([
    { key: 'finance', label: 'Finance' },
    { key: 'finance', label: 'Finance duplicate' },
    { key: 'referensi', hasItem: true, items: [{ key: '', label: 'Empty' }, { key: 'companies' }, { key: '/items/', label: 'Items' }] },
  ])
  assert.deepEqual(groups.flatMap(({ links }) => links.map(({ path }) => path)), ['/finance', '/referensi/items'])
})

test('branch context follows the active account and never substitutes another branch', () => {
  assert.equal(branchLabel({ officeBranchId: 'branch-a', officeBranch: { name: 'Jakarta' } }), 'Jakarta')
  assert.equal(branchLabel({ officeBranchId: 'branch-b', officeBranchName: 'Surabaya' }), 'Surabaya')
  assert.equal(branchLabel({ officeBranchId: 'branch-b' }), 'Branch assigned')
  assert.equal(branchLabel({ officeBranch: { name: 'Stale branch' } }), 'No branch assigned')
  assert.equal(branchLabel(null), 'No branch assigned')
})
