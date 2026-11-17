// Run with Playwright MCP browser_run_code_unsafe(filename: this file).
// Start all five Vite applications first. All API data is intercepted in this browser only.
async (page) => {
  const assert = (condition, message) => { if (!condition) throw new Error(message) }
  const pageErrors = []
  const onPageError = (error) => pageErrors.push(error.message)
  page.on('pageerror', onPageError)
  const sessionUser = { id: 'ui-review-user', username: 'reviewer', firstName: 'Alex', lastName: 'Morgan', role: 'ADMIN', section: 'MARKETING', isActive: true, officeBranchId: 'branch-a', officeBranch: { id: 'branch-a', name: 'Jakarta' } }
  const menus = [
    { key: 'app_manager', label: 'App Manager', hasItem: true, items: [{ key: 'menus', label: 'Menus' }, { key: 'users', label: 'Users' }, { key: 'office-branches', label: 'Office Branches' }] },
    { key: 'marketing', label: 'Marketing', hasItem: true, items: [{ key: 'quotations', label: 'Quotations' }] },
    { key: 'field-service', label: 'Field Service', hasItem: true, items: [{ key: 'work-orders', label: 'Work Orders' }] },
    { key: 'finance', label: 'Finance', hasItem: true, items: [{ key: 'finance_quotations', label: 'Quotations' }] },
    { key: 'referensi', label: 'Reference', hasItem: true, items: [{ key: 'companies', label: 'Companies' }, { key: 'services', label: 'Services' }, { key: 'items', label: 'Items' }, { key: 'taxes', label: 'Tax' }] },
  ]
  let user = sessionUser
  let assignedMenus = menus
  let failMenus = false
  const pagination = { page: 1, limit: 20, total: 0, totalPages: 1 }
  const company = { id: 'ui-review-company', name: 'PT Industrial Inspection Customer', type: 'CUSTOMER', address: 'Jakarta', npwp: '01.234.567.8-901.000', revoked: false, isSisterCompany: false }
  const routeHandler = async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (!['fetch', 'xhr'].includes(request.resourceType()) || [4173, 4174, 4175, 4176, 4177].includes(Number(url.port))) return route.continue()
    const path = url.pathname
    if (failMenus && path.endsWith('/menus/my-menus')) {
      return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Review fixture: temporarily unavailable' }) })
    }
    assert(request.method() === 'GET', `Unexpected API mutation during visual review: ${request.method()} ${path}`)
    let data = []
    if (path.endsWith('/auth/me')) data = user
    else if (path.endsWith('/menus/my-menus')) data = assignedMenus
    else if (path.includes('quotation')) data = { quotations: [], pagination }
    else if (path.includes('work-order')) data = { workOrders: [], pagination }
    else if (path.endsWith('/companies')) data = { companies: [company], pagination: { ...pagination, total: 1 } }
    else if (path.endsWith('/users')) data = { users: [], pagination }
    else if (path.endsWith('/office-branches')) data = { officeBranches: [], pagination }
    else if (path.endsWith('/menus')) data = { menus: [], pagination }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data, pagination }) })
  }
  await page.unrouteAll({ behavior: 'wait' })
  await page.route('**/*', routeHandler)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.evaluate(() => localStorage.setItem('akura-theme', 'light'))
  await page.goto('http://127.0.0.1:4173/dashboard')
  await page.getByRole('heading', { name: 'Your operations workspace', exact: true }).waitFor()
  const navigate = async (path, title) => {
    await page.evaluate((destination) => { history.pushState({}, '', destination); dispatchEvent(new PopStateEvent('popstate')) }, path)
    await page.getByRole('heading', { name: title, exact: true }).first().waitFor()
    await page.waitForFunction(() => !document.querySelector('.ant-spin-spinning, .ant-spin-blur'))
  }
  const capture = async (path) => {
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path, animations: 'disabled' })
  }
  const routes = [
    ['/dashboard', 'Your operations workspace'], ['/dashboard/profile', 'My Profile'],
    ['/app_manager/menus', 'Menu Management'], ['/app_manager/users', 'User Management'], ['/app_manager/office-branches', 'Office Branch Management'],
    ['/marketing', 'Marketing'], ['/marketing/quotations', 'Quotation Management'], ['/marketing/quotations/create', 'Create Quotation'],
    ['/referensi/companies', 'Company Management'], ['/referensi/services', 'Service Management'], ['/referensi/items', 'Item Management'],
    ['/field-service', 'Field Service'], ['/field-service/work-orders', 'Work Orders'],
    ['/finance', 'Finance'], ['/finance/finance_quotations', 'Quotations'], ['/referensi/taxes', 'Tax'],
  ]
  const layouts = []
  let moduleThemeChecks = 0
  try {
    for (const width of [1440, 1024, 768, 390, 375]) {
      await page.setViewportSize({ width, height: 1000 })
      for (const [path, title] of routes) {
        await navigate(path, title)
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
        assert(!overflow, `Document overflow at ${width}px: ${path}`)
        const branch = width <= 768 ? page.locator('.header-mobile-location small') : page.locator('.header-branch')
        assert((await branch.innerText()) === 'Jakarta', `Missing branch context at ${width}px: ${path}`)
        if (path === '/dashboard' && [1440, 768, 390].includes(width)) {
          await capture(`docs/design/previews/workspace-${width}.png`)
        }
        layouts.push({ width, path })
      }
    }

    await page.setViewportSize({ width: 390, height: 844 })
    await navigate('/dashboard', 'Your operations workspace')
    assert(await page.locator('.workspace-group a').count() === 10, 'Directory differs from assigned menus')
    const toggle = page.getByRole('button', { name: 'Toggle navigation' })
    await toggle.click()
    await page.getByRole('dialog').waitFor()
    assert(await page.evaluate(() => !!document.activeElement.closest('.ant-drawer')), 'Drawer did not receive focus')
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    assert(await page.evaluate(() => !!document.activeElement.closest('.ant-drawer')), 'Drawer focus escaped')
    await page.keyboard.press('Escape')
    await page.getByRole('dialog').waitFor({ state: 'hidden' })
    assert(await toggle.evaluate((element) => element === document.activeElement), 'Drawer did not restore focus')
    await page.locator('.workspace-group a[href="/referensi/companies"]').click()
    await page.getByRole('heading', { name: 'Company Management', exact: true }).waitFor()
    await page.getByRole('cell', { name: company.name, exact: true }).waitFor()
    await page.waitForFunction(() => !document.querySelector('.ant-spin-spinning, .ant-spin-blur'))
    await capture('docs/design/previews/company-mobile.png')
    await page.getByRole('button', { name: /Add Company$/ }).click()
    await page.getByRole('dialog').waitFor()
    assert(await page.getByRole('dialog').evaluate((element) => element.getBoundingClientRect().width <= innerWidth), 'Company editor exceeds mobile viewport')
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    await page.getByRole('dialog').waitFor({ state: 'hidden' })

    await page.setViewportSize({ width: 1440, height: 1000 })
    await toggle.click()
    await page.waitForFunction(() => Math.round(document.querySelector('.dashboard-sider').getBoundingClientRect().width) === 80)
    await toggle.click()
    await page.locator('.workspace-skip-link').focus()
    await page.keyboard.press('Enter')
    assert(await page.evaluate(() => document.activeElement.id === 'workspace-main'), 'Skip link did not focus main content')
    await navigate('/app_manager/menus', 'Menu Management')
    await page.getByRole('tab', { name: 'Menu Item', exact: true }).click()
    await page.getByRole('heading', { name: 'Menu Item Management', exact: true }).waitFor()
    await page.getByRole('tab', { name: 'Menu Access', exact: true }).click()
    await page.getByRole('heading', { name: 'Menu Access', exact: true }).waitFor()

    for (const mode of ['dark', 'light']) {
      await page.getByRole('button', { name: `Switch to ${mode} mode` }).click()
      await page.waitForFunction((expected) => document.documentElement.dataset.theme === expected, mode)
      await navigate('/dashboard', 'Your operations workspace')
      const contrast = await page.evaluate(() => {
        const linear = (value) => { const channel = value / 255; return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4 }
        const luminance = (color) => { const channels = color.match(/[\d.]+/g).slice(0, 3).map(Number).map(linear); return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722 }
        const background = getComputedStyle(document.querySelector('.workspace-group')).backgroundColor
        return ['.workspace-group a', '.workspace-group p', '.workspace-group h3'].map((selector) => {
          const foreground = getComputedStyle(document.querySelector(selector)).color
          const a = luminance(foreground), b = luminance(background)
          return { selector, ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05) }
        })
      })
      contrast.forEach(({ selector, ratio }) => assert(ratio >= 4.5, `${mode} contrast below 4.5: ${selector} (${ratio})`))
      for (const [path, title] of [routes[2], routes[8], routes[12], routes[14]]) {
        await navigate(path, title)
        const color = await page.locator('.dashboard-content .ant-typography-secondary').first().evaluate((element) => getComputedStyle(element).color)
        assert(color === (mode === 'dark' ? 'rgb(166, 183, 199)' : 'rgb(83, 102, 121)'), `Module secondary text differs from ${mode} theme: ${path} (${color})`)
        moduleThemeChecks += 1
      }
      await navigate('/dashboard', 'Your operations workspace')
      if (mode === 'dark') await capture('docs/design/previews/workspace-dark.png')
    }

    failMenus = true
    await page.reload()
    await page.getByRole('heading', { name: 'Your modules could not be loaded' }).waitFor()
    failMenus = false
    await page.getByRole('button', { name: 'Try Again', exact: true }).click()
    await page.locator('.workspace-group a').first().waitFor()
    assignedMenus = [menus[3]]
    user = { ...sessionUser, section: 'FINANCE', officeBranchId: 'branch-b', officeBranch: { name: 'Surabaya' } }
    await page.reload()
    await page.getByRole('heading', { name: 'Your operations workspace' }).waitFor()
    assert(await page.locator('.workspace-group a').count() === 1, 'Unassigned module links leaked into directory')
    assert((await page.locator('.header-branch').innerText()) === 'Surabaya', 'Branch context did not update')
    assignedMenus = []
    await page.reload()
    await page.getByRole('heading', { name: 'No modules assigned yet' }).waitFor()
    assert(await page.locator('.workspace-group a').count() === 0, 'Empty menu invented destinations')

    user = null
    for (const path of ['/login', '/register']) {
      await page.goto(`http://127.0.0.1:4173${path}`)
      await page.locator('.auth-form-title').waitFor()
      for (const width of [1440, 768, 390, 375]) {
        await page.setViewportSize({ width, height: width <= 390 ? 844 : 1000 })
        assert(!await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), `Auth overflow: ${path} at ${width}px`)
        if (path === '/login' && width <= 390) {
          const button = await page.locator('#btn-login-submit').boundingBox()
          assert(button.y + button.height <= 844, 'Mobile sign-in action falls below the first viewport')
        }
      }
      assert(await page.locator('#input-username').getAttribute('autocomplete') === 'username', 'Username autocomplete was overridden')
      assert(await page.locator('#input-password').getAttribute('autocomplete') === (path === '/login' ? 'current-password' : 'new-password'), 'Password manager autocomplete was overridden')
      await page.locator('button[type="submit"]').click()
      await page.getByText('Username is required.', { exact: true }).waitFor()
    }
    assert(pageErrors.length === 0, `Browser errors: ${pageErrors.join('; ')}`)
    return { responsiveRouteChecks: layouts.length, authChecks: 8, moduleThemeChecks, checked: ['assigned menus', 'branch change', 'no menus', 'menu retry', 'populated company table', 'mobile editor', 'menu tabs', 'drawer focus/Escape/restore', 'sidebar collapse', 'skip link', 'light/dark contrast', 'module secondary text', 'auth validation/autocomplete', 'mobile sign-in position'], pageErrors }
  } finally {
    page.off('pageerror', onPageError)
    await page.unroute('**/*', routeHandler)
  }
}
