import React from 'react';

export const metadata = {
  title: 'Data Deletion Instructions | OrbionAgents',
  description: 'Instructions on how to delete your data from OrbionAgents.',
};

export default function DataDeletion() {
  return (
    <div className="min-h-screen bg-[#080810] text-white pt-24 pb-20 px-6 sm:px-12 lg:px-24 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-8 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
          Data Deletion Instructions
        </h1>
        
        <p className="text-gray-400 text-sm">Last Updated: July 3, 2026</p>
        
        <section className="space-y-4">
          <p className="text-gray-300 leading-relaxed">
            According to Meta Platform rules, we provide you with explicit instructions on how to request the deletion of your user data from our systems. 
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">How to Delete Your Data</h2>
          <p className="text-gray-300 leading-relaxed">
            If you wish to delete your account and all associated data on OrbionAgents, you can do so by following these methods:
          </p>
          
          <div className="bg-[#181825] p-6 rounded-lg border border-gray-800 space-y-4">
            <h3 className="text-xl font-medium text-white">Method 1: Email Request (Recommended)</h3>
            <p className="text-gray-400">
              Send an email to our support team requesting full data deletion.
            </p>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li><strong>To:</strong> orbionagents@gmail.com</li>
              <li><strong>Subject:</strong> Data Deletion Request</li>
              <li><strong>Body:</strong> Please include the email address associated with your OrbionAgents account so we can locate and remove your data.</li>
            </ul>
            <p className="text-sm text-gray-500 italic mt-2">We will process your request within 72 hours and confirm via email once all data is permanently deleted.</p>
          </div>

          <div className="bg-[#181825] p-6 rounded-lg border border-gray-800 space-y-4">
            <h3 className="text-xl font-medium text-white">Method 2: Remove Facebook Integration</h3>
            <p className="text-gray-400">
              If you connected your WhatsApp account via Facebook Login, you can remove our app's access directly from your Facebook settings:
            </p>
            <ol className="list-decimal pl-6 text-gray-300 space-y-2">
              <li>Go to your Facebook Account Settings.</li>
              <li>Navigate to <strong>Security and Login</strong> {'>'} <strong>Business Integrations</strong>.</li>
              <li>Find <strong>OrbionAgents</strong> in the list of active integrations.</li>
              <li>Click <strong>Remove</strong>. This will revoke all API access tokens immediately.</li>
            </ol>
          </div>
        </section>

        <section className="space-y-4 mt-8">
          <h2 className="text-2xl font-semibold text-white">What data gets deleted?</h2>
          <p className="text-gray-300 leading-relaxed">
            Upon processing your request, we will permanently delete:
          </p>
          <ul className="list-disc pl-6 text-gray-300 space-y-2">
            <li>Your account profile (email, name, passwords).</li>
            <li>All WhatsApp Automation workflows and canvas diagrams.</li>
            <li>Any synced WhatsApp contacts, conversations, or CRM data.</li>
            <li>All Meta access tokens and integration linkages.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
