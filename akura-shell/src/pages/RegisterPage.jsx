import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeftOutlined,
  UserAddOutlined,
  UserOutlined,
  LockOutlined,
} from '../components/global'
import AkuraLogo from '../components/brand/AkuraLogo'
import { authAPI } from '../services/api'
import { useNotification } from '../context/NotificationContext'
import {
  AppButton,
  AppInput,
  AppForm,
  AppDivider,
} from '../components/ui'
import './AuthPage.css'

function RegisterPage() {
  const [form] = AppForm.useForm()
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const notify = useNotification()

  const handleRegister = async (values) => {
    setLoading(true)
    try {
      const response = await authAPI.register({
        username:             values.username,
        password:             values.password,
        passwordConfirmation: values.passwordConfirmation,
        firstName:            values.firstName,
        lastName:             values.lastName,
      })
      notify.success('Registrasi Berhasil', response.data?.message || 'Registrasi berhasil.')
      navigate('/login')
    } catch (err) {
      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Gagal mendaftar. Coba lagi.'
      notify.error('Registrasi Gagal', errMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-root">
      {/* ── Left Panel ─────────────────────────────────────────── */}
      <div className="auth-left auth-left-register">
        <div className="auth-left-content">
          <button className="back-btn" onClick={() => navigate('/')}>
            <ArrowLeftOutlined /> Kembali
          </button>
          <div className="auth-brand">
            <AkuraLogo inverse size={60} />
          </div>
          <h2 className="auth-left-title">Bergabunglah Bersama Kami!</h2>
          <p className="auth-left-desc">
            Buat akun gratis dan mulai perjalanan digital Anda bersama Akura
            Bina Citra hari ini.
          </p>
          <div className="auth-features">
            {[
              '✓  Gratis 30 hari percobaan',
              '✓  Tidak perlu kartu kredit',
              '✓  Setup dalam 5 menit',
              '✓  Dukungan penuh dari tim kami',
            ].map((f) => (
              <div key={f} className="auth-feature-item">{f}</div>
            ))}
          </div>
          <div className="auth-decoration">
            <div className="deco-circle deco-c1" />
            <div className="deco-circle deco-c2" />
            <div className="deco-circle deco-c3" />
          </div>
        </div>
      </div>

      {/* ── Right Panel — Form ─────────────────────────────────── */}
      <div className="auth-right">
        <div className="auth-form-container auth-form-container-wide">
          <div className="auth-form-header">
            <h1 className="auth-form-title">Buat Akun Baru</h1>
            <p className="auth-form-subtitle">
              Sudah punya akun?{' '}
              <Link to="/login" className="auth-link">
                Masuk sekarang
              </Link>
            </p>
          </div>

          <AppForm
            form={form}
            name="register"
            id="register-form"
            onFinish={handleRegister}
          >
            {/* Nama Depan & Nama Belakang */}
            <div className="form-row">
              <AppForm.Item
                label="Nama Depan"
                name="firstName"
                rules={[{ required: true, message: 'Nama depan wajib diisi.' }]}
              >
                <AppInput
                  id="input-firstname"
                  prefixIcon={<UserOutlined />}
                  placeholder="John"
                />
              </AppForm.Item>

              <AppForm.Item
                label="Nama Belakang"
                name="lastName"
                rules={[{ required: true, message: 'Nama belakang wajib diisi.' }]}
              >
                <AppInput
                  id="input-lastname"
                  prefixIcon={<UserOutlined />}
                  placeholder="Doe"
                />
              </AppForm.Item>
            </div>

            {/* Username */}
            <AppForm.Item
              label="Username"
              name="username"
              rules={[
                { required: true, message: 'Username wajib diisi.' },
                { min: 3, message: 'Username minimal 3 karakter.' },
                {
                  pattern: /^[a-zA-Z0-9_]+$/,
                  message: 'Hanya huruf, angka, dan underscore.',
                },
              ]}
            >
              <AppInput
                id="input-username"
                prefixIcon={<UserOutlined />}
                placeholder="johndoe"
              />
            </AppForm.Item>

            {/* Password & Konfirmasi */}
            <div className="form-row">
              <AppForm.Item
                label="Password"
                name="password"
                rules={[
                  { required: true, message: 'Password wajib diisi.' },
                  { min: 8, message: 'Password minimal 8 karakter.' },
                ]}
              >
                <AppInput
                  id="input-password"
                  inputType="password"
                  prefixIcon={<LockOutlined />}
                  placeholder="Min. 8 karakter"
                />
              </AppForm.Item>

              <AppForm.Item
                label="Konfirmasi Password"
                name="passwordConfirmation"
                dependencies={['password']}
                rules={[
                  { required: true, message: 'Konfirmasi password wajib diisi.' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value)
                        return Promise.resolve()
                      return Promise.reject(new Error('Password tidak cocok.'))
                    },
                  }),
                ]}
              >
                <AppInput
                  id="input-password-confirmation"
                  inputType="password"
                  prefixIcon={<LockOutlined />}
                  placeholder="Ulangi password"
                />
              </AppForm.Item>
            </div>

            {/* Submit */}
            <AppForm.Item>
              <AppButton
                id="btn-register-submit"
                variant="primary"
                htmlType="submit"
                loading={loading}
                block
                icon={<UserAddOutlined />}
                className="auth-submit-btn"
              >
                {loading ? 'Mendaftarkan...' : 'Buat Akun'}
              </AppButton>
            </AppForm.Item>

            <AppDivider>
              <span className="divider-text">sudah punya akun?</span>
            </AppDivider>

            <AppButton
              id="btn-goto-login"
              variant="outline"
              block
              onClick={() => navigate('/login')}
            >
              Masuk ke Akun
            </AppButton>
          </AppForm>

          <p className="auth-footer-note">
            Dengan mendaftar, Anda menyetujui{' '}
            <a href="#" className="auth-link">Syarat &amp; Ketentuan</a> dan{' '}
            <a href="#" className="auth-link">Kebijakan Privasi</a> kami.
          </p>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
