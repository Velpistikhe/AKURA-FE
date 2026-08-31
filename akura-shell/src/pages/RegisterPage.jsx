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
      await authAPI.register({
        username:             values.username,
        password:             values.password,
        passwordConfirmation: values.passwordConfirmation,
        firstName:            values.firstName,
        lastName:             values.lastName,
      })
      notify.success('Registration Successful', 'Your account has been created successfully.')
      navigate('/login')
    } catch (err) {
      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Unable to register. Please try again.'
      notify.error('Registration Failed', errMsg)
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
            <ArrowLeftOutlined /> Back
          </button>
          <div className="auth-brand">
            <AkuraLogo inverse size={60} />
          </div>
          <h2 className="auth-left-title">Join Us Today!</h2>
          <p className="auth-left-desc">
            Create your account and begin your digital journey with Akura Bina
            Citra today.
          </p>
          <div className="auth-features">
            {[
              '✓  30-day free trial',
              '✓  No credit card required',
              '✓  Set up in five minutes',
              '✓  Full support from our team',
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
            <h1 className="auth-form-title">Create an Account</h1>
            <p className="auth-form-subtitle">
              Already have an account?{' '}
              <Link to="/login" className="auth-link">
                Sign in now
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
                label="First Name"
                name="firstName"
                rules={[{ required: true, message: 'First name is required.' }]}
              >
                <AppInput
                  id="input-firstname"
                  prefixIcon={<UserOutlined />}
                  placeholder="John"
                />
              </AppForm.Item>

              <AppForm.Item
                label="Last Name"
                name="lastName"
                rules={[{ required: true, message: 'Last name is required.' }]}
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
                { required: true, message: 'Username is required.' },
                { min: 3, message: 'Username must contain at least 3 characters.' },
                {
                  pattern: /^[a-zA-Z0-9_]+$/,
                  message: 'Use letters, numbers, and underscores only.',
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
                  { required: true, message: 'Password is required.' },
                  { min: 8, message: 'Password must contain at least 8 characters.' },
                ]}
              >
                <AppInput
                  id="input-password"
                  inputType="password"
                  prefixIcon={<LockOutlined />}
                  placeholder="At least 8 characters"
                />
              </AppForm.Item>

              <AppForm.Item
                label="Confirm Password"
                name="passwordConfirmation"
                dependencies={['password']}
                rules={[
                  { required: true, message: 'Password confirmation is required.' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value)
                        return Promise.resolve()
                      return Promise.reject(new Error('Passwords do not match.'))
                    },
                  }),
                ]}
              >
                <AppInput
                  id="input-password-confirmation"
                  inputType="password"
                  prefixIcon={<LockOutlined />}
                  placeholder="Re-enter your password"
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
                {loading ? 'Creating account...' : 'Create Account'}
              </AppButton>
            </AppForm.Item>

            <AppDivider>
              <span className="divider-text">already have an account?</span>
            </AppDivider>

            <AppButton
              id="btn-goto-login"
              variant="outline"
              block
              onClick={() => navigate('/login')}
            >
              Sign In
            </AppButton>
          </AppForm>

          <p className="auth-footer-note">
            By registering, you agree to our{' '}
            <a href="#" className="auth-link">Terms &amp; Conditions</a> and{' '}
            <a href="#" className="auth-link">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
