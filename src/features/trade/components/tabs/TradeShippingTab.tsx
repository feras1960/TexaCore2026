import React from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Truck } from 'lucide-react';
// import { TradeDocument } from '../../types'; // Adjust path if needed

interface TradeShippingTabProps {
    data: any;
    onChange?: (updates: any) => void;
    readOnly?: boolean;
}

export const TradeShippingTab: React.FC<TradeShippingTabProps> = ({
    data,
    onChange,
    readOnly
}) => {
    const { t, isRTL } = useLanguage();

    return (
        <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
            <div className="p-8 text-center text-gray-500 border-2 border-dashed rounded-lg bg-gray-50/50">
                <Truck className="w-12 h-12 mx-auto text-gray-300 mb-2 opacity-50" />
                <h3 className="text-lg font-medium text-gray-700 mb-1">
                    {isRTL ? 'تفاصيل الشحن والكونتينرات' : 'Shipping & Container Details'}
                </h3>
                <p className="text-sm text-gray-500">
                    {isRTL
                        ? 'يمكنك هنا إضافة معلومات الشحن والحاويات ومتابعة الحالة اللوجستية.'
                        : 'Details about shipment containers and logistics can be managed here.'}
                </p>
                {/* Future Forms for Container Number, BL Number, etc. */}
            </div>
        </div>
    );
};
