import {
    Truck,
    Container,
    User,
    MapPin,
    Calendar,
    Weight,
    Globe,
    FileCheck
} from 'lucide-react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TradeShippingTabProps {
    data: any;
    options?: any;
    mode: 'view' | 'edit' | 'create';
    onChange?: (updates: any) => void;
}

export function TradeShippingTab({ data, mode, onChange }: TradeShippingTabProps) {
    const { t, direction } = useLanguage();
    const isRTL = direction === 'rtl';
    const isEditable = mode === 'create' || mode === 'edit';

    const handleChange = (field: string, value: any) => {
        onChange?.({ [field]: value });
    };

    if (isEditable) {
        return (
            <div className="space-y-6 p-4">
                {/* Container Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Container Number */}
                    <div className="space-y-2">
                        <Label>{t('fields.containerNumber') || 'Container Number'}</Label>
                        <Input
                            value={data.container_number || ''}
                            onChange={(e) => handleChange('container_number', e.target.value)}
                            placeholder="e.g. MSKU1234567"
                        />
                    </div>
                    {/* B/L */}
                    <div className="space-y-2">
                        <Label>{t('fields.billOfLading') || 'Bill of Lading'}</Label>
                        <Input
                            value={data.bill_of_lading || ''}
                            onChange={(e) => handleChange('bill_of_lading', e.target.value)}
                        />
                    </div>
                    {/* Origin Country */}
                    <div className="space-y-2">
                        <Label>{t('fields.originCountry') || 'Origin Country'}</Label>
                        <Input
                            value={data.origin_country || ''}
                            onChange={(e) => handleChange('origin_country', e.target.value)}
                        />
                    </div>
                    {/* Container Size */}
                    <div className="space-y-2">
                        <Label>{t('fields.containerSize') || 'Container Size'}</Label>
                        <Select value={data.container_size || '40ft'} onValueChange={(v) => handleChange('container_size', v)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="20ft">20ft</SelectItem>
                                <SelectItem value="40ft">40ft</SelectItem>
                                <SelectItem value="40hc">40ft HC</SelectItem>
                                <SelectItem value="45ft">45ft</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {/* Container Type */}
                    <div className="space-y-2">
                        <Label>{t('fields.containerType') || 'Container Type'}</Label>
                        <Select value={data.container_type || 'dry'} onValueChange={(v) => handleChange('container_type', v)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="dry">{t('types.dry') || 'Dry'}</SelectItem>
                                <SelectItem value="reefer">{t('types.reefer') || 'Reefer'}</SelectItem>
                                <SelectItem value="open">{t('types.open') || 'Open Top'}</SelectItem>
                                <SelectItem value="flat">{t('types.flat') || 'Flat Rack'}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <Separator />

                {/* Shipping Route */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>{t('fields.portOfLoading') || 'Port of Loading'}</Label>
                        <Input
                            value={data.port_of_loading || ''}
                            onChange={(e) => handleChange('port_of_loading', e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>{t('fields.portOfDischarge') || 'Port of Discharge'}</Label>
                        <Input
                            value={data.port_of_discharge || ''}
                            onChange={(e) => handleChange('port_of_discharge', e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>{t('fields.vesselName') || 'Vessel Name'}</Label>
                        <Input
                            value={data.vessel_name || ''}
                            onChange={(e) => handleChange('vessel_name', e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>{t('fields.shippingLine') || 'Shipping Line'}</Label>
                        <Input
                            value={data.shipping_line || ''}
                            onChange={(e) => handleChange('shipping_line', e.target.value)}
                        />
                    </div>
                </div>

                <Separator />

                {/* Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>{t('fields.etd') || 'ETD'}</Label>
                        <Input
                            type="date"
                            value={data.etd || ''}
                            onChange={(e) => handleChange('etd', e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>{t('fields.eta') || 'ETA'}</Label>
                        <Input
                            type="date"
                            value={data.eta || ''}
                            onChange={(e) => handleChange('eta', e.target.value)}
                        />
                    </div>
                </div>
            </div>
        );
    }

    // Read Only View
    const shipment = data.shipment || data;

    if (!shipment && mode === 'view') {
        return (
            <div className="p-8 text-center text-gray-500">
                <Truck className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                <p>{t('trade.shipping.noData')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-1">
            {/* Shipment Status & Type */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-blue-600" />
                    {t('trade.shipping.details')}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                    <InfoRow
                        label={t('fields.containerNumber') || 'Container No'}
                        value={data.container_number || shipment.container_number}
                        icon={Container}
                        highlight
                    />
                    <InfoRow
                        label={t('fields.originCountry') || 'Origin'}
                        value={data.origin_country || shipment.origin_country}
                        icon={Globe}
                    />
                    <InfoRow
                        label={t('fields.billOfLading') || 'B/L'}
                        value={data.bill_of_lading || shipment.bill_of_lading}
                        icon={FileCheck}
                    />
                    <InfoRow
                        label={t('fields.vesselName') || 'Vessel'}
                        value={data.vessel_name || shipment.vessel_name}
                        icon={Globe}
                    />
                    <InfoRow
                        label={t('fields.eta') || 'ETA'}
                        value={data.eta ? new Date(data.eta).toLocaleDateString() : '-'}
                        icon={Calendar}
                    />
                    <InfoRow
                        label={t('fields.containerSize') || 'Size'}
                        value={data.container_size || shipment.container_size}
                        icon={Container}
                    />
                </div>
            </div>

            {/* Logistics Info (Driver, Location) */}
            {(data.driver_name || data.delivery_address) && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-orange-600" />
                        {t('trade.shipping.logistics')}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                        {data.driver_name && (
                            <InfoRow
                                label={t('fields.driverName')}
                                value={data.driver_name}
                                icon={User}
                            />
                        )}
                        {data.vehicle_number && (
                            <InfoRow
                                label={t('fields.vehicleNumber')}
                                value={data.vehicle_number}
                                icon={Truck}
                            />
                        )}
                        {data.delivery_date && (
                            <InfoRow
                                label={t('fields.deliveryDate')}
                                value={new Date(data.delivery_date).toLocaleDateString()}
                                icon={Calendar}
                            />
                        )}
                        {data.weight && (
                            <InfoRow
                                label={t('fields.weight')}
                                value={`${data.weight} kg`}
                                icon={Weight}
                            />
                        )}
                    </div>

                    {data.delivery_address && (
                        <>
                            <Separator className="my-4" />
                            <div className="flex gap-2 items-start">
                                <MapPin className="w-4 h-4 text-gray-400 mt-1" />
                                <div>
                                    <span className="text-sm text-gray-500 block mb-1">{t('fields.deliveryAddress')}</span>
                                    <p className="text-sm text-gray-900 dark:text-gray-200 leading-relaxed">
                                        {data.delivery_address}
                                    </p>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

// Helper Component for Info Rows
function InfoRow({ label, value, icon: Icon, highlight, isLink }: any) {
    if (!value) return null;

    return (
        <div className="flex items-center justify-between group">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                {Icon && <Icon className="w-4 h-4 text-gray-400 group-hover:text-erp-teal transition-colors" />}
                <span>{label}</span>
            </div>
            <div className={`text-sm font-medium ${highlight ? 'text-erp-navy dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded' : 'text-gray-900 dark:text-gray-200'} ${isLink ? 'text-erp-teal hover:underline cursor-pointer' : ''}`}>
                {value}
            </div>
        </div>
    );
}
