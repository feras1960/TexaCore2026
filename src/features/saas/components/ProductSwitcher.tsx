import { Building2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/hooks';

export interface Product {
  code: string;
  name: string;
  name_ar: string;
  color: string;
  icon?: string;
}

const PRODUCTS: Product[] = [
  {
    code: 'all',
    name: 'All Products',
    name_ar: 'جميع المنتجات',
    color: '#6366F1',
  },
  {
    code: 'nexacore',
    name: 'NexaCore',
    name_ar: 'نيكسا كور',
    color: '#3B82F6',
  },
  {
    code: 'texacore',
    name: 'TexaCore',
    name_ar: 'تيكسا كور',
    color: '#8B5CF6',
  },
  {
    code: 'fincore',
    name: 'FinCore',
    name_ar: 'فين كور',
    color: '#10B981',
  },
  {
    code: 'inducore',
    name: 'InduCore',
    name_ar: 'إندو كور',
    color: '#F59E0B',
  },
  {
    code: 'medcore',
    name: 'MedCore',
    name_ar: 'ميد كور',
    color: '#EF4444',
  },
];

interface ProductSwitcherProps {
  selectedProduct: string;
  onProductChange: (productCode: string) => void;
  className?: string;
}

export function ProductSwitcher({
  selectedProduct,
  onProductChange,
  className = '',
}: ProductSwitcherProps) {
  const { language } = useLanguage();

  const currentProduct = PRODUCTS.find((p) => p.code === selectedProduct) || PRODUCTS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={`justify-between min-w-[200px] ${className}`}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: currentProduct.color }}
            />
            <Building2 className="h-4 w-4" />
            <span className="font-medium">
              {language === 'ar' ? currentProduct.name_ar : currentProduct.name}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={language === 'ar' ? 'end' : 'start'} className="w-[200px]">
        {PRODUCTS.map((product, index) => (
          <div key={product.code}>
            {index === 1 && <DropdownMenuSeparator />}
            <DropdownMenuItem
              onClick={() => onProductChange(product.code)}
              className={`cursor-pointer ${
                product.code === selectedProduct ? 'bg-accent' : ''
              }`}
            >
              <div className="flex items-center gap-2 w-full">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: product.color }}
                />
                <span className="flex-1">
                  {language === 'ar' ? product.name_ar : product.name}
                </span>
                {product.code === selectedProduct && (
                  <span className="text-primary">✓</span>
                )}
              </div>
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { PRODUCTS };
