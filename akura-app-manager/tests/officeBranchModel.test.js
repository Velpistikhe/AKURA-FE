import assert from 'node:assert/strict'
import test from 'node:test'
import { officeBranchPayload } from '../src/modules/office-branch/officeBranchModel.js'

const values = {
  name: ' Jakarta Branch ',
  address: ' Jl. Merdeka 10 ',
  telp: ' +62 21 555 0100 ',
  email: ' jakarta@example.com ',
  isHead: false,
  officeBranchId: 'another-branch',
  version: 99,
}

test('creation includes the normalized branch name and only documented fields', () => {
  assert.deepEqual(officeBranchPayload(values, { create: true }), {
    name: 'Jakarta Branch', address: 'Jl. Merdeka 10', telp: '+62 21 555 0100',
    email: 'jakarta@example.com', isHead: false,
  })
  assert.equal(values.name, ' Jakarta Branch ')
})

test('updates omit the immutable name, branch ownership and unsupported fields', () => {
  assert.deepEqual(officeBranchPayload(values), {
    address: 'Jl. Merdeka 10', telp: '+62 21 555 0100', email: 'jakarta@example.com', isHead: false,
  })
  assert.equal(officeBranchPayload({ ...values, name: undefined, isHead: true }).isHead, true)
})
