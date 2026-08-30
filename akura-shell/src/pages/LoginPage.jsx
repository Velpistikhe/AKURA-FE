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
      const response = await login({
        username: values.username,
        password: values.password,
      });
      const requestedPath = location.state?.returnTo;
      const destination =
        typeof requestedPath === "string" && requestedPath.startsWith("/dashboard")
          ? requestedPath
          : "/dashboard";
      navigate(destination, { replace: true });
      notify.success("Login Berhasil", response.message || "Login berhasil.");
    } catch (err) {
      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Username atau password salah.";
      notify.error("Login Gagal", errMsg);
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
            <ArrowLeftOutlined /> Kembali
          </button>
          <div className="auth-brand">
            <AkuraLogo inverse size={60} />
          </div>
          <h2 className="auth-left-title">Selamat Datang Kembali!</h2>
          <p className="auth-left-desc">
            Masuk ke akun Anda dan kelola bisnis dengan lebih efisien bersama
            platform kami.
          </p>
          <div className="auth-features">
            {[
              "✓  Dashboard analitik real-time",
              "✓  Keamanan data terjamin",
              "✓  Dukungan 24/7",
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
            <h1 className="auth-form-title">Masuk ke Akun</h1>
            <p className="auth-form-subtitle">
              Belum punya akun?{" "}
              <Link to="/register" className="auth-link">
                Daftar sekarang
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
              rules={[{ required: true, message: "Username wajib diisi." }]}
            >
              <AppInput
                id="input-username"
                prefixIcon={<UserOutlined />}
                placeholder="Masukkan username Anda"
              />
            </AppForm.Item>

            <AppForm.Item
              label="Password"
              name="password"
              rules={[{ required: true, message: "Password wajib diisi." }]}
            >
              <AppInput
                id="input-password"
                inputType="password"
                prefixIcon={<LockOutlined />}
                placeholder="Masukkan password Anda"
              />
            </AppForm.Item>

            <div className="form-options">
              <AppForm.Item name="remember" valuePropName="checked" noStyle>
                <AppCheckbox id="checkbox-remember">Ingat saya</AppCheckbox>
              </AppForm.Item>
              <a href="#" className="forgot-link">
                Lupa password?
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
                {loading ? "Memproses..." : "Masuk"}
              </AppButton>
            </AppForm.Item>

            <AppDivider>
              <span className="divider-text">atau</span>
            </AppDivider>

            <AppButton
              id="btn-goto-register"
              variant="outline"
              block
              onClick={() => navigate("/register")}
            >
              Buat Akun Baru
            </AppButton>
          </AppForm>

          <p className="auth-footer-note">
            Dengan masuk, Anda menyetujui{" "}
            <a href="#" className="auth-link">
              Syarat &amp; Ketentuan
            </a>{" "}
            dan{" "}
            <a href="#" className="auth-link">
              Kebijakan Privasi
            </a>{" "}
            kami.
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
