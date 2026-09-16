export async function loadQuotationPdf(url, { signal } = {}) {
  const source = new URL(url)
  if (!['http:', 'https:'].includes(source.protocol)) throw new Error('PDF URL is unavailable.')
  const response = await fetch(source.href, { signal, credentials: 'omit' })
  if (!response.ok) throw new Error('Unable to load quotation PDF. Close the preview and try again.')
  const file = await response.blob()
  if (!(await file.slice(0, 1024).text()).includes('%PDF-')) throw new Error('The server did not return a valid PDF.')
  // Ignore attachment headers and normalize the MIME type for the browser viewer.
  return new Blob([file], { type: 'application/pdf' })
}
