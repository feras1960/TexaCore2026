const fs = require('fs');
const path = require('path');

const fileP = path.join(__dirname, 'src/features/accounting/components/unified/tabs/WatermarkEngine.ts');

const newEngine = `import * as QRCode from 'qrcode';

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
            
            // Programmatically create a pristine white footer for the data to guarantee readability
            const footerHeight = settings.enabled ? Math.max(160, Math.floor(img.height * 0.12)) : 0;
            canvas.height = img.height + footerHeight;
            
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('Canvas context failed'));

            // 1. Fill entire canvas with pure white (so footer is natively white)
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 2. Draw base image at the top
            ctx.drawImage(img, 0, 0);

            // Draw a subtle thin border line separating image from footer
            if (settings.enabled) {
                ctx.fillStyle = '#e2e8f0'; // slate-200
                ctx.fillRect(0, img.height, canvas.width, 3);
            }

            if (!settings.enabled) {
                canvas.toBlob((b) => b ? resolve(b) : reject(new Error('Blob fail')), 'image/jpeg', 0.95);
                return;
            }

            // --- Footer Layout Data ---
            const isRTL = settings.language === 'ar';
            const padX = Math.floor(canvas.width * 0.03); // 3% margin
            const padY = Math.floor(footerHeight * 0.15); // 15% top/bottom pad
            
            // Fonts
            const fontTitle = Math.max(24, Math.floor(footerHeight * 0.35));
            const fontLabel = Math.max(16, Math.floor(footerHeight * 0.16));
            const fontValue = Math.max(18, Math.floor(footerHeight * 0.18));

            // Coordinates
            const startY = img.height;
            const drawTop = startY + padY;
            const availableHeight = footerHeight - (padY * 2);

            let currentLeftX = padX;
            let currentRightX = canvas.width - padX;

            // Helper to determine text line
            const getName = () => {
                if (settings.language === 'ar' && data.name_ar) return data.name_ar;
                if (settings.language === 'en' && data.name_en) return data.name_en;
                if (settings.language === 'bilingual') return [data.name_ar, data.name_en].filter(Boolean).join(' | ');
                return data.name_ar || data.name_en || '';
            };

            // 1. Draw QR Code (placed on the edge, left or right depending on language)
            const qrSize = settings.showQRCode ? availableHeight : 0;
            if (settings.showQRCode) {
                try {
                    const qrCanvas = document.createElement('canvas');
                    await QRCode.toCanvas(qrCanvas, JSON.stringify({ c: data.code, n: data.name_en || data.name_ar }), { width: qrSize, margin: 0 });
                    
                    if (isRTL) { // Place on the far left natively
                        ctx.drawImage(qrCanvas, currentLeftX, drawTop, qrSize, qrSize);
                        currentLeftX += qrSize + padX;
                    } else { // Place on far right
                        ctx.drawImage(qrCanvas, currentRightX - qrSize, drawTop, qrSize, qrSize);
                        currentRightX -= (qrSize + padX);
                    }
                } catch (err) {
                    console.error('QR Generate Error', err);
                }
            }

            // 2. Draw Company Name Logo/Text
            if (settings.companyName) {
                ctx.font = \`900 \${fontTitle}px "Tajawal", "Inter", sans-serif\`;
                ctx.fillStyle = '#312e81'; // Deep Indigo
                ctx.textBaseline = 'middle';
                
                if (isRTL) {
                    ctx.textAlign = 'right';
                    ctx.fillText(settings.companyName, currentRightX, drawTop + (availableHeight / 2));
                    const textW = ctx.measureText(settings.companyName).width;
                    currentRightX -= (textW + padX * 1.5);
                } else {
                    ctx.textAlign = 'left';
                    ctx.fillText(settings.companyName, currentLeftX, drawTop + (availableHeight / 2));
                    const textW = ctx.measureText(settings.companyName).width;
                    currentLeftX += (textW + padX * 1.5);
                }
            }

            // 3. Draw The Grid Of Specification Text
            // We have remaining horizontal space between currentLeftX and currentRightX.
            // Let's lay them out in 1 or 2 rows.
            
            const specItems: {label: string, value: string}[] = [];
            if (settings.showCode && data.code) specItems.push({ label: isRTL ? 'الكود:' : 'Code:', value: data.code });
            if (settings.showName) {
                const n = getName();
                if (n) specItems.push({ label: isRTL ? 'الاسم:' : 'Name:', value: n });
            }
            if (settings.showComposition && data.composition) specItems.push({ label: isRTL ? 'المكونات:' : 'Composition:', value: data.composition });
            if (settings.showDesign && data.design) specItems.push({ label: isRTL ? 'التصميم:' : 'Design:', value: data.design });
            if (settings.showColor && data.color) specItems.push({ label: isRTL ? 'اللون:' : 'Color:', value: data.color });
            
            if (settings.priceMode && settings.priceMode !== 'none' && settings.priceValue) {
                const pl = settings.priceMode === 'wholesale' ? (isRTL ? 'سعر الجملة:' : 'Wholesale:') : (isRTL ? 'سعر المفرق:' : 'Retail:');
                specItems.push({ label: pl, value: \`\${settings.priceValue} \${settings.currency || ''}\` });
            }

            if (specItems.length > 0) {
                const totalTextSpace = currentRightX - currentLeftX;
                const itemsPerRow = Math.ceil(specItems.length / 2);
                const colWidth = Math.floor(totalTextSpace / itemsPerRow);
                
                // Draw 2 rows
                const row1Y = drawTop + (availableHeight * 0.3);
                const row2Y = drawTop + (availableHeight * 0.75);

                ctx.textAlign = isRTL ? 'right' : 'left';
                
                specItems.forEach((item, idx) => {
                    const row = idx % 2 === 0 ? 0 : 1; // Actually let's do columns first
                    const col = Math.floor(idx / 2); // 0, 0, 1, 1, 2, 2
                    
                    const drawX = isRTL ? currentRightX - (col * colWidth) : currentLeftX + (col * colWidth);
                    const drawY = row === 0 ? row1Y : row2Y;

                    // Draw Label
                    ctx.font = \`500 \${fontLabel}px "Tajawal", "Inter", sans-serif\`;
                    ctx.fillStyle = '#64748b'; // Slate 500
                    ctx.textBaseline = 'alphabetic';
                    ctx.fillText(item.label, drawX, drawY);

                    // Draw Value
                    const labelWidth = ctx.measureText(item.label + " ").width;
                    ctx.font = \`bold \${fontValue}px "Tajawal", "Inter", sans-serif\`;
                    
                    // Highlight Price
                    if (item.label.includes('سعر') || item.label.includes('Wholesale') || item.label.includes('Retail')) {
                        ctx.fillStyle = '#059669'; // Emerald 600
                    } else {
                        ctx.fillStyle = '#0f172a'; // Slate 900
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
`;
fs.writeFileSync(fileP, newEngine);

