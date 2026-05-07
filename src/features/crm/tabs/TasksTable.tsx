import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { supabase } from '@/lib/supabase';
import {
  CheckSquare, Plus, Calendar, Phone, Package, DollarSign,
  Users, RefreshCw, Loader2, Clock, AlertCircle, MoreHorizontal,
  CheckCircle2, XCircle, Video, ArrowUpRight, Filter,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import {
  type CrmTask, type TaskCategory, type TaskPriority, type CallResult,
  TASK_CATEGORIES, CALL_RESULTS,
  getTasks, createTask, updateTask, completeTask, deleteTask,
} from '@/services/taskService';

// ─── Category colors ────────────────────────────────────────────
const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
  overdue: 'bg-red-100 text-red-700',
};

export default function TasksTable() {
  const { t, direction } = useLanguage();
  const isAr = direction === 'rtl';
  const { companyId, company } = useCompany();
  const tenantId = company?.tenant_id;
  const { toast } = useToast();

  const [tasks, setTasks] = useState<CrmTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTask, setSelectedTask] = useState<CrmTask | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // Create form
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<TaskCategory>('custom');
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium');
  const [newDueDate, setNewDueDate] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newAssignedTo, setNewAssignedTo] = useState('');
  const [newAddMeet, setNewAddMeet] = useState(false);
  const [newSyncCalendar, setNewSyncCalendar] = useState(true);
  const [creating, setCreating] = useState(false);

  // Users/employees for assignment
  const [users, setUsers] = useState<{ id: string; full_name: string }[]>([]);

  useEffect(() => {
    supabase.from('profiles').select('id, full_name').then(({ data }) => {
      setUsers((data || []).filter(u => u.full_name));
    });
  }, []);

  // Detail form
  const [detailCallResult, setDetailCallResult] = useState<CallResult | ''>('');
  const [detailOutcome, setDetailOutcome] = useState('');
  const [completing, setCompleting] = useState(false);

  // Cloud company id for calendar sync
  const [cloudCompanyId, setCloudCompanyId] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;
    supabase.from('companies').select('integrations').eq('id', companyId).single()
      .then(({ data }) => {
        setCloudCompanyId(data?.integrations?.google?.cloud_company_id || null);
      });
  }, [companyId]);

  const loadTasks = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const data = await getTasks(companyId, {
        status: filter === 'all' ? undefined : filter as any,
      });
      setTasks(data);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId, filter]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  // ─── Create Task ───
  const handleCreate = async () => {
    if (!companyId || !tenantId || !newTitle.trim()) return;
    setCreating(true);
    try {
      await createTask(companyId, tenantId, {
        title: newTitle.trim(),
        description: newDescription,
        task_category: newCategory,
        priority: newPriority,
        due_date: newDueDate ? new Date(newDueDate).toISOString() : undefined,
        assigned_to: newAssignedTo || undefined,
        sync_to_calendar: newSyncCalendar,
        add_meet_link: newAddMeet,
      }, cloudCompanyId || undefined);
      toast({ title: isAr ? '✅ تم إنشاء المهمة' : '✅ Task Created' });
      setShowCreate(false);
      setNewTitle(''); setNewDescription(''); setNewDueDate('');
      loadTasks();
    } catch (err: any) {
      toast({ title: '❌ Error', description: err.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  // ─── Complete Task ───
  const handleComplete = async () => {
    if (!selectedTask) return;
    setCompleting(true);
    try {
      await completeTask(
        selectedTask.id,
        detailOutcome,
        detailCallResult as CallResult || undefined,
        undefined,
        cloudCompanyId || undefined
      );
      toast({ title: isAr ? '✅ تم إكمال المهمة' : '✅ Task Completed' });
      setShowDetail(false);
      setSelectedTask(null);
      loadTasks();
    } catch (err: any) {
      toast({ title: '❌ Error', description: err.message, variant: 'destructive' });
    } finally {
      setCompleting(false);
    }
  };

  // ─── Filter tasks ───
  const filteredTasks = tasks.filter(t =>
    !search || t.title.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    overdue: tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  };

  function formatDate(iso?: string) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(isAr ? 'ar-EG-u-nu-latn' : 'en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  function isOverdue(task: CrmTask) {
    return task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* ═══ Header ═══ */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">{isAr ? 'المهام والمتابعات' : 'Tasks & Follow-ups'}</h2>
          <p className="text-sm text-muted-foreground">
            {isAr ? `${stats.total} مهمة • ${stats.overdue} متأخرة` : `${stats.total} tasks • ${stats.overdue} overdue`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadTasks} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" />
            {isAr ? 'مهمة جديدة' : 'New Task'}
          </Button>
        </div>
      </div>

      {/* ═══ Stats Cards ═══ */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { key: 'total', label: isAr ? 'الكل' : 'Total', value: stats.total, color: 'text-blue-600', bg: 'bg-blue-50' },
          { key: 'pending', label: isAr ? 'قيد الانتظار' : 'Pending', value: stats.pending, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { key: 'overdue', label: isAr ? 'متأخرة' : 'Overdue', value: stats.overdue, color: 'text-red-600', bg: 'bg-red-50' },
          { key: 'completed', label: isAr ? 'مكتملة' : 'Completed', value: stats.completed, color: 'text-green-600', bg: 'bg-green-50' },
        ].map(s => (
          <Card key={s.key} className={cn("cursor-pointer hover:shadow-md transition-shadow", filter === s.key && "ring-2 ring-blue-400")}
                onClick={() => setFilter(s.key === 'total' ? 'all' : s.key)}>
            <CardContent className="p-3 text-center">
              <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ═══ Search + Filter ═══ */}
      <div className="flex gap-2">
        <Input placeholder={isAr ? 'بحث...' : 'Search...'} value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isAr ? 'الكل' : 'All'}</SelectItem>
            <SelectItem value="pending">{isAr ? 'قيد الانتظار' : 'Pending'}</SelectItem>
            <SelectItem value="completed">{isAr ? 'مكتملة' : 'Completed'}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ═══ Task List ═══ */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CheckSquare className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p>{isAr ? 'لا توجد مهام' : 'No tasks found'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map(task => {
            const cat = TASK_CATEGORIES[task.task_category as TaskCategory] || TASK_CATEGORIES.custom;
            const overdue = isOverdue(task);
            return (
              <Card key={task.id}
                className={cn(
                  "cursor-pointer hover:shadow-md transition-all border-s-4",
                  overdue ? "border-s-red-500" : `border-s-[${cat.color}]`,
                  task.status === 'completed' && "opacity-60"
                )}
                onClick={() => { setSelectedTask(task); setDetailCallResult(''); setDetailOutcome(task.outcome || ''); setShowDetail(true); }}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-lg">{cat.icon}</span>
                      <div className="min-w-0">
                        <p className={cn("font-medium text-sm truncate", task.status === 'completed' && "line-through")}>
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                          {task.due_date && (
                            <span className={cn("flex items-center gap-0.5", overdue && "text-red-500 font-medium")}>
                              <Clock className="w-3 h-3" />
                              {formatDate(task.due_date)}
                            </span>
                          )}
                          {task.meet_link && <Video className="w-3 h-3 text-blue-500" />}
                          {task.google_event_id && <Calendar className="w-3 h-3 text-green-500" />}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge className={cn("text-[10px] h-5", PRIORITY_COLORS[task.priority || 'medium'])}>
                        {isAr ? ({ low: 'منخفض', medium: 'متوسط', high: 'عالي', urgent: 'عاجل' }[task.priority || 'medium']) : (task.priority || 'medium')}
                      </Badge>
                      <Badge className={cn("text-[10px] h-5", STATUS_COLORS[overdue ? 'overdue' : (task.status || 'pending')])}>
                        {isAr ? cat.labelAr : cat.label}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ═══ Create Dialog ═══ */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-[480px]" aria-describedby="create-task-desc">
          <DialogHeader>
            <DialogTitle>{isAr ? '➕ مهمة جديدة' : '➕ New Task'}</DialogTitle>
            <DialogDescription id="create-task-desc">
              {isAr ? 'إنشاء مهمة جديدة وتعيينها لموظف' : 'Create a new task and assign it'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{isAr ? 'العنوان' : 'Title'}</Label>
              <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder={isAr ? 'عنوان المهمة...' : 'Task title...'} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{isAr ? 'الفئة' : 'Category'}</Label>
                <Select value={newCategory} onValueChange={v => setNewCategory(v as TaskCategory)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TASK_CATEGORIES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.icon} {isAr ? v.labelAr : v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{isAr ? 'الأولوية' : 'Priority'}</Label>
                <Select value={newPriority} onValueChange={v => setNewPriority(v as TaskPriority)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{isAr ? 'منخفض' : 'Low'}</SelectItem>
                    <SelectItem value="medium">{isAr ? 'متوسط' : 'Medium'}</SelectItem>
                    <SelectItem value="high">{isAr ? 'عالي' : 'High'}</SelectItem>
                    <SelectItem value="urgent">{isAr ? 'عاجل' : 'Urgent'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>{isAr ? 'تعيين لـ' : 'Assign To'}</Label>
              <Select value={newAssignedTo} onValueChange={setNewAssignedTo}>
                <SelectTrigger><SelectValue placeholder={isAr ? 'اختر موظف...' : 'Select employee...'} /></SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{isAr ? 'تاريخ الاستحقاق' : 'Due Date'}</Label>
              <Input type="datetime-local" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} />
            </div>
            <div>
              <Label>{isAr ? 'الوصف' : 'Description'}</Label>
              <Textarea value={newDescription} onChange={e => setNewDescription(e.target.value)} rows={2} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={newSyncCalendar} onChange={e => setNewSyncCalendar(e.target.checked)} className="rounded" />
                <Calendar className="w-3.5 h-3.5 text-green-500" />
                {isAr ? 'مزامنة مع Google Calendar' : 'Sync to Google Calendar'}
              </label>
              {newCategory === 'meeting' && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={newAddMeet} onChange={e => setNewAddMeet(e.target.checked)} className="rounded" />
                  <Video className="w-3.5 h-3.5 text-blue-500" />
                  {isAr ? 'إنشاء رابط Google Meet' : 'Create Google Meet link'}
                </label>
              )}
            </div>
            <Button className="w-full" onClick={handleCreate} disabled={creating || !newTitle.trim()}>
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {isAr ? 'إنشاء' : 'Create'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ Task Detail Dialog ═══ */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="sm:max-w-[500px]" aria-describedby="task-detail-desc">
          {selectedTask && (() => {
            const cat = TASK_CATEGORIES[selectedTask.task_category as TaskCategory] || TASK_CATEGORIES.custom;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <span>{cat.icon}</span> {selectedTask.title}
                  </DialogTitle>
                  <DialogDescription id="task-detail-desc">
                    {isAr ? 'تفاصيل المهمة وتسجيل النتيجة' : 'Task details and result logging'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  {selectedTask.description && (
                    <p className="text-sm text-muted-foreground">{selectedTask.description}</p>
                  )}
                  {selectedTask.assigned_to && (
                    <div className="flex items-center gap-2 text-xs p-2 rounded bg-blue-50 dark:bg-blue-950/20">
                      <Users className="w-3.5 h-3.5 text-blue-500" />
                      <span className="text-muted-foreground">{isAr ? 'معيّنة لـ:' : 'Assigned to:'}</span>
                      <span className="font-medium">{users.find(u => u.id === selectedTask.assigned_to)?.full_name || selectedTask.assigned_to}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="p-2 rounded bg-slate-50 dark:bg-slate-800">
                      <p className="text-[11px] text-muted-foreground">{isAr ? 'الحالة' : 'Status'}</p>
                      <Badge className={STATUS_COLORS[selectedTask.status || 'pending']}>{selectedTask.status}</Badge>
                    </div>
                    <div className="p-2 rounded bg-slate-50 dark:bg-slate-800">
                      <p className="text-[11px] text-muted-foreground">{isAr ? 'الاستحقاق' : 'Due'}</p>
                      <p className="font-medium">{formatDate(selectedTask.due_date)}</p>
                    </div>
                  </div>

                  {selectedTask.meet_link && (
                    <a href={selectedTask.meet_link} target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-sm">
                      <Video className="w-4 h-4" /> {isAr ? 'انضم للاجتماع' : 'Join Meeting'} <ArrowUpRight className="w-3 h-3" />
                    </a>
                  )}

                  {selectedTask.status !== 'completed' && (
                    <>
                      <hr />
                      <h4 className="text-sm font-semibold">{isAr ? '📝 تسجيل النتيجة' : '📝 Log Result'}</h4>

                      {(selectedTask.task_category === 'call' || selectedTask.task_category === 'follow_up' || selectedTask.task_category === 'invoice_due') && (
                        <div>
                          <Label>{isAr ? 'نتيجة الاتصال' : 'Call Result'}</Label>
                          <Select value={detailCallResult} onValueChange={v => setDetailCallResult(v as CallResult)}>
                            <SelectTrigger><SelectValue placeholder={isAr ? 'اختر...' : 'Select...'} /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(CALL_RESULTS).map(([k, v]) => (
                                <SelectItem key={k} value={k}>{isAr ? v.labelAr : v.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div>
                        <Label>{isAr ? 'ملاحظات' : 'Notes'}</Label>
                        <Textarea value={detailOutcome} onChange={e => setDetailOutcome(e.target.value)} rows={2}
                                  placeholder={isAr ? 'تفاصيل المتابعة...' : 'Follow-up details...'} />
                      </div>

                      <div className="flex gap-2">
                        <Button className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700" onClick={handleComplete} disabled={completing}>
                          {completing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                          {isAr ? 'إكمال المهمة' : 'Complete Task'}
                        </Button>
                        <Button variant="destructive" size="icon" onClick={async () => {
                          await deleteTask(selectedTask.id, cloudCompanyId || undefined);
                          setShowDetail(false);
                          loadTasks();
                        }}>
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </>
                  )}

                  {selectedTask.status === 'completed' && selectedTask.outcome && (
                    <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 text-sm">
                      <p className="font-medium text-green-700">{isAr ? '✅ النتيجة:' : '✅ Result:'}</p>
                      {selectedTask.call_result && <Badge className="mt-1">{CALL_RESULTS[selectedTask.call_result as CallResult]?.[isAr ? 'labelAr' : 'label']}</Badge>}
                      <p className="mt-1 text-muted-foreground">{selectedTask.outcome}</p>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
