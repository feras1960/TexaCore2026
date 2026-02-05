import React, { useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ChevronLeft, ChevronRight, Loader2, FileX } from 'lucide-react';
import { useLanguage } from '@/app/providers/LanguageProvider';

export interface Column<T> {
    header: string;
    accessorKey?: keyof T;
    cell?: (row: T) => React.ReactNode;
    className?: string;
}

interface DataTableProps<T> {
    data: T[];
    columns: Column<T>[];
    searchKey?: keyof T;
    searchPlaceholder?: string;
    onRowClick?: (row: T) => void;
    loading?: boolean;
    emptyMessage?: string;
    actions?: React.ReactNode;
    rowClassName?: (row: T) => string;
}

export function DataTable<T extends { id?: string | number }>({
    data,
    columns,
    searchKey,
    searchPlaceholder,
    onRowClick,
    loading = false,
    emptyMessage,
    actions,
    rowClassName
}: DataTableProps<T>) {
    const { t, direction } = useLanguage();
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Filter data
    const filteredData = React.useMemo(() => {
        if (!searchKey || !searchTerm) return data;
        return data.filter((item) => {
            const value = item[searchKey];
            if (typeof value === 'string') {
                return value.toLowerCase().includes(searchTerm.toLowerCase());
            }
            return false;
        });
    }, [data, searchKey, searchTerm]);

    // Pagination
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginatedData = filteredData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            {(searchKey || actions) && (
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                    {searchKey && (
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground rtl:right-3 rtl:left-auto" />
                            <Input
                                placeholder={searchPlaceholder || t('common.search')}
                                value={searchTerm}
                                onChange={handleSearch}
                                className="pl-9 rtl:pr-9 rtl:pl-3"
                            />
                        </div>
                    )}
                    {actions && <div className="flex gap-2 w-full sm:w-auto">{actions}</div>}
                </div>
            )}

            {/* Table */}
            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {columns.map((col, index) => (
                                <TableHead
                                    key={index}
                                    className={`text-start ${col.className || ''}`}
                                >
                                    {col.header}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    <div className="flex justify-center items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>{t('common.loading')}</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : paginatedData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-32 text-center">
                                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                        <FileX className="h-8 w-8 opacity-50" />
                                        <p>{emptyMessage || t('common.noData')}</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedData.map((row, rowIndex) => (
                                <TableRow
                                    key={row.id || rowIndex}
                                    onClick={() => onRowClick && onRowClick(row)}
                                    className={`${onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''} ${rowClassName ? rowClassName(row) : ''}`}
                                >
                                    {columns.map((col, colIndex) => (
                                        <TableCell key={colIndex} className={col.className}>
                                            {col.cell
                                                ? col.cell(row)
                                                : (col.accessorKey ? String(row[col.accessorKey]) : '')}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-end space-x-2 rtl:space-x-reverse">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                    >
                        <ChevronLeft className="h-4 w-4 rtl:hidden" />
                        <ChevronRight className="h-4 w-4 ltr:hidden" />
                    </Button>
                    <div className="text-sm text-muted-foreground">
                        {currentPage} / {totalPages}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                    >
                        <ChevronRight className="h-4 w-4 rtl:hidden" />
                        <ChevronLeft className="h-4 w-4 ltr:hidden" />
                    </Button>
                </div>
            )}
        </div>
    );
}
