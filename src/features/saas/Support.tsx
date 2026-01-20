/**
 * Support Management Page
 * إدارة تذاكر الدعم والإشعارات
 */

import React, { useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Ticket,
  Search,
  Plus,
  Eye,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  MessageSquare,
  Bell,
  RefreshCw,
  User,
  Building2,
  Calendar,
  Send,
  Filter,
} from 'lucide-react';
import { UnifiedSheet } from '@/components/shared/sheets/UnifiedSheet';
import { cn } from '@/lib/utils';

// Mock data
const mockTickets = [
  {
    id: 'TKT-001',
    subject: 'مشكلة في تسجيل الدخول',
    tenant_name: 'شركة الأمل للتجارة',
    tenant_code: 'AMK-001',
    priority: 'high' as const,
    status: 'open' as const,
    category: 'technical',
    created_at: '2026-01-20T10:30:00Z',
    updated_at: '2026-01-20T10:30:00Z',
    messages_count: 3,
  },
  {
    id: 'TKT-002',
    subject: 'استفسار عن ترقية الباقة',
    tenant_name: 'مؤسسة النور',
    tenant_code: 'NUR-002',
    priority: 'medium' as const,
    status: 'in_progress' as const,
    category: 'billing',
    created_at: '2026-01-19T14:15:00Z',
    updated_at: '2026-01-20T09:00:00Z',
    messages_count: 5,
  },
  {
    id: 'TKT-003',
    subject: 'طلب إضافة مستخدمين جدد',
    tenant_name: 'شركة البناء والتعمير',
    tenant_code: 'BLD-003',
    priority: 'low' as const,
    status: 'resolved' as const,
    category: 'account',
    created_at: '2026-01-18T09:00:00Z',
    updated_at: '2026-01-19T16:30:00Z',
    messages_count: 2,
  },
  {
    id: 'TKT-004',
    subject: 'خطأ في التقارير المالية',
    tenant_name: 'مجموعة التقنية',
    tenant_code: 'TCH-004',
    priority: 'critical' as const,
    status: 'open' as const,
    category: 'bug',
    created_at: '2026-01-20T08:00:00Z',
    updated_at: '2026-01-20T08:00:00Z',
    messages_count: 1,
  },
  {
    id: 'TKT-005',
    subject: 'طلب تدريب على النظام',
    tenant_name: 'شركة الخليج للاستثمار',
    tenant_code: 'GLF-005',
    priority: 'low' as const,
    status: 'closed' as const,
    category: 'training',
    created_at: '2026-01-15T11:00:00Z',
    updated_at: '2026-01-17T14:00:00Z',
    messages_count: 8,
  },
];

const mockNotifications = [
  {
    id: '1',
    type: 'system',
    title: 'تحديث النظام',
    message: 'سيتم تحديث النظام يوم الجمعة القادم من الساعة 2:00 إلى 4:00 صباحاً',
    sent_to: 'all',
    sent_at: '2026-01-19T10:00:00Z',
    read_count: 250,
    total_count: 342,
  },
  {
    id: '2',
    type: 'billing',
    title: 'تذكير بموعد التجديد',
    message: 'يرجى العلم بأن اشتراكك سينتهي خلال 7 أيام',
    sent_to: 'expiring',
    sent_at: '2026-01-18T08:00:00Z',
    read_count: 15,
    total_count: 20,
  },
  {
    id: '3',
    type: 'feature',
    title: 'ميزة جديدة: التقارير المتقدمة',
    message: 'يسرنا إعلامكم بإطلاق ميزة التقارير المتقدمة الجديدة',
    sent_to: 'all',
    sent_at: '2026-01-15T12:00:00Z',
    read_count: 180,
    total_count: 342,
  },
];

