const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/features/accounting/components/unified/tabs/AIImageWizard.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. WizardStep to 5
content = content.replace(/type WizardStep = 1 \| 2 \| 3 \| 4;/, 'type WizardStep = 1 | 2 | 3 | 4 | 5;');

// 2. Fix ReferenceError
content = content.replace(/const currentMaterialCode = data\?\.code \|\| materialCode; \/\/ Use data\?\.code if available, fallback to component state materialCode/, 'const currentMaterialCode = materialCode;');
content = content.replace(/const materialCodeValue = data\?\.code \|\| 'wizard';/, "const materialCodeValue = materialCode || 'wizard';");

// 3. Add states for watermark preview
const stateInsertionPoint = "const [priceValue, setPriceValue] = useState<string>('');\n    const [currency, setCurrency] = useState<string>('USD');\n";
const newStates = `    const [priceValue, setPriceValue] = useState<string>('');
    const [currency, setCurrency] = useState<string>('USD');

    const [watermarkPreviewUrl, setWatermarkPreviewUrl] = useState<string | null>(null);
    const [isRenderingWatermark, setIsRenderingWatermark] = useState(false);

    // ═══ Realtime watermark preview effect ═══
    React.useEffect(() => {
        const accepted = generatedImages.filter(img => img.accepted);
        if (step !== 4 || accepted.length === 0) return;

        const wData = {
            code: materialCode,
            name_ar: materialInfo.name,
            name_en: materialInfo.name,
            composition: materialInfo.composition,
            design: materialInfo.design,
            color: materialInfo.color,
        };
        const wSettings = {
            enabled: tagEnabled,
            companyName: companyWatermark,
            showCode: showMaterialCode,
            showName: showMaterialName,
            showComposition: showComposition,
            showDesign: showDesign,
            showColor: showColor,
            showQRCode: showQRCode,
            showBarcode: showBarcode,
            language: tagLanguage,
            position: tagPosition,
            priceMode: priceMode,
            priceValue: priceValue,
            currency: currency,
        };

        if (!tagEnabled) {
            setWatermarkPreviewUrl(accepted[0].url);
            return;
        }

        let isMounted = true;
        setIsRenderingWatermark(true);
        createWatermarkedImage(accepted[0].url, wSettings, wData)
            .then(blob => {
                if (isMounted) {
                    setWatermarkPreviewUrl(URL.createObjectURL(blob));
                }
            })
            .catch(err => console.error('Preview error:', err))
            .finally(() => {
                if (isMounted) setIsRenderingWatermark(false);
            });

        return () => { isMounted = false; };
    }, [
        step, tagEnabled, companyWatermark, showMaterialCode, showMaterialName, 
        showComposition, showDesign, showColor, showQRCode, showBarcode, 
        tagLanguage, tagPosition, priceMode, priceValue, currency, generatedImages,
        materialCode, materialInfo
    ]);
`;
content = content.replace(stateInsertionPoint, newStates);

// 4. Move Tag/Watermark Options from step 2 to step 4
const watermarkBlockStart = `                            {/* ═══ Tag/Watermark Options ═══ */}`;
const watermarkBlockEndStr = `                            {/* Credits summary */}`;
const watermarkSectionIndex = content.indexOf(watermarkBlockStart);
const watermarkSectionEnd = content.indexOf(watermarkBlockEndStr);

if (watermarkSectionIndex > -1 && watermarkSectionEnd > -1) {
    const watermarkSectionCode = content.substring(watermarkSectionIndex, watermarkSectionEnd);
    content = content.slice(0, watermarkSectionIndex) + content.slice(watermarkSectionEnd);

    // Now insert this right under step === 4 condition, which replaced the previous step === 4 block.
    // Wait, let's first shift step === 4 to step === 5
    content = content.replace(/\{(\/\*\s*═══ Step 4: Distribution & Save ═══\s*\*\/.*?step === )4( && \()/s, '{$15$2');
    
    // Then create a NEW step 4 right before Step 5
    const step5Marker = `{/* ═══ Step 4: Distribution & Save ═══ */}`;
    const newStep4 = `{/* ═══ Step 4: Watermark Setup ═══ */}
                    {step === 4 && (
                        <div className="space-y-4">
                            <h3 className="font-semibold text-base">
                                {isAr ? '🏷️ إضافة وسوم وبيانات المادة' : '🏷️ Add Material Watermark & Info'}
                            </h3>
                            <p className="text-sm text-gray-500 mb-4">
                                {isAr ? 'عاين كيفية ظهور الوسوم على الصور المولدة.' : 'Preview how the watermarks look on generated images.'}
                            </p>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Settings Column */}
                                <div className="space-y-4">
${watermarkSectionCode}
                                </div>
                                
                                {/* Preview Column */}
                                <div>
                                    <div className="sticky top-4 border rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center min-h-[300px] relative">
                                        {!watermarkPreviewUrl || isRenderingWatermark ? (
                                            <div className="flex flex-col items-center justify-center p-12 text-gray-400">
                                                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                                                <span className="text-sm">{isAr ? 'جاري تحديث المعاينة...' : 'Updating preview...'}</span>
                                            </div>
                                        ) : (
                                            <img src={watermarkPreviewUrl} alt="Watermark Preview" className="w-full h-auto max-h-[500px] object-contain" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}\n\n                    `;
    
    content = content.replace(step5Marker, newStep4 + step5Marker.replace('Step 4', 'Step 5'));
}

// 5. Update Footer Navigation
// Next button for Step 3: goes to 4 instead of 4
// Make it navigate correctly
// step === 3 -> setStep(4) (already does this)
// step === 4 -> setStep(5)
content = content.replace(/\{step === 4 && \(\s*<Button\s*size="sm"\s*disabled=\{isSaving\}\s*className="bg-green-600 hover:bg-green-700"\s*onClick=\{handleSaveAll\}\s*>\s*\{isSaving \? \(\s*<Loader2 className="w-4 h-4 me-1 animate-spin" \/>\s*\) : \(\s*<Save className="w-4 h-4 me-1" \/>\s*\)\}\s*\{isAr \? 'حفظ الكل' : 'Save All'\}\s*<\/Button>\s*\)\}/, 
`{step === 4 && (
                            <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={() => setStep(5)}>
                                {isAr ? 'التالي: توزيع وحفظ' : 'Next: Distribute & Save'}
                                <ChevronRight className="w-4 h-4 ms-1" />
                            </Button>
                        )}
                        {step === 5 && (
                            <Button size="sm" disabled={isSaving} className="bg-green-600 hover:bg-green-700" onClick={handleSaveAll}>
                                {isSaving ? <Loader2 className="w-4 h-4 me-1 animate-spin" /> : <Save className="w-4 h-4 me-1" />}
                                {isAr ? 'حفظ الكل' : 'Save All'}
                            </Button>
                        )}`);

// Also update the "Back" button logic:
// The current code:
// {step > 1 && step !== 3 && ( ... setStep((step - 1) as WizardStep) ... )}
// Well this naturally works! For step 4, it goes to 3... wait, step 3 is Generation.
// Is it safe to go back to 3? Yes, the state is kept intact.
// So step > 1 && step !== 3 covers it (we don't show back on step 3 because it's the loading state or review state).

fs.writeFileSync(filePath, content, 'utf8');
console.log('Script completed successfully');
