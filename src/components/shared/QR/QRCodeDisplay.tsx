import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

interface QRCodeDisplayProps {
    value: string; // The code string (e.g. MAT-123-XYZ)
    title?: string;
    size?: number;
    showPrint?: boolean;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
    value,
    title = 'QR Code',
    size = 128,
    showPrint = true,
}) => {
    const handlePrint = () => {
        const printWindow = window.open('', '', 'width=600,height=600');
        if (printWindow) {
            printWindow.document.write(`
        <html>
          <head>
            <title>Print QR - ${value}</title>
            <style>
              body { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; }
              .code { font-size: 24px; font-weight: bold; margin-top: 20px; }
            </style>
          </head>
          <body>
            ${document.getElementById(`qr-${value}`)?.outerHTML || ''}
            <div class="code">${value}</div>
            <script>
              window.onload = () => { window.print(); window.close(); }
            </script>
          </body>
        </html>
      `);
            printWindow.document.close();
        }
    };

    return (
        <Card className="w-fit mx-auto">
            <CardHeader className="pb-2">
                <CardTitle className="text-center text-sm font-medium text-gray-500">
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
                <div className="p-4 bg-white rounded-lg border" id={`qr-wrapper-${value}`}>
                    <QRCodeSVG
                        id={`qr-${value}`}
                        value={value}
                        size={size}
                        level="H"
                        includeMargin={true}
                    />
                </div>
                <div className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                    {value}
                </div>
                {showPrint && (
                    <Button variant="outline" size="sm" onClick={handlePrint} className="w-full">
                        <Printer className="w-4 h-4 mr-2" />
                        Print
                    </Button>
                )}
            </CardContent>
        </Card>
    );
};
