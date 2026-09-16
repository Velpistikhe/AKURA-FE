import { Route, Routes } from 'react-router-dom'
import { Result } from 'antd'
import RemoteMarketing from './RemoteMarketing'
import RemoteFinance from './RemoteFinance'
import { useMenu } from '../../context/MenuContext'

const modules = { items: RemoteMarketing, services: RemoteMarketing, companies: RemoteMarketing, taxes: RemoteFinance }

export default function RemoteReference() {
  const { menus } = useMenu()
  const reference = (menus || []).find((menu) => String(menu.key || '').trim().replace(/^\/+|\/+$/g, '') === 'referensi')
  const allowedItems = new Set((reference?.items || []).map((item) => String(item.key || '').trim().replace(/^\/+|\/+$/g, '')))
  return <Routes>
    {Object.entries(modules).map(([path, Module]) => <Route key={path} path={path} element={allowedItems.has(path)
      ? <Module />
      : <Result status="403" title="Access denied" subTitle="This module is not included in your menu access." />} />)}
    <Route index element={<Result title="Referensi" subTitle="Select a reference module from the navigation." />} />
    <Route path="*" element={<Result status="404" title="Module not found" subTitle="This reference page is not available." />} />
  </Routes>
}
