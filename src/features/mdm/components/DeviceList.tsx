import React, { useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Search,
  MonitorSmartphone,
  Filter,
  Wifi,
  WifiOff,
  MoreVertical,
  Terminal,
  FolderOpen
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DeviceDetailsSheet } from './DeviceDetailsSheet';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

// Mock data as fallback
const MOCK_DEVICES = [
  { id: '1', name: 'CEO-Laptop', os: 'Windows 11', status: 'online', company: 'Next Revolution', branch: 'Riyadh HQ', user: 'Ahmed' },
  { id: '2', name: 'Cashier-PC-01', os: 'Windows 10', status: 'online', company: 'Next Revolution', branch: 'Jeddah Branch', user: 'Cashier 1' },
  { id: '3', name: 'HR-iMac', os: 'macOS Sonoma', status: 'offline', company: 'TexaCore', branch: 'Dubai Office', user: 'Sarah' },
  { id: '4', name: 'Warehouse-Tablet', os: 'Android', status: 'online', company: 'Next Revolution', branch: 'Riyadh Warehouse', user: 'Worker A' },
];

export function DeviceList() {
  const { t, language } = useLanguage();
  const { isSuperAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Sheet state
  const [selectedDevice, setSelectedDevice] = useState<any | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Fetch devices from Edge Function
  const { data: devices, isLoading, error } = useQuery({
    queryKey: ['mdm-devices'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('mdm-proxy', {
        body: { action: 'get_devices' }
      });
      if (error) throw error;
      return data?.data || [];
    },
    refetchInterval: 30000, // Refresh every 30s
    retry: 1
  });

  // Simulating the dynamic filter based on role
  const isSuper = isSuperAdmin;

  // Search filter
  const displayDevices = (devices && devices.length > 0 ? devices : MOCK_DEVICES).filter(
    d => d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
         (d.user && d.user.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      {/* Top Toolbar: Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
        
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input 
            placeholder={language === 'ar' ? 'البحث عن جهاز...' : 'Search devices...'}
            className="pl-9 bg-gray-50 dark:bg-gray-800 border-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <Button variant="outline" className="gap-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <Filter className="w-4 h-4 text-gray-500" />
            {language === 'ar' ? 'الحالة' : 'Status'}
          </Button>

          {isSuper ? (
            <Button variant="outline" className="gap-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              {language === 'ar' ? 'الشركة' : 'Company'}
            </Button>
          ) : null}

          <Button variant="outline" className="gap-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            {language === 'ar' ? 'الفرع' : 'Branch'}
          </Button>
        </div>
      </div>

      {/* Devices Grid/Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400 font-tajawal">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800/50 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th scope="col" className="px-6 py-4">{language === 'ar' ? 'الجهاز' : 'Device'}</th>
                {isSuper && <th scope="col" className="px-6 py-4">{language === 'ar' ? 'الشركة' : 'Company'}</th>}
                <th scope="col" className="px-6 py-4">{language === 'ar' ? 'الفرع' : 'Branch'}</th>
                <th scope="col" className="px-6 py-4">{language === 'ar' ? 'المستخدم' : 'User'}</th>
                <th scope="col" className="px-6 py-4">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                <th scope="col" className="px-6 py-4 text-center">{language === 'ar' ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-erp-teal mx-auto"></div>
                  </td>
                </tr>
              ) : displayDevices.map((device: any) => (
                <tr 
                  key={device.id} 
                  className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedDevice(device);
                    setIsSheetOpen(true);
                  }}
                >
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${device.status === 'online' ? 'bg-erp-teal/10 text-erp-teal' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'}`}>
                      <MonitorSmartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold">{device.name}</div>
                      <div className="text-xs text-gray-500">{device.os}</div>
                    </div>
                  </td>
                  {isSuper && <td className="px-6 py-4">{device.company}</td>}
                  <td className="px-6 py-4">{device.branch}</td>
                  <td className="px-6 py-4">{device.user}</td>
                  <td className="px-6 py-4">
                    {device.status === 'online' ? (
                      <span className="flex items-center gap-1.5 text-erp-teal bg-erp-teal/10 px-2.5 py-1 rounded-full w-fit text-xs font-bold">
                        <Wifi className="w-3.5 h-3.5" />
                        {language === 'ar' ? 'متصل' : 'Online'}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-gray-500 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full w-fit text-xs font-bold">
                        <WifiOff className="w-3.5 h-3.5" />
                        {language === 'ar' ? 'غير متصل' : 'Offline'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="gap-2">
                          <Terminal className="w-4 h-4 text-erp-teal" />
                          <span>{language === 'ar' ? 'تحكم عن بعد' : 'Remote Control'}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2">
                          <FolderOpen className="w-4 h-4 text-blue-500" />
                          <span>{language === 'ar' ? 'تصفح الملفات' : 'Browse Files'}</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              {displayDevices.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-500 font-tajawal">
                    {language === 'ar' ? 'لا توجد أجهزة متصلة.' : 'No devices found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DeviceDetailsSheet 
        device={selectedDevice} 
        isOpen={isSheetOpen} 
        onClose={() => setIsSheetOpen(false)} 
      />
    </div>
  );
}