const wizP = path.join(__dirname, 'src/features/accounting/components/unified/tabs/AIImageWizard.tsx');
let wizC = fs.readFileSync(wizP, 'utf8');

// Replacing layoutInstruction logic
wizC = wizC.replace(
/let layoutInstruction = \`CRITICAL LAYOUT COMMAND: Arrange exactly \$\{numSwatches\} fabric samples as long, elegant vertical fabric panels hanging side-by-side.*?DO NOT DRAW ANY TEXT\.\`;/s,
`// APPROACH 3: FANNED CARDS / SQUARES (User Preferred)
                            let layoutInstruction = \`CRITICAL LAYOUT COMMAND: Arrange exactly \${numSwatches} square fabric cutouts perfectly arranged in a neat grid or slightly fanned out like premium fabric swatch cards. They MUST fill the space beautifully.\`;

                            const swatchDesc = compColors.length > 0
                                ? \`Display an elegant fabric swatch presentation showing exactly \${numSwatches} overlapping square fabric cutouts: \${swatchList}. CRITICAL INSTRUCTION: EVERY single square cutout MUST visibly show the actual woven fabric texture, natural lighting, and the original \${fabricLabel} pattern dyed in its respective DIFFERENT color. \${layoutInstruction} ABSOLUTELY DO NOT DRAW ANY TEXT, LABELS, BORDERS, OR CODES.\`
                                : \`Display elegant abstract fabric swatches flowing organically. DO NOT DRAW ANY TEXT.\`;`
);

// Removing the white banner prompt instruction in AIImageWizard (Lines ~848-857)
wizC = wizC.replace(
/A completely clean, solid white, totally blank horizontal banner spanning the entire width at the very bottom edge.*?DO NOT draw any vertical lines cutting through the bottom lifestyle scene\.\`;/s,
`A breathtaking, photorealistic interior/fashion shot of \${compUsageScene}. The item must aggressively feature the fabric pattern flawlessly applied to it. \${mainColorInstruction} Architecture/styling must be ultra-luxurious, Vogue/Architectural Digest quality, 8K resolution, ultra-sharp focus, with \${lightingInstruction}. CRITICAL: This scene must be ONE continuous wide panoramic image completely filling the bottom half from edge to edge without any borders. DO NOT draw a white banner.\`;`
);

fs.writeFileSync(wizP, wizC);
console.log('Script completed');
