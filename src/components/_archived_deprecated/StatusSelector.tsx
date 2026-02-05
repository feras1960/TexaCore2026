/**
 * Status Selector Component
 * مكون اختيار الحالة
 * 
 * Dropdown selector for changing document status
 * Similar to the one in Reem Online screenshots
 */

import { useState, useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ChevronDown, 
  Search,
  Check,
  Clock,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge } from './StatusBadge';
import { 
  statusService, 
  type CustomStatus,
  STATUS_COLORS,
  type StatusColor
} from '@/services/statusService';

interface StatusSelectorProps {
  currentStatus: CustomStatus | null;
  statuses: CustomStatus[];
  onChange: (status: CustomStatus, comment?: string) => void;
  disabled?: boolean;
  requireComment?: boolean;
  showSearch?: boolean;
  className?: string;
}

export function StatusSelector({
  currentStatus,
  statuses,
  onChange,
  disabled = false,
  requireComment = false,
  showSearch = true,
  className,
}: StatusSelectorProps) {
  const { t, language, direction } = useLanguage();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<CustomStatus | null>(null);
  const [comment, setComment] = useState('');

  // Group statuses by their group
  const groupedStatuses = useMemo(() => {
    const grouped = statusService.groupStatusesByGroup(statuses);
    return Array.from(grouped.entries()).sort((a, b) => 
      (a[1].group.sort_order || 0) - (b[1].group.sort_order || 0)
    );
  }, [statuses]);

  // Filter statuses by search
  const filteredGroups = useMemo(() => {
    if (!search) {
      // Convert to consistent format
      return groupedStatuses.map(([key, { group, statuses: groupStatuses }]) => ({
        key,
        group,
        statuses: groupStatuses
      }));
    }

    return groupedStatuses.map(([key, { group, statuses: groupStatuses }]) => ({
      key,
      group,
      statuses: groupStatuses.filter(s => 
        s.name_ar.toLowerCase().includes(search.toLowerCase()) ||
        (s.name_en && s.name_en.toLowerCase().includes(search.toLowerCase())) ||
        s.code.toLowerCase().includes(search.toLowerCase())
      )
    })).filter(g => g.statuses.length > 0);
  }, [groupedStatuses, search]);

  const handleSelect = (status: CustomStatus) => {
    if (requireComment) {
      setSelectedStatus(status);
    } else {
      onChange(status);
      setOpen(false);
    }
  };

  const handleConfirm = () => {
    if (selectedStatus) {
      onChange(selectedStatus, comment);
      setSelectedStatus(null);
      setComment('');
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "justify-between min-w-[150px] h-auto py-1.5",
            className
          )}
        >
          {currentStatus ? (
            <StatusBadge status={currentStatus} size="sm" />
          ) : (
            <span className="text-muted-foreground">
              {t('statusManager.selectStatus')}
            </span>
          )}
          <ChevronDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent 
        className="w-[280px] p-0" 
        align={direction === 'rtl' ? 'end' : 'start'}
      >
        {/* Comment input mode */}
        {selectedStatus && requireComment && (
          <div className="p-3 space-y-3">
            <div className="flex items-center gap-2">
              <StatusBadge status={selectedStatus} size="sm" />
              <span className="text-sm text-muted-foreground">
                {t('statusManager.changeTo')}
              </span>
            </div>
            
            <Textarea
              placeholder={t('statusManager.addComment')}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[80px] resize-none"
            />

            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedStatus(null)}
              >
                {t('common.cancel')}
              </Button>
              <Button
                size="sm"
                onClick={handleConfirm}
              >
                {t('common.confirm')}
              </Button>
            </div>
          </div>
        )}

        {/* Status selection mode */}
        {!selectedStatus && (
          <>
            {showSearch && (
              <div className="p-2 border-b">
                <div className="relative">
                  <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('common.search')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="ps-8 h-9"
                  />
                </div>
              </div>
            )}

            <ScrollArea className="max-h-[350px]">
              <div className="p-1">
                {filteredGroups.map(({ key, group, statuses: groupStatuses }, index) => (
                  <div key={key}>
                    {index > 0 && <Separator className="my-1" />}
                    
                    {/* Group header */}
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-2">
                      <span>
                        {language === 'ar' ? group.name_ar : (group.name_en || group.name_ar)}
                      </span>
                    </div>

                    {/* Statuses in group */}
                    {groupStatuses.map((status: CustomStatus) => {
                      const isSelected = currentStatus?.id === status.id;
                      const colorConfig = STATUS_COLORS[(status.color as StatusColor) || 'gray'];

                      return (
                        <button
                          key={status.id}
                          onClick={() => handleSelect(status)}
                          className={cn(
                            "w-full flex items-center gap-2 px-2 py-2 text-sm rounded-md transition-colors",
                            "hover:bg-accent hover:text-accent-foreground",
                            isSelected && "bg-accent"
                          )}
                        >
                          {/* Color indicator */}
                          <div 
                            className={cn(
                              "w-3 h-3 rounded-full",
                              colorConfig.bg,
                              colorConfig.border,
                              "border"
                            )}
                          />

                          {/* Status name */}
                          <span className="flex-1 text-start">
                            {language === 'ar' ? status.name_ar : (status.name_en || status.name_ar)}
                          </span>

                          {/* Time norm if exists */}
                          {status.time_norm_hours && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {status.time_norm_hours}h
                            </span>
                          )}

                          {/* Check mark for selected */}
                          {isSelected && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}

                {filteredGroups.length === 0 && (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    {t('statusManager.noStatuses')}
                  </div>
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default StatusSelector;
