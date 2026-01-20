import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface AddCostCenterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: any;
}

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  code: z.string().min(2, {
    message: "Code must be at least 2 characters.",
  }),
  parent: z.string().optional(),
  budget: z.string().optional(),
});

export function AddCostCenterDialog({ open, onOpenChange, initialData }: AddCostCenterDialogProps) {
  const { t, direction } = useLanguage();
  const [showCloseAlert, setShowCloseAlert] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      code: "",
      parent: "none",
      budget: "",
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        code: initialData.code,
        parent: initialData.parent === '-' ? 'none' : initialData.parent,
        budget: initialData.budget.toString(),
      });
    } else {
      form.reset({
        name: "",
        code: "",
        parent: "none",
        budget: "",
      });
    }
  }, [initialData, form, open]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
    // Here you would typically call an API to save the data
    onOpenChange(false);
    form.reset();
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && form.formState.isDirty) {
      setShowCloseAlert(true);
    } else {
      onOpenChange(newOpen);
    }
  };

  const handleClose = () => {
    setShowCloseAlert(false);
    onOpenChange(false);
    form.reset();
  };

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-full sm:max-w-[425px]" dir={direction}>
        <DialogHeader>
          <DialogTitle>{initialData ? t('editCostCenter') : t('addCostCenter')}</DialogTitle>
          <DialogDescription>
            {initialData ? 'Update cost center details.' : 'Create a new cost center to track expenses.'}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('costCenterName')}</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Marketing" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('costCenterCode')}</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. CC-001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="parent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('parentCostCenter')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select parent cost center" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None (Top Level)</SelectItem>
                      <SelectItem value="Administration">Administration</SelectItem>
                      <SelectItem value="Sales Department">Sales Department</SelectItem>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="budget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('budget') || 'Budget'}</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                {t('cancel') || 'Cancel'}
              </Button>
              <Button type="submit" className="bg-erp-navy hover:bg-erp-navy/90">
                {initialData ? (t('saveChanges') || 'Save Changes') : (t('create') || 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

    <AlertDialog open={showCloseAlert} onOpenChange={setShowCloseAlert}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('unsavedChanges') || 'تغييرات غير محفوظة'}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('unsavedChangesDesc') || 'لديك تغييرات غير محفوظة. هل أنت متأكد من الخروج؟ سيتم فقدان جميع التغييرات.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setShowCloseAlert(false)}>
            {t('keepEditing') || 'متابعة التعديل'}
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleClose} className="bg-red-600 hover:bg-red-700">
            {t('discard') || 'تجاهل التغييرات'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
