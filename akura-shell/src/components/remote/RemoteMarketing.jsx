import { Component, lazy, Suspense } from 'react'
import { Alert, Button } from '../global'
import { useLocation } from 'react-router-dom'
import { AppLoading } from '../ui'
import { useAuth } from '../../context/AuthContext'

const FederatedMarketing = lazy(() => import('akuraMarketing/MarketingApp'))

class MarketingErrorBoundary extends Component {
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
          message="Unable to load Akura Marketing"
          description="Make sure the Marketing microfrontend is running and its remote address is correct."
          action={<Button onClick={() => window.location.reload()}>Reload</Button>}
        />
      )
    }

    return this.props.children
  }
}

function RemoteMarketing() {
  const { user } = useAuth()
  const location = useLocation()

  return (
    <MarketingErrorBoundary>
      <Suspense fallback={<AppLoading message="Loading Akura Marketing..." fullScreen={false} />}>
        <FederatedMarketing currentUser={user} pathname={location.pathname} />
      </Suspense>
    </MarketingErrorBoundary>
  )
}

export default RemoteMarketing
