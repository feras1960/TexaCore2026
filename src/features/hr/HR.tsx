import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MainTabsBar } from '@/components/shared/tabs/MainTabsBar';
import {
    LayoutDashboard,
    Users,
    Building2,
    FileText,
    Calendar,
    Clock,
    DollarSign,
    Settings,
} from 'lucide-react';

// ⚡ Direct imports (no lazy loading) for instant tab switching
import HRDashboard from './tabs/HRDashboard';
import EmployeesTable from './tabs/EmployeesTable';
import DepartmentsManager from './tabs/DepartmentsManager';
import ContractsTable from './tabs/ContractsTable';
import LeaveRequests from './tabs/LeaveRequests';
import AttendanceTable from './tabs/AttendanceTable';
import PayrollDashboard from './tabs/PayrollDashboard';
import HRSettings from './tabs/HRSettings';

export default function HR() {
    const location = useLocation();
    const navigate = useNavigate();

    const getActiveTab = () => {
        const path = location.pathname;
        if (path.includes('/hr/employees')) return 'employees';
        if (path.includes('/hr/departments')) return 'departments';
        if (path.includes('/hr/contracts')) return 'contracts';
        if (path.includes('/hr/leaves')) return 'leaves';
        if (path.includes('/hr/attendance')) return 'attendance';
        if (path.includes('/hr/payroll')) return 'payroll';
        if (path.includes('/hr/settings')) return 'settings';
        return 'dashboard';
    };

    const [activeTab, setActiveTab] = useState(getActiveTab());

    useEffect(() => {
        setActiveTab(getActiveTab());
    }, [location.pathname]);

    const tabs = [
        { id: 'dashboard', labelKey: 'hr.dashboard', icon: LayoutDashboard },
        { id: 'employees', labelKey: 'hr.employees', icon: Users },
        { id: 'departments', labelKey: 'hr.departments', icon: Building2 },
        { id: 'contracts', labelKey: 'hr.contracts', icon: FileText },
        { id: 'leaves', labelKey: 'hr.leaves', icon: Calendar },
        { id: 'attendance', labelKey: 'hr.attendance', icon: Clock },
        { id: 'payroll', labelKey: 'hr.payroll', icon: DollarSign },
        { id: 'settings', labelKey: 'hr.settings', icon: Settings },
    ];

    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId);
        if (tabId === 'dashboard') navigate('/hr');
        else navigate(`/hr/${tabId}`);
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard': return <HRDashboard />;
            case 'employees': return <EmployeesTable />;
            case 'departments': return <DepartmentsManager />;
            case 'contracts': return <ContractsTable />;
            case 'leaves': return <LeaveRequests />;
            case 'attendance': return <AttendanceTable />;
            case 'payroll': return <PayrollDashboard />;
            case 'settings': return <HRSettings />;
            default: return <HRDashboard />;
        }
    };

    return (
        <div className="h-full flex flex-col gap-4">
            <MainTabsBar
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                variant="underline"
            />

            {renderContent()}
        </div>
    );
}
