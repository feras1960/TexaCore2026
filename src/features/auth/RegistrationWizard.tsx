/**
 * Registration Wizard - معالج التسجيل المتقدم
 * يظهر بعد التسجيل الأساسي لإكمال إعداد الحساب
 * 
 * Features:
 * - Step 1: اختيار نوع العمل + اسم الشركة
 * - Step 2: معلومات الشركة (دولة، مدينة، عنوان، موقع)
 * - Step 3: الإعدادات المالية (عملات، سنة مالية)
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  Building2,
  Shirt,
  DollarSign,
  Heart,
  ShoppingCart,
  ChevronRight,
  ChevronLeft,
  Check,
  Info,
  Loader2,
  Store,
  MapPin,
  Phone,
  Mail,
  Globe,
  Calendar,
  Coins,
  Warehouse,
  GitBranch,
  Wallet,
  SkipForward
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================
// TYPES
// ============================================

interface BusinessTypeOption {
  id: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
}

interface CompanyFormData {
  companyName: string;
  businessType: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  localCurrency: string; // العملة المحلية
  mainCurrency: string; // العملة الرئيسية
  fiscalYearStart: number;
  selectedPlan: string; // 🆕 الباقة المختارة
  billingCycle: 'monthly' | 'yearly'; // 🆕 دورة الفوترة
  chartTemplate: string; // 🆕 قالب شجرة الحسابات
}

interface Country {
  code: string;
  name: string;
  nameAr: string;
  currency: string;
  region: string; // 'arab', 'russian', 'european', 'asian', etc.
}

// ============================================
// COUNTRIES DATA
// ============================================

const countries: Country[] = [
  // الدول العربية
  { code: 'SA', name: 'Saudi Arabia', nameAr: 'السعودية', currency: 'SAR', region: 'arab' },
  { code: 'AE', name: 'United Arab Emirates', nameAr: 'الإمارات', currency: 'AED', region: 'arab' },
  { code: 'KW', name: 'Kuwait', nameAr: 'الكويت', currency: 'KWD', region: 'arab' },
  { code: 'QA', name: 'Qatar', nameAr: 'قطر', currency: 'QAR', region: 'arab' },
  { code: 'BH', name: 'Bahrain', nameAr: 'البحرين', currency: 'BHD', region: 'arab' },
  { code: 'OM', name: 'Oman', nameAr: 'عمان', currency: 'OMR', region: 'arab' },
  { code: 'EG', name: 'Egypt', nameAr: 'مصر', currency: 'EGP', region: 'arab' },
  { code: 'JO', name: 'Jordan', nameAr: 'الأردن', currency: 'JOD', region: 'arab' },
  { code: 'LB', name: 'Lebanon', nameAr: 'لبنان', currency: 'LBP', region: 'arab' },
  { code: 'SY', name: 'Syria', nameAr: 'سوريا', currency: 'SYP', region: 'arab' },
  { code: 'IQ', name: 'Iraq', nameAr: 'العراق', currency: 'IQD', region: 'arab' },
  { code: 'YE', name: 'Yemen', nameAr: 'اليمن', currency: 'YER', region: 'arab' },
  { code: 'MA', name: 'Morocco', nameAr: 'المغرب', currency: 'MAD', region: 'arab' },
  { code: 'DZ', name: 'Algeria', nameAr: 'الجزائر', currency: 'DZD', region: 'arab' },
  { code: 'TN', name: 'Tunisia', nameAr: 'تونس', currency: 'TND', region: 'arab' },
  { code: 'LY', name: 'Libya', nameAr: 'ليبيا', currency: 'LYD', region: 'arab' },
  { code: 'SD', name: 'Sudan', nameAr: 'السودان', currency: 'SDG', region: 'arab' },
  { code: 'SO', name: 'Somalia', nameAr: 'الصومال', currency: 'SOS', region: 'arab' },
  { code: 'DJ', name: 'Djibouti', nameAr: 'جيبوتي', currency: 'DJF', region: 'arab' },
  { code: 'KM', name: 'Comoros', nameAr: 'جزر القمر', currency: 'KMF', region: 'arab' },
  { code: 'MR', name: 'Mauritania', nameAr: 'موريتانيا', currency: 'MRU', region: 'arab' },
  { code: 'PS', name: 'Palestine', nameAr: 'فلسطين', currency: 'ILS', region: 'arab' },

  // دول ناطقة بالروسية
  { code: 'RU', name: 'Russia', nameAr: 'روسيا', currency: 'RUB', region: 'russian' },
  { code: 'UA', name: 'Ukraine', nameAr: 'أوكرانيا', currency: 'UAH', region: 'russian' },
  { code: 'BY', name: 'Belarus', nameAr: 'بيلاروسيا', currency: 'BYN', region: 'russian' },
  { code: 'KZ', name: 'Kazakhstan', nameAr: 'كازاخستان', currency: 'KZT', region: 'russian' },
  { code: 'UZ', name: 'Uzbekistan', nameAr: 'أوزبكستان', currency: 'UZS', region: 'russian' },
  { code: 'AZ', name: 'Azerbaijan', nameAr: 'أذربيجان', currency: 'AZN', region: 'russian' },
  { code: 'GE', name: 'Georgia', nameAr: 'جورجيا', currency: 'GEL', region: 'russian' },
  { code: 'AM', name: 'Armenia', nameAr: 'أرمينيا', currency: 'AMD', region: 'russian' },

  // دول ناطقة بالتركية
  { code: 'TR', name: 'Turkey', nameAr: 'تركيا', currency: 'TRY', region: 'turkish' },

  // دول أوروبية
  { code: 'DE', name: 'Germany', nameAr: 'ألمانيا', currency: 'EUR', region: 'european' },
  { code: 'IT', name: 'Italy', nameAr: 'إيطاليا', currency: 'EUR', region: 'european' },
  { code: 'FR', name: 'France', nameAr: 'فرنسا', currency: 'EUR', region: 'european' },
  { code: 'ES', name: 'Spain', nameAr: 'إسبانيا', currency: 'EUR', region: 'european' },
  { code: 'GB', name: 'United Kingdom', nameAr: 'المملكة المتحدة', currency: 'GBP', region: 'european' },
  { code: 'NL', name: 'Netherlands', nameAr: 'هولندا', currency: 'EUR', region: 'european' },
  { code: 'BE', name: 'Belgium', nameAr: 'بلجيكا', currency: 'EUR', region: 'european' },
  { code: 'CH', name: 'Switzerland', nameAr: 'سويسرا', currency: 'CHF', region: 'european' },
  { code: 'AT', name: 'Austria', nameAr: 'النمسا', currency: 'EUR', region: 'european' },
  { code: 'SE', name: 'Sweden', nameAr: 'السويد', currency: 'SEK', region: 'european' },
  { code: 'NO', name: 'Norway', nameAr: 'النرويج', currency: 'NOK', region: 'european' },
  { code: 'DK', name: 'Denmark', nameAr: 'الدنمارك', currency: 'DKK', region: 'european' },
  { code: 'FI', name: 'Finland', nameAr: 'فنلندا', currency: 'EUR', region: 'european' },
  { code: 'PL', name: 'Poland', nameAr: 'بولندا', currency: 'PLN', region: 'european' },
  { code: 'RO', name: 'Romania', nameAr: 'رومانيا', currency: 'RON', region: 'european' },
  { code: 'PT', name: 'Portugal', nameAr: 'البرتغال', currency: 'EUR', region: 'european' },
  { code: 'GR', name: 'Greece', nameAr: 'اليونان', currency: 'EUR', region: 'european' },
  { code: 'CZ', name: 'Czech Republic', nameAr: 'التشيك', currency: 'CZK', region: 'european' },
  { code: 'HU', name: 'Hungary', nameAr: 'المجر', currency: 'HUF', region: 'european' },

  // أخرى
  { code: 'US', name: 'United States', nameAr: 'الولايات المتحدة', currency: 'USD', region: 'other' },
  { code: 'CA', name: 'Canada', nameAr: 'كندا', currency: 'CAD', region: 'other' },
  { code: 'CN', name: 'China', nameAr: 'الصين', currency: 'CNY', region: 'other' },
  { code: 'JP', name: 'Japan', nameAr: 'اليابان', currency: 'JPY', region: 'other' },
  { code: 'IN', name: 'India', nameAr: 'الهند', currency: 'INR', region: 'asian' },
  { code: 'BR', name: 'Brazil', nameAr: 'البرازيل', currency: 'BRL', region: 'american' },
  { code: 'AU', name: 'Australia', nameAr: 'أستراليا', currency: 'AUD', region: 'other' },
  { code: 'NZ', name: 'New Zealand', nameAr: 'نيوزيلندا', currency: 'NZD', region: 'other' },
  { code: 'ZA', name: 'South Africa', nameAr: 'جنوب أفريقيا', currency: 'ZAR', region: 'african' },

  // المزيد من الدول الآسيوية
  { code: 'PK', name: 'Pakistan', nameAr: 'باكستان', currency: 'PKR', region: 'asian' },
  { code: 'BD', name: 'Bangladesh', nameAr: 'بنغلاديش', currency: 'BDT', region: 'asian' },
  { code: 'ID', name: 'Indonesia', nameAr: 'إندونيسيا', currency: 'IDR', region: 'asian' },
  { code: 'MY', name: 'Malaysia', nameAr: 'ماليزيا', currency: 'MYR', region: 'asian' },
  { code: 'TH', name: 'Thailand', nameAr: 'تايلاند', currency: 'THB', region: 'asian' },
  { code: 'VN', name: 'Vietnam', nameAr: 'فيتنام', currency: 'VND', region: 'asian' },
  { code: 'PH', name: 'Philippines', nameAr: 'الفلبين', currency: 'PHP', region: 'asian' },
  { code: 'SG', name: 'Singapore', nameAr: 'سنغافورة', currency: 'SGD', region: 'asian' },
  { code: 'HK', name: 'Hong Kong', nameAr: 'هونغ كونغ', currency: 'HKD', region: 'asian' },
  { code: 'TW', name: 'Taiwan', nameAr: 'تايوان', currency: 'TWD', region: 'asian' },
  { code: 'KR', name: 'South Korea', nameAr: 'كوريا الجنوبية', currency: 'KRW', region: 'asian' },
  { code: 'LK', name: 'Sri Lanka', nameAr: 'سريلانكا', currency: 'LKR', region: 'asian' },
  { code: 'NP', name: 'Nepal', nameAr: 'نيبال', currency: 'NPR', region: 'asian' },
  { code: 'MM', name: 'Myanmar', nameAr: 'ميانمار', currency: 'MMK', region: 'asian' },
  { code: 'KH', name: 'Cambodia', nameAr: 'كمبوديا', currency: 'KHR', region: 'asian' },
  { code: 'AF', name: 'Afghanistan', nameAr: 'أفغانستان', currency: 'AFN', region: 'asian' },
  { code: 'MV', name: 'Maldives', nameAr: 'المالديف', currency: 'MVR', region: 'asian' },
  { code: 'BN', name: 'Brunei', nameAr: 'بروناي', currency: 'BND', region: 'asian' },
  { code: 'LA', name: 'Laos', nameAr: 'لاوس', currency: 'LAK', region: 'asian' },
  { code: 'MN', name: 'Mongolia', nameAr: 'منغوليا', currency: 'MNT', region: 'asian' },

  // دول أفريقية إضافية
  { code: 'NG', name: 'Nigeria', nameAr: 'نيجيريا', currency: 'NGN', region: 'african' },
  { code: 'KE', name: 'Kenya', nameAr: 'كينيا', currency: 'KES', region: 'african' },
  { code: 'TZ', name: 'Tanzania', nameAr: 'تنزانيا', currency: 'TZS', region: 'african' },
  { code: 'UG', name: 'Uganda', nameAr: 'أوغندا', currency: 'UGX', region: 'african' },
  { code: 'GH', name: 'Ghana', nameAr: 'غانا', currency: 'GHS', region: 'african' },
  { code: 'SN', name: 'Senegal', nameAr: 'السنغال', currency: 'XOF', region: 'african' },
  { code: 'CI', name: 'Ivory Coast', nameAr: 'ساحل العاج', currency: 'XOF', region: 'african' },
  { code: 'CM', name: 'Cameroon', nameAr: 'الكاميرون', currency: 'XAF', region: 'african' },
  { code: 'ET', name: 'Ethiopia', nameAr: 'إثيوبيا', currency: 'ETB', region: 'african' },
  { code: 'RW', name: 'Rwanda', nameAr: 'رواندا', currency: 'RWF', region: 'african' },
  { code: 'ZW', name: 'Zimbabwe', nameAr: 'زيمبابوي', currency: 'ZWL', region: 'african' },
  { code: 'ZM', name: 'Zambia', nameAr: 'زامبيا', currency: 'ZMW', region: 'african' },
  { code: 'BW', name: 'Botswana', nameAr: 'بوتسوانا', currency: 'BWP', region: 'african' },
  { code: 'NA', name: 'Namibia', nameAr: 'ناميبيا', currency: 'NAD', region: 'african' },
  { code: 'MU', name: 'Mauritius', nameAr: 'موريشيوس', currency: 'MUR', region: 'african' },
  { code: 'MG', name: 'Madagascar', nameAr: 'مدغشقر', currency: 'MGA', region: 'african' },
  { code: 'SC', name: 'Seychelles', nameAr: 'سيشل', currency: 'SCR', region: 'african' },
  { code: 'AO', name: 'Angola', nameAr: 'أنغولا', currency: 'AOA', region: 'african' },
  { code: 'MZ', name: 'Mozambique', nameAr: 'موزمبيق', currency: 'MZN', region: 'african' },
  { code: 'CD', name: 'DR Congo', nameAr: 'الكونغو الديمقراطية', currency: 'CDF', region: 'african' },
  { code: 'CG', name: 'Congo', nameAr: 'الكونغو', currency: 'XAF', region: 'african' },

  // دول أمريكا اللاتينية
  { code: 'MX', name: 'Mexico', nameAr: 'المكسيك', currency: 'MXN', region: 'american' },
  { code: 'AR', name: 'Argentina', nameAr: 'الأرجنتين', currency: 'ARS', region: 'american' },
  { code: 'CL', name: 'Chile', nameAr: 'تشيلي', currency: 'CLP', region: 'american' },
  { code: 'CO', name: 'Colombia', nameAr: 'كولومبيا', currency: 'COP', region: 'american' },
  { code: 'PE', name: 'Peru', nameAr: 'بيرو', currency: 'PEN', region: 'american' },
  { code: 'VE', name: 'Venezuela', nameAr: 'فنزويلا', currency: 'VES', region: 'american' },
  { code: 'EC', name: 'Ecuador', nameAr: 'الإكوادور', currency: 'USD', region: 'american' },
  { code: 'UY', name: 'Uruguay', nameAr: 'أوروغواي', currency: 'UYU', region: 'american' },
  { code: 'PY', name: 'Paraguay', nameAr: 'باراغواي', currency: 'PYG', region: 'american' },
  { code: 'BO', name: 'Bolivia', nameAr: 'بوليفيا', currency: 'BOB', region: 'american' },
  { code: 'PA', name: 'Panama', nameAr: 'بنما', currency: 'PAB', region: 'american' },
  { code: 'CR', name: 'Costa Rica', nameAr: 'كوستاريكا', currency: 'CRC', region: 'american' },
  { code: 'GT', name: 'Guatemala', nameAr: 'غواتيمالا', currency: 'GTQ', region: 'american' },
  { code: 'CU', name: 'Cuba', nameAr: 'كوبا', currency: 'CUP', region: 'american' },
  { code: 'DO', name: 'Dominican Republic', nameAr: 'جمهورية الدومينيكان', currency: 'DOP', region: 'american' },
  { code: 'HN', name: 'Honduras', nameAr: 'هندوراس', currency: 'HNL', region: 'american' },
  { code: 'SV', name: 'El Salvador', nameAr: 'السلفادور', currency: 'USD', region: 'american' },
  { code: 'NI', name: 'Nicaragua', nameAr: 'نيكاراغوا', currency: 'NIO', region: 'american' },
  { code: 'JM', name: 'Jamaica', nameAr: 'جامايكا', currency: 'JMD', region: 'american' },
  { code: 'TT', name: 'Trinidad & Tobago', nameAr: 'ترينيداد وتوباغو', currency: 'TTD', region: 'american' },

  // دول أوروبية إضافية
  { code: 'IE', name: 'Ireland', nameAr: 'أيرلندا', currency: 'EUR', region: 'european' },
  { code: 'LU', name: 'Luxembourg', nameAr: 'لوكسمبورغ', currency: 'EUR', region: 'european' },
  { code: 'SK', name: 'Slovakia', nameAr: 'سلوفاكيا', currency: 'EUR', region: 'european' },
  { code: 'SI', name: 'Slovenia', nameAr: 'سلوفينيا', currency: 'EUR', region: 'european' },
  { code: 'HR', name: 'Croatia', nameAr: 'كرواتيا', currency: 'EUR', region: 'european' },
  { code: 'RS', name: 'Serbia', nameAr: 'صربيا', currency: 'RSD', region: 'european' },
  { code: 'BA', name: 'Bosnia', nameAr: 'البوسنة', currency: 'BAM', region: 'european' },
  { code: 'AL', name: 'Albania', nameAr: 'ألبانيا', currency: 'ALL', region: 'european' },
  { code: 'MK', name: 'North Macedonia', nameAr: 'مقدونيا الشمالية', currency: 'MKD', region: 'european' },
  { code: 'ME', name: 'Montenegro', nameAr: 'الجبل الأسود', currency: 'EUR', region: 'european' },
  { code: 'XK', name: 'Kosovo', nameAr: 'كوسوفو', currency: 'EUR', region: 'european' },
  { code: 'LT', name: 'Lithuania', nameAr: 'ليتوانيا', currency: 'EUR', region: 'european' },
  { code: 'LV', name: 'Latvia', nameAr: 'لاتفيا', currency: 'EUR', region: 'european' },
  { code: 'EE', name: 'Estonia', nameAr: 'إستونيا', currency: 'EUR', region: 'european' },
  { code: 'IS', name: 'Iceland', nameAr: 'آيسلندا', currency: 'ISK', region: 'european' },
  { code: 'CY', name: 'Cyprus', nameAr: 'قبرص', currency: 'EUR', region: 'european' },
  { code: 'MT', name: 'Malta', nameAr: 'مالطا', currency: 'EUR', region: 'european' },
  { code: 'MD', name: 'Moldova', nameAr: 'مولدوفا', currency: 'MDL', region: 'european' },

  // أوقيانوسيا
  { code: 'FJ', name: 'Fiji', nameAr: 'فيجي', currency: 'FJD', region: 'other' },
  { code: 'PG', name: 'Papua New Guinea', nameAr: 'بابوا غينيا', currency: 'PGK', region: 'other' },
];

// Map language to region priority
const languageRegionMap: Record<string, string[]> = {
  'ar': ['arab', 'asian', 'african', 'turkish', 'european', 'russian', 'american', 'other'],
  'en': ['other', 'american', 'european', 'asian', 'african', 'arab', 'turkish', 'russian'],
  'de': ['european', 'other', 'american', 'asian', 'african', 'arab', 'turkish', 'russian'],
  'tr': ['turkish', 'arab', 'european', 'asian', 'african', 'russian', 'american', 'other'],
  'ru': ['russian', 'european', 'asian', 'arab', 'african', 'turkish', 'american', 'other'],
  'uk': ['russian', 'european', 'asian', 'arab', 'african', 'turkish', 'american', 'other'],
  'it': ['european', 'other', 'american', 'asian', 'african', 'arab', 'turkish', 'russian'],
  'pl': ['european', 'other', 'american', 'asian', 'african', 'arab', 'turkish', 'russian'],
  'ro': ['european', 'other', 'american', 'asian', 'african', 'arab', 'turkish', 'russian'],
};

const defaultCountryByLanguage: Record<string, string> = {
  'ar': 'SA',
  'en': 'US',
  'de': 'DE',
  'tr': 'TR',
  'ru': 'RU',
  'uk': 'UA',
  'it': 'IT',
  'pl': 'PL',
  'ro': 'RO',
};

// ============================================
// CURRENCIES
// ============================================

const currencies = [
  { code: 'SAR', name: 'ريال سعودي', nameEn: 'Saudi Riyal' },
  { code: 'AED', name: 'درهم إماراتي', nameEn: 'UAE Dirham' },
  { code: 'USD', name: 'دولار أمريكي', nameEn: 'US Dollar' },
  { code: 'EUR', name: 'يورو', nameEn: 'Euro' },
  { code: 'GBP', name: 'جنيه إسترليني', nameEn: 'British Pound' },
  { code: 'EGP', name: 'جنيه مصري', nameEn: 'Egyptian Pound' },
  { code: 'SYP', name: 'ليرة سورية', nameEn: 'Syrian Pound' },
  { code: 'LBP', name: 'ليرة لبنانية', nameEn: 'Lebanese Pound' },
  { code: 'IQD', name: 'دينار عراقي', nameEn: 'Iraqi Dinar' },
  { code: 'KWD', name: 'دينار كويتي', nameEn: 'Kuwaiti Dinar' },
  { code: 'QAR', name: 'ريال قطري', nameEn: 'Qatari Riyal' },
  { code: 'BHD', name: 'دينار بحريني', nameEn: 'Bahraini Dinar' },
  { code: 'OMR', name: 'ريال عماني', nameEn: 'Omani Rial' },
  { code: 'JOD', name: 'دينار أردني', nameEn: 'Jordanian Dinar' },
  { code: 'TRY', name: 'ليرة تركية', nameEn: 'Turkish Lira' },
  { code: 'RUB', name: 'روبل روسي', nameEn: 'Russian Ruble' },
  { code: 'UAH', name: 'هريفنا أوكرانية', nameEn: 'Ukrainian Hryvnia' },
  { code: 'PLN', name: 'زلوتي بولندي', nameEn: 'Polish Zloty' },
  { code: 'RON', name: 'ليو روماني', nameEn: 'Romanian Leu' },
  { code: 'CHF', name: 'فرنك سويسري', nameEn: 'Swiss Franc' },
  { code: 'JPY', name: 'ين ياباني', nameEn: 'Japanese Yen' },
  { code: 'CNY', name: 'يوان صيني', nameEn: 'Chinese Yuan' },
  { code: 'INR', name: 'روبية هندية', nameEn: 'Indian Rupee' },
];

// ============================================
// COMPONENT
// ============================================

export default function RegistrationWizard() {
  const { t, direction, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // قراءة بيانات التسجيل من localStorage أو من Google OAuth user_metadata
  const registrationData = React.useMemo(() => {
    // First try localStorage (from website trial signup modal)
    const data = localStorage.getItem('registration_data');
    if (data) {
      try {
        return JSON.parse(data);
      } catch {
        // fall through
      }
    }
    // If no localStorage data, extract from Google OAuth user_metadata
    if (user?.user_metadata) {
      return {
        email: user.email || user.user_metadata.email || '',
        name: user.user_metadata.full_name || user.user_metadata.name || '',
        companyName: '', // Google doesn't provide company
        phone: user.user_metadata.phone || '',
        plan: '',
        billing: 'monthly',
      };
    }
    return null;
  }, [user]);

  // Google user info for wizard header
  const googleInfo = React.useMemo(() => {
    if (user?.user_metadata?.avatar_url) {
      return {
        name: user.user_metadata.full_name || user.user_metadata.name || '',
        email: user.email || '',
        avatar: user.user_metadata.avatar_url,
      };
    }
    return null;
  }, [user]);

  const [formData, setFormData] = useState<CompanyFormData>({
    companyName: registrationData?.companyName || '',
    businessType: 'fabric',
    address: '',
    city: '',
    country: defaultCountryByLanguage[language] || 'SA',
    phone: registrationData?.phone || '',
    email: registrationData?.email || user?.email || '',
    website: '',
    localCurrency: '',
    mainCurrency: 'USD',
    fiscalYearStart: 1,
    selectedPlan: registrationData?.plan || 'texa-professional',
    billingCycle: registrationData?.billing || 'monthly',
    chartTemplate: 'simple'
  });

  // 🆕 قراءة الباقة من URL أو من بيانات التسجيل
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const planFromUrl = params.get('plan');
    if (planFromUrl && ['starter', 'professional', 'enterprise'].includes(planFromUrl)) {
      setFormData(prev => ({
        ...prev,
        selectedPlan: planFromUrl
      }));
    }
  }, []);

  const isRTL = direction === 'rtl';
  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  // ترتيب الدول أبجدياً عالمياً
  const sortedCountries = React.useMemo(() => {
    console.log('📍 Total countries:', countries.length);
    console.log('📍 Ukraine exists:', countries.some(c => c.code === 'UA'));
    const sorted = [...countries].sort((a, b) => {
      // ترتيب أبجدي حسب اللغة
      if (isRTL) {
        return a.nameAr.localeCompare(b.nameAr, 'ar');
      }
      return a.name.localeCompare(b.name);
    });

    return sorted;
  }, [language, isRTL]);

  // تحديث العملة المحلية عند تغيير الدولة
  useEffect(() => {
    const selectedCountry = countries.find(c => c.code === formData.country);
    if (selectedCountry && !formData.localCurrency) {
      setFormData(prev => ({
        ...prev,
        localCurrency: selectedCountry.currency
      }));
    }
  }, [formData.country]);

  // Business Types
  const businessTypes: Record<string, BusinessTypeOption> = {
    general: {
      id: 'general',
      icon: Building2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-600'
    },
    fabric: {
      id: 'fabric',
      icon: Shirt,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-600'
    },
    exchange: {
      id: 'exchange',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-600'
    },
    healthcare: {
      id: 'healthcare',
      icon: Heart,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-600'
    },
    ecommerce: {
      id: 'ecommerce',
      icon: ShoppingCart,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-600'
    }
  };

  const months = [
    { value: 1, label: t('wizard.months.january') },
    { value: 2, label: t('wizard.months.february') },
    { value: 3, label: t('wizard.months.march') },
    { value: 4, label: t('wizard.months.april') },
    { value: 5, label: t('wizard.months.may') },
    { value: 6, label: t('wizard.months.june') },
    { value: 7, label: t('wizard.months.july') },
    { value: 8, label: t('wizard.months.august') },
    { value: 9, label: t('wizard.months.september') },
    { value: 10, label: t('wizard.months.october') },
    { value: 11, label: t('wizard.months.november') },
    { value: 12, label: t('wizard.months.december') }
  ];

  const handleChange = (field: keyof CompanyFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // إذا تغيرت الدولة، نحدث العملة المحلية
    if (field === 'country') {
      const selectedCountry = countries.find(c => c.code === value);
      if (selectedCountry) {
        setFormData(prev => ({
          ...prev,
          localCurrency: selectedCountry.currency
        }));
      }
    }
  };

  const handleNext = () => {
    // Step 1: التحقق من اسم الشركة والدولة والمدينة
    if (currentStep === 1) {
      if (!formData.companyName || formData.companyName.trim() === '') {
        toast.error(t('wizard.companyNameRequired') || 'الرجاء إدخال اسم الشركة');
        return;
      }
      if (!formData.country) {
        toast.error(t('wizard.countryRequired') || 'الرجاء اختيار الدولة');
        return;
      }
      if (!formData.city || formData.city.trim() === '') {
        toast.error(t('wizard.cityRequired') || 'الرجاء إدخال المدينة');
        return;
      }
      if (!formData.email || formData.email.trim() === '') {
        toast.error(t('wizard.emailRequired') || 'الرجاء إدخال البريد الإلكتروني');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        toast.error(t('wizard.emailInvalid') || 'البريد الإلكتروني غير صحيح');
        return;
      }
    }

    // Step 2: التحقق من العملات
    if (currentStep === 2) {
      if (!formData.localCurrency) {
        toast.error(t('wizard.localCurrencyRequired') || 'الرجاء اختيار العملة المحلية');
        return;
      }
      if (!formData.mainCurrency) {
        toast.error(t('wizard.mainCurrencyRequired') || 'الرجاء اختيار العملة الرئيسية');
        return;
      }
    }

    // Step 3: اختياري — يمكن التخطي

    // Step 4: التحقق من الباقة
    if (currentStep === 4) {
      if (!formData.selectedPlan) {
        toast.error(t('wizard.selectPlan') || 'الرجاء اختيار الباقة');
        return;
      }
    }

    setCurrentStep(prev => Math.min(prev + 1, totalSteps));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    // التحقق من وجود المستخدم
    if (!user?.id) {
      console.error('❌ No user found!');
      toast.error(t('wizard.userNotFound') || 'User not found. Please login again.');
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    // التحقق من البيانات المطلوبة
    if (!formData.companyName || !formData.businessType) {
      console.error('❌ Missing required fields!', {
        companyName: formData.companyName,
        businessType: formData.businessType
      });
      toast.error(t('wizard.fillAllFields') || 'Please fill all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('🔄 Starting registration...', {
        userId: user.id,
        email: formData.email,
        companyName: formData.companyName,
        businessType: formData.businessType,
        currency: formData.localCurrency,
        country: formData.country
      });

      // Call register_new_subscriber with business_type, currency, country, and plan
      const { data, error } = await supabase.rpc('register_new_subscriber', {
        p_user_id: user.id,
        p_user_email: formData.email,
        p_user_name: user?.user_metadata?.full_name || formData.companyName || 'User',
        p_company_name: formData.companyName,
        p_phone: formData.phone || null,
        p_business_type: formData.businessType,
        p_currency: formData.mainCurrency,           // العملة الرئيسية (USD مثلاً)
        p_local_currency: formData.localCurrency,     // العملة المحلية (UAH, SAR مثلاً)
        p_country_code: formData.country,
        p_plan_code: formData.selectedPlan,
        p_chart_template: formData.chartTemplate      // simple أو extended
      });

      console.log('📊 RPC Response:', { data, error });

      if (error) {
        console.error('❌ Registration error:', error);
        toast.error(t('wizard.registrationFailed') + ': ' + (error.message || 'Unknown error'));
        setIsSubmitting(false);
        return;
      }

      if (!data) {
        console.error('❌ No data returned from RPC');
        toast.error(t('wizard.registrationFailed') + ': No data returned');
        setIsSubmitting(false);
        return;
      }

      if (data && !data.success) {
        console.error('❌ Registration failed:', data.error);
        toast.error(data.error || t('wizard.registrationFailed'));
        setIsSubmitting(false);
        return;
      }

      console.log('✅ Registration successful!', data);

      // Update company details
      if (data?.company_id) {
        console.log('📝 Updating company details for company_id:', data.company_id);

        // 1. Update companies table
        const { error: updateError } = await supabase
          .from('companies')
          .update({
            address: formData.address || '',
            city: formData.city || '',
            country: formData.country,
            phone: formData.phone || '',
            email: formData.email,
            website: formData.website || '',
            default_currency: formData.mainCurrency,
            fiscal_year_start_month: formData.fiscalYearStart
          })
          .eq('id', data.company_id);

        if (updateError) {
          console.error('⚠️ Company update error:', updateError);
        } else {
          console.log('✅ Company details updated');
        }

        // 2. Update company_accounting_settings
        const supportedCurrencies = [formData.mainCurrency];
        if (formData.localCurrency && formData.localCurrency !== formData.mainCurrency) {
          supportedCurrencies.push(formData.localCurrency);
        }

        const { error: accountingError } = await supabase
          .from('company_accounting_settings')
          .upsert({
            company_id: data.company_id,
            base_currency: formData.mainCurrency,
            supported_currencies: supportedCurrencies,
            fiscal_year_start_month: formData.fiscalYearStart,
            fiscal_year_end_month: formData.fiscalYearStart === 1 ? 12 : ((formData.fiscalYearStart - 1 + 11) % 12) + 1,
            enable_vat: true,
            decimal_places: 2
          }, { onConflict: 'company_id' });

        if (accountingError) {
          console.error('⚠️ Accounting settings error:', accountingError);
        } else {
          console.log('✅ Accounting settings updated');
        }
      }

      // Success!
      console.log('🎉 Registration complete! Cleaning up...');

      // تنظيف البيانات المؤقتة
      localStorage.removeItem('registration_data');

      // عرض رسالة النجاح
      const successMessage = formData.businessType === 'fabric'
        ? t('wizard.successFabric')
        : t('wizard.success');

      console.log('✅ Success message:', successMessage);
      toast.success(successMessage);

      console.log('🚀 Preparing redirect to dashboard...');

      // Force immediate redirect attempt
      try {
        window.location.href = '/';
      } catch (e) {
        console.warn('Standard redirect failed, trying replace', e);
        window.location.replace('/');
      }

    } catch (err: any) {
      console.error('💥 Submission error:', err);
      console.error('Error stack:', err.stack);
      toast.error(err.message || (t && t('wizard.registrationFailed')) || 'Registration Failed');
      setIsSubmitting(false);
    }
  };


  // ============================================
  // STEP 1: Company Info (معلومات الشركة)
  // ============================================

  const renderStep1 = () => (
    <motion.div
      key="step1"
      initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
      className="space-y-5"
    >
      <div className="text-center mb-4">
        {/* Google account info */}
        {googleInfo && (
          <div className="flex items-center justify-center gap-3 mb-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
            <img src={googleInfo.avatar} alt="" className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
            <div className="text-start">
              <p className="text-sm font-semibold text-gray-900">{googleInfo.name}</p>
              <p className="text-xs text-gray-500">{googleInfo.email}</p>
            </div>
            <div className="ms-auto">
              <span className="text-[10px] px-2 py-1 bg-blue-100 text-blue-700 rounded-full flex items-center gap-1">
                <Check className="w-3 h-3" />
                {isRTL ? 'تم التحقق' : 'Verified'}
              </span>
            </div>
          </div>
        )}
        <Building2 className="w-10 h-10 mx-auto mb-3 text-teal-600" />
        <h2 className="text-xl font-bold text-gray-900 mb-1">
          {isRTL ? 'معلومات شركتك' : 'Company Information'}
        </h2>
        <p className="text-sm text-gray-500">{isRTL ? 'أدخل البيانات الأساسية لشركتك' : 'Enter your company details'}</p>

        {/* Fabric badge */}
        <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-xs font-medium border border-purple-100">
          <Shirt className="w-3.5 h-3.5" />
          {isRTL ? 'منصة تجارة الأقمشة' : 'Fabric Trading Platform'}
        </div>
      </div>

      <div className="grid gap-4">
        {/* اسم الشركة */}
        <div>
          <Label htmlFor="companyName" className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-teal-600" />
            {t('wizard.companyName')} *
          </Label>
          <Input
            id="companyName"
            value={formData.companyName}
            onChange={(e) => handleChange('companyName', e.target.value)}
            placeholder={isRTL ? 'مثال: شركة النسيج الذهبي' : 'e.g. Golden Textile Co.'}
            className="h-11 border-gray-200"
            dir={isRTL ? 'rtl' : 'ltr'}
            autoFocus={!formData.companyName}
            required
          />
        </div>

        {/* الدولة و المدينة */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="country" className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-teal-600" />
              {t('wizard.country')} *
            </Label>
            <Select
              value={formData.country}
              onValueChange={(value) => handleChange('country', value)}
            >
              <SelectTrigger id="country" className="h-11">
                <SelectValue placeholder={t('wizard.selectCountry')} />
              </SelectTrigger>
              <SelectContent>
                {sortedCountries.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    {isRTL ? country.nameAr : country.name} ({country.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="city" className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              {t('wizard.city')} *
            </Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => handleChange('city', e.target.value)}
              placeholder={isRTL ? 'المدينة' : 'City'}
              className="h-11"
            />
          </div>
        </div>

        {/* البريد و الهاتف */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="email" className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-teal-600" />
              {t('wizard.email')} *
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="name@company.com"
              className="h-11"
              dir="ltr"
            />
          </div>
          <div>
            <Label htmlFor="phone" className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" />
              {t('wizard.phone')}
            </Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="+xxx xxx xxxx"
              className="h-11"
              dir="ltr"
            />
          </div>
        </div>

        {/* العنوان و الموقع (اختياري) */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="address" className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              {t('wizard.address')}
            </Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder={isRTL ? 'العنوان (اختياري)' : 'Address (optional)'}
              className="h-11"
            />
          </div>
          <div>
            <Label htmlFor="website" className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              {t('wizard.website')}
            </Label>
            <Input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) => handleChange('website', e.target.value)}
              placeholder="www.example.com"
              className="h-11"
              dir="ltr"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );

  // ============================================
  // STEP 2: Financial Settings (الإعدادات المالية)
  // ============================================

  const renderStep2 = () => (
    <motion.div
      key="step2"
      initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
      className="space-y-5"
    >
      <div className="text-center mb-4">
        <Coins className="w-10 h-10 mx-auto mb-3 text-teal-600" />
        <h2 className="text-xl font-bold text-gray-900 mb-1">
          {isRTL ? 'الإعدادات المالية' : 'Financial Settings'}
        </h2>
        <p className="text-sm text-gray-500">{isRTL ? 'اختر العملات وبداية السنة المالية' : 'Configure currencies and fiscal year'}</p>
      </div>

      <div className="grid gap-5">
        {/* العملات */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="localCurrency" className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-teal-600" />
              {t('wizard.localCurrency')} *
            </Label>
            <Select value={formData.localCurrency} onValueChange={(value) => handleChange('localCurrency', value)}>
              <SelectTrigger id="localCurrency" className="h-11">
                <SelectValue placeholder={t('wizard.selectCurrency')} />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    {currency.code} - {isRTL ? currency.name : currency.nameEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-gray-400 mt-1">{isRTL ? 'العملة في بلدك' : 'Your country currency'}</p>
          </div>
          <div>
            <Label htmlFor="mainCurrency" className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-teal-600" />
              {t('wizard.mainCurrency')} *
            </Label>
            <Select value={formData.mainCurrency} onValueChange={(value) => handleChange('mainCurrency', value)}>
              <SelectTrigger id="mainCurrency" className="h-11">
                <SelectValue placeholder={t('wizard.selectMainCurrency')} />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    {currency.code} - {isRTL ? currency.name : currency.nameEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-gray-400 mt-1">{isRTL ? 'للتقارير والمحاسبة' : 'For reports & accounting'}</p>
          </div>
        </div>

        {/* بداية السنة المالية */}
        <div>
          <Label htmlFor="fiscalYear" className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-teal-600" />
            {t('wizard.fiscalYearStart')}
          </Label>
          <Select value={formData.fiscalYearStart.toString()} onValueChange={(value) => handleChange('fiscalYearStart', parseInt(value))}>
            <SelectTrigger id="fiscalYear" className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value.toString()}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* الشجرة المحاسبية */}
        <div>
          <Label className="text-sm font-medium mb-2 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-teal-600" />
            {isRTL ? 'نوع الشجرة المحاسبية' : 'Chart of Accounts'}
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => handleChange('chartTemplate', 'simple')}
              className={cn("p-3 rounded-xl border-2 transition-all text-start",
                formData.chartTemplate === 'simple' ? "border-teal-600 bg-teal-50" : "border-gray-200 hover:border-teal-200"
              )}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-sm text-gray-900">{isRTL ? 'قياسية' : 'Standard'}</span>
                {formData.chartTemplate === 'simple' && <Check className="w-4 h-4 text-teal-600" />}
              </div>
              <p className="text-xs text-gray-500">{isRTL ? 'للشركات الصغيرة والمتوسطة' : 'Small & medium businesses'}</p>
            </button>
            <button type="button" onClick={() => handleChange('chartTemplate', 'extended')}
              className={cn("p-3 rounded-xl border-2 transition-all text-start",
                formData.chartTemplate === 'extended' ? "border-teal-600 bg-teal-50" : "border-gray-200 hover:border-teal-200"
              )}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-sm text-gray-900">{isRTL ? 'موسّعة' : 'Extended'}</span>
                {formData.chartTemplate === 'extended' && <Check className="w-4 h-4 text-teal-600" />}
              </div>
              <p className="text-xs text-gray-500">{isRTL ? 'للشركات الكبيرة المتعددة الفروع' : 'Large multi-branch companies'}</p>
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm">
          <div className="flex items-center gap-2 mb-2 text-gray-700 font-medium">
            <Info className="w-4 h-4 text-teal-600" />
            {isRTL ? 'ملخص الإعدادات' : 'Settings Summary'}
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
            <div><span className="text-gray-700">{isRTL ? 'الشركة:' : 'Company:'}</span> {formData.companyName}</div>
            <div><span className="text-gray-700">{isRTL ? 'الدولة:' : 'Country:'}</span> {countries.find(c => c.code === formData.country)?.[isRTL ? 'nameAr' : 'name']}</div>
            <div><span className="text-gray-700">{isRTL ? 'المحلية:' : 'Local:'}</span> {formData.localCurrency || '—'}</div>
            <div><span className="text-gray-700">{isRTL ? 'الرئيسية:' : 'Main:'}</span> {formData.mainCurrency}</div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  // ============================================
  // STEP 3: Quick Setup (إعداد سريع - اختياري)
  // ============================================

  const [quickSetup, setQuickSetup] = useState({
    branchName: '',
    warehouseName: '',
    cashRegisterName: '',
  });

  const renderStep3 = () => (
    <motion.div
      key="step3"
      initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
      className="space-y-5"
    >
      <div className="text-center mb-4">
        <Warehouse className="w-10 h-10 mx-auto mb-3 text-teal-600" />
        <h2 className="text-xl font-bold text-gray-900 mb-1">
          {isRTL ? 'إعداد سريع' : 'Quick Setup'}
        </h2>
        <p className="text-sm text-gray-500">
          {isRTL ? 'أنشئ الفرع والمستودع والصندوق الآن أو لاحقاً' : 'Create branch, warehouse & register now or later'}
        </p>
        <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-xs font-medium border border-amber-100">
          <SkipForward className="w-3.5 h-3.5" />
          {isRTL ? 'هذه الخطوة اختيارية — يمكنك التخطي' : 'Optional step — you can skip'}
        </div>
      </div>

      <div className="grid gap-4">
        {/* الفرع */}
        <div className="p-4 rounded-xl border border-gray-200 bg-white hover:border-teal-200 transition-colors">
          <Label className="text-sm font-medium mb-2 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <GitBranch className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <span className="text-gray-900">{isRTL ? 'الفرع الرئيسي' : 'Main Branch'}</span>
              <p className="text-xs text-gray-400 font-normal">{isRTL ? 'أول فرع لشركتك' : 'Your first branch location'}</p>
            </div>
          </Label>
          <Input
            value={quickSetup.branchName}
            onChange={(e) => setQuickSetup(prev => ({ ...prev, branchName: e.target.value }))}
            placeholder={isRTL ? 'مثال: الفرع الرئيسي' : 'e.g. Main Branch'}
            className="h-10 mt-2"
          />
        </div>

        {/* المستودع */}
        <div className="p-4 rounded-xl border border-gray-200 bg-white hover:border-teal-200 transition-colors">
          <Label className="text-sm font-medium mb-2 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Warehouse className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <span className="text-gray-900">{isRTL ? 'المستودع الرئيسي' : 'Main Warehouse'}</span>
              <p className="text-xs text-gray-400 font-normal">{isRTL ? 'مستودع الأقمشة الأساسي' : 'Primary fabric warehouse'}</p>
            </div>
          </Label>
          <Input
            value={quickSetup.warehouseName}
            onChange={(e) => setQuickSetup(prev => ({ ...prev, warehouseName: e.target.value }))}
            placeholder={isRTL ? 'مثال: المستودع الرئيسي' : 'e.g. Main Warehouse'}
            className="h-10 mt-2"
          />
        </div>

        {/* الصندوق */}
        <div className="p-4 rounded-xl border border-gray-200 bg-white hover:border-teal-200 transition-colors">
          <Label className="text-sm font-medium mb-2 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <span className="text-gray-900">{isRTL ? 'صندوق النقد' : 'Cash Register'}</span>
              <p className="text-xs text-gray-400 font-normal">{isRTL ? 'الصندوق الأساسي للمدفوعات' : 'Primary cash register'}</p>
            </div>
          </Label>
          <Input
            value={quickSetup.cashRegisterName}
            onChange={(e) => setQuickSetup(prev => ({ ...prev, cashRegisterName: e.target.value }))}
            placeholder={isRTL ? 'مثال: الصندوق الرئيسي' : 'e.g. Main Cash Register'}
            className="h-10 mt-2"
          />
        </div>
      </div>

      <Alert className="bg-blue-50 border-blue-100">
        <Info className="w-4 h-4 text-blue-600" />
        <AlertDescription className="text-xs text-blue-800">
          {isRTL
            ? 'يمكنك إنشاء هذه العناصر لاحقاً من لوحة التحكم. إذا تركت الحقول فارغة سيتم تخطي الإنشاء.'
            : 'You can create these later from the dashboard. Leave fields empty to skip.'}
        </AlertDescription>
      </Alert>
    </motion.div>
  );

  // ============================================
  // STEP 4: اختيار الباقة 🆕
  // ============================================

  const renderStep4 = () => {
    // خطط الباقات
    const plans = [
      {
        code: 'texa-starter',
        nameKey: 'wizard.plans.starter.name',
        descKey: 'wizard.plans.starter.description',
        priceMonthly: 99,
        priceYearly: 1188,
        discountedMonthly: 49.50,
        discountedYearly: 495,
        color: 'blue',
        features: [
          t('wizard.plans.starter.feature1') || '1 شركة',
          t('wizard.plans.starter.feature2') || '5 مستخدمين',
          t('wizard.plans.starter.feature3') || '50 فرع',
          t('wizard.plans.starter.feature4') || '10 GB تخزين',
          t('wizard.plans.starter.feature5') || '14 يوم تجريبي'
        ],
        isPopular: false
      },
      {
        code: 'texa-professional',
        nameKey: 'wizard.plans.professional.name',
        descKey: 'wizard.plans.professional.description',
        priceMonthly: 799,
        priceYearly: 9588,
        discountedMonthly: 399.50,
        discountedYearly: 3995,
        color: 'teal',
        features: [
          t('wizard.plans.professional.feature1') || '3 شركات',
          t('wizard.plans.professional.feature2') || '20 مستخدم',
          t('wizard.plans.professional.feature3') || '200 فرع',
          t('wizard.plans.professional.feature4') || '100 GB تخزين',
          t('wizard.plans.professional.feature5') || '30 يوم تجريبي',
          t('wizard.plans.professional.feature6') || 'دعم ذو أولوية'
        ],
        isPopular: true
      },
      {
        code: 'texa-enterprise',
        nameKey: 'wizard.plans.enterprise.name',
        descKey: 'wizard.plans.enterprise.description',
        priceMonthly: 1199,
        priceYearly: 14388,
        discountedMonthly: 599.50,
        discountedYearly: 5995,
        color: 'purple',
        features: [
          t('wizard.plans.enterprise.feature1') || 'غير محدود',
          t('wizard.plans.enterprise.feature2') || '500 GB تخزين',
          t('wizard.plans.enterprise.feature3') || '30 يوم تجريبي',
          t('wizard.plans.enterprise.feature4') || 'White Label',
          t('wizard.plans.enterprise.feature5') || 'API Access',
          t('wizard.plans.enterprise.feature6') || 'دعم مخصص'
        ],
        isPopular: false
      }
    ];

    const getColorClasses = (color: string, isSelected: boolean) => {
      const colors: Record<string, any> = {
        blue: {
          border: 'border-blue-600',
          bg: 'bg-blue-50',
          text: 'text-blue-600',
          badge: 'bg-blue-100 text-blue-700'
        },
        teal: {
          border: 'border-teal-600',
          bg: 'bg-teal-50',
          text: 'text-teal-600',
          badge: 'bg-teal-100 text-teal-700'
        },
        purple: {
          border: 'border-purple-600',
          bg: 'bg-purple-50',
          text: 'text-purple-600',
          badge: 'bg-purple-100 text-purple-700'
        }
      };
      return colors[color] || colors.blue;
    };

    return (
      <motion.div
        key="step4"
        initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
        className="space-y-6"
      >
        <div className="text-center mb-8">
          <DollarSign className="w-12 h-12 mx-auto mb-4 text-teal-600" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t('wizard.step4Title') || 'اختر باقتك'}
          </h2>
          <p className="text-gray-600">
            {t('wizard.step4Description') || 'ابدأ بفترة تجريبية مجانية'}
          </p>
        </div>

        {/* تبديل شهري/سنوي */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-lg border-2 border-gray-200 p-1 bg-white">
            <button
              type="button"
              onClick={() => handleChange('billingCycle', 'monthly')}
              className={cn(
                "px-6 py-2 rounded-md text-sm font-medium transition-all",
                formData.billingCycle === 'monthly'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              {t('wizard.monthly') || 'شهري'}
            </button>
            <button
              type="button"
              onClick={() => handleChange('billingCycle', 'yearly')}
              className={cn(
                "px-6 py-2 rounded-md text-sm font-medium transition-all",
                formData.billingCycle === 'yearly'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              {t('wizard.yearly') || 'سنوي'}
              <span className="ms-2 text-xs">
                ({t('wizard.save') || 'وفر'} 58%)
              </span>
            </button>
          </div>
        </div>

        {/* الباقات */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isSelected = formData.selectedPlan === plan.code;
            const colors = getColorClasses(plan.color, isSelected);
            const price = formData.billingCycle === 'monthly'
              ? plan.discountedMonthly
              : plan.discountedYearly;
            const originalPrice = formData.billingCycle === 'monthly'
              ? plan.priceMonthly
              : plan.priceYearly;

            return (
              <button
                key={plan.code}
                type="button"
                onClick={() => handleChange('selectedPlan', plan.code)}
                className={cn(
                  "relative p-6 rounded-xl border-2 transition-all duration-200 text-start",
                  "hover:shadow-lg hover:scale-[1.02]",
                  isSelected
                    ? `${colors.border} ${colors.bg} shadow-lg scale-[1.02]`
                    : 'border-gray-200 bg-white hover:border-gray-300'
                )}
              >
                {/* Popular Badge */}
                {plan.isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <div className={cn("px-3 py-1 rounded-full text-xs font-bold", colors.badge)}>
                      ⭐ {t('wizard.mostPopular') || 'الأكثر شعبية'}
                    </div>
                  </div>
                )}

                {/* Check Icon */}
                {isSelected && (
                  <div className="absolute top-4 end-4">
                    <div className="w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}

                {/* Plan Name */}
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {t(plan.nameKey)}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {t(plan.descKey)}
                </p>

                {/* Price */}
                <div className="mb-6">
                  {/* سعر مشطوب */}
                  <div className="text-sm text-gray-400 line-through mb-1">
                    ${originalPrice}
                  </div>
                  {/* السعر الحالي */}
                  <div className="flex items-baseline gap-2">
                    <span className={cn("text-4xl font-bold", colors.text)}>
                      ${price}
                    </span>
                    <span className="text-gray-600">
                      / {formData.billingCycle === 'monthly'
                        ? (t('wizard.month') || 'شهر')
                        : (t('wizard.year') || 'سنة')
                      }
                    </span>
                  </div>
                  {/* خصم */}
                  <div className="mt-2 text-xs text-teal-600 font-medium">
                    🎉 {t('wizard.discount50') || 'خصم 50%'}
                    {formData.billingCycle === 'yearly' &&
                      ` + ${t('wizard.freeMonths') || '2 أشهر مجاناً'}`
                    }
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {/* ملاحظة */}
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-sm text-blue-900">
            {t('wizard.planNote') || 'يمكنك تغيير الباقة أو الترقية في أي وقت من لوحة التحكم'}
          </AlertDescription>
        </Alert>
      </motion.div>
    );
  };

  // ============================================
  // STEP INDICATORS
  // ============================================

  const stepInfo = [
    { icon: Building2, labelAr: 'معلومات الشركة', labelEn: 'Company Info' },
    { icon: Coins, labelAr: 'الإعدادات المالية', labelEn: 'Financial Settings' },
    { icon: Warehouse, labelAr: 'إعداد سريع', labelEn: 'Quick Setup', optional: true },
    { icon: Check, labelAr: 'اختيار الباقة', labelEn: 'Choose Plan' },
  ];

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 flex" dir={direction}>

      {/* ═══ Left Sidebar — Steps Indicator ═══ */}
      <div className="hidden lg:flex lg:w-80 bg-gradient-to-b from-[#0d5c4d] to-[#0a4a3f] flex-col p-8 relative overflow-hidden">
        {/* Decorative */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(255,255,255,0.2) 0%, transparent 50%)'
          }}
        />
        <div className="absolute top-0 left-0 w-full h-full opacity-[0.05]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
            backgroundSize: '32px 32px'
          }}
        />

        {/* Logo / Brand */}
        <div className="relative z-10 mb-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">TexaCore</h2>
              <p className="text-white/50 text-xs">{isRTL ? 'إعداد حسابك' : 'Account Setup'}</p>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="relative z-10 flex-1 space-y-1">
          {stepInfo.map((step, idx) => {
            const stepNum = idx + 1;
            const isActive = currentStep === stepNum;
            const isDone = currentStep > stepNum;
            const StepIcon = step.icon;

            return (
              <div key={idx} className="flex items-start gap-4">
                {/* Circle + Line */}
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500",
                    isDone ? "bg-white/20 border-white/60" :
                      isActive ? "bg-white border-white shadow-lg shadow-white/20 scale-110" :
                        "bg-white/5 border-white/20"
                  )}>
                    {isDone ? (
                      <Check className="w-5 h-5 text-white" />
                    ) : (
                      <StepIcon className={cn("w-5 h-5", isActive ? "text-[#0d5c4d]" : "text-white/40")} />
                    )}
                  </div>
                  {idx < stepInfo.length - 1 && (
                    <div className={cn(
                      "w-0.5 h-12 my-1 transition-all duration-500",
                      isDone ? "bg-white/40" : "bg-white/10"
                    )} />
                  )}
                </div>

                <div className="pt-2">
                  <p className={cn(
                    "text-sm font-medium transition-all duration-300",
                    isActive ? "text-white" : isDone ? "text-white/70" : "text-white/30"
                  )}>
                    {isRTL ? step.labelAr : step.labelEn}
                    {(step as any).optional && (
                      <span className="ms-1.5 text-[9px] px-1.5 py-0.5 bg-white/10 text-white/50 rounded-full">
                        {isRTL ? 'اختياري' : 'optional'}
                      </span>
                    )}
                  </p>
                  {isActive && (
                    <p className="text-[10px] text-white/40 mt-0.5">
                      {isRTL ? `الخطوة ${stepNum} من ${totalSteps}` : `Step ${stepNum} of ${totalSteps}`}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom — Trust */}
        <div className="relative z-10 mt-auto pt-8 border-t border-white/10">
          <div className="flex items-center gap-2 text-white/40 text-xs">
            <Info className="w-3.5 h-3.5" />
            <span>{isRTL ? 'بياناتك محمية ومشفرة' : 'Your data is protected & encrypted'}</span>
          </div>
        </div>
      </div>

      {/* ═══ Main Content ═══ */}
      <div className="flex-1 flex items-start lg:items-center justify-center p-4 sm:p-8 overflow-y-auto">
        <div className="w-full max-w-2xl">

          {/* Mobile Header */}
          <div className="lg:hidden mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0d5c4d] to-teal-600 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-lg text-gray-900">TexaCore</h2>
                <p className="text-xs text-gray-500">{isRTL ? 'إعداد حسابك' : 'Account Setup'}</p>
              </div>
            </div>
            {/* Mobile Progress */}
            <div className="flex items-center gap-2 mb-2">
              {stepInfo.map((_, idx) => (
                <div key={idx} className={cn(
                  "h-1.5 flex-1 rounded-full transition-all duration-500",
                  idx + 1 <= currentStep ? "bg-teal-500" : "bg-gray-200"
                )} />
              ))}
            </div>
            <p className="text-xs text-gray-500">
              {isRTL ? `الخطوة ${currentStep} من ${totalSteps}` : `Step ${currentStep} of ${totalSteps}`}
            </p>
          </div>

          {/* Card */}
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6 sm:p-8">
              {/* Steps Content */}
              <div className="min-h-[450px]">
                <AnimatePresence mode="wait">
                  {currentStep === 1 && renderStep1()}
                  {currentStep === 2 && renderStep2()}
                  {currentStep === 3 && renderStep3()}
                  {currentStep === 4 && renderStep4()}
                </AnimatePresence>
              </div>

              {/* Navigation */}
              <div className={cn(
                "flex gap-4 mt-6 pt-6 border-t border-gray-100",
                currentStep === 1 ? "justify-end" : "justify-between"
              )}>
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    disabled={isSubmitting}
                    className="gap-2 h-11 px-6 border-gray-200 hover:bg-gray-50"
                  >
                    {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    {t('wizard.back')}
                  </Button>
                )}

                {currentStep < totalSteps ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={isSubmitting}
                    className="gap-2 h-11 px-8 bg-gradient-to-r from-[#0d5c4d] to-teal-600 hover:from-[#0a4a3f] hover:to-teal-700 shadow-lg shadow-teal-600/20"
                  >
                    {t('wizard.next')}
                    {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="gap-2 h-12 px-10 bg-gradient-to-r from-[#0d5c4d] to-teal-600 hover:from-[#0a4a3f] hover:to-teal-700 shadow-lg shadow-teal-600/20 text-base font-semibold"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {t('wizard.submitting')}
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        {t('wizard.complete')}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Bottom Trust Bar */}
          <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">🔒 {isRTL ? 'اتصال آمن' : 'Secure'}</span>
            <span className="flex items-center gap-1">🇪🇺 {isRTL ? 'جودة أوروبية' : 'European Quality'}</span>
            <span className="flex items-center gap-1">⚡ {isRTL ? 'إعداد سريع' : 'Quick Setup'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

