import React from 'react';

export default function CampaignsList() {
    return (
        <div className="animate-in fade-in duration-500 space-y-6">
            <h2 className="text-2xl font-bold text-erp-navy dark:text-gray-100">
                Marketing Campaigns
            </h2>
            <div className="p-8 text-center text-gray-500 bg-white dark:bg-gray-800 rounded-lg border shadow-sm">
                No active campaigns. Create one to get started.
            </div>
        </div>
    );
}
