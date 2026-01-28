/**
 * Plan Modules Tab - موديولات الباقة
 */

import React, { useState, useEffect } from 'react';
import { TabComponentProps } from '@/components/shared/sheets/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Package, Plus, Trash2, Loader2, 
  CheckCircle2, XCircle 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { getLocalizedField } from '@/lib/i18n-helpers';

export const PlanModulesTab: React.FC<TabComponentProps> = ({ 
  data, 
  language, 
  t,
  onRefresh 
}) => {
  const [modules, setModules] = useState<any[]>([]);
  const [availableModules, setAvailableModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadModules();
  }, [data.id]);

  const loadModules = async () => {
    try {
      setLoading(true);
      
      // Load plan modules
      const { data: planModules, error: planError } = await supabase
        .from('plan_modules')
        .select(`
          *,
          modules:module_id (
            id,
            name_en,
            name_ar,
            icon,
            is_active
          )
        `)
        .eq('plan_id', data.id);

      if (planError) throw planError;

      // Load all available modules
      const { data: allModules, error: modulesError } = await supabase
        .from('modules')
        .select('*')
        .eq('is_active', true)
        .order('name_en');

      if (modulesError) throw modulesError;

      console.log('🟢 Modules Loaded:', {
        planModules: planModules?.length || 0,
        allModules: allModules?.length || 0,
        planId: data.id,
      });

      setModules(planModules || []);
      setAvailableModules(allModules || []);
    } catch (error: any) {
      console.error('❌ Error loading modules:', error);
      toast.error(t('errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddModule = async (moduleId: string) => {
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('plan_modules')
        .insert({
          plan_id: data.id,
          module_id: moduleId,
        });

      if (error) throw error;

      toast.success(t('messages.saved'));
      await loadModules();
      onRefresh?.();
    } catch (error: any) {
      console.error('Error adding module:', error);
      toast.error(t('errors.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveModule = async (planModuleId: string) => {
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('plan_modules')
        .delete()
        .eq('id', planModuleId);

      if (error) throw error;

      toast.success(t('messages.deleted'));
      await loadModules();
      onRefresh?.();
    } catch (error: any) {
      console.error('Error removing module:', error);
      toast.error(t('errors.deleteFailed'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const moduleIds = modules.map(m => m.module_id);
  const unassignedModules = availableModules.filter(m => !moduleIds.includes(m.id));

  return (
    <div className="space-y-4">
      {/* Assigned Modules */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Package className="h-4 w-4" />
            {t('saas.plan.assignedModules')}
          </h3>
          <Badge variant="secondary">
            {modules.length}
          </Badge>
        </div>

        {modules.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t('saas.plan.noModules')}
          </p>
        ) : (
          <div className="space-y-2">
            {modules.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
                    <Package className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">
                      {language === 'ar' ? item.modules.name_ar : item.modules.name_en}
                    </div>
                    {item.modules.is_active ? (
                      <Badge variant="outline" className="mt-1 text-xs">
                        <CheckCircle2 className="h-3 w-3 me-1" />
                        {t('common.active')}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="mt-1 text-xs">
                        <XCircle className="h-3 w-3 me-1" />
                        {t('common.inactive')}
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveModule(item.id)}
                  disabled={saving}
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Available Modules */}
      {unassignedModules.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {t('saas.plan.availableModules')}
            </h3>
            <Badge variant="outline">
              {unassignedModules.length}
            </Badge>
          </div>

          <div className="space-y-2">
            {unassignedModules.map((module) => (
              <div
                key={module.id}
                className="flex items-center justify-between p-3 rounded-lg border border-dashed border-border/50 hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted">
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="text-sm font-medium">
                    {getLocalizedField(module, 'name', language, t('common.notSet'))}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddModule(module.id)}
                  disabled={saving}
                  className="h-8"
                >
                  <Plus className="h-4 w-4 me-1" />
                  {t('common.add')}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
