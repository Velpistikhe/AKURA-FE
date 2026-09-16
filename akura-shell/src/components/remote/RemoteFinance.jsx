import { Component, lazy, Suspense } from 'react'
import { Alert, Button } from '../global'
import { useLocation, useNavigate } from 'react-router-dom'
import { AppLoading } from '../ui'
import { useAuth } from '../../context/AuthContext'

const FederatedFinance = lazy(() => import('akuraFinance/FinanceApp'))

class FinanceErrorBoundary extends Component {
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
          title="Unable to load Akura Finance"
          description="Make sure the Finance microfrontend is running and its remote address is correct."
          action={<Button onClick={() => window.location.reload()}>Reload</Button>}
        />
      )
    }

    return this.props.children
  }
}

function RemoteFinance() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <FinanceErrorBoundary>
      <Suspense fallback={<AppLoading message="Loading Akura Finance..." fullScreen={false} />}>
        <FederatedFinance currentUser={user} pathname={location.pathname} navigate={navigate} />
      </Suspense>
    </FinanceErrorBoundary>
  )
}

export default RemoteFinance
