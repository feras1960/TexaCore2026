import React from 'react';
import { NexaDataTable } from '@/components/ui/nexa-data-table';
import { ColumnDef } from '@tanstack/react-table';

const columns: ColumnDef<any>[] = [
    { accessorKey: 'title', header: 'Task' },
    { accessorKey: 'dueDate', header: 'Due Date' },
    { accessorKey: 'priority', header: 'Priority' },
    { accessorKey: 'status', header: 'Status' },
];

export default function TasksTable() {
    return (
        <div className="animate-in fade-in duration-500">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-erp-navy dark:text-gray-100">
                    Tasks & Follow-ups
                </h2>
            </div>
            <NexaDataTable
                columns={columns}
                data={[]}
                searchPlaceholder="Search tasks..."
            />
        </div>
    );
}
