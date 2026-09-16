import assert from 'node:assert/strict'
import test from 'node:test'
import { loadQuotationPdf } from '../src/modules/quotation/quotationPdfPreview.js'

test('Attachment responses become PDF blobs for inline browser preview', async (t) => {
  const controller = new AbortController()
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://storage.example/quotation.pdf?signature=test')
    assert.equal(options.signal, controller.signal)
    assert.equal(options.credentials, 'omit')
    return new Response('%PDF-1.7\npreview', { headers: { 'Content-Type': 'application/octet-stream', 'Content-Disposition': 'attachment; filename="quotation.pdf"' } })
  })
  const pdf = await loadQuotationPdf('https://storage.example/quotation.pdf?signature=test', { signal: controller.signal })
  assert.equal(pdf.type, 'application/pdf')
  assert.equal(await pdf.text(), '%PDF-1.7\npreview')
})

test('Invalid files, expired links, and unsupported URLs do not open a preview', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => new Response('Expired', { status: 403 }))
  await assert.rejects(loadQuotationPdf('https://storage.example/pdf'), /Unable to load/)
  fetch.mock.mockImplementation(async () => new Response('<html>Error</html>'))
  await assert.rejects(loadQuotationPdf('https://storage.example/pdf'), /valid PDF/)
  await assert.rejects(loadQuotationPdf('javascript:alert(1)'), /unavailable/)
})
