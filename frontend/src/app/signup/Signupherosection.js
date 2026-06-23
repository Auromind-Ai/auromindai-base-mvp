import FeatureCard from './Featurecard';

export default function SignupHeroSection() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');

        @media (min-width: 1024px) {
          .hero-title {
            margin-left: -80px !important;
          }
        }

        /* Mobile: font size குறைக்கணும் */
        @media (max-width: 640px) {
          .hero-title {
            font-size: 36px !important;
            white-space: normal !important;
            letter-spacing: -0.5px !important;
          }
        }
      `}</style>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          maxWidth: '500px',
          width: '100%',
          fontFamily: "'Poppins', sans-serif",
        }}
      >
        <div>
          <h1
            className="hero-title"
            style={{
              color: '#ffffff',
              fontSize: '52px',
              fontWeight: '700',
              lineHeight: '1.1',
              margin: '0 0 14px',
              letterSpacing: '-1px',
              whiteSpace: 'nowrap',
            }}
          >
            Start your{' '}
            <span
              style={{
                background: 'linear-gradient(180deg, #814AC8 50%, #FFFFFF 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Growth Engine
            </span>
          </h1>
          <p
            style={{
              color: '#9ca3af',
              fontSize: '15px',
              margin: 0,
              lineHeight: '1.6',
            }}
          >
            Build your AI workforce in minutes. No credit card required.
          </p>
        </div>

        <FeatureCard />
      </div>
    </>
  );
}