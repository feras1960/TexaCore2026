import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Phone, PhoneOff, Clock } from 'lucide-react';

export default function CallCenterDashboard() {
    return (
        <div className="animate-in fade-in duration-500 space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-erp-navy dark:text-gray-100">
                    Communications Center
                </h2>
                <div className="px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium animate-pulse">
                    ● Live System Active
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                            <Activity className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Active Calls</p>
                            <p className="text-2xl font-bold">3</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                            <Phone className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Completed Today</p>
                            <p className="text-2xl font-bold">128</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-red-100 text-red-600 rounded-lg">
                            <PhoneOff className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Missed Calls</p>
                            <p className="text-2xl font-bold">12</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
                            <Clock className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Avg Duration</p>
                            <p className="text-2xl font-bold">2m 45s</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Live Monitor</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-800/20 rounded border border-dashed">
                        <p className="text-gray-400">Live Call Visualization & Agent Status</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
