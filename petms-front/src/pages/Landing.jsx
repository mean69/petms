import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ClipboardList,
  Heart,
  LockKeyhole,
  PawPrint,
  Scale,
  ShieldCheck,
  Syringe,
} from "lucide-react";
import { Brand } from "../components/UI";
import PetIllustration from "../components/PetIllustration";
const features = [
  [
    PawPrint,
    "01",
    "A profile, all their own.",
    "Names, breeds, birth information, and all the little details that make them them.",
  ],
  [
    ClipboardList,
    "02",
    "Their story, kept together.",
    "Dated medical history and allergy information, ready when it matters.",
  ],
  [
    Syringe,
    "03",
    "Every record remembered.",
    "Vaccination details and recorded due dates, in one easy-to-find place.",
  ],
  [
    Scale,
    "04",
    "See how they grow.",
    "A clear weight history that puts each new measurement in perspective.",
  ],
];
export default function Landing() {
  return (
    <div className="landing">
      <header className="landing-header">
        <Brand />
        <nav aria-label="Public navigation">
          <a href="#features">Why PetFave</a>
          <a href="#how-it-works">How it works</a>
        </nav>
        <div>
          <Link className="login-link" to="/login">
            Log in
          </Link>
          <Link className="btn primary small" to="/register">
            Get started <ArrowUpRight size={15} />
          </Link>
        </div>
      </header>
      <main>
        <section className="landing-hero">
          <div className="hero-copy">
            <span className="hero-eyebrow">
              <span className="live-dot" /> A LITTLE MORE CARE. A LOT MORE PEACE
              OF MIND.
            </span>
            <h1>
              Every pet has
              <br />a story.
              <br />
              <em>Keep theirs close.</em>
            </h1>
            <p>
              Meet PetFave. A thoughtful space for your pet’s health records,
              everyday details, and the people who care for them.
            </p>
            <div className="hero-actions">
              <Link className="btn primary" to="/register">
                Make room for better care <ArrowRight size={18} />
              </Link>
              <a href="#features" className="btn text-btn">
                Explore PetFave <span>↗</span>
              </a>
            </div>
            <div className="hero-trust">
              <span>
                <ShieldCheck size={16} /> Private by design
              </span>
              <span>
                <Check size={16} /> Made for owners & clinics
              </span>
            </div>
          </div>
          <div className="hero-art">
            <span className="art-caption">FOR THE ONES YOU CALL FAMILY</span>
            <PetIllustration />
            <div className="floating-pill">
              <Heart size={19} fill="#df9e85" stroke="#df9e85" />
              <span>A little care goes a long way.</span>
            </div>
            <div className="example-card">
              <span className="example-icon">
                <PawPrint size={24} />
              </span>
              <div>
                <strong>Mochi’s pet profile</strong>
                <small>One pet. Their whole story.</small>
              </div>
              <span className="example-check">
                <Check size={16} />
              </span>
              <span className="example-label">ILLUSTRATIVE PROFILE</span>
            </div>
            <span className="decor-paw">
              <PawPrint size={38} />
            </span>
          </div>
        </section>
        <section className="intro-strip">
          <p>
            A happier way to keep
            <br />
            <strong>their care connected.</strong>
          </p>
          <div>
            <PawPrint /> Pet profiles
          </div>
          <div>
            <Heart /> Health history
          </div>
          <div>
            <Syringe /> Vaccinations
          </div>
          <div>
            <Scale /> Weight records
          </div>
        </section>
        <section id="features" className="features-section">
          <div className="section-intro">
            <div>
              <span className="eyebrow">
                THE DETAILS THAT MAKE A DIFFERENCE
              </span>
              <h2>
                All the little things.
                <br />
                <em>One lovely place.</em>
              </h2>
            </div>
            <p>
              Less searching for scattered records.
              <br />
              More time knowing they’re in good hands.
            </p>
          </div>
          <div className="feature-grid">
            {features.map(([Icon, number, title, description]) => (
              <article key={number}>
                <div className="feature-top">
                  <span className="feature-icon">
                    <Icon size={25} strokeWidth={1.5} />
                  </span>
                  <span>{number}</span>
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>
        <section id="how-it-works" className="care-section">
          <div className="care-quote">
            <span className="eyebrow light-text">CARE IS BETTER, TOGETHER</span>
            <h2>
              One shared story.
              <br />
              The right people
              <br />
              <em>by their side.</em>
            </h2>
            <PawPrint size={60} strokeWidth={1} />
          </div>
          <div className="care-steps">
            {[
              [
                "01",
                "Find your place.",
                "Join as a pet owner or apply as clinic staff. Every account has a clear role.",
              ],
              [
                "02",
                "Meet your pet’s new home.",
                "Add their profile and keep the essentials together, from their name to their birth information.",
              ],
              [
                "03",
                "Keep their care connected.",
                "Clinic teams maintain health records. Owners stay informed and can request corrections.",
              ],
            ].map(([n, t, d]) => (
              <article key={n}>
                <span>{n}</span>
                <div>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </div>
              </article>
            ))}
            <div className="care-security">
              <LockKeyhole size={19} />
              <p>
                Owner access is limited to their own pets. Clinic access follows
                account approval and permissions.
              </p>
            </div>
          </div>
        </section>
        <section className="landing-cta">
          <span className="eyebrow">THEIR NEXT CHAPTER STARTS HERE</span>
          <h2>
            Good records.
            <br />
            <em>Even better peace of mind.</em>
          </h2>
          <Link to="/register" className="btn primary">
            Get started with PetFave <ArrowRight size={18} />
          </Link>
          <p>For pet owners. For clinic teams. For the love of pets.</p>
        </section>
      </main>
      <footer className="landing-footer">
        <Brand />
        <p>Thoughtful care, all in one place.</p>
        <span>PetFave · Pet Management System</span>
      </footer>
    </div>
  );
}
