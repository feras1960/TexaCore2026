import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card } from '@/components/ui/card';

interface QRCodeDisplayProps {
    value: string;
    size?: number;
    title?: string;
    className?: string;
}

export default function QRCodeDisplay({
    value,
    size = 80,
    title,
    className = ''
}: QRCodeDisplayProps) {
    return (
        <Card className={`p-2 bg-white dark:bg-gray-800 ${className}`}>
            {title && (
                <div className="text-xs text-center text-gray-600 dark:text-gray-400 mb-1">
                    {title}
                </div>
            )}
            <QRCodeSVG
                value={value}
                size={size}
                level="M"
                includeMargin={false}
                className="mx-auto"
            />
        </Card>
    );
}
