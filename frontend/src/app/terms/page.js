import React from 'react';

export const metadata = {
  title: 'Terms of Service | OrbionAgents',
  description: 'Terms of Service for OrbionAgents WhatsApp Automation platform.',
};

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#080810] text-white pt-24 pb-20 px-6 sm:px-12 lg:px-24 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-8 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
          Terms of Service
        </h1>
        
        <p className="text-gray-400 text-sm">Last Updated: July 3, 2026</p>
        
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">1. Acceptance of Terms</h2>
          <p className="text-gray-300 leading-relaxed">
            By accessing and using the OrbionAgents platform, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">2. Description of Service</h2>
          <p className="text-gray-300 leading-relaxed">
            OrbionAgents provides a visual automation platform for WhatsApp Business. We allow users to connect their WhatsApp Business Accounts via Meta's Embedded Signup flow to create automation workflows, chatbots, and CRM integrations.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">3. User Obligations</h2>
          <p className="text-gray-300 leading-relaxed">
            When using our service, you agree that:
          </p>
          <ul className="list-disc pl-6 text-gray-300 space-y-2">
            <li>You will not use the service for any illegal or unauthorized purpose.</li>
            <li>You are responsible for maintaining the security of your account and passwords.</li>
            <li>You will comply with Meta's WhatsApp Business Policies and Commerce Policies.</li>
            <li>You will not spam users or violate any anti-spam regulations in your jurisdiction.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">4. Meta & WhatsApp Integration</h2>
          <p className="text-gray-300 leading-relaxed">
            Our platform acts as a Technical Provider (TP) or Business Solution Provider (BSP) to connect you with the WhatsApp Cloud API. By using our service, you authorize us to manage your WhatsApp messaging data solely for the purpose of executing your designed automations. We do not claim ownership over your WhatsApp assets.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">5. Termination</h2>
          <p className="text-gray-300 leading-relaxed">
            We reserve the right to suspend or terminate your account at any time if we suspect a violation of these Terms of Service or Meta's policies.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">6. Contact Us</h2>
          <p className="text-gray-300 leading-relaxed">
            For any questions regarding these terms, please contact: <br/>
            <a href="mailto:orbionagents@gmail.com" className="text-purple-400 hover:text-purple-300 underline">orbionagents@gmail.com</a>
          </p>
        </section>
      </div>
    </div>
  );
}
