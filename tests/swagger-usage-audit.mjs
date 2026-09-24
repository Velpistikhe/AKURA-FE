import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

// Read-only audit: service requests are captured locally, never sent to the API.
const root = path.resolve(import.meta.dirname, '..')
const apps = ['akura-shell', 'akura-app-manager', 'akura-marketing', 'akura-finance', 'akura-fieldservice']
const swagger = await fetch(process.env.SWAGGER_URL || 'http://localhost:5000/api-docs.json').then(r => {
  if (!r.ok) throw new Error(`Swagger HTTP ${r.status}`)
  return r.json()
})
const id = '00000000-0000-4000-8000-000000000001'
const normalize = value => value.replace(/\{[^}]+\}/g, '{}')
const operations = Object.entries(swagger.paths).flatMap(([url, methods]) => Object.keys(methods)
  .filter(method => ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(method))
  .map(method => ({ method: method.toUpperCase(), path: url, callers: [] })))
const requests = []
async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? files(path.join(dir, entry.name)) : path.join(dir, entry.name)))).flat()
}
function capture(request, app, caller, references) {
  const url = new URL(request.path, 'http://localhost')
  const pathname = `/api/v1${url.pathname}`.replaceAll(id, '{id}')
  const method = request.method || 'GET'
  const operation = operations.find(op => op.method === method && normalize(op.path) === normalize(pathname))
  const entry = { app, caller, references, method, path: pathname, documented: Boolean(operation) }
  requests.push(entry)
  if (operation) operation.callers.push(entry)
}
for (const app of apps) {
  const sources = await Promise.all((await files(path.join(root, app, 'src'))).filter(file => /\.[jt]sx?$/.test(file)).map(async file => ({ file: path.relative(root, file).replaceAll('\\', '/'), text: await readFile(file, 'utf8') })))
  for (const source of sources.filter(source => /\/services\/.*Service\.js$/.test(source.file))) {
    const code = source.text.replace("import { apiRequest } from './api'", 'const apiRequest = (path, options = {}) => ({ path, ...options })')
    const mod = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
    const name = path.basename(source.file, '.js')
    const groups = name === 'documentService'
      ? ['invoices', 'proforma-invoices'].map(kind => [name, mod.documentService(kind)])
      : [[name, mod[name]]]
    for (const [object, service] of groups) {
      for (const [method, invoke] of Object.entries(service)) {
        const references = sources.filter(s => s.file !== source.file && (s.text.includes(`${object}.${method}`)
          || (name === 'documentService' && s.text.includes(`service.${method}`))
          || (name === 'serviceService' && /\/modules\/service\//.test(s.file) && s.text.includes(`service.${method}`))
          || (name === 'contractService' && s.text.includes('contractService[action.key]') && s.text.includes(`key: '${method}'`))))
          .map(s => s.file)
        let request
        if (method === 'importPrices') request = invoke(id, { companyId: id, version: 0, file: new Blob(['audit']) })
        else if (method === 'listContractPriceOptions') request = invoke(id, {})
        else if (/^(list|download|deliveries|resync|options)$/.test(method) || method.startsWith('list')) request = invoke({})
        else if (method === 'create') request = invoke({})
        else if (/history$/i.test(method)) request = invoke(id, {})
        else request = invoke(id, id, '2026-09-22')
        capture(request, app, `${source.file}: ${object}.${method}`, references)
      }
    }
    if (mod.getQuotationReference) capture(mod.getQuotationReference(id), app, `${source.file}: getQuotationReference`, sources.filter(s => s.file !== source.file && s.text.includes('getQuotationReference')).map(s => s.file))
  }
  // Direct request sites, shell auth/menu calls and automatic cookie refresh.
  for (const source of sources) {
    if (/\/services\/.*Service\.js$/.test(source.file)) continue
    for (const match of source.text.matchAll(/(?:apiRequest\(|api\.(get|post|put|patch|delete)\(|(?:authAPI|refreshClient)\.(post)\()[`']([^`']+)[`'](?:,\s*\{\s*method:\s*'([^']+)')?/g)) {
      if (!match[3].startsWith('/')) continue
      const url = match[3].replace(/\$\{[^}]+\}/g, id)
      capture({ path: url, method: (match[4] || match[1] || match[2] || 'GET').toUpperCase() }, app, source.file, [source.file])
    }
    if (source.text.includes('/auth/refresh-token')) capture({ path: '/auth/refresh-token', method: 'POST' }, app, source.file, [source.file])
  }
}
const report = {
  checkedAt: new Date().toISOString(), source: process.env.SWAGGER_URL || 'http://localhost:5000/api-docs.json',
  note: 'Static source audit, not runtime telemetry. Service references must be reviewed for dynamically selected methods and component reachability.',
  totalOperations: operations.length,
  unused: operations.filter(op => !op.callers.length),
  serviceOnly: operations.filter(op => op.callers.length && op.callers.every(c => !c.references.length)),
  undocumented: requests.filter(r => !r.documented),
  operations,
}
await writeFile(path.join(root, 'tests/swagger-usage-audit.json'), `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify({ ...report, operations: undefined }, null, 2))
