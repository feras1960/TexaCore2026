/**
 * 📅 CalendarWidget — Dashboard Calendar with Task Integration
 */
import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Calendar, ChevronLeft, ChevronRight, Clock, Video, Phone, Package, DollarSign, Users, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { type CrmTask, type TaskCategory, TASK_CATEGORIES, getTasksForDashboard } from '@/services/taskService';

interface Props {
  companyId: string;
}

const CATEGORY_ICONS: Record<string, any> = {
  invoice_due: DollarSign,
  delivery: Package,
  call: Phone,
  meeting: Users,
  follow_up: CheckCircle2,
  custom: Calendar,
};

export function CalendarWidget({ companyId }: Props) {
  const { direction } = useLanguage();
  const isAr = direction === 'rtl';

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [tasks, setTasks] = useState<{ today: CrmTask[]; overdue: CrmTask[]; upcoming: CrmTask[] }>({ today: [], overdue: [], upcoming: [] });
  const [stats, setStats] = useState({ total: 0, completed: 0, overdue: 0, pending: 0 });

  useEffect(() => {
    if (!companyId || companyId === 'default-company') return;
    getTasksForDashboard(companyId).then(data => {
      setTasks({ today: data.today, overdue: data.overdue, upcoming: data.upcoming });
      setStats(data.stats);
    });
  }, [companyId]);

  // Calendar grid
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [currentDate]);

  const monthName = currentDate.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' });

  // Tasks for selected date
  const selectedDayTasks = useMemo(() => {
    if (!selectedDate) return [];
    const sel = selectedDate.toISOString().slice(0, 10);
    return [...tasks.today, ...tasks.overdue, ...tasks.upcoming].filter(t =>
      t.due_date && t.due_date.slice(0, 10) === sel
    );
  }, [selectedDate, tasks]);

  // Days with tasks (for dots)
  const taskDaySet = useMemo(() => {
    const set = new Set<string>();
    [...tasks.today, ...tasks.overdue, ...tasks.upcoming].forEach(t => {
      if (t.due_date) set.add(t.due_date.slice(0, 10));
    });
    return set;
  }, [tasks]);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const navigateMonth = (dir: number) => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + dir, 1));
  };

  const dayNames = isAr
    ? ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <h3 className="font-semibold text-sm">{isAr ? 'التقويم والمهام' : 'Calendar & Tasks'}</h3>
          </div>
          <div className="flex items-center gap-1">
            {stats.overdue > 0 && (
              <Badge className="bg-red-500/20 text-white border-red-400/30 text-[10px]">
                {stats.overdue} {isAr ? 'متأخر' : 'overdue'}
              </Badge>
            )}
          </div>
        </div>

        <div className="p-3">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateMonth(-1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium">{monthName}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateMonth(1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Day Names */}
          <div className="grid grid-cols-7 mb-1">
            {dayNames.map(d => (
              <div key={d} className="text-center text-[10px] text-muted-foreground font-medium py-1">{d}</div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {calendarDays.map((day, i) => {
              if (day === null) return <div key={`empty-${i}`} />;
              const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isToday = dateStr === todayStr;
              const hasTask = taskDaySet.has(dateStr);
              const isSelected = selectedDate && dateStr === `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;

              return (
                <button key={day}
                  className={cn(
                    "relative h-8 w-full rounded text-xs font-medium transition-all hover:bg-blue-50 dark:hover:bg-blue-950",
                    isToday && "bg-blue-600 text-white hover:bg-blue-700",
                    isSelected && !isToday && "bg-blue-100 dark:bg-blue-900 ring-1 ring-blue-400",
                  )}
                  onClick={() => setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
                >
                  {day}
                  {hasTask && (
                    <span className={cn(
                      "absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full",
                      isToday ? "bg-white" : "bg-blue-500"
                    )} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tasks for selected day */}
        <div className="border-t px-3 py-2 max-h-44 overflow-y-auto">
          {selectedDayTasks.length === 0 ? (
            <p className="text-xs text-center text-muted-foreground py-3">
              {isAr ? 'لا توجد مهام لهذا اليوم' : 'No tasks for this day'}
            </p>
          ) : (
            <div className="space-y-1.5">
              {selectedDayTasks.map(task => {
                const cat = TASK_CATEGORIES[task.task_category as TaskCategory] || TASK_CATEGORIES.custom;
                const Icon = CATEGORY_ICONS[task.task_category] || Calendar;
                return (
                  <div key={task.id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-xs">
                    <div className="p-1 rounded" style={{ backgroundColor: cat.color + '20' }}>
                      <Icon className="w-3 h-3" style={{ color: cat.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn("font-medium truncate", task.status === 'completed' && "line-through opacity-60")}>{task.title}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {task.due_date && new Date(task.due_date).toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                        {task.meet_link && <Video className="w-2.5 h-2.5 text-blue-500" />}
                      </p>
                    </div>
                    <Badge className="text-[9px] h-4 shrink-0" style={{ backgroundColor: cat.color + '20', color: cat.color }}>
                      {isAr ? cat.labelAr : cat.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Stats Footer */}
        <div className="border-t px-3 py-2 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{isAr ? `${tasks.today.length} مهمة اليوم` : `${tasks.today.length} today`}</span>
          <span>{isAr ? `${tasks.upcoming.length} قادمة` : `${tasks.upcoming.length} upcoming`}</span>
        </div>
      </CardContent>
    </Card>
  );
}
