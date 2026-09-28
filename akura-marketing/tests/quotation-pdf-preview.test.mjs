import assert from 'node:assert/strict'
import test from 'node:test'
import { loadQuotationPdf, quotationPdfBlob } from '../src/modules/quotation/quotationPdfPreview.js'
import { readFile } from 'node:fs/promises'

test('Preview endpoint uses authenticated API transport, binary response and abort signal', async () => {
  const source = (await readFile(new URL('../src/services/quotationService.js', import.meta.url), 'utf8'))
    .replace("import { apiRequest } from './api'", 'const apiRequest = (path, options) => ({ path, ...options })')
  const { quotationService } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
  const signal = new AbortController().signal
  const request = quotationService.previewPdf('quote-1', { signal })
  assert.equal(request.path, '/marketing/quotations/quote-1/pdf')
  assert.equal(request.method, 'GET')
  assert.equal(request.responseType, 'blob')
  assert.equal(request.cache, 'no-store')
  assert.equal(request.signal, signal)
  assert.equal(request.body, undefined)
  const pdf = await quotationPdfBlob(new Blob(['%PDF-1.4\npreview'], { type: 'application/octet-stream' }))
  assert.equal(pdf.type, 'application/pdf')
  await assert.rejects(quotationPdfBlob(new Blob(['{"error":"unavailable"}'])), /valid PDF/)
  await assert.rejects(quotationPdfBlob(undefined), /valid PDF/)
})

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
