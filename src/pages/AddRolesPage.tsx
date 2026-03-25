/**
 * Temporary page: Add missing roles to Supabase
 * Access at: /add-roles (temporary, remove after use)
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const MISSING_ROLES = [
    {
        code: 'company_owner', name_ar: 'مالك الشركة', name_en: 'Company Owner',
        level: 'company', is_system: true, can_be_deleted: false, icon: 'Crown', color: 'amber',
        visible_modules: ['dashboard', 'accounting', 'treasury', 'sales', 'purchases', 'inventory', 'warehouse', 'fabric', 'shipments', 'crm', 'pos', 'manufacturing', 'hr', 'activity_log', 'system_config', 'reports'],
        permissions: { all: ['read', 'write', 'delete'] }, display_order: 15,
    },
    {
        code: 'driver', name_ar: 'سائق', name_en: 'Driver',
        level: 'operations', is_system: true, can_be_deleted: false, icon: 'Truck', color: 'cyan',
        visible_modules: ['dashboard'],
        permissions: { delivery: ['read', 'write'] }, display_order: 130,
    },
    {
        code: 'picker', name_ar: 'عتّال', name_en: 'Picker',
        level: 'operations', is_system: true, can_be_deleted: false, icon: 'Package', color: 'violet',
        visible_modules: ['dashboard', 'warehouse', 'inventory'],
        permissions: { warehouse: ['read', 'write'], inventory: ['read'] }, display_order: 135,
    },
    {
        code: 'cashier', name_ar: 'أمين صندوق', name_en: 'Cashier',
        level: 'operations', is_system: true, can_be_deleted: false, icon: 'Wallet', color: 'yellow',
        visible_modules: ['dashboard', 'treasury', 'sales'],
        permissions: { treasury: ['read', 'write'], sales: ['read'] }, display_order: 50,
    },
    {
        code: 'purchaser', name_ar: 'مسؤول مشتريات', name_en: 'Purchaser',
        level: 'operations', is_system: true, can_be_deleted: false, icon: 'ShoppingCart', color: 'lime',
        visible_modules: ['dashboard', 'purchases', 'inventory', 'shipments'],
        permissions: { purchases: ['read', 'write', 'delete'], inventory: ['read'], suppliers: ['read', 'write'] }, display_order: 85,
    },
    {
        code: 'employee', name_ar: 'موظف', name_en: 'Employee',
        level: 'operations', is_system: true, can_be_deleted: false, icon: 'User', color: 'slate',
        visible_modules: ['dashboard'],
        permissions: { dashboard: ['read'] }, display_order: 140,
    },
    {
        code: 'auditor', name_ar: 'مدقق', name_en: 'Auditor',
        level: 'operations', is_system: true, can_be_deleted: false, icon: 'ClipboardCheck', color: 'gray',
        visible_modules: ['dashboard', 'accounting', 'reports', 'activity_log'],
        permissions: { accounting: ['read'], reports: ['read'], activity_log: ['read'] }, display_order: 150,
    },
    {
        code: 'agent', name_ar: 'وكيل', name_en: 'Agent',
        level: 'operations', is_system: true, can_be_deleted: false, icon: 'UserCircle', color: 'rose',
        visible_modules: ['dashboard', 'sales', 'crm'],
        permissions: { sales: ['read', 'write'], crm: ['read', 'write'] }, display_order: 120,
    },
];

export default function AddRolesPage() {
    const [log, setLog] = useState<string[]>([]);
    const [running, setRunning] = useState(false);

    const addLog = (msg: string) => setLog(prev => [...prev, msg]);

    const runMigration = async () => {
        setRunning(true);
        setLog([]);
        addLog('🔍 Checking existing roles...');

        const { data: existing, error: fetchErr } = await supabase
            .from('roles')
            .select('code');

        if (fetchErr) {
            addLog(`❌ Error fetching: ${fetchErr.message}`);
            setRunning(false);
            return;
        }

        const existingCodes = new Set((existing || []).map((r: any) => r.code));
        addLog(`📋 Found ${existingCodes.size} existing roles: ${Array.from(existingCodes).sort().join(', ')}`);

        const toInsert = MISSING_ROLES.filter(r => !existingCodes.has(r.code));

        if (toInsert.length === 0) {
            addLog('✅ All roles already exist — nothing to do!');
            setRunning(false);
            return;
        }

        addLog(`📝 Inserting ${toInsert.length} missing roles: ${toInsert.map(r => r.code).join(', ')}`);

        for (const role of toInsert) {
            const { error } = await supabase.from('roles').insert(role);
            if (error) {
                addLog(`❌ ${role.code}: ${error.message}`);
            } else {
                addLog(`✅ ${role.code} — ${role.name_ar}`);
            }
        }

        addLog('🎉 Done!');
        setRunning(false);
    };

    return (
        <div style={{ padding: '2rem', fontFamily: 'monospace', maxWidth: 800, margin: '0 auto' }}>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>🔧 Add Missing Roles</h1>
            <button
                onClick={runMigration}
                disabled={running}
                style={{
                    padding: '0.75rem 2rem', fontSize: '1rem', cursor: running ? 'not-allowed' : 'pointer',
                    background: running ? '#666' : '#0d9488', color: 'white', border: 'none', borderRadius: 8,
                }}
            >
                {running ? '⏳ Running...' : '▶️ Run Migration'}
            </button>
            <div style={{ marginTop: '1rem', background: '#1a1a2e', color: '#16e0bd', padding: '1rem', borderRadius: 8, minHeight: 200 }}>
                {log.map((line, i) => <div key={i}>{line}</div>)}
                {log.length === 0 && <div style={{ color: '#666' }}>Click "Run Migration" to start...</div>}
            </div>
        </div>
    );
}
