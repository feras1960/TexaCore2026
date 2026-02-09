import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { Scan, Search, CheckCircle, Plus, QrCode } from 'lucide-react';
import { qrCodeService, QRCode } from '@/services/qrCodeService';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { QRCodeDisplay } from '@/components/shared/QR/QRCodeDisplay';

export const AdvancedQRScannerPage: React.FC = () => {
    const { user } = useAuth();
    const [scanInput, setScanInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [scannedData, setScannedData] = useState<QRCode | null>(null);
    const [lastScanResult, setLastScanResult] = useState<any>(null);

    // Generator State
    const [genType, setGenType] = useState<string>('material');
    const [genId, setGenId] = useState<string>(crypto.randomUUID());
    const [generatedQR, setGeneratedQR] = useState<QRCode | null>(null);

    const handleSearch = async () => {
        if (!scanInput) return;
        setLoading(true);
        setScannedData(null);
        setLastScanResult(null);

        try {
            const qrData = await qrCodeService.getByCode(scanInput);
            if (qrData) {
                setScannedData(qrData);
                toast.success('QR Code Found');
            } else {
                toast.error('QR Code not found in system');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error fetching QR code');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (newStatus: string) => {
        if (!scannedData || !user) return;
        setLoading(true);

        try {
            const { data, error } = await supabase.rpc('update_entity_status_on_scan', {
                p_qr_code: scannedData.code,
                p_new_status: newStatus,
                p_user_id: user.id
            });

            if (error) throw error;

            setLastScanResult(data);
            toast.success(`Status updated to: ${newStatus}`);
            handleSearch();
        } catch (error: any) {
            console.error(error);
            toast.error('Failed to update status: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        if (!genId) return;
        setLoading(true);
        try {
            const newQR = await qrCodeService.getOrCreateQRCode(genType as any, genId);
            if (newQR) {
                setGeneratedQR(newQR);
                toast.success(`Generated: ${newQR.code}`);
            }
        } catch (error: any) {
            toast.error('Generation failed: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-cairo text-erp-navy dark:text-gray-100">
                        Advanced QR Scanner
                    </h1>
                    <p className="text-gray-500 font-tajawal">
                        Simulate scanning and updating entity statuses (Invoices, Materials, Rolls)
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Column 1: Generator (Debug Tool) */}
                <Card className="lg:col-span-1 border-dashed border-2 border-indigo-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                            <Plus className="w-5 h-5" />
                            Debug Generator
                        </CardTitle>
                        <CardDescription>
                            Create a test QR code if you don't have one.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Entity Type</Label>
                            <Select value={genType} onValueChange={setGenType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="material">Material</SelectItem>
                                    <SelectItem value="invoice">Invoice</SelectItem>
                                    <SelectItem value="roll">Roll</SelectItem>
                                    <SelectItem value="entry">Journal Entry</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Entity ID (UUID)</Label>
                            <Input
                                value={genId}
                                onChange={(e) => setGenId(e.target.value)}
                                placeholder="UUID"
                                className="font-mono text-xs"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setGenId(crypto.randomUUID())}
                                className="w-full text-xs"
                            >
                                Generate Random UUID
                            </Button>
                        </div>

                        <Button onClick={handleGenerate} className="w-full bg-indigo-600 hover:bg-indigo-700">
                            Generate & Save QR
                        </Button>

                        {generatedQR && (
                            <div className="mt-4 pt-4 border-t flex flex-col items-center animate-in zoom-in-95">
                                <QRCodeDisplay value={generatedQR.code} size={150} />
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="mt-2 w-full"
                                    onClick={() => setScanInput(generatedQR.code)}
                                >
                                    Use in Scanner
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Column 2 & 3: Scanner & Result */}
                <div className="lg:col-span-2 grid grid-cols-1 gap-6">
                    {/* Scanner Input */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Scan className="w-5 h-5 text-primary" />
                                Scan Operations
                            </CardTitle>
                            <CardDescription>
                                Enter the code manually (e.g. INV-123-XYZ) since we are in browser mode.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <Input
                                        placeholder="Enter QR Code to Scan..."
                                        value={scanInput}
                                        onChange={(e) => setScanInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                        className="text-lg font-mono tracking-wider"
                                    />
                                </div>
                                <Button onClick={handleSearch} disabled={loading} size="lg">
                                    {loading ? 'Scanning...' : <Search className="w-5 h-5" />}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Result Area */}
                    <Card className={`transition-all duration-300 ${scannedData ? 'ring-2 ring-green-500 shadow-lg' : ''}`}>
                        <CardHeader>
                            <CardTitle>Scan Result</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {scannedData ? (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">

                                    {/* Status Banner */}
                                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-100 rounded-lg flex items-start gap-4">
                                        <QrCode className="w-12 h-12 text-green-600 mt-1" />
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-lg font-bold text-green-900 dark:text-green-100">
                                                    {scannedData.code}
                                                </h3>
                                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-bold uppercase">
                                                    Valid
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm mt-3">
                                                <div className="flex flex-col">
                                                    <span className="text-gray-500 uppercase text-xs">Type</span>
                                                    <span className="font-semibold capitalize">{scannedData.entity_type}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-gray-500 uppercase text-xs">Current Status</span>
                                                    <span className="font-bold text-primary text-base">{scannedData.current_status}</span>
                                                </div>
                                                <div className="flex flex-col col-span-2 mt-2">
                                                    <span className="text-gray-500 uppercase text-xs">Entity ID</span>
                                                    <span className="font-mono text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 p-1 rounded truncate">
                                                        {scannedData.entity_id}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="space-y-3">
                                        <Label className="text-base">Update Status To:</Label>
                                        <div className="flex flex-wrap gap-3">
                                            {['Scanned', 'Received', 'Delivered', 'Rejected', 'Pending'].map((status) => (
                                                <Button
                                                    key={status}
                                                    variant={scannedData.current_status === status.toLowerCase() ? "default" : "outline"}
                                                    onClick={() => handleUpdateStatus(status.toLowerCase())}
                                                    className="min-w-[100px]"
                                                >
                                                    {status}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Logs */}
                                    {lastScanResult && (
                                        <div className="mt-6 pt-4 border-t">
                                            <p className="font-bold text-gray-500 mb-2 text-xs uppercase">Server Response:</p>
                                            <pre className="bg-gray-950 text-gray-50 p-3 rounded-md text-xs font-mono overflow-auto max-h-40">
                                                {JSON.stringify(lastScanResult, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="h-48 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed rounded-lg bg-gray-50/50 dark:bg-gray-800/50">
                                    <div className="bg-white dark:bg-gray-800 p-4 rounded-full mb-3 shadow-sm">
                                        <Scan className="w-8 h-8 opacity-50" />
                                    </div>
                                    <p className="font-medium">Ready to Scan</p>
                                    <p className="text-sm opacity-70">Generate a code on the left or enter one above</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default AdvancedQRScannerPage;
