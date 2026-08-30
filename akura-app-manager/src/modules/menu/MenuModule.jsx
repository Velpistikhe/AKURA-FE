import { Tabs } from '../../components/global'
import MenuPage from './MenuPage'
import MenuItemPage from './MenuItemPage'
import MenuAccessPage from './MenuAccessPage'

function MenuModule() {
  return (
    <Tabs
      initialKey="menus"
      items={[
        { key: 'menus', label: 'Menu', children: <MenuPage /> },
        { key: 'menu-items', label: 'Menu Item', children: <MenuItemPage /> },
        { key: 'menu-accesses', label: 'Access Menu', children: <MenuAccessPage /> },
      ]}
    />
  )
}

export default MenuModule
