import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wzkklenfsaepegymfxfz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6a2tsZW5mc2FlcGVneW1meGZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NTIxNzcsImV4cCI6MjA4NDMyODE3N30.ATYSK_WvOfbqEaInbg5nKau-wgixF0lIGaue3m8AJtI';
const supabase = createClient(supabaseUrl, supabaseKey);

export interface Contact {
  id: string;
  name: string;
  phone: string;
  mobile: string;
  type: string;
}

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchContacts = async () => {
      setLoading(true);
      try {
        // Fetch customers
        const { data: customers } = await supabase
          .from('customers')
          .select('id, name_ar, name_en, phone, mobile')
          .limit(200);

        // Fetch suppliers
        const { data: suppliers } = await supabase
          .from('suppliers')
          .select('id, name_ar, name_en, phone, mobile')
          .limit(200);

        const formatted: Contact[] = [];

        (customers || []).forEach(c => {
          const name = c.name_ar || c.name_en || 'بدون اسم';
          const phone = c.phone || '';
          const mobile = c.mobile || '';
          if (phone || mobile) {
            formatted.push({ id: 'c-' + c.id, name, phone, mobile, type: 'عميل' });
          }
        });

        (suppliers || []).forEach(s => {
          const name = s.name_ar || s.name_en || 'بدون اسم';
          const phone = s.phone || '';
          const mobile = s.mobile || '';
          if (phone || mobile) {
            formatted.push({ id: 's-' + s.id, name, phone, mobile, type: 'مورد' });
          }
        });

        // Sort alphabetically
        formatted.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
        setContacts(formatted);
      } catch (err) {
        console.error('Failed to load contacts', err);
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, []);

  return { contacts, loading };
}
