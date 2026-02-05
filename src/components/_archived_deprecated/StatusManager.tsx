/**
 * Status Manager Component
 * مكون إدارة الحالات
 * 
 * Full-page component for managing custom statuses
 * Based on Reem Online's status management interface
 */

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Plus, 
  GripVertical, 
  Pencil, 
  Trash2, 
  ChevronDown,
  ChevronRight,
  Settings,
  Users,
  Eye,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  statusService, 
  type CustomStatus, 
  type StatusGroup,
  STATUS_COLORS,
  type StatusColor
} from '@/services/statusService';

// Document types configuration - using translation keys
const DOC_TYPES = [
  { code: 'invoice', key: 'tabs.invoices' },
  { code: 'order', key: 'common.orders' },
  { code: 'payment', key: 'accounting.payments' },
  { code: 'journal_entry', key: 'accounting.journalEntries' },
  { code: 'customer', key: 'accounting.customers' },
  { code: 'supplier', key: 'accounting.suppliers' },
];

const COLORS: StatusColor[] = [
  'gray', 'blue', 'green', 'red', 'yellow', 
  'orange', 'purple', 'pink', 'indigo', 'teal', 'cyan'
];

interface StatusManagerProps {
  tenantId?: string;
  defaultDocType?: string;
  className?: string;
}

