import { App } from './components/global'
import AppRoute from './routes/AppRoute'

function AppManager({ pathname = window.location.pathname }) {
  return (
    <App>
      <AppRoute pathname={pathname} />
    </App>
  )
}

export default AppManager
