import SignupHeroSection from './Signupherosection';
import SignupFormCard from './Signupformcard';

export default function SignupPage() {
  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; }
        input::placeholder { color: #4b5563; }
        input:focus { border-color: rgba(124,58,237,0.5) !important; outline: none; }
        button:hover { opacity: 0.9; }

        .signup-wrapper {
          min-height: 100vh;
          background: #0a0a0a;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 24px;
          font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
        }

        .signup-inner {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 80px;
          width: 100%;
          max-width: 1040px;
        }

        .signup-left {
          flex: 1;
          min-width: 0;
        }

        .signup-right {
          flex-shrink: 0;
          display: flex;
          justify-content: center;
          width: 440px;
        }

        @media (max-width: 900px) {
          .signup-inner {
            flex-direction: column;
            align-items: center;
            gap: 48px;
          }
          .signup-left {
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
          .signup-right {
            width: 100%;
            max-width: 440px;
          }
        }

        @media (max-width: 480px) {
          .signup-wrapper {
            padding: 32px 16px;
          }
          .signup-inner {
            gap: 36px;
          }
        }
      `}</style>

      <div className="signup-wrapper">
        <div className="signup-inner">
          <div className="signup-left">
            <SignupHeroSection />
          </div>
          <div className="signup-right">
            <SignupFormCard />
          </div>
        </div>
      </div>
    </>
  );
}