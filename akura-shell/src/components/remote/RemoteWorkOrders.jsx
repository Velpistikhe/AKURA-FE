import { Result } from 'antd'
import { useAuth } from '../../context/AuthContext'
import { useMenu } from '../../context/MenuContext'
import { workOrderMfe } from '../../routes/workOrderRouting'
import RemoteMarketing from './RemoteMarketing'
import RemoteFieldService from './RemoteFieldService'

export default function RemoteWorkOrders() {
  const { user } = useAuth()
  const { menus } = useMenu()
  const mfe = workOrderMfe(menus, user)
  if (!mfe) return <Result status="403" title="Access denied" subTitle="Work orders are not included in your menu access." />
  return mfe === 'marketing' ? <RemoteMarketing /> : <RemoteFieldService />
}