export function StatusManager({
  tenantId,
  defaultDocType = 'invoice',
  className,
}: StatusManagerProps) {
  const { t, language } = useLanguage();
  
  // State
  const [activeDocType, setActiveDocType] = useState(defaultDocType);
  const [groups, setGroups] = useState<StatusGroup[]>([]);
  const [statuses, setStatuses] = useState<CustomStatus[]>([]);
  const [_loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  // Dialog states
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  // Reserved for future use
  void useState(false); // groupDialogOpen
  const [editingStatus, setEditingStatus] = useState<CustomStatus | null>(null);
  const [_editingGroup, _setEditingGroup] = useState<StatusGroup | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name_ar: '',
    name_en: '',
    color: 'gray' as StatusColor,
    group_id: '',
    time_norm_hours: '',
    is_initial: false,
    is_final: false,
    can_view_roles: ['admin', 'manager', 'user'],
    can_set_roles: ['admin', 'manager'],
  });

  // Load data
  useEffect(() => {
    loadData();
  }, [activeDocType, tenantId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [groupsData, statusesData] = await Promise.all([
        statusService.getStatusGroups(activeDocType, tenantId),
        statusService.getStatuses(activeDocType, tenantId),
      ]);
      setGroups(groupsData);
      setStatuses(statusesData);
      
      // Expand all groups by default
      setExpandedGroups(new Set(groupsData.map(g => g.id)));
    } catch (error) {
      console.error('Error loading statuses:', error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const openStatusDialog = (status?: CustomStatus) => {
    if (status) {
      setEditingStatus(status);
      setFormData({
        code: status.code,
        name_ar: status.name_ar,
        name_en: status.name_en || '',
        color: status.color as StatusColor,
        group_id: status.group_id,
        time_norm_hours: status.time_norm_hours?.toString() || '',
        is_initial: status.is_initial,
        is_final: status.is_final,
        can_view_roles: status.can_view_roles,
        can_set_roles: status.can_set_roles,
      });
    } else {
      setEditingStatus(null);
      setFormData({
        code: '',
        name_ar: '',
        name_en: '',
        color: 'gray',
        group_id: groups[0]?.id || '',
        time_norm_hours: '',
        is_initial: false,
        is_final: false,
        can_view_roles: ['admin', 'manager', 'user'],
        can_set_roles: ['admin', 'manager'],
      });
    }
    setStatusDialogOpen(true);
  };

  const handleSaveStatus = async () => {
    try {
      const statusData: Partial<CustomStatus> = {
        tenant_id: tenantId || null,
        doc_type: activeDocType,
        code: formData.code,
        name_ar: formData.name_ar,
        name_en: formData.name_en || null,
        color: formData.color,
        group_id: formData.group_id,
        time_norm_hours: formData.time_norm_hours ? parseInt(formData.time_norm_hours) : null,
        is_initial: formData.is_initial,
        is_final: formData.is_final,
        can_view_roles: formData.can_view_roles,
        can_set_roles: formData.can_set_roles,
      };

      if (editingStatus) {
        await statusService.updateStatus(editingStatus.id, statusData);
        toast.success(t('statusManager.statusUpdated'));
      } else {
        await statusService.createStatus(statusData);
        toast.success(t('statusManager.statusCreated'));
      }

      setStatusDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Error saving status:', error);
      toast.error(t('common.error'));
    }
  };

  const handleDeleteStatus = async (status: CustomStatus) => {
    if (status.is_system) {
      toast.error(t('statusManager.cannotDeleteSystem'));
      return;
    }

    if (!confirm(t('statusManager.deleteConfirm'))) {
      return;
    }

    try {
      await statusService.deleteStatus(status.id);
      toast.success(t('statusManager.statusDeleted'));
      loadData();
    } catch (error) {
      console.error('Error deleting status:', error);
      toast.error(t('common.error'));
    }
  };

  // Group statuses by their group
  const groupedStatuses = groups.map(group => ({
    group,
    statuses: statuses.filter(s => s.group_id === group.id),
  }));

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {t('statusManager.title')}
          </h2>
          <p className="text-muted-foreground">
            {t('statusManager.description')}
          </p>
        </div>
        <Button onClick={() => openStatusDialog()}>
          <Plus className="w-4 h-4 me-2" />
          {t('statusManager.newStatus')}
        </Button>
      </div>

      {/* Document Type Tabs */}
      <Tabs value={activeDocType} onValueChange={setActiveDocType}>
        <TabsList className="flex-wrap">
          {DOC_TYPES.map(doc => (
            <TabsTrigger key={doc.code} value={doc.code}>
              {t(doc.key)}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeDocType} className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="w-4 h-4" />
                {t('statusManager.statusGroups')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Status Groups Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>{t('common.status')}</TableHead>
                      <TableHead className="hidden md:table-cell">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {t('statusManager.fields.timeNorm')}
                        </div>
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">
                        <div className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {t('statusManager.fields.canView')}
                        </div>
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {t('statusManager.fields.canSet')}
                        </div>
                      </TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedStatuses.map(({ group, statuses: groupStatuses }) => (
                      <React.Fragment key={group.id}>
                        {/* Group Header Row */}
                        <TableRow 
                          className="bg-muted/50 cursor-pointer hover:bg-muted/70"
                          onClick={() => toggleGroup(group.id)}
                        >
                          <TableCell colSpan={6}>
                            <div className="flex items-center gap-2">
                              {expandedGroups.has(group.id) ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                              <span className="font-medium">
                                {language === 'ar' ? group.name_ar : (group.name_en || group.name_ar)}
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                {groupStatuses.length}
                              </Badge>
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Status Rows */}
                        {expandedGroups.has(group.id) && groupStatuses.map((status) => (
                          <TableRow key={status.id}>
                            <TableCell>
                              <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div 
                                  className={cn(
                                    "w-24 h-7 rounded flex items-center justify-center text-sm font-medium",
                                    STATUS_COLORS[status.color as StatusColor]?.bg,
                                    STATUS_COLORS[status.color as StatusColor]?.text
                                  )}
                                >
                                  {language === 'ar' ? status.name_ar : (status.name_en || status.name_ar)}
                                </div>
                                {status.is_system && (
                                  <Badge variant="outline" className="text-xs">
                                    {t('statusManager.badges.system')}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-muted-foreground">
                              {status.time_norm_hours ? `${status.time_norm_hours}h` : '-'}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <span className="text-xs text-muted-foreground truncate max-w-[150px] block">
                                {status.can_view_roles.join(', ')}
                              </span>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <span className="text-xs text-muted-foreground truncate max-w-[150px] block">
                                {status.can_set_roles.join(', ')}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 justify-end">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openStatusDialog(status)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                {!status.is_system && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteStatus(status)}
                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    ))}

                    {statuses.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          {t('statusManager.noStatuses')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Status Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingStatus 
                ? t('statusManager.editStatus')
                : t('statusManager.newStatus')
              }
            </DialogTitle>
            <DialogDescription>
              {t('statusManager.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('statusManager.fields.nameAr')}</Label>
                <Input
                  value={formData.name_ar}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                  placeholder="جديد"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('statusManager.fields.nameEn')}</Label>
                <Input
                  value={formData.name_en}
                  onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                  placeholder="New"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('statusManager.fields.code')}</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase() })}
                  placeholder="new"
                  disabled={editingStatus?.is_system}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('statusManager.fields.group')}</Label>
                <Select
                  value={formData.group_id}
                  onValueChange={(value) => setFormData({ ...formData, group_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map(group => (
                      <SelectItem key={group.id} value={group.id}>
                        {language === 'ar' ? group.name_ar : (group.name_en || group.name_ar)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('statusManager.fields.color')}</Label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      STATUS_COLORS[color].bg,
                      formData.color === color 
                        ? "border-primary ring-2 ring-primary/50" 
                        : "border-transparent hover:border-gray-300"
                    )}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('statusManager.fields.timeNorm')}</Label>
                <Input
                  type="number"
                  value={formData.time_norm_hours}
                  onChange={(e) => setFormData({ ...formData, time_norm_hours: e.target.value })}
                  placeholder="24"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>{t('statusManager.fields.isInitial')}</Label>
              <Switch
                checked={formData.is_initial}
                onCheckedChange={(checked) => setFormData({ ...formData, is_initial: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>{t('statusManager.fields.isFinal')}</Label>
              <Switch
                checked={formData.is_final}
                onCheckedChange={(checked) => setFormData({ ...formData, is_final: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveStatus}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default StatusManager;
