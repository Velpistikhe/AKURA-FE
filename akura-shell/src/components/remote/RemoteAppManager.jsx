import { Component, lazy, Suspense } from 'react'
import { Alert, Button } from '../global'
import { useLocation } from 'react-router-dom'
import { AppLoading } from '../ui'
import { useAuth } from '../../context/AuthContext'

const FederatedAppManager = lazy(() => import('akuraAppManager/AppManager'))

class RemoteErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <Alert
          tone="error"
          showIcon
          message="Unable to load Akura App Manager"
          description="Make sure the App Manager microfrontend is running and its remote address is correct."
          action={<Button onClick={() => window.location.reload()}>Reload</Button>}
        />
      )
    }

    return this.props.children
  }
}

function RemoteAppManager() {
  const { user } = useAuth()
  const location = useLocation()

  return (
    <RemoteErrorBoundary>
      <Suspense fallback={<AppLoading message="Loading Akura App Manager..." fullScreen={false} />}>
        <FederatedAppManager currentUser={user} pathname={location.pathname} />
      </Suspense>
    </RemoteErrorBoundary>
  )
}

export default RemoteAppManager
