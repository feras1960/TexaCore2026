import React from 'react';
import { Phone, Users, Voicemail, HeadphonesIcon, Globe } from 'lucide-react';
import { OnlineVisitorsList } from '../components/OnlineVisitorsList';

export default function PBXDashboard() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">المقسم السحابي (Cloud PBX)</h1>
          <p className="text-gray-500 dark:text-gray-400">إدارة وتحكم كامل بنظام الاتصالات الخاص بشركتك</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 border-t-4 border-t-blue-500">
          <div className="flex items-center space-x-4 space-x-reverse">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Phone className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">المكالمات الجارية</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">0</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 border-t-4 border-t-green-500">
          <div className="flex items-center space-x-4 space-x-reverse">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">الأرقام الداخلية النشطة</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">0</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 border-t-4 border-t-orange-500">
          <div className="flex items-center space-x-4 space-x-reverse">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <HeadphonesIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">مجموعات الرنين</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">0</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 border-t-4 border-t-rose-500">
          <div className="flex items-center space-x-4 space-x-reverse">
            <div className="p-3 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
              <Voicemail className="w-6 h-6 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">رسائل صوتية جديدة</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">0</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="text-center">
              <p className="text-gray-500 dark:text-gray-400 mb-2 font-medium">جاري العمل على استكمال الإحصائيات</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">سيتم عرض الرسوم البيانية وسجل المكالمات هنا</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <OnlineVisitorsList />
        </div>
      </div>
    </div>
  );
}
