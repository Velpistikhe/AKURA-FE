import { App } from './components/global'
import AppRoute from './routes/AppRoute'
import { setAccessToken } from './services/api'

function AppManager({ accessToken = '', pathname = window.location.pathname }) {
  // Child effects issue requests on mount, so initialize the token before rendering them.
  setAccessToken(accessToken)
  return (
    <App>
      <AppRoute pathname={pathname} />
    </App>
  )
}

export default AppManager
