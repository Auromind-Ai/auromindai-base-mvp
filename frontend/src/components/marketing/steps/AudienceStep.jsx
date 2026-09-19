'use client';

import React, { useState, useMemo } from 'react';
import {
  Users,
  UploadCloud,
  Filter,
  Plus,
  Search,
  RefreshCw,
  Check,
  Info
} from 'lucide-react';
import AudienceSummary from '../AudienceSummary';
import ProTip from '../ProTip';
import { INITIAL_CONTACT_LISTS } from '@/lib/api/marketing';

const AUDIENCE_TYPES = [
  { id: 'Existing Contacts', label: 'Existing Contacts', desc: 'Use contacts from your CRM', icon: Users },
  { id: 'Upload CSV', label: 'Upload CSV', desc: 'Import contacts from file', icon: UploadCloud },
  { id: 'Smart Segment', label: 'Smart Segment', desc: 'Target a specific segment', icon: Filter },
  { id: 'Manual Entry', label: 'Manual Entry', desc: 'Add numbers manually', icon: Plus },
];

export default function AudienceStep({ data, updateData, onNext, onBack }) {
  const [audienceType, setAudienceType] = useState(data.audienceType || 'Existing Contacts');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedListIds, setSelectedListIds] = useState(data.selectedListIds || ['list_1']);
  const [contactLists, setContactLists] = useState(INITIAL_CONTACT_LISTS);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const filteredLists = useMemo(() => {
    return contactLists.filter((l) =>
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [contactLists, searchQuery]);

  const toggleList = (id) => {
    setError('');
    let updated;
    if (selectedListIds.includes(id)) {
      updated = selectedListIds.filter((item) => item !== id);
    } else {
      updated = [...selectedListIds, id];
    }
    setSelectedListIds(updated);

    // Calculate aggregate totals
    const selectedObj = contactLists.filter((l) => updated.includes(l.id));
    const total = selectedObj.reduce((acc, curr) => acc + curr.totalContacts, 0);
    const valid = selectedObj.reduce((acc, curr) => acc + curr.validContacts, 0);
    const invalid = selectedObj.reduce((acc, curr) => acc + curr.invalidContacts, 0);
    const optedIn = selectedObj.reduce((acc, curr) => acc + curr.optedIn, 0);
    const optedOut = selectedObj.reduce((acc, curr) => acc + curr.optedOut, 0);

    updateData({
      selectedListIds: updated,
      audienceListName: selectedObj.map((s) => s.name).join(', ') || 'No list selected',
      recipientsCount: total,
      validRecipients: valid,
      invalidRecipients: invalid,
      optedInCount: optedIn,
      optedOutCount: optedOut,
    });
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const handleProceed = () => {
    if (selectedListIds.length === 0) {
      setError('Please select at least one contact list for your campaign.');
      return;
    }
    onNext();
  };

  const totalSelectedCount = contactLists
    .filter((l) => selectedListIds.includes(l.id))
    .reduce((acc, curr) => acc + curr.totalContacts, 0);

  const validCount = contactLists
    .filter((l) => selectedListIds.includes(l.id))
    .reduce((acc, curr) => acc + curr.validContacts, 0);

  const invalidCount = contactLists
    .filter((l) => selectedListIds.includes(l.id))
    .reduce((acc, curr) => acc + curr.invalidContacts, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
      {/* Left Column: Audience Selection */}
      <div className="lg:col-span-7 space-y-5">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight">
            Select Audience
          </h3>
          <p className="text-xs text-[#8c88a6] mt-0.5">
            Choose who you want to send this campaign to.
          </p>
        </div>

        {/* Audience Type Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {AUDIENCE_TYPES.map((type) => {
            const Icon = type.icon;
            const isSelected = audienceType === type.id;

            return (
              <div
                key={type.id}
                onClick={() => {
                  setAudienceType(type.id);
                  updateData({ audienceType: type.id });
                }}
                className={`p-3 rounded-xl border cursor-pointer transition-all duration-200 flex flex-col justify-between select-none ${
                  isSelected
                    ? 'bg-[#1a0f2e] border-[#814AC8] shadow-[0_0_16px_rgba(129,74,200,0.25)]'
                    : 'bg-[#0f0e1c] border-[#251f42] hover:border-[#382f61] hover:bg-[#141226]'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2 ${
                    isSelected ? 'bg-[#814AC8] text-white' : 'bg-[#1a1636] text-[#8c88a6]'
                  }`}
                >
                  <Icon size={14} />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white truncate">
                    {type.label}
                  </h4>
                  <p className="text-[10px] text-[#7f7a9c] mt-0.5 leading-tight line-clamp-2">
                    {type.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Contact Lists Section */}
        <div className="space-y-3 pt-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-semibold text-white">
                Choose from Your Contacts
              </h4>
              <p className="text-[11px] text-[#8c88a6]">
                Select lists or segments from your saved contacts.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRefresh}
                className="p-2 rounded-lg bg-[#0f0e1c] border border-[#251f42] text-[#8c88a6] hover:text-white hover:border-[#3d3363] transition-colors"
                title="Refresh lists"
              >
                <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-[#814AC8]' : ''} />
              </button>

              <button
                type="button"
                className="px-3 py-1.5 rounded-lg bg-[#181230] border border-purple-500/30 text-[#C49FE0] hover:bg-purple-600/20 text-xs font-medium flex items-center gap-1.5 transition-all"
              >
                <Plus size={13} />
                <span>Create New List</span>
              </button>
            </div>
          </div>

          {/* Search input */}
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6d688c]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contact lists..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#0f0e1c] border border-[#251f42] text-xs text-white placeholder-[#585375] outline-none focus:border-[#814AC8] transition-colors"
            />
          </div>

          {/* Contacts Table */}
          <div className="rounded-xl border border-[#251f42] bg-[#0c0b17] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#121024] border-b border-[#251f42] text-[#8c88a6] uppercase text-[10px] font-semibold tracking-wider">
                  <tr>
                    <th className="w-10 px-3 py-2.5 text-center">
                      <span className="sr-only">Select</span>
                    </th>
                    <th className="px-3 py-2.5">List Name</th>
                    <th className="px-3 py-2.5">Total Contacts</th>
                    <th className="px-3 py-2.5 hidden sm:table-cell">Description</th>
                    <th className="px-3 py-2.5 hidden md:table-cell">Created On</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f1a36]">
                  {filteredLists.map((item) => {
                    const isChecked = selectedListIds.includes(item.id);

                    return (
                      <tr
                        key={item.id}
                        onClick={() => toggleList(item.id)}
                        className={`cursor-pointer transition-colors duration-150 ${
                          isChecked ? 'bg-[#814AC8]/10' : 'hover:bg-[#15122b]'
                        }`}
                      >
                        <td className="px-3 py-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="w-4 h-4 rounded bg-[#1a1636] border-[#382f61] text-[#814AC8] accent-[#814AC8] cursor-pointer"
                          />
                        </td>
                        <td className="px-3 py-2.5 font-medium text-white">
                          {item.name}
                        </td>
                        <td className="px-3 py-2.5 text-[#a8a3c2] font-semibold">
                          {item.totalContacts.toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-[#8c88a6] hidden sm:table-cell text-[11px] truncate max-w-[150px]">
                          {item.description}
                        </td>
                        <td className="px-3 py-2.5 text-[#6d688c] hidden md:table-cell text-[11px]">
                          {item.createdOn}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Footer Count */}
            <div className="px-4 py-2.5 bg-[#121024] border-t border-[#251f42] text-[11px] text-[#8c88a6] flex items-center justify-between">
              <span>
                <strong className="text-white">{selectedListIds.length}</strong> list{selectedListIds.length !== 1 ? 's' : ''} selected •{' '}
                <strong className="text-white">{totalSelectedCount.toLocaleString()}</strong> contacts
              </span>
            </div>
          </div>

          {error && (
            <p className="text-xs text-rose-400">{error}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-[#251f42]/70 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 rounded-xl text-xs font-medium text-[#9da3ae] bg-[#121024] border border-[#251f42] hover:text-white hover:border-[#3d3363] transition-all"
          >
            ← Back
          </button>

          <button
            type="button"
            onClick={handleProceed}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#814AC8] hover:bg-[#703db5] shadow-[0_0_20px_rgba(129,74,200,0.4)] hover:shadow-[0_0_25px_rgba(129,74,200,0.6)] flex items-center gap-1.5 transition-all"
          >
            <span>Next</span>
            <span>→</span>
          </button>
        </div>
      </div>

      {/* Right Column: Audience Summary & Pro Tip */}
      <div className="lg:col-span-5 space-y-4">
        <AudienceSummary
          total={totalSelectedCount || 2480}
          valid={validCount || 2430}
          invalid={invalidCount || 50}
          optedIn={validCount || 2430}
          optedOut={invalidCount || 50}
          estimatedMessages={`~ ${(validCount || 2430).toLocaleString()} messages`}
        />

        <ProTip message="Smaller, targeted audiences get higher engagement. Try segmenting your audience for better results." />
      </div>
    </div>
  );
}
