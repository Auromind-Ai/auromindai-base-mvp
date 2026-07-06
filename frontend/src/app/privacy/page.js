import React from 'react';

export const metadata = {
  title: 'Privacy Policy | OrbionAgents',
  description: 'Privacy Policy for OrbionAgents WhatsApp Automation platform.',
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#080810] text-white pt-24 pb-20 px-6 sm:px-12 lg:px-24 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-8 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
          Privacy Policy
        </h1>
        
        <p className="text-gray-400 text-sm">Last Updated: July 3, 2026</p>
        
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">1. Introduction</h2>
          <p className="text-gray-300 leading-relaxed">
            Welcome to OrbionAgents. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our website and use our WhatsApp automation services, and tell you about your privacy rights and how the law protects you.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">2. Data We Collect</h2>
          <p className="text-gray-300 leading-relaxed">
            We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:
          </p>
          <ul className="list-disc pl-6 text-gray-300 space-y-2">
            <li><strong>Identity Data:</strong> includes first name, last name, username or similar identifier.</li>
            <li><strong>Contact Data:</strong> includes email address and telephone numbers.</li>
            <li><strong>Technical Data:</strong> includes internet protocol (IP) address, your login data, browser type and version, time zone setting and location.</li>
            <li><strong>WhatsApp Data:</strong> We access and process WhatsApp messages on behalf of your business when you connect our platform using Meta's Embedded Signup, strictly for providing automation services.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">3. How We Use Your Data</h2>
          <p className="text-gray-300 leading-relaxed">
            We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
          </p>
          <ul className="list-disc pl-6 text-gray-300 space-y-2">
            <li>Where we need to perform the contract we are about to enter into or have entered into with you.</li>
            <li>Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.</li>
            <li>Where we need to comply with a legal or regulatory obligation.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">4. Data Security</h2>
          <p className="text-gray-300 leading-relaxed">
            We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorised way, altered or disclosed. In addition, we limit access to your personal data to those employees, agents, contractors and other third parties who have a business need to know.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">5. Contact Us</h2>
          <p className="text-gray-300 leading-relaxed">
            If you have any questions about this privacy policy or our privacy practices, please contact us at: <br/>
            <a href="mailto:orbionagents@gmail.com" className="text-purple-400 hover:text-purple-300 underline">orbionagents@gmail.com</a>
          </p>
        </section>
      </div>
    </div>
  );
}
