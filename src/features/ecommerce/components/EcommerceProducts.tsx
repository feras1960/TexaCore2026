/**
 * EcommerceProducts — إدارة منتجات المتجر
 * يعرض منتجات ecommerce_products من Supabase
 */
import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { Package, Search, Eye, EyeOff, Loader2, RefreshCw, Star, ImageIcon } from 'lucide-react';

export default function EcommerceProducts() {
    const { direction } = useLanguage();
    const isRTL = direction === 'rtl';
    const [loading, setLoading] = useState(true);
    const [products, setProducts] = useState<any[]>([]);
    const [search, setSearch] = useState('');

    const fetchProducts = async () => {
        setLoading(true);
        const { data } = await supabase.from('ecommerce_products').select('*').order('created_at', { ascending: false });
        setProducts(data || []);
        setLoading(false);
    };

    useEffect(() => { fetchProducts(); }, []);

    const getName = (n: any) => { if (!n) return '-'; if (typeof n === 'string') return n; return n[isRTL ? 'ar' : 'en'] || n.ar || n.en || '-'; };

    const filtered = products.filter(p => !search || getName(p.name).toLowerCase().includes(search.toLowerCase()) || p.sku?.includes(search));

    const toggleVisibility = async (id: string, current: boolean) => {
        await supabase.from('ecommerce_products').update({ is_active: !current }).eq('id', id);
        setProducts(prev => prev.map(p => p.id === id ? { ...p, is_active: !current } : p));
    };

    if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-erp-teal" /></div>;

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={isRTL ? 'بحث...' : 'Search...'} className="ps-9 text-sm" />
                </div>
                <Button variant="ghost" size="sm" onClick={fetchProducts}><RefreshCw className="w-4 h-4" /></Button>
                <Badge variant="outline">{products.length} {isRTL ? 'منتج' : 'products'}</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.map(product => (
                    <Card key={product.id} className="border-0 shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
                        <div className="aspect-square bg-gray-100 dark:bg-gray-800 relative overflow-hidden">
                            {product.images?.[0] ? (
                                <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-12 h-12 text-gray-300" /></div>
                            )}
                            <div className="absolute top-2 end-2 flex gap-1">
                                {product.is_featured && <Badge className="bg-yellow-500 text-white text-[10px]"><Star className="w-3 h-3" /></Badge>}
                                <Badge className={product.is_active ? 'bg-green-500 text-white text-[10px]' : 'bg-gray-500 text-white text-[10px]'}>
                                    {product.is_active ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'مخفي' : 'Hidden')}
                                </Badge>
                            </div>
                            <Button size="sm" variant="ghost"
                                className="absolute top-2 start-2 w-8 h-8 p-0 bg-white/80 dark:bg-gray-900/80 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => toggleVisibility(product.id, product.is_active)}
                            >
                                {product.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </Button>
                        </div>
                        <CardContent className="p-3">
                            <p className="font-medium text-sm text-erp-navy dark:text-white truncate">{getName(product.name)}</p>
                            <p className="text-xs text-gray-500 mb-2">{product.sku || '-'}</p>
                            <div className="flex items-center justify-between">
                                <div>
                                    {product.sale_price ? (
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-sm font-bold text-red-600 font-mono">{product.sale_price}</span>
                                            <span className="text-xs text-gray-400 line-through font-mono">{product.price}</span>
                                        </div>
                                    ) : (
                                        <span className="text-sm font-bold text-erp-teal font-mono">{product.price}</span>
                                    )}
                                </div>
                                <Badge variant="outline" className="text-[10px]">{product.category_code || '-'}</Badge>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {filtered.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>{isRTL ? 'لا توجد منتجات' : 'No products found'}</p>
                </div>
            )}
        </div>
    );
}
