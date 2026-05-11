import FeatureCard from './FeatureCard';

export default function SignupHeroSection() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        maxWidth: '500px',
        width: '100%',
      }}
    >
      <div>
        <h1
          style={{
            color: '#ffffff',
            fontSize: '52px',
            fontWeight: '700',
            lineHeight: '1.1',
            margin: '0 0 14px',
            letterSpacing: '-1px',
          }}
        >
          Start your{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #a855f7 0%, #8b5cf6 50%, #7c3aed 100%)',
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
  );
}