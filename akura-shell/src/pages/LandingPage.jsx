import { useNavigate } from 'react-router-dom'
import {
  ApiOutlined,
  ArrowRightOutlined,
  Button,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SafetyOutlined,
  TeamOutlined,
  ThunderboltOutlined,
} from '../components/global'
import AkuraLogo from '../components/brand/AkuraLogo'
import './LandingPage.css'

const services = [
  {
    icon: <SafetyOutlined />,
    title: 'NDE Services',
    desc: 'Non-destructive testing to verify the integrity of materials and equipment without causing damage.',
  },
  {
    icon: <ThunderboltOutlined />,
    title: 'Lifting Gear Inspection',
    desc: 'Comprehensive lifting-equipment inspections that support safe, standards-compliant operations.',
  },
  {
    icon: <ApiOutlined />,
    title: 'Tubular / OCTG Inspection',
    desc: 'Inspection of pipes and tubular products used in oil and gas drilling and production operations.',
  },
  {
    icon: <TeamOutlined />,
    title: 'Third-Party QA/QC',
    desc: 'Independent surveillance to ensure products, processes, and work meet all required specifications.',
  },
]

const strengths = [
  'Advanced Technology',
  'Certified Personnel',
  'Delivery On Time',
  'Attention to Details',
]

function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="landing-root">
      <div className="landing-topbar">
        <div className="landing-container topbar-inner">
          <span>Established since 2001 as an independent Inspection Company</span>
          <div className="topbar-contact">
            <span><ClockCircleOutlined /> Monday–Friday, 8:00 AM–5:00 PM</span>
            <a href="tel:+622188334486">+62 (021) 8833 4486</a>
            <a href="mailto:marketing@akurabinacitra.com">marketing@akurabinacitra.com</a>
          </div>
        </div>
      </div>

      <nav className="landing-nav">
        <div className="landing-container landing-nav-inner">
          <button className="landing-logo" onClick={() => navigate('/')} aria-label="Akura Bina Citra home">
            <AkuraLogo size={53} />
          </button>
          <div className="landing-nav-links">
            <a href="#home">Home</a>
            <a href="#about">About Us</a>
            <a href="#services">Services</a>
            <a href="#contact">Contact</a>
          </div>
          <div className="landing-nav-actions">
            <Button onClick={() => navigate('/login')} className="nav-login-btn">Sign In</Button>
            <Button type="primary" onClick={() => navigate('/register')} className="akura-primary-btn">
              Register for the Portal
            </Button>
          </div>
          <div className="mobile-nav-actions">
            <Button onClick={() => navigate('/login')}>Sign In</Button>
            <Button type="primary" onClick={() => navigate('/register')} className="akura-primary-btn">Register</Button>
          </div>
        </div>
      </nav>

      <main>
        <section className="landing-hero" id="home">
          <div className="hero-overlay" />
          <div className="landing-container hero-inner">
            <div className="hero-content">
              <p className="hero-eyebrow">Management System Certification</p>
              <h1>Quality and Delivery Are Our <span>#1 Priority</span></h1>
              <p className="hero-desc">
                Your independent inspection partner for industrial, oilfield, petrochemical, and
                geothermal operations—delivering reliable, timely, standards-compliant services.
              </p>
              <div className="hero-certifications">
                <span><CheckCircleOutlined /> API Spec Q1</span>
                <span><CheckCircleOutlined /> ISO 9001:2015</span>
                <span><CheckCircleOutlined /> LEEA Full Member</span>
              </div>
              <div className="hero-actions">
                <Button
                  type="primary"
                  size="large"
                  icon={<ArrowRightOutlined />}
                  onClick={() => navigate('/register')}
                  className="akura-primary-btn hero-primary-btn"
                >
                  Register for the Portal
                </Button>
                <a className="hero-secondary-btn" href="#services">Explore Our Services</a>
              </div>
            </div>
          </div>
          <div className="hero-side-label">QUALITY CONTROL</div>
        </section>

        <section className="landing-intro" id="about">
          <div className="landing-container intro-grid">
            <div className="intro-heading">
              <p className="section-kicker">Welcome to</p>
              <h2>PT Akura Bina Citra</h2>
            </div>
            <div className="intro-copy">
              <p>
                PT Akura Bina Citra was established in 2001 as an independent inspection company.
                We support industrial, oilfield, petrochemical, and geothermal businesses with
                effective, quality-driven solutions that conform to relevant standards.
              </p>
              <a href="#advantages">Learn more about us <ArrowRightOutlined /></a>
            </div>
          </div>
        </section>

        <section className="landing-services" id="services">
          <div className="landing-container">
            <div className="section-heading-row">
              <div>
                <p className="section-kicker">Inspection &amp; Maintenance</p>
                <h2>Our Core Services</h2>
              </div>
              <p>Integrated inspection and certification services that safeguard the safety, quality, and compliance of your operations.</p>
            </div>
            <div className="services-grid">
              {services.map((service, index) => (
                <article className="service-card" key={service.title}>
                  <span className="service-number">0{index + 1}</span>
                  <div className="service-icon">{service.icon}</div>
                  <h3>{service.title}</h3>
                  <p>{service.desc}</p>
                  <a href="#contact">Talk to Our Team <ArrowRightOutlined /></a>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-choice" id="advantages">
          <div className="landing-container choice-grid">
            <div className="choice-image">
              <img src="/akura-brand/inspection.jpg" alt="An Akura professional carrying out inspection work" />
              <div className="experience-card">
                <strong>25+</strong>
                <span>Years of industry experience</span>
              </div>
            </div>
            <div className="choice-content">
              <p className="section-kicker">Where quality and delivery are the #1 priority</p>
              <h2>Why Choose Us?</h2>
              <p>
                Our commitment to excellence keeps us competitive and relevant in a dynamic
                industry, with customer satisfaction as our primary objective.
              </p>
              <p>
                Through training and induction, every Akura team member contributes to the
                consistent implementation of our Quality and HSE Management System.
              </p>
              <div className="strength-grid">
                {strengths.map((item) => (
                  <div className="strength-item" key={item}>
                    <CheckCircleOutlined />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="landing-portal-cta">
          <div className="landing-container portal-cta-inner">
            <div>
              <p className="section-kicker">Akura Digital Portal</p>
              <h2>Manage services and operations in one portal.</h2>
            </div>
            <div className="portal-cta-actions">
              <Button size="large" onClick={() => navigate('/login')} className="cta-login-btn">Sign In</Button>
              <Button
                type="primary"
                size="large"
                icon={<ArrowRightOutlined />}
                onClick={() => navigate('/register')}
                className="akura-primary-btn"
              >
                Create Account
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer" id="contact">
        <div className="landing-container footer-grid">
          <div className="footer-brand">
            <AkuraLogo inverse size={53} />
            <p>An independent inspection company since 2001, supporting industry through quality and dependable service delivery.</p>
          </div>
          <div className="footer-column">
            <h3>Services</h3>
            <a href="#services">NDE Services</a>
            <a href="#services">Lifting Gear Inspection</a>
            <a href="#services">Tubular/OCTG Inspection</a>
            <a href="#services">Third-Party QA/QC</a>
          </div>
          <div className="footer-column footer-contact">
            <h3>Contact Information</h3>
            <p>POJ Kalimalang, Kp. Pekopen No. 12, Tambun, Bekasi 17510</p>
            <a href="tel:+622188334486">+62 (021) 8833 4486</a>
            <a href="mailto:marketing@akurabinacitra.com">marketing@akurabinacitra.com</a>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="landing-container">© 2026 PT Akura Bina Citra. All rights reserved.</div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
