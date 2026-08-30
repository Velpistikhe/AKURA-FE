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
          message="Akura App Manager tidak dapat dimuat"
          description="Pastikan service microfrontend App Manager aktif dan alamat remote sudah benar."
          action={<Button onClick={() => window.location.reload()}>Muat ulang</Button>}
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
      <Suspense fallback={<AppLoading message="Memuat Akura App Manager..." fullScreen={false} />}>
        <FederatedAppManager currentUser={user} pathname={location.pathname} />
      </Suspense>
    </RemoteErrorBoundary>
  )
}

export default RemoteAppManager
