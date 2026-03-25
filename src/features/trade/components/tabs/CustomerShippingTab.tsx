/**
 * ═══════════════════════════════════════════════════════════════
 *  CustomerShippingTab — تبويب شحن العميل
 * ═══════════════════════════════════════════════════════════════
 *  Phase 7: جلب عناوين العميل + اختيار عنوان التسليم + طريقة التوصيل
 *  يعمل مع جدول customer_addresses
 * ═══════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
    MapPin,
    Plus,
    Truck,
    Phone,
    User,
    CheckCircle2,
    Building2,
    Navigation,
    Package,
    Clock,
    Edit3,
    Trash2,
    Star,
    StarOff,
    ChevronDown,
    Search,
    Loader2,
    Printer,
    ExternalLink,
    Zap,
    AlertCircle,
    RefreshCw,
    DollarSign,
    Weight,
    Hash,
    FileCheck,
} from 'lucide-react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

// ═══ Types ═══
interface CustomerAddress {
    id: string;
    customer_id: string;
    tenant_id: string;
    address_type: 'shipping' | 'billing' | 'both';
    label: string;
    recipient_name: string;
    phone: string;
    country: string;
    city: string;
    district: string;
    street: string;
    building: string;
    floor: string;
    apartment: string;
    postal_code: string;
    latitude: number | null;
    longitude: number | null;
    is_default: boolean;
    created_at: string;
}

interface DeliveryMethod {
    id: string;
    label_ar: string;
    label_en: string;
    icon: any;
    description_ar: string;
    description_en: string;
    estimatedDays?: string;
}

interface CustomerShippingTabProps {
    data: any;
    mode: 'view' | 'edit' | 'create';
    onChange?: (updates: any) => void;
}

// ═══ Delivery Methods ═══
const DELIVERY_METHODS: DeliveryMethod[] = [
    {
        id: 'store_pickup',
        label_ar: 'تسليم عبر الفرع',
        label_en: 'Branch Delivery',
        icon: Building2,
        description_ar: 'إرسال البضاعة للفرع ثم تسليم العميل',
        description_en: 'Ship to branch, then deliver to customer',
    },
    {
        id: 'direct_delivery',
        label_ar: 'توصيل لعنوان العميل',
        label_en: 'Customer Delivery',
        icon: Truck,
        description_ar: 'سائق يوصّل البضاعة مباشرة لعنوان العميل',
        description_en: 'Driver delivers directly to customer address',
        estimatedDays: '1-3',
    },
    {
        id: 'direct_pickup',
        label_ar: 'تسليم مباشر بالمستودع',
        label_en: 'Warehouse Pickup',
        icon: Package,
        description_ar: 'العميل أو مندوبه يستلم مباشرة من المستودع',
        description_en: 'Customer or representative picks up from warehouse',
    },
    {
        id: 'carrier',
        label_ar: 'شركة شحن',
        label_en: 'Shipping Carrier',
        icon: Navigation,
        description_ar: 'شحن عبر شركة شحن خارجية (نوفايا بوشتا، أوكربوشتا...)',
        description_en: 'Via carrier (Nova Poshta, Ukrposhta...)',
        estimatedDays: '1-5',
    },
];

// ═══ Shipping Carriers (configurable via company_settings / n8n) ═══
interface ShippingCarrier {
    id: string;
    name_ar: string;
    name_en: string;
    logo?: string;
    tracking_url?: string; // e.g. "https://novaposhta.ua/tracking?id={tracking}"
    n8n_webhook?: string;  // n8n webhook for creating shipment
    country?: string;
}

const DEFAULT_CARRIERS: ShippingCarrier[] = [
    {
        id: 'nova_poshta',
        name_ar: 'نوفايا بوشتا',
        name_en: 'Nova Poshta',
        tracking_url: 'https://novaposhta.ua/tracking/international/en?id={tracking}',
        country: 'UA',
    },
    {
        id: 'ukrposhta',
        name_ar: 'أوكربوشتا',
        name_en: 'Ukrposhta',
        tracking_url: 'https://track.ukrposhta.ua/tracking_EN.html?barcode={tracking}',
        country: 'UA',
    },
    {
        id: 'dhl',
        name_ar: 'دي إتش إل',
        name_en: 'DHL',
        tracking_url: 'https://www.dhl.com/en/express/tracking.html?AWB={tracking}',
        country: 'INTL',
    },
    {
        id: 'aramex',
        name_ar: 'أرامكس',
        name_en: 'Aramex',
        tracking_url: 'https://www.aramex.com/track/results?ShipmentNumber={tracking}',
        country: 'INTL',
    },
    {
        id: 'other',
        name_ar: 'أخرى',
        name_en: 'Other',
    },
];

// ═══ Empty Address Template ═══
const EMPTY_ADDRESS: Partial<CustomerAddress> = {
    address_type: 'shipping',
    label: '',
    recipient_name: '',
    phone: '',
    country: '',
    city: '',
    district: '',
    street: '',
    building: '',
    floor: '',
    apartment: '',
    postal_code: '',
    is_default: false,
};

// ═══ Component ═══
export function CustomerShippingTab({ data, mode, onChange }: CustomerShippingTabProps) {
    const { t, language, direction } = useLanguage();
    const isRTL = direction === 'rtl';
    const isEditable = mode === 'create' || mode === 'edit';

    // State
    const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
    const [loading, setLoading] = useState(false);
    const [addressDialogOpen, setAddressDialogOpen] = useState(false);
    const [editingAddress, setEditingAddress] = useState<Partial<CustomerAddress> | null>(null);
    const [savingAddress, setSavingAddress] = useState(false);
    const [deliveryNotesOpen, setDeliveryNotesOpen] = useState(false);

    // ═══ Nova Poshta Integration State ═══
    const [npApiKey, setNpApiKey] = useState<string | null>(null);
    const [npConnected, setNpConnected] = useState(false);
    const [npLoading, setNpLoading] = useState(false);
    const [npDeliveryType, setNpDeliveryType] = useState('WarehouseWarehouse');
    const [npCitySearch, setNpCitySearch] = useState('');
    const [npCities, setNpCities] = useState<any[]>([]);
    const [npSelectedCity, setNpSelectedCity] = useState<any>(null);
    const [npWarehouses, setNpWarehouses] = useState<any[]>([]);
    const [npSelectedWarehouse, setNpSelectedWarehouse] = useState<any>(null);
    const [npPayerType, setNpPayerType] = useState('Recipient');
    const [npPaymentMethod, setNpPaymentMethod] = useState('Cash');
    const [npWeight, setNpWeight] = useState('1');
    const [npDescription, setNpDescription] = useState('Тканини / Fabrics');
    const [npSeatsAmount, setNpSeatsAmount] = useState('1');
    const [npCreatingTTN, setNpCreatingTTN] = useState(false);
    const [npTrackingStatus, setNpTrackingStatus] = useState<any>(null);
    const [npSearchingCities, setNpSearchingCities] = useState(false);
    const [npEstimatedCost, setNpEstimatedCost] = useState<string | null>(null);
    const [npShowCityDropdown, setNpShowCityDropdown] = useState(false);
    // ═══ COD (Cash on Delivery / Наложенный платеж) ═══
    const [npCodEnabled, setNpCodEnabled] = useState(false);
    const [npCodAmount, setNpCodAmount] = useState('');
    const [npCodRedeliveryPayer, setNpCodRedeliveryPayer] = useState('Recipient');
    const [npMoneyTransferType, setNpMoneyTransferType] = useState('MoneyTransfer');
    // ═══ Recipient Info (auto-filled from customer) ═══
    const [npRecipientName, setNpRecipientName] = useState('');
    const [npRecipientPhone, setNpRecipientPhone] = useState('');
    const [npCargoType, setNpCargoType] = useState('Cargo');
    const [npDeclaredCost, setNpDeclaredCost] = useState('');
    const citySearchTimer = useRef<NodeJS.Timeout | null>(null);

    // ═══ Drivers list for dropdown ═══
    const { companyId } = useAuth();
    const [driversList, setDriversList] = useState<{ id: string; name_ar: string; name_en?: string; phone?: string; vehicle_number?: string }[]>([]);
    const [driversLoading, setDriversLoading] = useState(false);

    const customerId = data?.customer_id;
    const selectedAddressId = data?.shipping_address_id;
    const selectedDeliveryMethod = data?.delivery_method || 'store_pickup';

    // ═══ Fetch drivers ═══
    useEffect(() => {
        if (!companyId) return;
        const fetchDrivers = async () => {
            setDriversLoading(true);
            try {
                const { data: drv } = await supabase
                    .from('drivers')
                    .select('id, name_ar, name_en, phone, vehicle_number')
                    .eq('company_id', companyId)
                    .eq('status', 'active')
                    .order('name_ar');
                setDriversList(drv || []);
            } catch { /* ignore */ }
            finally { setDriversLoading(false); }
        };
        fetchDrivers();
    }, [companyId]);

    // ═══ Fetch addresses ═══
    useEffect(() => {
        if (!customerId) return;

        const fetchAddresses = async () => {
            setLoading(true);
            try {
                const { data: addrs, error } = await supabase
                    .from('customer_addresses')
                    .select('*')
                    .eq('customer_id', customerId)
                    .order('is_default', { ascending: false })
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setAddresses(addrs || []);

                // Auto-select default address if none selected
                if (!selectedAddressId && addrs && addrs.length > 0) {
                    const defaultAddr = addrs.find((a: CustomerAddress) => a.is_default) || addrs[0];
                    onChange?.({
                        shipping_address_id: defaultAddr.id,
                        shipping_address: formatAddressText(defaultAddr),
                    });
                }
            } catch (err) {
                console.error('Error fetching addresses:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchAddresses();
    }, [customerId]);

    // ═══ Selected Address ═══
    const selectedAddress = useMemo(
        () => addresses.find(a => a.id === selectedAddressId),
        [addresses, selectedAddressId]
    );

    // ═══ Auto-fill recipient from customer data + invoice details ═══
    useEffect(() => {
        const name = selectedAddress?.recipient_name || data?.customer_name || '';
        const phone = selectedAddress?.phone || data?.customer_phone || '';
        if (name && !npRecipientName) setNpRecipientName(name);
        if (phone && !npRecipientPhone) setNpRecipientPhone(phone);
        if (data?.total_amount && !npDeclaredCost) setNpDeclaredCost(data.total_amount.toString());

        // Build cargo description from invoice items
        const items = data?.items || data?.lines || [];
        if (items.length > 0 && npDescription === 'Тканини / Fabrics') {
            const lang = language === 'ar' ? 'ar' : 'en';
            const itemNames = items
                .map((item: any) => lang === 'ar'
                    ? (item.material_name_ar || item.material_name_en || item.description || '')
                    : (item.material_name_en || item.material_name_ar || item.description || ''))
                .filter(Boolean)
                .slice(0, 5); // Max 5 items in description
            if (itemNames.length > 0) {
                const desc = itemNames.join(', ');
                const suffix = items.length > 5
                    ? (lang === 'ar' ? ` (+${items.length - 5} أخرى)` : ` (+${items.length - 5} more)`)
                    : '';
                setNpDescription(desc + suffix);
            }
            // Estimate seats from item count
            if (npSeatsAmount === '1' && items.length > 1) {
                setNpSeatsAmount(Math.min(items.length, 10).toString());
            }
        }
    }, [data?.customer_name, data?.customer_phone, data?.total_amount, data?.items, data?.lines, selectedAddress, selectedAddressId]);

    // ═══ Format address ═══
    function formatAddressText(addr: CustomerAddress): string {
        const parts = [
            addr.street,
            addr.building && (language === 'ar' ? `مبنى ${addr.building}` : `Bldg ${addr.building}`),
            addr.floor && (language === 'ar' ? `طابق ${addr.floor}` : `Floor ${addr.floor}`),
            addr.district,
            addr.city,
            addr.country,
            addr.postal_code,
        ].filter(Boolean);
        return parts.join(', ');
    }

    // ═══ Select address ═══
    function handleSelectAddress(addr: CustomerAddress) {
        if (!isEditable) return;
        onChange?.({
            shipping_address_id: addr.id,
            shipping_address: formatAddressText(addr),
            shipping_recipient: addr.recipient_name,
            shipping_phone: addr.phone,
        });
    }

    // ═══ Select delivery method ═══
    function handleSelectMethod(methodId: string) {
        if (!isEditable) return;
        onChange?.({ delivery_method: methodId });
    }

    // ═══ Save address ═══
    async function handleSaveAddress() {
        if (!editingAddress || !customerId) return;
        setSavingAddress(true);

        try {
            const payload = {
                ...editingAddress,
                customer_id: customerId,
                tenant_id: data?.tenant_id,
            };
            delete (payload as any).id;
            delete (payload as any).created_at;

            if (editingAddress.id) {
                // Update
                const { error } = await supabase
                    .from('customer_addresses')
                    .update(payload)
                    .eq('id', editingAddress.id);
                if (error) throw error;
                toast.success(language === 'ar' ? 'تم تحديث العنوان' : 'Address updated');
            } else {
                // Insert
                const { error } = await supabase
                    .from('customer_addresses')
                    .insert(payload);
                if (error) throw error;
                toast.success(language === 'ar' ? 'تمت إضافة العنوان' : 'Address added');
            }

            // Refresh
            const { data: addrs } = await supabase
                .from('customer_addresses')
                .select('*')
                .eq('customer_id', customerId)
                .order('is_default', { ascending: false })
                .order('created_at', { ascending: false });

            setAddresses(addrs || []);
            setAddressDialogOpen(false);
            setEditingAddress(null);
        } catch (err: any) {
            toast.error(err.message || 'Error saving address');
        } finally {
            setSavingAddress(false);
        }
    }

    // ═══ Delete address ═══
    async function handleDeleteAddress(addrId: string) {
        try {
            const { error } = await supabase
                .from('customer_addresses')
                .delete()
                .eq('id', addrId);
            if (error) throw error;

            setAddresses(prev => prev.filter(a => a.id !== addrId));
            if (selectedAddressId === addrId) {
                onChange?.({ shipping_address_id: null, shipping_address: '' });
            }
            toast.success(language === 'ar' ? 'تم حذف العنوان' : 'Address deleted');
        } catch (err: any) {
            toast.error(err.message);
        }
    }

    // ═══ Toggle default ═══
    async function handleToggleDefault(addrId: string) {
        try {
            // Reset all defaults first
            await supabase
                .from('customer_addresses')
                .update({ is_default: false })
                .eq('customer_id', customerId);

            // Set new default
            await supabase
                .from('customer_addresses')
                .update({ is_default: true })
                .eq('id', addrId);

            setAddresses(prev => prev.map(a => ({
                ...a,
                is_default: a.id === addrId,
            })));

            toast.success(language === 'ar' ? 'تم تعيين العنوان الافتراضي' : 'Default address set');
        } catch (err: any) {
            toast.error(err.message);
        }
    }

    // ═══ Fetch NP API Key from company integrations ═══
    useEffect(() => {
        const fetchNpSettings = async () => {
            const companyId = data?.company_id;
            if (!companyId) return;
            try {
                const { data: company } = await supabase
                    .from('companies')
                    .select('integrations')
                    .eq('id', companyId)
                    .single();
                const npKey = company?.integrations?.nova_poshta?.api_key;
                if (npKey) {
                    setNpApiKey(npKey);
                    setNpConnected(true);
                }
            } catch (err) {
                console.warn('Could not fetch NP settings:', err);
            }
        };
        fetchNpSettings();
    }, [data?.company_id]);

    // ═══ Debounced NP City Search ═══
    const handleNpCitySearch = useCallback((query: string) => {
        setNpCitySearch(query);
        if (citySearchTimer.current) clearTimeout(citySearchTimer.current);
        if (!npApiKey || query.length < 2) {
            setNpCities([]);
            setNpShowCityDropdown(false);
            return;
        }
        citySearchTimer.current = setTimeout(async () => {
            setNpSearchingCities(true);
            try {
                const { data: result, error } = await supabase.functions.invoke('nova-poshta', {
                    body: { action: 'searchCities', apiKey: npApiKey, params: { query } },
                });
                if (!error && result?.success && result?.data?.[0]?.Addresses) {
                    setNpCities(result.data[0].Addresses);
                    setNpShowCityDropdown(true);
                }
            } catch (err) {
                console.warn('NP city search failed:', err);
            } finally {
                setNpSearchingCities(false);
            }
        }, 400);
    }, [npApiKey]);

    // ═══ Fetch NP Warehouses when city selected ═══
    const fetchNpWarehouses = useCallback(async (cityRef: string) => {
        if (!npApiKey) return;
        setNpLoading(true);
        try {
            const { data: result, error } = await supabase.functions.invoke('nova-poshta', {
                body: { action: 'getWarehouses', apiKey: npApiKey, params: { cityRef } },
            });
            if (!error && result?.success) {
                setNpWarehouses(result.data || []);
            }
        } catch (err) {
            console.warn('NP warehouse fetch failed:', err);
        } finally {
            setNpLoading(false);
        }
    }, [npApiKey]);

    // ═══ Select NP City ═══
    const handleSelectNpCity = useCallback((city: any) => {
        setNpSelectedCity(city);
        setNpCitySearch(city.Present || city.MainDescription || '');
        setNpShowCityDropdown(false);
        setNpCities([]);
        setNpSelectedWarehouse(null);
        // Fetch warehouses for the selected city
        const cityRef = city.DeliveryCity || city.Ref;
        if (cityRef) fetchNpWarehouses(cityRef);
    }, [fetchNpWarehouses]);

    // ═══ Create NP TTN (Internet Document) ═══
    const createNpDocument = async () => {
        if (!npApiKey) return;
        if (!npSelectedCity) {
            toast.error(language === 'ar' ? 'اختر مدينة المستلم أولاً' : 'Select recipient city first');
            return;
        }
        if (npDeliveryType === 'WarehouseWarehouse' && !npSelectedWarehouse) {
            toast.error(language === 'ar' ? 'اختر فرع الاستلام' : 'Select recipient warehouse');
            return;
        }

        setNpCreatingTTN(true);
        try {
            const companyId = data?.company_id;
            const { data: company } = await supabase
                .from('companies')
                .select('integrations')
                .eq('id', companyId)
                .single();
            const nps = company?.integrations?.nova_poshta || {};

            if (!nps.sender_ref || !nps.sender_address_ref || !nps.sender_contact_ref) {
                toast.error(language === 'ar'
                    ? 'يرجى إعداد بيانات المرسل في إعدادات الشركة أولاً (sender_ref, sender_address_ref, sender_contact_ref)'
                    : 'Please configure sender details in company settings first');
                setNpCreatingTTN(false);
                return;
            }

            const recipientPhone = npRecipientPhone || selectedAddress?.phone || data?.customer_phone || '';
            const recipientName = npRecipientName || selectedAddress?.recipient_name || data?.customer_name || '';
            const today = new Date();
            const dateStr = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;

            const documentParams: any = {
                PayerType: npPayerType,
                PaymentMethod: npPaymentMethod,
                DateTime: dateStr,
                CargoType: npCargoType,
                Weight: npWeight,
                ServiceType: npDeliveryType,
                SeatsAmount: npSeatsAmount,
                Description: npDescription,
                Cost: npDeclaredCost || data?.total_amount?.toString() || '100',
                CitySender: nps.sender_city_ref,
                Sender: nps.sender_ref,
                SenderAddress: nps.sender_address_ref,
                ContactSender: nps.sender_contact_ref,
                SendersPhone: nps.sender_phone || '',
                CityRecipient: npSelectedCity.DeliveryCity || npSelectedCity.Ref,
                RecipientCityName: npSelectedCity.Present || npSelectedCity.MainDescription || '',
                RecipientsPhone: recipientPhone,
            };

            if (npDeliveryType === 'WarehouseWarehouse' && npSelectedWarehouse) {
                documentParams.RecipientAddress = npSelectedWarehouse.Ref;
                documentParams.RecipientAddressName = npSelectedWarehouse.Description;
            }

            // Auto-create recipient as PrivatePerson
            documentParams.RecipientName = recipientName;
            documentParams.RecipientType = 'PrivatePerson';

            // ═══ COD (Cash on Delivery / Наложенный платеж) ═══
            if (npCodEnabled && npCodAmount && parseFloat(npCodAmount) > 0) {
                documentParams.BackwardDeliveryData = [{
                    PayerType: npCodRedeliveryPayer,
                    CargoType: npMoneyTransferType,
                    RedeliveryString: npCodAmount,
                }];
                documentParams.AfterpaymentOnGoodsCost = npCodAmount;
            }

            const { data: result, error } = await supabase.functions.invoke('nova-poshta', {
                body: { action: 'createDocument', apiKey: npApiKey, params: documentParams },
            });

            if (error) throw error;

            if (result?.success && result?.data?.[0]?.IntDocNumber) {
                const ttn = result.data[0].IntDocNumber;
                const ref = result.data[0].Ref;
                const estDelivery = result.data[0].EstimatedDeliveryDate;
                const costOnSite = result.data[0].CostOnSite;

                onChange?.({
                    tracking_number: ttn,
                    np_document_ref: ref,
                    np_estimated_delivery: estDelivery,
                    shipping_carrier: 'nova_poshta',
                    shipping_cost: costOnSite ? parseFloat(costOnSite) : undefined,
                });

                toast.success(language === 'ar'
                    ? `✅ تم إنشاء البوليصة: ${ttn}`
                    : `✅ TTN Created: ${ttn}`);
            } else {
                const errorMsg = result?.errors?.join(', ') || 'Unknown NP error';
                toast.error(`Nova Poshta: ${errorMsg}`);
            }
        } catch (err: any) {
            console.error('NP create document error:', err);
            toast.error(language === 'ar' ? `فشل إنشاء البوليصة: ${err.message}` : `TTN creation failed: ${err.message}`);
        } finally {
            setNpCreatingTTN(false);
        }
    };

    // ═══ Track NP Document ═══
    const trackNpDocument = async () => {
        if (!npApiKey || !data?.tracking_number) return;
        try {
            const { data: result, error } = await supabase.functions.invoke('nova-poshta', {
                body: {
                    action: 'trackDocument',
                    apiKey: npApiKey,
                    params: {
                        documents: [{ DocumentNumber: data.tracking_number, Phone: '' }],
                    },
                },
            });
            if (!error && result?.success && result?.data?.[0]) {
                setNpTrackingStatus(result.data[0]);
                // Update delivery status in document
                const statusCode = result.data[0].StatusCode;
                const statusDesc = result.data[0].Status;
                onChange?.({
                    np_status_code: statusCode,
                    np_status: statusDesc,
                    np_actual_delivery: result.data[0].ActualDeliveryDate || undefined,
                });
            }
        } catch (err) {
            console.warn('NP tracking failed:', err);
        }
    };

    // ═══ Auto-track when tracking number exists ═══
    useEffect(() => {
        if (npApiKey && data?.tracking_number && data?.shipping_carrier === 'nova_poshta') {
            trackNpDocument();
        }
    }, [npApiKey, data?.tracking_number]);

    // ═══ No customer selected ═══
    if (!customerId) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <MapPin className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">
                    {language === 'ar'
                        ? 'اختر عميلاً أولاً لعرض عناوين التسليم'
                        : 'Select a customer first to view shipping addresses'}
                </p>
            </div>
        );
    }

    // ═══ Loading ═══
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mb-3" />
                <p className="text-sm">{language === 'ar' ? 'جارٍ تحميل العناوين...' : 'Loading addresses...'}</p>
            </div>
        );
    }

    // ═══ Get current delivery method ═══
    const currentMethod = DELIVERY_METHODS.find(m => m.id === selectedDeliveryMethod) || DELIVERY_METHODS[0];

    return (
        <div className="space-y-5 p-3">
            {/* ═══ Section 1: Delivery Method ═══ */}
            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-blue-500" />
                    {language === 'ar' ? 'طريقة التوصيل' : 'Delivery Method'}
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {DELIVERY_METHODS.map((method) => {
                        const Icon = method.icon;
                        const isSelected = selectedDeliveryMethod === method.id;
                        return (
                            <button
                                key={method.id}
                                onClick={() => handleSelectMethod(method.id)}
                                disabled={!isEditable}
                                className={`
                                    relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200
                                    ${isSelected
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm shadow-blue-200/50 dark:shadow-blue-500/10'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                    }
                                    ${!isEditable ? 'cursor-default opacity-70' : 'cursor-pointer'}
                                `}
                            >
                                {isSelected && (
                                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                    </div>
                                )}
                                <Icon className={`w-5 h-5 ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
                                <span className={`text-xs font-medium text-center leading-tight ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'}`}>
                                    {language === 'ar' ? method.label_ar : method.label_en}
                                </span>
                                {method.estimatedDays && (
                                    <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                                        <Clock className="w-2.5 h-2.5" />
                                        {method.estimatedDays} {language === 'ar' ? 'أيام' : 'days'}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ═══ Section 1.2: Direct Pickup Details (when direct_pickup selected) ═══ */}
            {selectedDeliveryMethod === 'direct_pickup' && (
                <div className="space-y-3 bg-amber-50/50 dark:bg-amber-900/10 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
                    <h4 className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5" />
                        {language === 'ar' ? 'بيانات المستلم والسيارة' : 'Pickup Person & Vehicle Details'}
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* اسم المستلم */}
                        <div className="space-y-1">
                            <Label className="text-xs text-gray-600">
                                {language === 'ar' ? 'اسم المستلم' : 'Recipient Name'}
                            </Label>
                            <Input
                                value={data?.pickup_person_name || ''}
                                onChange={e => onChange?.({ pickup_person_name: e.target.value })}
                                placeholder={language === 'ar' ? 'اسم الشخص المستلم...' : 'Person picking up...'}
                                disabled={!isEditable}
                                className="h-9 text-sm"
                            />
                        </div>

                        {/* رقم الهوية */}
                        <div className="space-y-1">
                            <Label className="text-xs text-gray-600">
                                {language === 'ar' ? 'رقم الهوية / الجواز' : 'ID / Passport Number'}
                            </Label>
                            <Input
                                value={data?.pickup_person_id_number || ''}
                                onChange={e => onChange?.({ pickup_person_id_number: e.target.value })}
                                placeholder={language === 'ar' ? 'رقم الهوية...' : 'ID number...'}
                                disabled={!isEditable}
                                className="h-9 text-sm"
                            />
                        </div>

                        {/* رقم السيارة */}
                        <div className="space-y-1">
                            <Label className="text-xs text-gray-600">
                                {language === 'ar' ? 'رقم السيارة' : 'Vehicle Number'}
                            </Label>
                            <Input
                                value={data?.pickup_vehicle_number || ''}
                                onChange={e => onChange?.({ pickup_vehicle_number: e.target.value })}
                                placeholder={language === 'ar' ? 'مثال: AA 1234 BB' : 'e.g. AA 1234 BB'}
                                disabled={!isEditable}
                                className="h-9 text-sm font-mono"
                            />
                        </div>

                        {/* نوع السيارة */}
                        <div className="space-y-1">
                            <Label className="text-xs text-gray-600">
                                {language === 'ar' ? 'نوع السيارة' : 'Vehicle Type'}
                            </Label>
                            <Input
                                value={data?.pickup_vehicle_type || ''}
                                onChange={e => onChange?.({ pickup_vehicle_type: e.target.value })}
                                placeholder={language === 'ar' ? 'مثال: شاحنة صغيرة' : 'e.g. Van, Truck'}
                                disabled={!isEditable}
                                className="h-9 text-sm"
                            />
                        </div>

                        {/* اسم سائق العميل */}
                        <div className="space-y-1">
                            <Label className="text-xs text-gray-600">
                                {language === 'ar' ? 'اسم السائق' : 'Driver Name'}
                            </Label>
                            <Input
                                value={data?.pickup_driver_name || ''}
                                onChange={e => onChange?.({ pickup_driver_name: e.target.value })}
                                placeholder={language === 'ar' ? 'اسم سائق العميل...' : "Customer's driver name..."}
                                disabled={!isEditable}
                                className="h-9 text-sm"
                            />
                        </div>

                        {/* هاتف السائق */}
                        <div className="space-y-1">
                            <Label className="text-xs text-gray-600">
                                {language === 'ar' ? 'هاتف السائق' : 'Driver Phone'}
                            </Label>
                            <Input
                                value={data?.pickup_driver_phone || ''}
                                onChange={e => onChange?.({ pickup_driver_phone: e.target.value })}
                                placeholder={language === 'ar' ? '+380...' : '+380...'}
                                disabled={!isEditable}
                                className="h-9 text-sm font-mono"
                                dir="ltr"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ Section 1.3: Driver Selection (for store_pickup & direct_delivery) ═══ */}
            {(selectedDeliveryMethod === 'store_pickup' || selectedDeliveryMethod === 'direct_delivery') && (
                <div className="space-y-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                    <h4 className="text-xs font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        {language === 'ar' ? 'بيانات السائق' : 'Driver Details'}
                    </h4>

                    <div className="grid grid-cols-1 gap-3">
                        {/* اختيار السائق من القائمة */}
                        <div className="space-y-1">
                            <Label className="text-xs text-gray-600">
                                {language === 'ar' ? 'اختر السائق' : 'Select Driver'}
                            </Label>
                            <Select
                                value={data?.driver_id || ''}
                                onValueChange={(driverId) => {
                                    const driver = driversList.find(d => d.id === driverId);
                                    if (driver) {
                                        onChange?.({
                                            driver_id: driver.id,
                                            driver_name: driver.name_ar,
                                            driver_phone: driver.phone || '',
                                        });
                                    }
                                }}
                                disabled={!isEditable}
                            >
                                <SelectTrigger className="h-9 text-sm">
                                    <SelectValue placeholder={language === 'ar' ? 'اختر سائقاً...' : 'Select a driver...'} />
                                </SelectTrigger>
                                <SelectContent>
                                    {driversList.length === 0 ? (
                                        <div className="py-3 px-4 text-xs text-gray-400 text-center">
                                            {driversLoading
                                                ? (language === 'ar' ? 'جاري التحميل...' : 'Loading...')
                                                : (language === 'ar' ? 'لا يوجد سائقون. أضفهم من إدارة المستخدمين' : 'No drivers. Add from Users & Permissions')}
                                        </div>
                                    ) : driversList.map(drv => (
                                        <SelectItem key={drv.id} value={drv.id}>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{drv.name_ar}</span>
                                                {drv.vehicle_number && (
                                                    <span className="text-[10px] text-gray-400 font-mono">({drv.vehicle_number})</span>
                                                )}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* عرض بيانات السائق المختار */}
                        {data?.driver_name && (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-0.5">
                                    <div className="text-[10px] text-gray-400">{language === 'ar' ? 'الاسم' : 'Name'}</div>
                                    <div className="text-sm font-medium bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border">
                                        {data.driver_name}
                                    </div>
                                </div>
                                <div className="space-y-0.5">
                                    <div className="text-[10px] text-gray-400">{language === 'ar' ? 'الهاتف' : 'Phone'}</div>
                                    <div className="text-sm font-mono bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border" dir="ltr">
                                        {data.driver_phone || '—'}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* الفرع المستلم — فقط لسيناريو الفرع */}
                    {selectedDeliveryMethod === 'store_pickup' && (
                        <div className="space-y-1 mt-2">
                            <Label className="text-xs text-gray-600">
                                {language === 'ar' ? 'الفرع المستلم' : 'Receiving Branch'}
                            </Label>
                            <Input
                                value={data?.receiving_branch_name || ''}
                                onChange={e => onChange?.({ receiving_branch_name: e.target.value })}
                                placeholder={language === 'ar' ? 'اسم الفرع المستلم...' : 'Receiving branch name...'}
                                disabled={!isEditable}
                                className="h-9 text-sm"
                            />
                        </div>
                    )}
                </div>
            )}

            {/* ═══ Section 1.5: Carrier Selection (when carrier method selected) ═══ */}
            {selectedDeliveryMethod === 'carrier' && (
                <div className="space-y-3 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl p-3 border border-indigo-200 dark:border-indigo-800">
                    <h4 className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                        <Navigation className="w-3.5 h-3.5" />
                        {language === 'ar' ? 'شركة الشحن' : 'Shipping Carrier'}
                    </h4>

                    {/* Carrier buttons */}
                    <div className="flex flex-wrap gap-2">
                        {DEFAULT_CARRIERS.map((carrier) => {
                            const isSelected = data?.shipping_carrier === carrier.id;
                            return (
                                <button
                                    key={carrier.id}
                                    onClick={() => isEditable && onChange?.({ shipping_carrier: carrier.id })}
                                    disabled={!isEditable}
                                    className={`
                                        px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                                        ${isSelected
                                            ? 'border-indigo-500 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 shadow-sm'
                                            : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                                        }
                                        ${!isEditable ? 'cursor-default' : 'cursor-pointer'}
                                    `}
                                >
                                    {language === 'ar' ? carrier.name_ar : carrier.name_en}
                                    {carrier.country && carrier.country !== 'INTL' && (
                                        <span className="text-[9px] text-gray-400 ms-1">({carrier.country})</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* ═══ Nova Poshta Integration Panel (always shows when NP selected) ═══ */}
                    {data?.shipping_carrier === 'nova_poshta' ? (
                        <div className="space-y-3 mt-3">
                            {/* NP Connection Status */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <div className={`w-2 h-2 rounded-full ${npConnected ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
                                    <span className={`text-[10px] font-medium ${npConnected ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                        {npConnected
                                            ? (language === 'ar' ? 'متصل بنوفا بوشتا' : 'Connected to Nova Poshta')
                                            : (language === 'ar' ? 'غير مُعد — يرجى إضافة API Key' : 'Not configured — add API Key')
                                        }
                                    </span>
                                </div>
                                {data?.tracking_number && (
                                    <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1" onClick={trackNpDocument}>
                                        <RefreshCw className="w-3 h-3" />
                                        {language === 'ar' ? 'تحديث' : 'Refresh'}
                                    </Button>
                                )}
                            </div>

                            {/* ─── If TTN already exists → Show status ─── */}
                            {data?.tracking_number ? (
                                <div className="space-y-2">
                                    {/* TTN Number Display */}
                                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] text-green-600 dark:text-green-400 font-medium mb-0.5">
                                                    {language === 'ar' ? 'رقم البوليصة (TTN)' : 'Waybill Number (TTN)'}
                                                </p>
                                                <p className="text-lg font-mono font-bold text-green-700 dark:text-green-300" dir="ltr">
                                                    {data.tracking_number}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <a
                                                    href={`https://novaposhta.ua/tracking?cargo_number=${data.tracking_number}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1.5 rounded-lg bg-green-100 dark:bg-green-800/30 hover:bg-green-200 transition-colors"
                                                    title={language === 'ar' ? 'تتبع ↗' : 'Track ↗'}
                                                >
                                                    <ExternalLink className="w-4 h-4 text-green-700 dark:text-green-300" />
                                                </a>
                                                <button
                                                    className="p-1.5 rounded-lg bg-green-100 dark:bg-green-800/30 hover:bg-green-200 transition-colors"
                                                    title={language === 'ar' ? 'طباعة' : 'Print'}
                                                    onClick={() => window.open(`https://my.novaposhta.ua/orders/printDocument/orders[]/${data.np_document_ref}/type/pdf/apiKey/${npApiKey}`, '_blank')}
                                                >
                                                    <Printer className="w-4 h-4 text-green-700 dark:text-green-300" />
                                                </button>
                                            </div>
                                        </div>
                                        {data?.np_estimated_delivery && (
                                            <p className="text-[10px] text-green-600 mt-1 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {language === 'ar' ? 'التسليم المتوقع:' : 'Est. delivery:'} {data.np_estimated_delivery}
                                            </p>
                                        )}
                                    </div>

                                    {/* Tracking Status */}
                                    {npTrackingStatus && (
                                        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Package className="w-4 h-4 text-blue-600" />
                                                <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                                                    {language === 'ar' ? 'حالة الشحنة' : 'Shipment Status'}
                                                </span>
                                                <Badge className={`text-[9px] px-1.5 py-0 ${npTrackingStatus.StatusCode === '9' ? 'bg-green-100 text-green-700' :
                                                    npTrackingStatus.StatusCode === '7' || npTrackingStatus.StatusCode === '8' ? 'bg-amber-100 text-amber-700' :
                                                        'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {npTrackingStatus.StatusCode === '9' ? '✅' : npTrackingStatus.StatusCode === '7' ? '📦' : '🚚'}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                                                {npTrackingStatus.Status}
                                            </p>
                                            {npTrackingStatus.WarehouseRecipient && (
                                                <p className="text-[10px] text-blue-600 mt-1">
                                                    📍 {npTrackingStatus.WarehouseRecipient}
                                                </p>
                                            )}
                                            {npTrackingStatus.ActualDeliveryDate && (
                                                <p className="text-[10px] text-green-600 mt-0.5">
                                                    ✅ {language === 'ar' ? 'تم التسليم:' : 'Delivered:'} {npTrackingStatus.ActualDeliveryDate}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Shipping Cost */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-xs text-indigo-600 dark:text-indigo-400">
                                                {language === 'ar' ? 'تكلفة الشحن' : 'Shipping Cost'}
                                            </Label>
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                {data?.shipping_cost ? `${data.shipping_cost} UAH` : '—'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : isEditable ? (
                                /* ─── Create TTN Form ─── */
                                <div className="space-y-3">
                                    {/* Warning: Not configured */}
                                    {!npConnected && (
                                        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-2.5 flex items-start gap-2">
                                            <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                                            <div>
                                                <p className="text-[11px] font-medium text-amber-700 dark:text-amber-300">
                                                    {language === 'ar'
                                                        ? 'لم يتم إعداد تكامل Nova Poshta بعد'
                                                        : 'Nova Poshta integration not configured yet'}
                                                </p>
                                                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                                                    {language === 'ar'
                                                        ? 'يرجى إضافة API Key في الإعدادات → التكاملات لتفعيل إنشاء البوالص تلقائياً'
                                                        : 'Please add API Key in Settings → Integrations to enable automatic TTN creation'}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Delivery Type */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => setNpDeliveryType('WarehouseWarehouse')}
                                            className={`p-2 rounded-lg border text-xs font-medium text-center transition-all ${npDeliveryType === 'WarehouseWarehouse'
                                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700'
                                                : 'border-gray-200 dark:border-gray-700 text-gray-500'
                                                }`}
                                        >
                                            🏢 → 🏢<br />
                                            <span className="text-[10px]">
                                                {language === 'ar' ? 'فرع → فرع' : 'Warehouse → Warehouse'}
                                            </span>
                                        </button>
                                        <button
                                            onClick={() => setNpDeliveryType('WarehouseDoors')}
                                            className={`p-2 rounded-lg border text-xs font-medium text-center transition-all ${npDeliveryType === 'WarehouseDoors'
                                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700'
                                                : 'border-gray-200 dark:border-gray-700 text-gray-500'
                                                }`}
                                        >
                                            🏢 → 🏠<br />
                                            <span className="text-[10px]">
                                                {language === 'ar' ? 'فرع → عنوان' : 'Warehouse → Door'}
                                            </span>
                                        </button>
                                    </div>

                                    {/* City Search */}
                                    <div className="space-y-1 relative">
                                        <Label className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                                            <Search className="w-3 h-3" />
                                            {language === 'ar' ? 'مدينة المستلم' : 'Recipient City'}
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                value={npCitySearch}
                                                onChange={(e) => handleNpCitySearch(e.target.value)}
                                                placeholder={language === 'ar' ? 'ابحث عن المدينة...' : 'Search city...'}
                                                className="h-8 text-sm"
                                                onFocus={() => npCities.length > 0 && setNpShowCityDropdown(true)}
                                                disabled={!npConnected}
                                            />
                                            {npSearchingCities && (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin absolute end-2 top-2 text-indigo-500" />
                                            )}
                                        </div>
                                        {/* City dropdown */}
                                        {npShowCityDropdown && npCities.length > 0 && (
                                            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-auto">
                                                {npCities.map((city: any, idx: number) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => handleSelectNpCity(city)}
                                                        className="w-full text-start px-3 py-1.5 text-xs hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0"
                                                    >
                                                        <span className="font-medium">{city.Present || city.MainDescription}</span>
                                                        {city.Area && (
                                                            <span className="text-gray-400 ms-1">({city.Area})</span>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Warehouse Selection (for W2W) */}
                                    {npDeliveryType === 'WarehouseWarehouse' && npSelectedCity && (
                                        <div className="space-y-1">
                                            <Label className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                                                <Building2 className="w-3 h-3" />
                                                {language === 'ar' ? 'فرع الاستلام' : 'Recipient Warehouse'}
                                                {npLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                                            </Label>
                                            <Select
                                                value={npSelectedWarehouse?.Ref || ''}
                                                onValueChange={(val) => {
                                                    const wh = npWarehouses.find(w => w.Ref === val);
                                                    setNpSelectedWarehouse(wh);
                                                }}
                                            >
                                                <SelectTrigger className="h-8 text-xs">
                                                    <SelectValue placeholder={language === 'ar' ? 'اختر الفرع...' : 'Select warehouse...'} />
                                                </SelectTrigger>
                                                <SelectContent className="max-h-60">
                                                    {npWarehouses.map((wh: any) => (
                                                        <SelectItem key={wh.Ref} value={wh.Ref} className="text-xs">
                                                            {wh.Description}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    {/* ═══ Recipient Info (auto-filled) ═══ */}
                                    <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-900/10 p-2.5 space-y-2">
                                        <Label className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                                            👤 {language === 'ar' ? 'بيانات المستلم' : 'Recipient Info'}
                                            <span className="text-[9px] font-normal text-blue-400">
                                                ({language === 'ar' ? 'مأخوذة من بيانات العميل' : 'auto-filled from customer'})
                                            </span>
                                        </Label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <Label className="text-[10px] text-gray-500">
                                                    {language === 'ar' ? '📝 اسم المستلم' : '📝 Recipient Name'}
                                                </Label>
                                                <Input
                                                    value={npRecipientName}
                                                    onChange={(e) => setNpRecipientName(e.target.value)}
                                                    placeholder={data?.customer_name || 'Recipient name'}
                                                    className="h-7 text-xs bg-white dark:bg-gray-800"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] text-gray-500">
                                                    {language === 'ar' ? '📱 هاتف المستلم' : '📱 Recipient Phone'}
                                                </Label>
                                                <Input
                                                    value={npRecipientPhone}
                                                    onChange={(e) => setNpRecipientPhone(e.target.value)}
                                                    placeholder="+380XXXXXXXXX"
                                                    className="h-7 text-xs font-mono bg-white dark:bg-gray-800"
                                                    dir="ltr"
                                                />
                                            </div>
                                        </div>
                                        {/* Invoice Summary */}
                                        {(data?.items?.length > 0 || data?.lines?.length > 0 || data?.total_amount) && (
                                            <div className="mt-1.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-md p-2 flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs">🧾</span>
                                                    <p className="text-[10px] text-indigo-700 dark:text-indigo-300 font-medium">
                                                        {data?.document_number
                                                            ? `${language === 'ar' ? 'فاتورة' : 'Invoice'} #${data.document_number}`
                                                            : (language === 'ar' ? 'فاتورة جديدة' : 'New Invoice')}
                                                        {' · '}
                                                        {(data?.items || data?.lines || []).length} {language === 'ar' ? 'صنف' : 'items'}
                                                    </p>
                                                </div>
                                                {data?.total_amount && (
                                                    <p className="text-[11px] font-bold text-indigo-800 dark:text-indigo-200" dir="ltr">
                                                        {Number(data.total_amount).toLocaleString()} {data?.currency || '₴'}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Cargo Details */}
                                    <div className="grid grid-cols-4 gap-2">
                                        <div className="space-y-1">
                                            <Label className="text-[10px] text-gray-500 flex items-center gap-0.5">
                                                📦 {language === 'ar' ? 'نوع البضاعة' : 'Cargo Type'}
                                            </Label>
                                            <Select value={npCargoType} onValueChange={setNpCargoType}>
                                                <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Cargo" className="text-xs">
                                                        {language === 'ar' ? '📦 بضاعة' : '📦 Cargo'}
                                                    </SelectItem>
                                                    <SelectItem value="Documents" className="text-xs">
                                                        {language === 'ar' ? '📄 مستندات' : '📄 Documents'}
                                                    </SelectItem>
                                                    <SelectItem value="TiresWheels" className="text-xs">
                                                        {language === 'ar' ? '🛞 إطارات' : '🛞 Tires/Wheels'}
                                                    </SelectItem>
                                                    <SelectItem value="Pallet" className="text-xs">
                                                        {language === 'ar' ? '🪵 بالت' : '🪵 Pallet'}
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] text-gray-500 flex items-center gap-0.5">
                                                <Hash className="w-2.5 h-2.5" />
                                                {language === 'ar' ? 'عدد الطرود' : 'Seats'}
                                            </Label>
                                            <Input
                                                type="number"
                                                value={npSeatsAmount}
                                                onChange={(e) => setNpSeatsAmount(e.target.value)}
                                                className="h-7 text-xs"
                                                min="1"
                                                dir="ltr"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] text-gray-500 flex items-center gap-0.5">
                                                {language === 'ar' ? 'الوزن (كغ)' : 'Weight (kg)'}
                                            </Label>
                                            <Input
                                                type="number"
                                                value={npWeight}
                                                onChange={(e) => setNpWeight(e.target.value)}
                                                className="h-7 text-xs"
                                                step="0.5"
                                                min="0.1"
                                                dir="ltr"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] text-gray-500 flex items-center gap-0.5">
                                                <DollarSign className="w-2.5 h-2.5" />
                                                {language === 'ar' ? 'الدافع' : 'Payer'}
                                            </Label>
                                            <Select value={npPayerType} onValueChange={setNpPayerType}>
                                                <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Sender" className="text-xs">
                                                        {language === 'ar' ? 'المرسل' : 'Sender'}
                                                    </SelectItem>
                                                    <SelectItem value="Recipient" className="text-xs">
                                                        {language === 'ar' ? 'المستلم' : 'Recipient'}
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {/* Declared Cost + Payment Method */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <Label className="text-[10px] text-gray-500 flex items-center gap-0.5">
                                                💎 {language === 'ar' ? 'القيمة المُصرح بها (₴)' : 'Declared Value (₴)'}
                                            </Label>
                                            <Input
                                                type="number"
                                                value={npDeclaredCost}
                                                onChange={(e) => setNpDeclaredCost(e.target.value)}
                                                placeholder={data?.total_amount?.toString() || '100'}
                                                className="h-7 text-xs font-mono"
                                                min="1"
                                                dir="ltr"
                                            />
                                            <p className="text-[9px] text-gray-400">
                                                {language === 'ar'
                                                    ? 'قيمة التأمين — تُعوض في حالة الفقدان أو التلف'
                                                    : 'Insurance value — compensated if lost or damaged'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Payment Method */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <Label className="text-[10px] text-gray-500 flex items-center gap-0.5">
                                                <DollarSign className="w-2.5 h-2.5" />
                                                {language === 'ar' ? 'طريقة دفع الشحن' : 'Shipping Payment'}
                                            </Label>
                                            <Select value={npPaymentMethod} onValueChange={setNpPaymentMethod}>
                                                <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Cash" className="text-xs">
                                                        {language === 'ar' ? '💵 نقداً' : '💵 Cash'}
                                                    </SelectItem>
                                                    <SelectItem value="NonCash" className="text-xs">
                                                        {language === 'ar' ? '🏦 تحويل بنكي' : '🏦 Bank Transfer'}
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] text-gray-500">
                                                {language === 'ar' ? 'وصف البضاعة' : 'Cargo Description'}
                                            </Label>
                                            <Input
                                                value={npDescription}
                                                onChange={(e) => setNpDescription(e.target.value)}
                                                className="h-7 text-xs"
                                                placeholder="Тканини / Fabrics"
                                            />
                                        </div>
                                    </div>

                                    {/* ═══ COD: Cash on Delivery / الدفع عند الاستلام ═══ */}
                                    <div className={`rounded-lg border-2 transition-all ${npCodEnabled
                                        ? 'border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-900/10'
                                        : 'border-gray-200 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-800/20'
                                        } p-2.5 space-y-2`}>
                                        {/* Toggle + Title */}
                                        <div className="flex items-center justify-between">
                                            <Label className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                                                💰 {language === 'ar' ? 'الدفع عند الاستلام (COD)' : 'Cash on Delivery (COD)'}
                                            </Label>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setNpCodEnabled(!npCodEnabled);
                                                    if (!npCodEnabled && !npCodAmount && data?.total_amount) {
                                                        setNpCodAmount(data.total_amount.toString());
                                                    }
                                                }}
                                                className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${npCodEnabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                                                    }`}
                                            >
                                                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${npCodEnabled ? 'translate-x-4' : 'translate-x-0.5'
                                                    }`} />
                                            </button>
                                        </div>
                                        <p className="text-[9px] text-gray-400 -mt-1">
                                            {language === 'ar'
                                                ? 'نوفا بوشتا تجمع المبلغ من المستلم وتحوّله لحسابك البنكي'
                                                : 'Nova Poshta collects payment from recipient and transfers to your bank'}
                                        </p>

                                        {npCodEnabled && (
                                            <div className="space-y-2 pt-1">
                                                {/* COD Amount */}
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="space-y-1">
                                                        <Label className="text-[10px] text-gray-500">
                                                            {language === 'ar' ? '💵 المبلغ المطلوب تحصيله (₴)' : '💵 Amount to collect (₴)'}
                                                        </Label>
                                                        <Input
                                                            type="number"
                                                            value={npCodAmount}
                                                            onChange={(e) => setNpCodAmount(e.target.value)}
                                                            placeholder={data?.total_amount?.toString() || '0.00'}
                                                            className="h-7 text-xs font-semibold text-green-700 dark:text-green-400 bg-white dark:bg-gray-800"
                                                            min="1"
                                                            dir="ltr"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-[10px] text-gray-500">
                                                            {language === 'ar' ? '🤝 من يدفع عمولة التحويل' : '🤝 Transfer fee payer'}
                                                        </Label>
                                                        <Select value={npCodRedeliveryPayer} onValueChange={setNpCodRedeliveryPayer}>
                                                            <SelectTrigger className="h-7 text-[10px] bg-white dark:bg-gray-800">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="Recipient" className="text-xs">
                                                                    {language === 'ar' ? 'المستلم' : 'Recipient'}
                                                                </SelectItem>
                                                                <SelectItem value="Sender" className="text-xs">
                                                                    {language === 'ar' ? 'المرسل' : 'Sender'}
                                                                </SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>

                                                {/* Money Transfer Type */}
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] text-gray-500">
                                                        {language === 'ar' ? '🏦 طريقة استلام الأموال' : '🏦 How to receive money'}
                                                    </Label>
                                                    <Select value={npMoneyTransferType} onValueChange={setNpMoneyTransferType}>
                                                        <SelectTrigger className="h-7 text-[10px] bg-white dark:bg-gray-800">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="MoneyTransfer" className="text-xs">
                                                                {language === 'ar' ? '🏦 تحويل على الحساب البنكي' : '🏦 Bank account transfer'}
                                                            </SelectItem>
                                                            <SelectItem value="Money" className="text-xs">
                                                                {language === 'ar' ? '💵 نقداً (على عنوان المرسل)' : '💵 Cash (to sender address)'}
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <p className="text-[9px] text-gray-400">
                                                        {language === 'ar'
                                                            ? '☝️ التحويل البنكي أسرع وأكثر أماناً — يصل خلال 1-3 أيام عمل'
                                                            : '☝️ Bank transfer is faster & safer — arrives within 1-3 business days'}
                                                    </p>
                                                </div>

                                                {/* COD Summary */}
                                                {npCodAmount && parseFloat(npCodAmount) > 0 && (
                                                    <div className="bg-green-100 dark:bg-green-900/30 rounded-md p-2 flex items-center gap-2">
                                                        <span className="text-sm">✅</span>
                                                        <p className="text-[10px] text-green-700 dark:text-green-400 font-medium">
                                                            {language === 'ar'
                                                                ? `سيتم تحصيل ${npCodAmount} ₴ من المستلم — ${npCodRedeliveryPayer === 'Recipient' ? 'المستلم' : 'المرسل'} يدفع عمولة التحويل`
                                                                : `Will collect ${npCodAmount} ₴ from recipient — ${npCodRedeliveryPayer} pays transfer fee`}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Manual TTN + Cost (always available) */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <Label className="text-[10px] text-gray-500">
                                                {language === 'ar' ? 'رقم التتبع (يدوي)' : 'Tracking # (manual)'}
                                            </Label>
                                            <Input
                                                value={data?.tracking_number || ''}
                                                onChange={(e) => onChange?.({ tracking_number: e.target.value })}
                                                placeholder="20450073456789"
                                                className="h-7 text-xs font-mono"
                                                dir="ltr"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] text-gray-500">
                                                {language === 'ar' ? 'تكلفة الشحن' : 'Shipping Cost'}
                                            </Label>
                                            <Input
                                                type="number"
                                                value={data?.shipping_cost || ''}
                                                onChange={(e) => onChange?.({ shipping_cost: parseFloat(e.target.value) || 0 })}
                                                placeholder="0.00"
                                                className="h-7 text-xs"
                                                dir="ltr"
                                            />
                                        </div>
                                    </div>

                                    {/* Create TTN Button */}
                                    <Button
                                        onClick={createNpDocument}
                                        disabled={npCreatingTTN || !npSelectedCity || !npConnected}
                                        className="w-full h-9 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xs font-semibold gap-2 rounded-lg shadow-sm disabled:opacity-50"
                                    >
                                        {npCreatingTTN ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                {language === 'ar' ? 'جارٍ إنشاء البوليصة...' : 'Creating TTN...'}
                                            </>
                                        ) : !npConnected ? (
                                            <>
                                                <AlertCircle className="w-4 h-4" />
                                                {language === 'ar' ? '⚙️ أعدّ التكامل أولاً' : '⚙️ Configure Integration First'}
                                            </>
                                        ) : (
                                            <>
                                                <FileCheck className="w-4 h-4" />
                                                {language === 'ar' ? '📋 إنشاء بوليصة Nova Poshta' : '📋 Create Nova Poshta TTN'}
                                            </>
                                        )}
                                    </Button>
                                </div>
                            ) : null}
                        </div>
                    ) : (
                        /* ═══ Fallback: Simple tracking for non-NP carriers or no API key ═══ */
                        <>
                            {/* Tracking number */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs text-indigo-600 dark:text-indigo-400">
                                        {language === 'ar' ? 'رقم التتبع (TTN)' : 'Tracking Number (TTN)'}
                                    </Label>
                                    {isEditable ? (
                                        <Input
                                            value={data?.tracking_number || ''}
                                            onChange={(e) => onChange?.({ tracking_number: e.target.value })}
                                            placeholder="e.g. 20450073456789"
                                            className="h-8 text-sm font-mono"
                                            dir="ltr"
                                        />
                                    ) : (
                                        <p className="text-sm font-mono text-gray-700 dark:text-gray-300">
                                            {data?.tracking_number || '—'}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-indigo-600 dark:text-indigo-400">
                                        {language === 'ar' ? 'تكلفة الشحن' : 'Shipping Cost'}
                                    </Label>
                                    {isEditable ? (
                                        <Input
                                            type="number"
                                            value={data?.shipping_cost || ''}
                                            onChange={(e) => onChange?.({ shipping_cost: parseFloat(e.target.value) || 0 })}
                                            placeholder="0.00"
                                            className="h-8 text-sm"
                                            dir="ltr"
                                        />
                                    ) : (
                                        <p className="text-sm text-gray-700 dark:text-gray-300">
                                            {data?.shipping_cost ? `${data.shipping_cost} ${data?.currency || 'UAH'}` : '—'}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Track link */}
                            {data?.tracking_number && data?.shipping_carrier && (
                                (() => {
                                    const carrier = DEFAULT_CARRIERS.find(c => c.id === data.shipping_carrier);
                                    if (!carrier?.tracking_url) return null;
                                    const url = carrier.tracking_url.replace('{tracking}', data.tracking_number);
                                    return (
                                        <a
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 hover:underline"
                                        >
                                            <Package className="w-3 h-3" />
                                            {language === 'ar' ? 'تتبع الشحنة ↗' : 'Track Shipment ↗'}
                                        </a>
                                    );
                                })()
                            )}
                        </>
                    )
                    }
                </div >
            )}

            <Separator />

            {/* ═══ Section 2: Customer Addresses ═══ */}
            {
                selectedDeliveryMethod !== 'store_pickup' && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-emerald-500" />
                                {language === 'ar' ? 'عنوان التسليم' : 'Delivery Address'}
                                <Badge variant="outline" className="text-[10px]">
                                    {addresses.length}
                                </Badge>
                            </h3>

                            {isEditable && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        setEditingAddress({ ...EMPTY_ADDRESS });
                                        setAddressDialogOpen(true);
                                    }}
                                    className="h-7 text-xs gap-1"
                                >
                                    <Plus className="w-3 h-3" />
                                    {language === 'ar' ? 'عنوان جديد' : 'New Address'}
                                </Button>
                            )}
                        </div>

                        {addresses.length === 0 ? (
                            <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-6 text-center">
                                <MapPin className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                                <p className="text-sm text-gray-500">
                                    {language === 'ar'
                                        ? 'لا توجد عناوين مسجلة لهذا العميل'
                                        : 'No addresses registered for this customer'}
                                </p>
                                {isEditable && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="mt-2 text-blue-600"
                                        onClick={() => {
                                            setEditingAddress({ ...EMPTY_ADDRESS });
                                            setAddressDialogOpen(true);
                                        }}
                                    >
                                        <Plus className="w-3.5 h-3.5 mr-1" />
                                        {language === 'ar' ? 'إضافة عنوان' : 'Add Address'}
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="grid gap-2">
                                {addresses.map((addr) => {
                                    const isSelected = addr.id === selectedAddressId;
                                    return (
                                        <div
                                            key={addr.id}
                                            onClick={() => handleSelectAddress(addr)}
                                            className={`
                                            relative group rounded-xl border-2 p-3 transition-all duration-200
                                            ${isSelected
                                                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10 shadow-sm'
                                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                                }
                                            ${isEditable ? 'cursor-pointer' : ''}
                                        `}
                                        >
                                            {/* Selection indicator */}
                                            {isSelected && (
                                                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center z-10">
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                                </div>
                                            )}

                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    {/* Label + Badge */}
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                        <MapPin className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-emerald-600' : 'text-gray-400'}`} />
                                                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                                                            {addr.label || (language === 'ar' ? 'عنوان بدون تسمية' : 'Untitled Address')}
                                                        </span>
                                                        {addr.is_default && (
                                                            <Badge className="text-[9px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 px-1.5 py-0">
                                                                {language === 'ar' ? 'افتراضي' : 'Default'}
                                                            </Badge>
                                                        )}
                                                        <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                                                            {addr.address_type === 'shipping'
                                                                ? (language === 'ar' ? 'شحن' : 'Shipping')
                                                                : addr.address_type === 'billing'
                                                                    ? (language === 'ar' ? 'فوترة' : 'Billing')
                                                                    : (language === 'ar' ? 'شحن+فوترة' : 'Both')}
                                                        </Badge>
                                                    </div>

                                                    {/* Address text */}
                                                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed ps-5">
                                                        {formatAddressText(addr)}
                                                    </p>

                                                    {/* Recipient + Phone */}
                                                    {(addr.recipient_name || addr.phone) && (
                                                        <div className="flex items-center gap-3 mt-1.5 ps-5">
                                                            {addr.recipient_name && (
                                                                <span className="flex items-center gap-1 text-[11px] text-gray-500">
                                                                    <User className="w-3 h-3" />
                                                                    {addr.recipient_name}
                                                                </span>
                                                            )}
                                                            {addr.phone && (
                                                                <span className="flex items-center gap-1 text-[11px] text-gray-500" dir="ltr">
                                                                    <Phone className="w-3 h-3" />
                                                                    {addr.phone}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Action buttons - only in edit mode */}
                                                {isEditable && (
                                                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleToggleDefault(addr.id);
                                                            }}
                                                            className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 text-gray-400 hover:text-amber-600"
                                                            title={language === 'ar' ? 'تعيين كافتراضي' : 'Set as default'}
                                                        >
                                                            {addr.is_default
                                                                ? <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                                                : <StarOff className="w-3.5 h-3.5" />
                                                            }
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingAddress(addr);
                                                                setAddressDialogOpen(true);
                                                            }}
                                                            className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-gray-400 hover:text-blue-600"
                                                            title={language === 'ar' ? 'تعديل' : 'Edit'}
                                                        >
                                                            <Edit3 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteAddress(addr.id);
                                                            }}
                                                            className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600"
                                                            title={language === 'ar' ? 'حذف' : 'Delete'}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )
            }

            {/* ═══ Section 3: Delivery Notes ═══ */}
            <Collapsible open={deliveryNotesOpen} onOpenChange={setDeliveryNotesOpen}>
                <CollapsibleTrigger asChild>
                    <button className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors w-full">
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${deliveryNotesOpen ? 'rotate-180' : ''}`} />
                        {language === 'ar' ? 'ملاحظات التوصيل' : 'Delivery Notes'}
                    </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                    {isEditable ? (
                        <Textarea
                            value={data?.delivery_notes || ''}
                            onChange={(e) => onChange?.({ delivery_notes: e.target.value })}
                            placeholder={language === 'ar'
                                ? 'مثال: التسليم بين 9 صباحاً و 5 مساءً، الاتصال قبل الوصول...'
                                : 'e.g. Deliver between 9AM-5PM, call before arrival...'}
                            rows={3}
                            className="text-sm"
                        />
                    ) : (
                        data?.delivery_notes && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                                {data.delivery_notes}
                            </p>
                        )
                    )}
                </CollapsibleContent>
            </Collapsible>

            {/* ═══ Selected Summary (View Mode) ═══ */}
            {
                !isEditable && selectedAddress && (
                    <>
                        <Separator />
                        <div className="bg-emerald-50/50 dark:bg-emerald-900/10 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                                    {language === 'ar' ? 'عنوان التسليم المختار' : 'Selected Delivery Address'}
                                </span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 ps-6">
                                {formatAddressText(selectedAddress)}
                            </p>
                            <div className="flex items-center gap-4 mt-2 ps-6">
                                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                                    <Truck className="w-3 h-3" />
                                    {language === 'ar' ? currentMethod.label_ar : currentMethod.label_en}
                                </span>
                                {selectedAddress.recipient_name && (
                                    <span className="flex items-center gap-1.5 text-xs text-gray-500">
                                        <User className="w-3 h-3" />
                                        {selectedAddress.recipient_name}
                                    </span>
                                )}
                                {selectedAddress.phone && (
                                    <span className="flex items-center gap-1.5 text-xs text-gray-500" dir="ltr">
                                        <Phone className="w-3 h-3" />
                                        {selectedAddress.phone}
                                    </span>
                                )}
                            </div>
                        </div>
                    </>
                )
            }

            {/* ═══ Address Dialog ═══ */}
            <Dialog open={addressDialogOpen} onOpenChange={setAddressDialogOpen}>
                <DialogContent className="max-w-lg" dir={isRTL ? 'rtl' : 'ltr'}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-blue-500" />
                            {editingAddress?.id
                                ? (language === 'ar' ? 'تعديل العنوان' : 'Edit Address')
                                : (language === 'ar' ? 'عنوان جديد' : 'New Address')
                            }
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Label + Type */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs">{language === 'ar' ? 'التسمية' : 'Label'}</Label>
                                <Input
                                    value={editingAddress?.label || ''}
                                    onChange={(e) => setEditingAddress(prev => prev ? { ...prev, label: e.target.value } : null)}
                                    placeholder={language === 'ar' ? 'مثال: المكتب الرئيسي' : 'e.g. Main Office'}
                                    className="h-9"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">{language === 'ar' ? 'النوع' : 'Type'}</Label>
                                <Select
                                    value={editingAddress?.address_type || 'shipping'}
                                    onValueChange={(v) => setEditingAddress(prev => prev ? { ...prev, address_type: v as any } : null)}
                                >
                                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="shipping">{language === 'ar' ? 'شحن' : 'Shipping'}</SelectItem>
                                        <SelectItem value="billing">{language === 'ar' ? 'فوترة' : 'Billing'}</SelectItem>
                                        <SelectItem value="both">{language === 'ar' ? 'شحن + فوترة' : 'Both'}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Recipient + Phone */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs">{language === 'ar' ? 'اسم المستلم' : 'Recipient Name'}</Label>
                                <Input
                                    value={editingAddress?.recipient_name || ''}
                                    onChange={(e) => setEditingAddress(prev => prev ? { ...prev, recipient_name: e.target.value } : null)}
                                    className="h-9"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">{language === 'ar' ? 'الهاتف' : 'Phone'}</Label>
                                <Input
                                    value={editingAddress?.phone || ''}
                                    onChange={(e) => setEditingAddress(prev => prev ? { ...prev, phone: e.target.value } : null)}
                                    className="h-9"
                                    dir="ltr"
                                />
                            </div>
                        </div>

                        <Separator />

                        {/* Country + City */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs">{language === 'ar' ? 'الدولة' : 'Country'}</Label>
                                <Input
                                    value={editingAddress?.country || ''}
                                    onChange={(e) => setEditingAddress(prev => prev ? { ...prev, country: e.target.value } : null)}
                                    className="h-9"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">{language === 'ar' ? 'المدينة' : 'City'}</Label>
                                <Input
                                    value={editingAddress?.city || ''}
                                    onChange={(e) => setEditingAddress(prev => prev ? { ...prev, city: e.target.value } : null)}
                                    className="h-9"
                                />
                            </div>
                        </div>

                        {/* District + Street */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs">{language === 'ar' ? 'الحي' : 'District'}</Label>
                                <Input
                                    value={editingAddress?.district || ''}
                                    onChange={(e) => setEditingAddress(prev => prev ? { ...prev, district: e.target.value } : null)}
                                    className="h-9"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">{language === 'ar' ? 'الشارع' : 'Street'}</Label>
                                <Input
                                    value={editingAddress?.street || ''}
                                    onChange={(e) => setEditingAddress(prev => prev ? { ...prev, street: e.target.value } : null)}
                                    className="h-9"
                                />
                            </div>
                        </div>

                        {/* Building + Floor + Apt + Postal */}
                        <div className="grid grid-cols-4 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs">{language === 'ar' ? 'المبنى' : 'Building'}</Label>
                                <Input
                                    value={editingAddress?.building || ''}
                                    onChange={(e) => setEditingAddress(prev => prev ? { ...prev, building: e.target.value } : null)}
                                    className="h-9"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">{language === 'ar' ? 'الطابق' : 'Floor'}</Label>
                                <Input
                                    value={editingAddress?.floor || ''}
                                    onChange={(e) => setEditingAddress(prev => prev ? { ...prev, floor: e.target.value } : null)}
                                    className="h-9"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">{language === 'ar' ? 'الشقة' : 'Apt'}</Label>
                                <Input
                                    value={editingAddress?.apartment || ''}
                                    onChange={(e) => setEditingAddress(prev => prev ? { ...prev, apartment: e.target.value } : null)}
                                    className="h-9"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">{language === 'ar' ? 'الرمز' : 'Postal'}</Label>
                                <Input
                                    value={editingAddress?.postal_code || ''}
                                    onChange={(e) => setEditingAddress(prev => prev ? { ...prev, postal_code: e.target.value } : null)}
                                    className="h-9"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddressDialogOpen(false)}>
                            {language === 'ar' ? 'إلغاء' : 'Cancel'}
                        </Button>
                        <Button onClick={handleSaveAddress} disabled={savingAddress}>
                            {savingAddress
                                ? (language === 'ar' ? 'جارٍ الحفظ...' : 'Saving...')
                                : (language === 'ar' ? 'حفظ' : 'Save')
                            }
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
}