export default function Support() {
  const { t, language, direction } = useLanguage();
  const [tickets, setTickets] = useState(mockTickets);
  const [notifications] = useState(mockNotifications);
  const [activeTab, setActiveTab] = useState('tickets');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<typeof mockTickets[0] | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [replyText, setReplyText] = useState('');

  // Calculate stats
  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    critical: tickets.filter(t => t.priority === 'critical' && t.status !== 'closed').length,
  };

  // Filter tickets
  const filteredTickets = tickets.filter(ticket => {
    const query = searchQuery.toLowerCase();
    return (
      ticket.id.toLowerCase().includes(query) ||
      ticket.subject.toLowerCase().includes(query) ||
      ticket.tenant_name.toLowerCase().includes(query)
    );
  });

  // Get priority badge
  const getPriorityBadge = (priority: string) => {
    const priorityConfig: Record<string, { label: string; className: string }> = {
      critical: {
        label: language === 'ar' ? 'حرج' : 'Critical',
        className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 animate-pulse',
      },
      high: {
        label: language === 'ar' ? 'عالي' : 'High',
        className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      },
      medium: {
        label: language === 'ar' ? 'متوسط' : 'Medium',
        className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      },
      low: {
        label: language === 'ar' ? 'منخفض' : 'Low',
        className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
      },
    };
    const config = priorityConfig[priority] || priorityConfig.low;
    return (
      <Badge className={cn('text-xs font-medium', config.className)}>
        {config.label}
      </Badge>
    );
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
      open: {
        label: language === 'ar' ? 'مفتوحة' : 'Open',
        className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        icon: AlertCircle,
      },
      in_progress: {
        label: language === 'ar' ? 'قيد المعالجة' : 'In Progress',
        className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        icon: Clock,
      },
      resolved: {
        label: language === 'ar' ? 'تم الحل' : 'Resolved',
        className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        icon: CheckCircle2,
      },
      closed: {
        label: language === 'ar' ? 'مغلقة' : 'Closed',
        className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
        icon: XCircle,
      },
    };
    const config = statusConfig[status] || statusConfig.open;
    const Icon = config.icon;
    return (
      <Badge className={cn('text-xs font-medium flex items-center gap-1', config.className)}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  // Get category label
  const getCategoryLabel = (category: string) => {
    const categories: Record<string, string> = {
      technical: language === 'ar' ? 'تقني' : 'Technical',
      billing: language === 'ar' ? 'فوترة' : 'Billing',
      account: language === 'ar' ? 'حساب' : 'Account',
      bug: language === 'ar' ? 'خطأ برمجي' : 'Bug',
      feature: language === 'ar' ? 'طلب ميزة' : 'Feature Request',
      training: language === 'ar' ? 'تدريب' : 'Training',
    };
    return categories[category] || category;
  };

  return (
    <div className="space-y-6" dir={direction}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-erp-navy dark:text-white font-cairo">
            {t('saas.support')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-tajawal">
            {language === 'ar' ? 'إدارة تذاكر الدعم والإشعارات' : 'Manage support tickets and notifications'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('common.refresh')}
          </Button>
          <Button>
            <Bell className="w-4 h-4 mr-2" />
            {language === 'ar' ? 'إرسال إشعار' : 'Send Notification'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {language === 'ar' ? 'إجمالي التذاكر' : 'Total Tickets'}
                </p>
                <p className="text-2xl font-bold text-erp-navy dark:text-white mt-1">
                  {stats.total}
                </p>
              </div>
              <Ticket className="w-8 h-8 text-gray-300" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  {language === 'ar' ? 'مفتوحة' : 'Open'}
                </p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">
                  {stats.open}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200 dark:border-yellow-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                  {language === 'ar' ? 'قيد المعالجة' : 'In Progress'}
                </p>
                <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300 mt-1">
                  {stats.inProgress}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-600 dark:text-green-400">
                  {language === 'ar' ? 'تم الحل' : 'Resolved'}
                </p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300 mt-1">
                  {stats.resolved}
                </p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>

        {stats.critical > 0 && (
          <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {language === 'ar' ? 'حرجة' : 'Critical'}
                  </p>
                  <p className="text-2xl font-bold text-red-700 dark:text-red-300 mt-1 animate-pulse">
                    {stats.critical}
                  </p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-500/50 animate-pulse" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="tickets" className="gap-2">
              <Ticket className="w-4 h-4" />
              {language === 'ar' ? 'التذاكر' : 'Tickets'}
              {stats.open > 0 && (
                <Badge className="bg-blue-500 text-white text-[10px] h-5 px-1.5">
                  {stats.open}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="w-4 h-4" />
              {language === 'ar' ? 'الإشعارات' : 'Notifications'}
            </TabsTrigger>
          </TabsList>

          {/* Search */}
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder={t('common.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Tickets Tab */}
        <TabsContent value="tickets">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === 'ar' ? 'رقم التذكرة' : 'Ticket #'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الموضوع' : 'Subject'}</TableHead>
                    <TableHead>{language === 'ar' ? 'المشترك' : 'Subscriber'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الأولوية' : 'Priority'}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead>{language === 'ar' ? 'آخر تحديث' : 'Last Update'}</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets.map((ticket) => (
                    <TableRow 
                      key={ticket.id} 
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                      onClick={() => {
                        setSelectedTicket(ticket);
                        setIsDetailsOpen(true);
                      }}
                    >
                      <TableCell className="font-mono text-sm font-semibold">{ticket.id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{ticket.subject}</span>
                          {ticket.messages_count > 0 && (
                            <Badge variant="outline" className="text-[10px]">
                              <MessageSquare className="w-3 h-3 mr-1" />
                              {ticket.messages_count}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-sm">{ticket.tenant_name}</p>
                            <p className="text-xs text-gray-400">{ticket.tenant_code}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                      <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(ticket.updated_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTicket(ticket);
                              setIsDetailsOpen(true);
                            }}>
                              <Eye className="w-4 h-4 mr-2" />
                              {t('common.details')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                              <MessageSquare className="w-4 h-4 mr-2" />
                              {language === 'ar' ? 'إرسال رد' : 'Reply'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                              <DropdownMenuItem onClick={(e) => e.stopPropagation()} className="text-green-600">
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                {language === 'ar' ? 'تم الحل' : 'Mark Resolved'}
                              </DropdownMenuItem>
                            )}
                            {ticket.status !== 'closed' && (
                              <DropdownMenuItem onClick={(e) => e.stopPropagation()} className="text-gray-600">
                                <XCircle className="w-4 h-4 mr-2" />
                                {language === 'ar' ? 'إغلاق' : 'Close'}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === 'ar' ? 'العنوان' : 'Title'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الرسالة' : 'Message'}</TableHead>
                    <TableHead>{language === 'ar' ? 'المستلمون' : 'Recipients'}</TableHead>
                    <TableHead>{language === 'ar' ? 'نسبة القراءة' : 'Read Rate'}</TableHead>
                    <TableHead>{language === 'ar' ? 'تاريخ الإرسال' : 'Sent Date'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notifications.map((notification) => (
                    <TableRow key={notification.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-blue-500" />
                          <span className="font-medium">{notification.title}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-gray-600">
                        {notification.message}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {notification.sent_to === 'all' 
                            ? (language === 'ar' ? 'الجميع' : 'All')
                            : notification.sent_to}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500 rounded-full"
                              style={{ width: `${(notification.read_count / notification.total_count) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">
                            {notification.read_count}/{notification.total_count}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(notification.sent_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Ticket Details Sheet */}
      {selectedTicket && (
        <UnifiedSheet
          isOpen={isDetailsOpen}
          onClose={() => {
            setIsDetailsOpen(false);
            setSelectedTicket(null);
            setReplyText('');
          }}
          size="lg"
          icon={Ticket}
          title={selectedTicket.id}
          subtitle={selectedTicket.subject}
        >
          <div className="space-y-6 py-4">
            {/* Ticket Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">{language === 'ar' ? 'المشترك' : 'Subscriber'}</p>
                <p className="font-semibold">{selectedTicket.tenant_name}</p>
                <p className="text-xs text-gray-400">{selectedTicket.tenant_code}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('common.status')}</p>
                <div className="mt-1">{getStatusBadge(selectedTicket.status)}</div>
              </div>
              <div>
                <p className="text-sm text-gray-500">{language === 'ar' ? 'الأولوية' : 'Priority'}</p>
                <div className="mt-1">{getPriorityBadge(selectedTicket.priority)}</div>
              </div>
              <div>
                <p className="text-sm text-gray-500">{language === 'ar' ? 'التصنيف' : 'Category'}</p>
                <p className="font-medium">{getCategoryLabel(selectedTicket.category)}</p>
              </div>
            </div>

            {/* Subject */}
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">{language === 'ar' ? 'الموضوع' : 'Subject'}</h3>
              <p>{selectedTicket.subject}</p>
            </div>

            {/* Messages */}
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                {language === 'ar' ? 'المحادثة' : 'Conversation'}
                <Badge variant="outline" className="text-xs">{selectedTicket.messages_count}</Badge>
              </h3>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium">{selectedTicket.tenant_name}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(selectedTicket.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm">{selectedTicket.subject}</p>
                </div>
              </div>
            </div>

            {/* Reply */}
            {selectedTicket.status !== 'closed' && (
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">{language === 'ar' ? 'إرسال رد' : 'Send Reply'}</h3>
                <div className="space-y-3">
                  <Textarea
                    placeholder={language === 'ar' ? 'اكتب ردك هنا...' : 'Type your reply here...'}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={3}
                  />
                  <div className="flex justify-end">
                    <Button disabled={!replyText.trim()}>
                      <Send className="w-4 h-4 mr-2" />
                      {language === 'ar' ? 'إرسال' : 'Send'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </UnifiedSheet>
      )}
    </div>
  );
}
