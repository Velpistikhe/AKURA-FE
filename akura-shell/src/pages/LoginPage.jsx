import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeftOutlined,
  LoginOutlined,
  UserOutlined,
  LockOutlined,
} from "../components/global";
import AkuraLogo from "../components/brand/AkuraLogo";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import {
  AppButton,
  AppInput,
  AppForm,
  AppDivider,
  AppCheckbox,
} from "../components/ui";
import "./AuthPage.css";

function LoginPage() {
  const [form] = AppForm.useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const notify = useNotification();

  const handleLogin = async (values) => {
    setLoading(true);
    try {
      await login({
        username: values.username,
        password: values.password,
      });
      const requestedPath = location.state?.returnTo;
      const destination =
        typeof requestedPath === "string" && requestedPath.startsWith("/dashboard")
          ? requestedPath
          : "/dashboard";
      navigate(destination, { replace: true });
      notify.success("Login Successful", "You have signed in successfully.");
    } catch (err) {
      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Incorrect username or password.";
      notify.error("Login Failed", errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-root">
      {/* ── Left Panel ─────────────────────────────────────────── */}
      <div className="auth-left">
        <div className="auth-left-content">
          <button className="back-btn" onClick={() => navigate("/")}>
            <ArrowLeftOutlined /> Back
          </button>
          <div className="auth-brand">
            <AkuraLogo inverse size={60} />
          </div>
          <h2 className="auth-left-title">Welcome Back!</h2>
          <p className="auth-left-desc">
            Sign in to your account and manage your business more efficiently
            with our platform.
          </p>
          <div className="auth-features">
            {[
              "✓  Real-time analytics dashboard",
              "✓  Reliable data security",
              "✓  24/7 support",
            ].map((f) => (
              <div key={f} className="auth-feature-item">
                {f}
              </div>
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
        <div className="auth-form-container">
          <div className="auth-form-header">
            <h1 className="auth-form-title">Sign In</h1>
            <p className="auth-form-subtitle">
              Don't have an account?{" "}
              <Link to="/register" className="auth-link">
                Register now
              </Link>
            </p>
          </div>

          <AppForm
            form={form}
            name="login"
            id="login-form"
            onFinish={handleLogin}
          >
            <AppForm.Item
              label="Username"
              name="username"
              rules={[{ required: true, message: "Username is required." }]}
            >
              <AppInput
                id="input-username"
                prefixIcon={<UserOutlined />}
                placeholder="Enter your username"
              />
            </AppForm.Item>

            <AppForm.Item
              label="Password"
              name="password"
              rules={[{ required: true, message: "Password is required." }]}
            >
              <AppInput
                id="input-password"
                inputType="password"
                prefixIcon={<LockOutlined />}
                placeholder="Enter your password"
              />
            </AppForm.Item>

            <div className="form-options">
              <AppForm.Item name="remember" valuePropName="checked" noStyle>
                <AppCheckbox id="checkbox-remember">Remember me</AppCheckbox>
              </AppForm.Item>
              <a href="#" className="forgot-link">
                Forgot password?
              </a>
            </div>

            <AppForm.Item>
              <AppButton
                id="btn-login-submit"
                variant="primary"
                htmlType="submit"
                loading={loading}
                block
                icon={<LoginOutlined />}
                className="auth-submit-btn"
              >
                {loading ? "Signing in..." : "Sign In"}
              </AppButton>
            </AppForm.Item>

            <AppDivider>
              <span className="divider-text">or</span>
            </AppDivider>

            <AppButton
              id="btn-goto-register"
              variant="outline"
              block
              onClick={() => navigate("/register")}
            >
              Create New Account
            </AppButton>
          </AppForm>

          <p className="auth-footer-note">
            By signing in, you agree to our{" "}
            <a href="#" className="auth-link">
              Terms &amp; Conditions
            </a>{" "}
            and{" "}
            <a href="#" className="auth-link">
              Privacy Policy
            </a>{" "}
            .
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
