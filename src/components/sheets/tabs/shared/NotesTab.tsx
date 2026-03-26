/**
 * Notes Tab - تبويب الملاحظات
 * يعرض الملاحظات والتعليقات المرتبطة بالسجل
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/app/providers/LanguageProvider';
import {
  StickyNote,
  Edit,
  Trash2,
  Calendar,
  User,
  Pin,
  MessageCircle,
  Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotesTabProps {
  data: any;
  language: string;
  onAction?: (actionId: string, data?: any) => void;
}

export function NotesTab({ data, language, onAction }: NotesTabProps) {
  const { t } = useLanguage();
  const isRTL = language === 'ar';
  const [newNote, setNewNote] = useState('');
  const notes = data.notes_list || data.comments || [];

  const handleAddNote = () => {
    if (newNote.trim()) {
      onAction?.('add_note', { content: newNote });
      setNewNote('');
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Add Note Section */}
      <Card className="bg-gray-50 dark:bg-gray-800/50">
        <CardContent className="p-3">
          <div className="space-y-2">
            <Textarea
              placeholder={t('tabs.writeNote')}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="min-h-[80px] resize-none"
            />
            <div className="flex justify-end">
              <Button 
                size="sm" 
                onClick={handleAddNote}
                disabled={!newNote.trim()}
              >
                <Send className="w-4 h-4 me-2" />
                {t('tabs.addNote')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className="text-center py-8">
          <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">
            {t('tabs.noNotes')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note: any, index: number) => (
            <Card 
              key={note.id || index}
              className={cn(
                "relative",
                note.pinned && "border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10"
              )}
            >
              {note.pinned && (
                <Pin className="absolute top-2 end-2 w-4 h-4 text-amber-500" />
              )}
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <StickyNote className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {note.content || note.text}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      {note.createdAt && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(note.createdAt).toLocaleDateString(isRTL ? 'ar-u-nu-latn' : 'en-US')}
                        </span>
                      )}
                      {note.author && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {note.author}
                        </span>
                      )}
                      {note.type && (
                        <Badge variant="outline" className="text-[10px]">
                          {note.type}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 w-7 p-0"
                      onClick={() => onAction?.('edit_note', note)}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 w-7 p-0 text-red-500"
                      onClick={() => onAction?.('delete_note', note)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quick note if exists in data */}
      {(data.notes || data.description) && !notes.length && (
        <Card className="bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800">
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <StickyNote className="w-4 h-4 text-yellow-600 mt-0.5" />
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {data.notes || data.description}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
