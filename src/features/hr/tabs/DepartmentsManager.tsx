/**
 * 🏢 Departments & Positions Manager — إدارة الأقسام والمسميات
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Building2, Plus, Users, Pencil, Trash2, Briefcase, ChevronRight } from 'lucide-react';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment, getPositions, createPosition, getEmployees, type Department, type Position, type Employee } from '../services/hrService';
import { toast } from 'sonner';

export default function DepartmentsManager() {
    const { language } = useLanguage();
    const isRTL = language === 'ar';

    const [departments, setDepartments] = useState<Department[]>([]);
    const [positions, setPositions] = useState<Position[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDeptDialog, setShowDeptDialog] = useState(false);
    const [showPosDialog, setShowPosDialog] = useState(false);
    const [editingDept, setEditingDept] = useState<Department | null>(null);
    const [deptForm, setDeptForm] = useState({ name_ar: '', name_en: '', code: '', description: '' });
    const [posForm, setPosForm] = useState({ name_ar: '', name_en: '', code: '', department_id: '', min_salary: '', max_salary: '' });

    useEffect(() => { loadData(); }, []);

    async function loadData() {
        try {
            const [depts, pos, emps] = await Promise.all([getDepartments(), getPositions(), getEmployees()]);
            setDepartments(depts);
            setPositions(pos);
            setEmployees(emps);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    function getEmployeeCount(deptId: string) {
        return employees.filter(e => e.department_id === deptId).length;
    }

    async function handleSaveDept() {
        try {
            if (editingDept) {
                await updateDepartment(editingDept.id, deptForm);
                toast.success(isRTL ? 'تم تحديث القسم' : 'Department updated');
            } else {
                await createDepartment(deptForm);
                toast.success(isRTL ? 'تم إنشاء القسم' : 'Department created');
            }
            setShowDeptDialog(false);
            setEditingDept(null);
            setDeptForm({ name_ar: '', name_en: '', code: '', description: '' });
            loadData();
        } catch {
            toast.error(isRTL ? 'فشل الحفظ' : 'Save failed');
        }
    }

    async function handleDeleteDept(id: string) {
        if (getEmployeeCount(id) > 0) {
            toast.error(isRTL ? 'لا يمكن حذف قسم يحتوي على موظفين' : 'Cannot delete department with employees');
            return;
        }
        if (!confirm(isRTL ? 'حذف هذا القسم؟' : 'Delete this department?')) return;
        try {
            await deleteDepartment(id);
            toast.success(isRTL ? 'تم الحذف' : 'Deleted');
            loadData();
        } catch {
            toast.error(isRTL ? 'فشل الحذف' : 'Delete failed');
        }
    }

    async function handleSavePos() {
        try {
            await createPosition({
                ...posForm,
                min_salary: posForm.min_salary ? Number(posForm.min_salary) : undefined,
                max_salary: posForm.max_salary ? Number(posForm.max_salary) : undefined,
            } as any);
            toast.success(isRTL ? 'تم إنشاء المسمى' : 'Position created');
            setShowPosDialog(false);
            setPosForm({ name_ar: '', name_en: '', code: '', department_id: '', min_salary: '', max_salary: '' });
            loadData();
        } catch {
            toast.error(isRTL ? 'فشل الحفظ' : 'Save failed');
        }
    }

    if (loading) return <div className="animate-pulse space-y-4"><div className="h-64 bg-muted rounded-lg" /></div>;

    return (
        <div className="p-2 space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-erp-navy dark:text-gray-100">
                    {isRTL ? 'الأقسام والمسميات الوظيفية' : 'Departments & Positions'}
                </h2>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowPosDialog(true)}>
                        <Briefcase className="h-4 w-4 me-2" />
                        {isRTL ? 'إضافة مسمى' : 'Add Position'}
                    </Button>
                    <Button className="bg-erp-primary hover:bg-erp-primary/90" onClick={() => { setEditingDept(null); setDeptForm({ name_ar: '', name_en: '', code: '', description: '' }); setShowDeptDialog(true); }}>
                        <Plus className="h-4 w-4 me-2" />
                        {isRTL ? 'إضافة قسم' : 'Add Department'}
                    </Button>
                </div>
            </div>

            {/* Departments Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {departments.map(dept => {
                    const empCount = getEmployeeCount(dept.id);
                    const deptPositions = positions.filter(p => (p as any).department_id === dept.id);
                    return (
                        <Card key={dept.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                                        <Building2 className="h-4 w-4 text-blue-500" />
                                        {isRTL ? dept.name_ar : (dept.name_en || dept.name_ar)}
                                    </CardTitle>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                                            setEditingDept(dept);
                                            setDeptForm({ name_ar: dept.name_ar, name_en: dept.name_en || '', code: dept.code || '', description: dept.description || '' });
                                            setShowDeptDialog(true);
                                        }}>
                                            <Pencil className="h-3 w-3" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDeleteDept(dept.id)}>
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-2 mb-3">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm font-mono">{empCount}</span>
                                    <span className="text-sm text-muted-foreground">{isRTL ? 'موظف' : 'employees'}</span>
                                </div>
                                {dept.code && (
                                    <Badge variant="outline" className="mb-2">{dept.code}</Badge>
                                )}
                                {deptPositions.length > 0 && (
                                    <div className="space-y-1 mt-2">
                                        <p className="text-xs font-medium text-muted-foreground">{isRTL ? 'المسميات:' : 'Positions:'}</p>
                                        {deptPositions.map(p => (
                                            <div key={p.id} className="flex items-center gap-1 text-sm">
                                                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                                {isRTL ? p.name_ar : (p.name_en || p.name_ar)}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}

                {departments.length === 0 && (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        <Building2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
                        <p>{isRTL ? 'لا توجد أقسام بعد. أضف أول قسم!' : 'No departments yet. Add your first!'}</p>
                    </div>
                )}
            </div>

            {/* Department Dialog */}
            <Dialog open={showDeptDialog} onOpenChange={setShowDeptDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {editingDept ? (isRTL ? 'تعديل القسم' : 'Edit Department') : (isRTL ? 'إضافة قسم جديد' : 'Add Department')}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div><Label>{isRTL ? 'الاسم بالعربية' : 'Name (Arabic)'} *</Label>
                            <Input value={deptForm.name_ar} onChange={e => setDeptForm(f => ({ ...f, name_ar: e.target.value }))} /></div>
                        <div><Label>{isRTL ? 'الاسم بالإنجليزية' : 'Name (English)'}</Label>
                            <Input value={deptForm.name_en} onChange={e => setDeptForm(f => ({ ...f, name_en: e.target.value }))} /></div>
                        <div><Label>{isRTL ? 'الرمز' : 'Code'}</Label>
                            <Input value={deptForm.code} onChange={e => setDeptForm(f => ({ ...f, code: e.target.value }))} placeholder="HR, IT, SALES..." /></div>
                        <div><Label>{isRTL ? 'الوصف' : 'Description'}</Label>
                            <Input value={deptForm.description} onChange={e => setDeptForm(f => ({ ...f, description: e.target.value }))} /></div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeptDialog(false)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                        <Button onClick={handleSaveDept} disabled={!deptForm.name_ar}>{isRTL ? 'حفظ' : 'Save'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Position Dialog */}
            <Dialog open={showPosDialog} onOpenChange={setShowPosDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{isRTL ? 'إضافة مسمى وظيفي' : 'Add Position'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div><Label>{isRTL ? 'الاسم بالعربية' : 'Name (Arabic)'} *</Label>
                            <Input value={posForm.name_ar} onChange={e => setPosForm(f => ({ ...f, name_ar: e.target.value }))} /></div>
                        <div><Label>{isRTL ? 'الاسم بالإنجليزية' : 'Name (English)'}</Label>
                            <Input value={posForm.name_en} onChange={e => setPosForm(f => ({ ...f, name_en: e.target.value }))} /></div>
                        <div><Label>{isRTL ? 'القسم' : 'Department'}</Label>
                            <select className="w-full border rounded-md p-2 bg-background" value={posForm.department_id}
                                onChange={e => setPosForm(f => ({ ...f, department_id: e.target.value }))}>
                                <option value="">{isRTL ? 'اختر القسم' : 'Select department'}</option>
                                {departments.map(d => <option key={d.id} value={d.id}>{d.name_ar}</option>)}
                            </select></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label>{isRTL ? 'حد أدنى للراتب' : 'Min Salary'}</Label>
                                <Input type="number" value={posForm.min_salary} onChange={e => setPosForm(f => ({ ...f, min_salary: e.target.value }))} /></div>
                            <div><Label>{isRTL ? 'حد أقصى للراتب' : 'Max Salary'}</Label>
                                <Input type="number" value={posForm.max_salary} onChange={e => setPosForm(f => ({ ...f, max_salary: e.target.value }))} /></div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowPosDialog(false)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                        <Button onClick={handleSavePos} disabled={!posForm.name_ar}>{isRTL ? 'حفظ' : 'Save'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
