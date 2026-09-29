import { Component, lazy, Suspense } from 'react'
import { Alert, Button } from '../global'
import { useLocation, useNavigate } from 'react-router-dom'
import { AppLoading } from '../ui'
import { useAuth } from '../../context/AuthContext'
import { getAccessToken } from '../../services/api'

const FederatedFieldService = lazy(() => import('akuraFieldService/FieldServiceApp'))

class FieldServiceErrorBoundary extends Component {
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
          title="Unable to load Akura FieldService"
          description="Make sure the FieldService microfrontend is running and its remote address is correct."
          action={<Button onClick={() => window.location.reload()}>Reload</Button>}
        />
      )
    }

    return this.props.children
  }
}

function RemoteFieldService() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <FieldServiceErrorBoundary>
      <Suspense fallback={<AppLoading message="Loading Akura FieldService..." fullScreen={false} />}>
        <FederatedFieldService
          currentUser={user}
          pathname={location.pathname}
          navigate={navigate}
          // Passed explicitly because the local MFE calls Field Service directly;
          // its HttpOnly Vercel cookie is not sent to localhost.
          accessToken={getAccessToken()}
        />
      </Suspense>
    </FieldServiceErrorBoundary>
  )
}

export default RemoteFieldService

