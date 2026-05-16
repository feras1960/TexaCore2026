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
        const { data, error } = await supabase.rpc('get_softphone_contacts');
        if (error) throw error;

        const formatted: Contact[] = [];

        (data || []).forEach((c: any) => {
          const name = c.name_ar || c.name_en || 'بدون اسم';
          formatted.push({ 
            id: c.id, 
            name, 
            phone: c.phone || '', 
            mobile: c.mobile || '', 
            type: c.type 
          });
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
