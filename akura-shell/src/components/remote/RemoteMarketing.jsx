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
          message="Akura Marketing tidak dapat dimuat"
          description="Pastikan service microfrontend Marketing aktif dan alamat remote sudah benar."
          action={<Button onClick={() => window.location.reload()}>Muat ulang</Button>}
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
      <Suspense fallback={<AppLoading message="Memuat Akura Marketing..." fullScreen={false} />}>
        <FederatedMarketing currentUser={user} pathname={location.pathname} />
      </Suspense>
    </MarketingErrorBoundary>
  )
}

export default RemoteMarketing
