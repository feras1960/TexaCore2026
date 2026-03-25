import { supabase } from '@/lib/supabase';

export interface SystemModule {
    code: string;
    name_ar: string;
    name_en: string;
    description_ar?: string;
    description_en?: string;
    icon: string;
    category: string;
    is_core: boolean;
    is_active: boolean;
    display_order: number;
}

export interface PlanAvailability {
    plan_code: string;
    plan_name_ar: string;
    plan_name_en: string;
    is_included: boolean;
}

export interface ModuleWithPlans extends SystemModule {
    plans_availability: PlanAvailability[];
}

export const saasModulesService = {
    // Fetch all system modules with plan availability
    getAllWithPlans: async (): Promise<ModuleWithPlans[]> => {
        try {
            // 1. Fetch all modules
            const { data: modules, error: modulesError } = await supabase
                .from('system_modules')
                .select('*')
                .order('display_order');

            if (modulesError) throw modulesError;

            // 2. Fetch all active plans
            const { data: plans, error: plansError } = await supabase
                .from('subscription_plans')
                .select('code, name_ar, name_en, included_modules')
                .eq('is_active', true)
                .order('display_order');

            if (plansError) throw plansError;

            // 3. Map modules with plan availability
            const result: ModuleWithPlans[] = modules.map(module => {
                const availability: PlanAvailability[] = plans.map(plan => ({
                    plan_code: plan.code,
                    plan_name_ar: plan.name_ar,
                    plan_name_en: plan.name_en,
                    is_included: module.is_core || (plan.included_modules || []).includes(module.code)
                }));

                return {
                    ...module,
                    plans_availability: availability
                };
            });

            return result;
        } catch (error) {
            console.error('Error in getAllWithPlans:', error);
            throw error;
        }
    },

    // Get module details including features
    getModuleDetails: async (moduleCode: string) => {
        try {
            const { data, error } = await supabase
                .from('system_modules')
                .select(`
          *,
          features:module_features(*)
        `)
                .eq('code', moduleCode)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching module details:', error);
            throw error;
        }
    }
};
