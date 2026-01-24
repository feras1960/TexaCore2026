/**
 * Form Editor Component (No-Code)
 * محرر النماذج بدون كود
 * 
 * Drag and drop form editor for customizing sheet layouts
 * Based on Reem Online's Form Editor
 */

import { useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  Plus, 
  GripVertical, 
  Pencil, 
  Trash2, 
  ChevronDown,
  ChevronRight,
  Save,
  Eye,
  EyeOff,
  Settings,
  Type,
  Hash,
  Calendar,
  DollarSign,
  Mail,
  Phone,
  MapPin,
  Link,
  List,
  CheckSquare,
  Image,
  FileText,
  LayoutGrid
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Field types
export type FieldType = 
  | 'text' 
  | 'number' 
  | 'currency' 
  | 'date' 
  | 'datetime'
  | 'email' 
  | 'phone' 
  | 'address'
  | 'select' 
  | 'multiselect'
  | 'checkbox'
  | 'image'
  | 'file'
  | 'reference'
  | 'custom';

// Field configuration
export interface FieldConfig {
  id: string;
  key: string;
  type: FieldType;
  label_ar: string;
  label_en: string;
  placeholder?: string;
  required: boolean;
  visible: boolean;
  showOnCard: boolean;
  width: 'full' | 'half' | 'third';
  order: number;
  isSystem: boolean;
  options?: { value: string; label_ar: string; label_en: string }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

// Section configuration
export interface SectionConfig {
  id: string;
  title_ar: string;
  title_en: string;
  expanded: boolean;
  visible: boolean;
  showOnCard: boolean;
  order: number;
  fields: FieldConfig[];
}

// Form configuration
export interface FormConfig {
  doc_type: string;
  form_type: string;
  sections: SectionConfig[];
}

// Field type icons
const FIELD_TYPE_ICONS: Record<FieldType, React.ComponentType<any>> = {
  text: Type,
  number: Hash,
  currency: DollarSign,
  date: Calendar,
  datetime: Calendar,
  email: Mail,
  phone: Phone,
  address: MapPin,
  select: List,
  multiselect: CheckSquare,
  checkbox: CheckSquare,
  image: Image,
  file: FileText,
  reference: Link,
  custom: Settings,
};

// Document types
const DOC_TYPES = [
  { code: 'invoice', labelAr: 'الفواتير', labelEn: 'Invoices' },
  { code: 'order', labelAr: 'الطلبات', labelEn: 'Orders' },
  { code: 'customer', labelAr: 'العملاء', labelEn: 'Customers' },
  { code: 'supplier', labelAr: 'الموردين', labelEn: 'Suppliers' },
  { code: 'account', labelAr: 'الحسابات', labelEn: 'Accounts' },
  { code: 'journal_entry', labelAr: 'القيود', labelEn: 'Journal Entries' },
];

// System fields that cannot be deleted
const SYSTEM_FIELDS: Record<string, FieldConfig[]> = {
  invoice: [
    { id: 'inv-1', key: 'number', type: 'text', label_ar: 'رقم الفاتورة', label_en: 'Invoice Number', required: true, visible: true, showOnCard: true, width: 'half', order: 0, isSystem: true },
    { id: 'inv-2', key: 'date', type: 'date', label_ar: 'التاريخ', label_en: 'Date', required: true, visible: true, showOnCard: true, width: 'half', order: 1, isSystem: true },
    { id: 'inv-3', key: 'customer', type: 'reference', label_ar: 'العميل', label_en: 'Customer', required: true, visible: true, showOnCard: true, width: 'full', order: 2, isSystem: true },
    { id: 'inv-4', key: 'total', type: 'currency', label_ar: 'الإجمالي', label_en: 'Total', required: true, visible: true, showOnCard: true, width: 'half', order: 3, isSystem: true },
  ],
  order: [
    { id: 'ord-1', key: 'number', type: 'text', label_ar: 'رقم الطلب', label_en: 'Order Number', required: true, visible: true, showOnCard: true, width: 'half', order: 0, isSystem: true },
    { id: 'ord-2', key: 'date', type: 'date', label_ar: 'التاريخ', label_en: 'Date', required: true, visible: true, showOnCard: true, width: 'half', order: 1, isSystem: true },
    { id: 'ord-3', key: 'customer', type: 'reference', label_ar: 'العميل', label_en: 'Customer', required: true, visible: true, showOnCard: true, width: 'full', order: 2, isSystem: true },
  ],
};

interface FormEditorProps {
  initialConfig?: FormConfig;
  docType?: string;
  onSave?: (config: FormConfig) => void;
  className?: string;
}

export function FormEditor({
  initialConfig,
  docType = 'invoice',
  onSave,
  className,
}: FormEditorProps) {
  const { language } = useLanguage();

  // State
  const [activeDocType, setActiveDocType] = useState(docType);
  const [formType, setFormType] = useState('default');
  const [sections, setSections] = useState<SectionConfig[]>(() => {
    if (initialConfig?.sections) return initialConfig.sections;
    
    // Default sections
    return [
      {
        id: 'section-1',
        title_ar: 'العميل',
        title_en: 'Customer',
        expanded: true,
        visible: true,
        showOnCard: true,
        order: 0,
        fields: SYSTEM_FIELDS[docType] || [],
      },
      {
        id: 'section-2',
        title_ar: 'المنتجات',
        title_en: 'Products',
        expanded: true,
        visible: true,
        showOnCard: true,
        order: 1,
        fields: [],
      },
      {
        id: 'section-3',
        title_ar: 'معلومات إضافية',
        title_en: 'Additional Information',
        expanded: true,
        visible: true,
        showOnCard: false,
        order: 2,
        fields: [],
      },
    ];
  });

  // Dialogs
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [fieldDialogOpen, setFieldDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<SectionConfig | null>(null);
  const [editingField, setEditingField] = useState<FieldConfig | null>(null);
  const [editingFieldSectionId, setEditingFieldSectionId] = useState<string | null>(null);

  // Field dropdown (reserved for future use)
  const [_fieldMenuOpen, _setFieldMenuOpen] = useState(false);
  const [_fieldMenuAnchor, _setFieldMenuAnchor] = useState<string | null>(null);

  // Form data
  const [sectionForm, setSectionForm] = useState({
    title_ar: '',
    title_en: '',
  });

  const [fieldForm, setFieldForm] = useState<Partial<FieldConfig>>({
    key: '',
    type: 'text',
    label_ar: '',
    label_en: '',
    required: false,
    visible: true,
    showOnCard: false,
    width: 'full',
  });

  // Handle save
  const handleSave = () => {
    const config: FormConfig = {
      doc_type: activeDocType,
      form_type: formType,
      sections,
    };
    
    if (onSave) {
      onSave(config);
    }
    
    toast.success(language === 'ar' ? 'تم حفظ التغييرات بنجاح' : 'Changes saved successfully');
  };

  // Add section
  const handleAddSection = () => {
    setEditingSection(null);
    setSectionForm({ title_ar: '', title_en: '' });
    setSectionDialogOpen(true);
  };

  const handleSaveSection = () => {
    if (editingSection) {
      // Update existing section
      setSections(sections.map(s => 
        s.id === editingSection.id 
          ? { ...s, title_ar: sectionForm.title_ar, title_en: sectionForm.title_en }
          : s
      ));
    } else {
      // Add new section
      const newSection: SectionConfig = {
        id: `section-${Date.now()}`,
        title_ar: sectionForm.title_ar,
        title_en: sectionForm.title_en,
        expanded: true,
        visible: true,
        showOnCard: false,
        order: sections.length,
        fields: [],
      };
      setSections([...sections, newSection]);
    }
    setSectionDialogOpen(false);
    toast.success(language === 'ar' ? 'تم الحفظ' : 'Saved');
  };

  // Delete section
  const handleDeleteSection = (sectionId: string) => {
    if (!confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا القسم؟' : 'Are you sure you want to delete this section?')) {
      return;
    }
    setSections(sections.filter(s => s.id !== sectionId));
    toast.success(language === 'ar' ? 'تم الحذف' : 'Deleted');
  };

  // Toggle section visibility
  const toggleSectionVisibility = (sectionId: string) => {
    setSections(sections.map(s => 
      s.id === sectionId ? { ...s, visible: !s.visible } : s
    ));
  };

  // Toggle section showOnCard
  const toggleSectionShowOnCard = (sectionId: string) => {
    setSections(sections.map(s => 
      s.id === sectionId ? { ...s, showOnCard: !s.showOnCard } : s
    ));
  };

  // Toggle section expanded
  const toggleSectionExpanded = (sectionId: string) => {
    setSections(sections.map(s => 
      s.id === sectionId ? { ...s, expanded: !s.expanded } : s
    ));
  };

  // Add field
  const handleAddField = (sectionId: string, _fieldType?: 'system' | 'user' | 'new') => {
    setEditingField(null);
    setEditingFieldSectionId(sectionId);
    setFieldForm({
      key: '',
      type: 'text',
      label_ar: '',
      label_en: '',
      required: false,
      visible: true,
      showOnCard: false,
      width: 'full',
    });
    setFieldDialogOpen(true);
  };

  const handleSaveField = () => {
    if (!editingFieldSectionId) return;

    const newField: FieldConfig = {
      id: editingField?.id || `field-${Date.now()}`,
      key: fieldForm.key || '',
      type: fieldForm.type || 'text',
      label_ar: fieldForm.label_ar || '',
      label_en: fieldForm.label_en || '',
      required: fieldForm.required || false,
      visible: fieldForm.visible !== false,
      showOnCard: fieldForm.showOnCard || false,
      width: fieldForm.width || 'full',
      order: editingField?.order || 0,
      isSystem: editingField?.isSystem || false,
    };

    setSections(sections.map(s => {
      if (s.id !== editingFieldSectionId) return s;

      if (editingField) {
        // Update existing field
        return {
          ...s,
          fields: s.fields.map(f => f.id === editingField.id ? newField : f),
        };
      } else {
        // Add new field
        return {
          ...s,
          fields: [...s.fields, { ...newField, order: s.fields.length }],
        };
      }
    }));

    setFieldDialogOpen(false);
    toast.success(language === 'ar' ? 'تم الحفظ' : 'Saved');
  };

  // Delete field
  const handleDeleteField = (sectionId: string, fieldId: string) => {
    setSections(sections.map(s => {
      if (s.id !== sectionId) return s;
      const field = s.fields.find(f => f.id === fieldId);
      if (field?.isSystem) {
        toast.error(language === 'ar' ? 'لا يمكن حذف حقل النظام' : 'Cannot delete system field');
        return s;
      }
      return {
        ...s,
        fields: s.fields.filter(f => f.id !== fieldId),
      };
    }));
  };

  // Toggle field visibility
  const toggleFieldShowOnCard = (sectionId: string, fieldId: string) => {
    setSections(sections.map(s => {
      if (s.id !== sectionId) return s;
      return {
        ...s,
        fields: s.fields.map(f => 
          f.id === fieldId ? { ...f, showOnCard: !f.showOnCard } : f
        ),
      };
    }));
  };

  // Toggle field required (reserved for future use)
  const _toggleFieldRequired = (sectionId: string, fieldId: string) => {
    setSections(sections.map(s => {
      if (s.id !== sectionId) return s;
      return {
        ...s,
        fields: s.fields.map(f => 
          f.id === fieldId ? { ...f, required: !f.required } : f
        ),
      };
    }));
  };
  void _toggleFieldRequired;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <LayoutGrid className="w-6 h-6" />
            {language === 'ar' ? 'محرر النماذج' : 'Form Editor'}
          </h2>
          <p className="text-muted-foreground">
            {language === 'ar' 
              ? 'قم بتخصيص الحقول وترتيبها حسب احتياجاتك'
              : 'Customize fields and their order to your needs'
            }
          </p>
        </div>
        <Button onClick={handleSave} className="gap-2">
          <Save className="w-4 h-4" />
          {language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
        </Button>
      </div>

      {/* Document Type Tabs */}
      <Tabs value={activeDocType} onValueChange={setActiveDocType}>
        <TabsList className="flex-wrap">
          {DOC_TYPES.map(doc => (
            <TabsTrigger key={doc.code} value={doc.code}>
              {language === 'ar' ? doc.labelAr : doc.labelEn}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeDocType} className="mt-4 space-y-4">
          {/* Form Type & Actions */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Label>{language === 'ar' ? 'النوع' : 'Type'}</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">
                    {language === 'ar' ? 'افتراضي' : 'Default'}
                  </SelectItem>
                  <SelectItem value="compact">
                    {language === 'ar' ? 'مختصر' : 'Compact'}
                  </SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="icon">
                <Plus className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Pencil className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleAddSection} className="gap-2">
                <Plus className="w-4 h-4" />
                {language === 'ar' ? 'إضافة عنوان' : 'Add Header'}
              </Button>
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-4">
            {sections.map((section, _sectionIndex) => (
              <Card key={section.id} className={cn(!section.visible && "opacity-50")}>
                {/* Section Header */}
                <Collapsible open={section.expanded} onOpenChange={() => toggleSectionExpanded(section.id)}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                      <div className="flex items-center gap-3">
                        <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab" />
                        
                        {section.expanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        
                        <CardTitle className="text-base flex-1">
                          {language === 'ar' ? section.title_ar : (section.title_en || section.title_ar)}
                        </CardTitle>

                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleSectionVisibility(section.id)}
                            className="h-8 w-8 p-0"
                            title={section.visible ? 'Hide' : 'Show'}
                          >
                            {section.visible ? (
                              <Eye className="w-4 h-4" />
                            ) : (
                              <EyeOff className="w-4 h-4" />
                            )}
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingSection(section);
                              setSectionForm({ title_ar: section.title_ar, title_en: section.title_en });
                              setSectionDialogOpen(true);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSection(section.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      {/* Fields */}
                      <div className="space-y-2 mb-4">
                        {section.fields.map((field, _fieldIndex) => {
                          const FieldIcon = FIELD_TYPE_ICONS[field.type] || Type;
                          
                          return (
                            <div
                              key={field.id}
                              className={cn(
                                "flex items-center gap-3 p-3 border rounded-lg bg-background",
                                !field.visible && "opacity-50"
                              )}
                            >
                              <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                              
                              <FieldIcon className="w-4 h-4 text-muted-foreground" />
                              
                              <span className="flex-1 text-sm">
                                {language === 'ar' ? field.label_ar : (field.label_en || field.label_ar)}
                              </span>

                              {field.isSystem && (
                                <Badge variant="secondary" className="text-xs">
                                  {language === 'ar' ? 'نظام' : 'System'}
                                </Badge>
                              )}

                              {field.required && (
                                <Badge variant="outline" className="text-xs text-red-500 border-red-200">
                                  {language === 'ar' ? 'إلزامي' : 'Required'}
                                </Badge>
                              )}

                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  <Checkbox
                                    id={`showOnCard-${field.id}`}
                                    checked={field.showOnCard}
                                    onCheckedChange={() => toggleFieldShowOnCard(section.id, field.id)}
                                  />
                                  <Label 
                                    htmlFor={`showOnCard-${field.id}`}
                                    className="text-xs text-muted-foreground cursor-pointer"
                                  >
                                    {language === 'ar' ? 'عرض على البطاقة' : 'Show on card'}
                                  </Label>
                                </div>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingField(field);
                                    setEditingFieldSectionId(section.id);
                                    setFieldForm(field);
                                    setFieldDialogOpen(true);
                                  }}
                                  className="h-7 w-7 p-0"
                                >
                                  <Pencil className="w-3 h-3" />
                                </Button>

                                {!field.isSystem && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteField(section.id, field.id)}
                                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {section.fields.length === 0 && (
                          <div className="text-center py-6 text-muted-foreground text-sm">
                            {language === 'ar' ? 'لا توجد حقول' : 'No fields'}
                          </div>
                        )}
                      </div>

                      {/* Add Field Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddField(section.id)}
                        className="w-full gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        {language === 'ar' ? 'إضافة حقل' : 'Add Field'}
                      </Button>

                      {/* Show on card toggle */}
                      <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                        <Checkbox
                          id={`sectionShowOnCard-${section.id}`}
                          checked={section.showOnCard}
                          onCheckedChange={() => toggleSectionShowOnCard(section.id)}
                        />
                        <Label 
                          htmlFor={`sectionShowOnCard-${section.id}`}
                          className="text-sm cursor-pointer"
                        >
                          {language === 'ar' ? 'عرض على بطاقة الطلب' : 'Show on order card'}
                        </Label>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Section Dialog */}
      <Dialog open={sectionDialogOpen} onOpenChange={setSectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSection 
                ? (language === 'ar' ? 'تعديل العنوان' : 'Edit Header')
                : (language === 'ar' ? 'إضافة عنوان' : 'Add Header')
              }
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)'}</Label>
              <Input
                value={sectionForm.title_ar}
                onChange={(e) => setSectionForm({ ...sectionForm, title_ar: e.target.value })}
                placeholder={language === 'ar' ? 'العميل' : 'العميل'}
              />
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الاسم (إنجليزي)' : 'Name (English)'}</Label>
              <Input
                value={sectionForm.title_en}
                onChange={(e) => setSectionForm({ ...sectionForm, title_en: e.target.value })}
                placeholder="Customer"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSectionDialogOpen(false)}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleSaveSection}>
              {language === 'ar' ? 'إضافة' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Field Dialog */}
      <Dialog open={fieldDialogOpen} onOpenChange={setFieldDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingField 
                ? (language === 'ar' ? 'تعديل الحقل' : 'Edit Field')
                : (language === 'ar' ? 'إضافة حقل' : 'Add Field')
              }
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'التسمية (عربي)' : 'Label (Arabic)'}</Label>
                <Input
                  value={fieldForm.label_ar || ''}
                  onChange={(e) => setFieldForm({ ...fieldForm, label_ar: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'التسمية (إنجليزي)' : 'Label (English)'}</Label>
                <Input
                  value={fieldForm.label_en || ''}
                  onChange={(e) => setFieldForm({ ...fieldForm, label_en: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'المفتاح' : 'Key'}</Label>
                <Input
                  value={fieldForm.key || ''}
                  onChange={(e) => setFieldForm({ ...fieldForm, key: e.target.value.toLowerCase() })}
                  placeholder="field_name"
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'النوع' : 'Type'}</Label>
                <Select
                  value={fieldForm.type}
                  onValueChange={(value) => setFieldForm({ ...fieldForm, type: value as FieldType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">{language === 'ar' ? 'نص' : 'Text'}</SelectItem>
                    <SelectItem value="number">{language === 'ar' ? 'رقم' : 'Number'}</SelectItem>
                    <SelectItem value="currency">{language === 'ar' ? 'مبلغ' : 'Currency'}</SelectItem>
                    <SelectItem value="date">{language === 'ar' ? 'تاريخ' : 'Date'}</SelectItem>
                    <SelectItem value="email">{language === 'ar' ? 'بريد إلكتروني' : 'Email'}</SelectItem>
                    <SelectItem value="phone">{language === 'ar' ? 'هاتف' : 'Phone'}</SelectItem>
                    <SelectItem value="select">{language === 'ar' ? 'قائمة منسدلة' : 'Dropdown'}</SelectItem>
                    <SelectItem value="checkbox">{language === 'ar' ? 'اختيار' : 'Checkbox'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{language === 'ar' ? 'العرض' : 'Width'}</Label>
              <Select
                value={fieldForm.width}
                onValueChange={(value) => setFieldForm({ ...fieldForm, width: value as 'full' | 'half' | 'third' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">{language === 'ar' ? 'كامل' : 'Full'}</SelectItem>
                  <SelectItem value="half">{language === 'ar' ? 'نصف' : 'Half'}</SelectItem>
                  <SelectItem value="third">{language === 'ar' ? 'ثلث' : 'Third'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label>{language === 'ar' ? 'إلزامي' : 'Required'}</Label>
              <Switch
                checked={fieldForm.required}
                onCheckedChange={(checked) => setFieldForm({ ...fieldForm, required: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>{language === 'ar' ? 'عرض على البطاقة' : 'Show on card'}</Label>
              <Switch
                checked={fieldForm.showOnCard}
                onCheckedChange={(checked) => setFieldForm({ ...fieldForm, showOnCard: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFieldDialogOpen(false)}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleSaveField}>
              {language === 'ar' ? 'حفظ' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default FormEditor;
