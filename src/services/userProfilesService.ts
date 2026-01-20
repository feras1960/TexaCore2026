/**
 * User Profiles Service
 * Service layer for User Profiles
 */

import { supabase } from '@/lib/supabase';

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role: string;
  company_id?: string;
  branch_id?: string;
  phone?: string;
  preferences?: any;
  created_at: string;
  updated_at: string;
}

export const userProfilesService = {
  /**
   * Get user profile by user ID
   */
  async getByUserId(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      // If profile doesn't exist, return null
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching user profile:', error);
      throw error;
    }

    return data;
  },

  /**
   * Get current user profile
   */
  async getCurrent(): Promise<UserProfile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    return this.getByUserId(user.id);
  },
};

export default userProfilesService;
