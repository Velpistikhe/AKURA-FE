import assert from 'node:assert/strict'
import test from 'node:test'
import * as marketing from '../src/modules/quotation/invoiceActionModel.js'
import * as finance from '../../akura-finance/src/modules/quotation/invoiceActionModel.js'

const quotation = { id: '00000000-0000-4000-8000-000000000001', version: 3, status: 'APPROVED', invoiceStatus: null, isActive: true }
for (const [name, model] of Object.entries({ marketing, finance })) {
  test(`${name}: invoice action requires Finance, active approval, and no invoice status`, () => {
    assert.equal(model.canCreateInvoice({ section: 'FINANCE' }, quotation), true)
    for (const section of ['MARKETING', 'FIELD_SERVICE', null, undefined]) assert.equal(model.canCreateInvoice({ section, role: 'ADMIN' }, quotation), false)
    for (const status of ['CREATED', 'REVISED', 'SENT', 'REJECTED']) assert.equal(model.canCreateInvoice({ section: 'FINANCE' }, { ...quotation, status }), false)
    assert.equal(model.canCreateInvoice({ section: 'FINANCE' }, { ...quotation, isActive: false }), false)
    assert.equal(model.canCreateInvoice({ section: 'FINANCE' }, { ...quotation, invoiceStatus: 'DRAFT' }), false)
    assert.equal(model.canCreateInvoice(undefined, quotation), false)
  })
  test(`${name}: invoice body matches local Swagger and uses refreshed quotation version`, async () => {
    const response = await fetch('http://localhost:5000/api-docs.json')
    assert.equal(response.status, 200)
    const swagger = await response.json()
    const schema = swagger.components.schemas.InvoiceCreate
    const body = model.invoicePayload({ number: ' INV-001 ', title: ' Inspection ', date: '2026-09-14', tax: 99 }, quotation)
    for (const key of schema.required) assert.notEqual(body[key], undefined)
    for (const key of Object.keys(body)) assert.ok(schema.properties[key], key)
    assert.equal(Object.hasOwn(body, 'number'), false)
    assert.equal(Object.hasOwn(body, 'date'), false)
    assert.equal(body.quotationVersion, 3)
    assert.equal(body.quotationId, quotation.id)
    assert.equal(body.status, 'DRAFT')
    assert.equal(Object.hasOwn(body, 'tax'), false)
  })
}
