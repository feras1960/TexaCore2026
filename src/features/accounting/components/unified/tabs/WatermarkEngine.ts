import * as QRCode from 'qrcode';

export interface WatermarkSettings {
    enabled: boolean;
    companyName: string;
    showCode: boolean;
    showName: boolean;
    showComposition: boolean;
    showDesign: boolean;
    showColor: boolean;
    showQRCode: boolean;
    showBarcode: boolean;
    language: 'ar' | 'en' | 'tr' | 'bilingual';
    position: 'bottom-left' | 'bottom-right' | 'top-right';
    priceMode?: 'none' | 'wholesale' | 'retail';
    priceValue?: number | string;
    currency?: string;
}

export interface MaterialData {
    code?: string;
    name_ar?: string;
    name_en?: string;
    composition?: string;
    design?: string;
    color?: string;
    barcode?: string;
}

export async function createWatermarkedImage(
    imageUrl: string, 
    settings: WatermarkSettings, 
    data: MaterialData
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = async () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            
            // Programmatically create a pristine white footer for the data
            const footerHeight = settings.enabled ? Math.max(160, Math.floor(img.height * 0.12)) : 0;
            canvas.height = img.height + footerHeight;
            
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('Canvas context failed'));

            // Fill entire canvas with pure white
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw base image at the top
            ctx.drawImage(img, 0, 0);

            // Draw a subtle border line
            if (settings.enabled) {
                ctx.fillStyle = '#e2e8f0'; 
                ctx.fillRect(0, img.height, canvas.width, 4);
            }

            if (!settings.enabled) {
                canvas.toBlob((b) => b ? resolve(b) : reject(new Error('Blob fail')), 'image/jpeg', 0.95);
                return;
            }

            // --- Footer Layout Data ---
            const isRTL = settings.language === 'ar';
            const padX = Math.floor(canvas.width * 0.04);
            const padY = Math.floor(footerHeight * 0.20);
            
            // Scaled fonts
            const fontTitle = Math.max(28, Math.floor(footerHeight * 0.35));
            const fontLabel = Math.max(16, Math.floor(footerHeight * 0.18));
            const fontValue = Math.max(18, Math.floor(footerHeight * 0.20));

            const startY = img.height;
            const drawTop = startY + padY;
            const availableHeight = footerHeight - (padY * 2);

            let currentLeftX = padX;
            let currentRightX = canvas.width - padX;

            const getName = () => {
                let n = '';
                if (settings.language === 'ar') n = data.name_ar || data.name_en || '';
                else if (settings.language === 'en') n = data.name_en || data.name_ar || '';
                else if (settings.language === 'bilingual') n = [data.name_ar, data.name_en].filter(Boolean).join(' | ');
                else n = data.name_ar || '';
                return n;
            };

            // 1. Draw QR Code 
            const qrSize = settings.showQRCode ? availableHeight : 0;
            if (settings.showQRCode) {
                try {
                    const qrCanvas = document.createElement('canvas');
                    await QRCode.toCanvas(qrCanvas, JSON.stringify({ c: data.code, n: data.name_en || data.name_ar }), { width: qrSize, margin: 0 });
                    
                    if (isRTL) { 
                        ctx.drawImage(qrCanvas, currentLeftX, drawTop, qrSize, qrSize);
                        currentLeftX += qrSize + padX;
                    } else { 
                        ctx.drawImage(qrCanvas, currentRightX - qrSize, drawTop, qrSize, qrSize);
                        currentRightX -= (qrSize + padX);
                    }
                } catch (err) {
                    console.error('QR Generate Error', err);
                }
            }

            // 2. Draw Company Name
            if (settings.companyName) {
                ctx.font = `900 ${fontTitle}px "Tajawal", "Inter", sans-serif`;
                ctx.fillStyle = '#312e81'; 
                ctx.textBaseline = 'middle';
                const textY = drawTop + (availableHeight / 2);
                
                if (isRTL) {
                    ctx.textAlign = 'right';
                    ctx.fillText(settings.companyName, currentRightX, textY);
                    currentRightX -= (ctx.measureText(settings.companyName).width + padX);
                } else {
                    ctx.textAlign = 'left';
                    ctx.fillText(settings.companyName, currentLeftX, textY);
                    currentLeftX += (ctx.measureText(settings.companyName).width + padX);
                }
            }

            // 3. Draw Grid Info
            const specItems: {label: string, value: string}[] = [];
            if (settings.showCode && data.code) specItems.push({ label: isRTL ? 'الكود:' : 'Code:', value: data.code });
            const nName = getName();
            if (settings.showName && nName) specItems.push({ label: isRTL ? 'الاسم:' : 'Name:', value: nName });
            if (settings.showComposition && data.composition) specItems.push({ label: isRTL ? 'المكونات:' : 'Comp:', value: data.composition });
            if (settings.showDesign && data.design) specItems.push({ label: isRTL ? 'التصميم:' : 'Design:', value: data.design });
            if (settings.showColor && data.color) specItems.push({ label: isRTL ? 'اللون:' : 'Color:', value: data.color });
            
            if (settings.priceMode && settings.priceMode !== 'none' && settings.priceValue) {
                const pl = settings.priceMode === 'wholesale' ? (isRTL ? 'سعر الجملة:' : 'Wholesale:') : (isRTL ? 'سعر المفرق:' : 'Retail:');
                specItems.push({ label: pl, value: `${settings.priceValue} ${settings.currency || ''}` });
            }

            if (specItems.length > 0) {
                const totalSpace = currentRightX - currentLeftX;
                const itemsPerRow = Math.ceil(specItems.length / 2);
                const colWidth = Math.floor(totalSpace / itemsPerRow);
                
                const row1Y = drawTop + (availableHeight * 0.3);
                const row2Y = drawTop + (availableHeight * 0.85);

                specItems.forEach((item, idx) => {
                    const row = idx % 2 === 0 ? 0 : 1; 
                    const col = Math.floor(idx / 2); 
                    
                    // X position
                    let drawX = 0;
                    if (isRTL) {
                        drawX = currentRightX - (col * colWidth);
                        ctx.textAlign = 'right';
                    } else {
                        drawX = currentLeftX + (col * colWidth);
                        ctx.textAlign = 'left';
                    }
                    
                    const drawY = row === 0 ? row1Y : row2Y;

                    // Label
                    ctx.font = `600 ${fontLabel}px "Tajawal", "Inter", sans-serif`;
                    ctx.fillStyle = '#64748b'; 
                    ctx.textBaseline = 'alphabetic';
                    ctx.fillText(item.label, drawX, drawY);

                    // Value
                    const labelWidth = ctx.measureText(item.label + " ").width;
                    ctx.font = `bold ${fontValue}px "Tajawal", "Inter", sans-serif`;
                    
                    if (item.label.includes('سعر') || item.label.includes('Wholesale') || item.label.includes('Retail')) {
                        ctx.fillStyle = '#059669'; 
                    } else {
                        ctx.fillStyle = '#0f172a'; 
                    }

                    const valX = isRTL ? drawX - labelWidth : drawX + labelWidth;
                    ctx.fillText(item.value, valX, drawY);
                });
            }

            canvas.toBlob((b) => b ? resolve(b) : reject(new Error('Blob fail')), 'image/jpeg', 0.95);
        };
        img.onerror = () => reject(new Error('Failed to load image for watermarking'));
        img.src = imageUrl + (imageUrl.includes('?') ? '&' : '?') + 'cors_cache_bust=' + new Date().getTime(); 
    });
}
