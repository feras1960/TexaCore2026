import React from 'react';

export default function ActivityFeed() {
    return (
        <div className="animate-in fade-in duration-500 space-y-6">
            <h2 className="text-2xl font-bold text-erp-navy dark:text-gray-100">
                Activity Log
            </h2>
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 bg-white dark:bg-gray-800 rounded-lg border shadow-sm flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                            <span className="text-lg">@</span>
                        </div>
                        <div>
                            <p className="font-medium">New interaction logged</p>
                            <p className="text-sm text-gray-500">User interacted with Module X • 2 hours ago</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
