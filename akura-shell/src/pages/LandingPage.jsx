import { useNavigate } from 'react-router-dom'
import {
  Button,
  SafetyOutlined,
  ThunderboltOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
  BarChartOutlined,
  CloudOutlined,
  ApiOutlined,
} from '../components/global'
import AkuraLogo from '../components/brand/AkuraLogo'
import './LandingPage.css'

const features = [
  {
    icon: <BarChartOutlined />,
    title: 'Analitik Real-time',
    desc: 'Pantau performa bisnis Anda secara langsung dengan dashboard yang intuitif dan informatif.',
  },
  {
    icon: <SafetyOutlined />,
    title: 'Keamanan Tingkat Tinggi',
    desc: 'Data Anda dilindungi dengan enkripsi end-to-end dan sistem autentikasi berlapis.',
  },
  {
    icon: <ThunderboltOutlined />,
    title: 'Performa Cepat',
    desc: 'Infrastruktur cloud modern memastikan respons cepat dan uptime 99.9%.',
  },
  {
    icon: <CloudOutlined />,
    title: 'Cloud Native',
    desc: 'Akses dari mana saja, kapan saja, dengan sinkronisasi data otomatis.',
  },
  {
    icon: <TeamOutlined />,
    title: 'Kolaborasi Tim',
    desc: 'Kelola tim dan izin akses dengan mudah untuk produktivitas maksimal.',
  },
  {
    icon: <ApiOutlined />,
    title: 'Integrasi Mudah',
    desc: 'Terhubung dengan sistem yang sudah ada melalui API yang fleksibel.',
  },
]

const stats = [
  { value: '500+', label: 'Klien Aktif' },
  { value: '99.9%', label: 'Uptime' },
  { value: '24/7', label: 'Support' },
  { value: '10+', label: 'Tahun Pengalaman' },
]

function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="landing-root">
      {/* NAVBAR */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-logo" onClick={() => navigate('/')} role="button">
            <AkuraLogo size={52} />
          </div>
          <div className="landing-nav-links">
            <a href="#fitur" className="nav-link">Fitur</a>
            <a href="#tentang" className="nav-link">Tentang</a>
            <a href="#kontak" className="nav-link">Kontak</a>
          </div>
          <div className="landing-nav-actions">
            <Button
              id="nav-login-btn"
              onClick={() => navigate('/login')}
              className="btn-outline-primary"
            >
              Masuk
            </Button>
            <Button
              id="nav-register-btn"
              variant="primary"
              onClick={() => navigate('/register')}
            >
              Daftar Sekarang
            </Button>
          </div>
          {/* Mobile hamburger handled via CSS */}
          <div className="mobile-nav-actions">
            <Button size="small" onClick={() => navigate('/login')}>Masuk</Button>
            <Button size="small" variant="primary" onClick={() => navigate('/register')}>Daftar</Button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="landing-hero">
        <div className="hero-bg-shapes">
          <div className="hero-shape hero-shape-1" />
          <div className="hero-shape hero-shape-2" />
          <div className="hero-shape hero-shape-3" />
        </div>
        <div className="hero-content">
          <div className="hero-badge">
            <span>🚀</span> Platform Manajemen Terpadu
          </div>
          <h1 className="hero-title">
            Solusi Digital
            <span className="hero-title-accent"> Cerdas</span>
            <br />untuk Bisnis Anda
          </h1>
          <p className="hero-desc">
            Akura Bina Citra menghadirkan sistem manajemen terintegrasi yang membantu
            bisnis Anda berkembang lebih efisien, lebih cepat, dan lebih cerdas.
          </p>
          <div className="hero-cta">
            <Button
              id="hero-register-btn"
              variant="primary"
              size="large"
              icon={<ArrowRightOutlined />}
              onClick={() => navigate('/register')}
              className="btn-hero-primary"
            >
              Mulai Gratis
            </Button>
            <Button
              id="hero-login-btn"
              size="large"
              onClick={() => navigate('/login')}
              className="btn-hero-secondary"
            >
              Sudah Punya Akun? Masuk
            </Button>
          </div>
          <div className="hero-checks">
            {['Gratis 30 hari percobaan', 'Tanpa kartu kredit', 'Setup dalam 5 menit'].map(t => (
              <div key={t} className="hero-check-item">
                <CheckCircleOutlined className="check-icon" />
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-card-mockup">
            <div className="mockup-header">
              <div className="mockup-dots">
                <span /><span /><span />
              </div>
              <span className="mockup-title">Dashboard Akura</span>
            </div>
            <div className="mockup-stats">
              {['Total Pengguna', 'Pendapatan', 'Transaksi', 'Kepuasan'].map((s, i) => (
                <div key={s} className="mockup-stat">
                  <div className="mockup-stat-bar" style={{ height: `${40 + i * 15}%` }} />
                  <span>{s}</span>
                </div>
              ))}
            </div>
            <div className="mockup-lines">
              <div className="mockup-line w-full" />
              <div className="mockup-line w-3q" />
              <div className="mockup-line w-half" />
              <div className="mockup-line w-3q" />
              <div className="mockup-line w-full" />
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="landing-stats">
        {stats.map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </section>

      {/* FEATURES */}
      <section className="landing-features" id="fitur">
        <div className="section-header">
          <div className="section-badge">Fitur Unggulan</div>
          <h2 className="section-title">Semua yang Anda Butuhkan</h2>
          <p className="section-desc">
            Platform lengkap dengan fitur-fitur canggih untuk mengelola bisnis secara menyeluruh.
          </p>
        </div>
        <div className="features-grid">
          {features.map((f) => (
            <div key={f.title} className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="landing-cta" id="tentang">
        <div className="cta-content">
          <h2 className="cta-title">Siap Memulai Perjalanan Digital Anda?</h2>
          <p className="cta-desc">
            Bergabunglah dengan ratusan bisnis yang telah mempercayakan pengelolaan digital mereka kepada Akura Bina Citra.
          </p>
          <div className="cta-buttons">
            <Button
              id="cta-register-btn"
              variant="primary"
              size="large"
              icon={<ArrowRightOutlined />}
              onClick={() => navigate('/register')}
              className="btn-cta-white"
            >
              Daftar Sekarang
            </Button>
            <Button
              id="cta-login-btn"
              size="large"
              ghost
              onClick={() => navigate('/login')}
            >
              Masuk ke Akun
            </Button>
          </div>
        </div>
        <div className="cta-bg-shapes">
          <div className="cta-shape-1" />
          <div className="cta-shape-2" />
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer" id="kontak">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="landing-logo">
              <AkuraLogo inverse size={44} />
            </div>
            <p className="footer-tagline">
              Solusi digital terpercaya untuk kemajuan bisnis Indonesia.
            </p>
          </div>
          <div className="footer-links">
            <div className="footer-col">
              <h4>Produk</h4>
              <a href="#fitur">Fitur</a>
              <a href="#">Harga</a>
              <a href="#">Dokumentasi</a>
            </div>
            <div className="footer-col">
              <h4>Perusahaan</h4>
              <a href="#tentang">Tentang Kami</a>
              <a href="#">Karier</a>
              <a href="#kontak">Kontak</a>
            </div>
            <div className="footer-col">
              <h4>Dukungan</h4>
              <a href="#">Pusat Bantuan</a>
              <a href="#">Kebijakan Privasi</a>
              <a href="#">Syarat & Ketentuan</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2024 Akura Bina Citra. Hak Cipta Dilindungi.</span>
          <span>Made with ❤️ in Indonesia</span>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
