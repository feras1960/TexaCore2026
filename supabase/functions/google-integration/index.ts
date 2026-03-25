/**
 * Google Workspace Integration Edge Function
 * ════════════════════════════════════════════
 * OAuth2 + Google Sheets, Drive, Calendar APIs
 * 
 * Actions:
 * - authorize: Generate OAuth URL
 * - callback: Exchange code for tokens
 * - refresh: Refresh access token
 * - disconnect: Revoke tokens
 * - export_sheet: Export data to Google Sheets
 * - import_sheet: Import data from Google Sheets
 * - create_event: Create Calendar event (with Meet link)
 * - list_events: List Calendar events
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ═══════════════════════════════════════════════════════════════
// Google OAuth Config
// ═══════════════════════════════════════════════════════════════

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!;
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
].join(' ');

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

function jsonResponse(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status,
    });
}

function redirectResponse(url: string) {
    return new Response(null, {
        headers: { ...corsHeaders, Location: url },
        status: 302,
    });
}

async function getTokensFromCode(code: string, redirectUri: string) {
    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            code,
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
        }),
    });
    return res.json();
}

async function refreshAccessToken(refreshToken: string) {
    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            refresh_token: refreshToken,
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            grant_type: 'refresh_token',
        }),
    });
    return res.json();
}

async function getGoogleUserInfo(accessToken: string) {
    const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    return res.json();
}

// Get valid access token (refresh if needed)
async function getValidAccessToken(companyId: string, supabaseAdmin: any): Promise<string | null> {
    const { data: company } = await supabaseAdmin
        .from('companies')
        .select('integrations')
        .eq('id', companyId)
        .single();

    const google = company?.integrations?.google;
    if (!google?.refresh_token) return null;

    // Check if access token is still valid (with 5 min buffer)
    const expiresAt = google.token_expires_at || 0;
    const now = Date.now();

    if (google.access_token && expiresAt > now + 300000) {
        return google.access_token;
    }

    // Refresh the token
    console.log('🔄 Refreshing Google access token...');
    const tokens = await refreshAccessToken(google.refresh_token);

    if (tokens.error) {
        console.error('Token refresh failed:', tokens.error);
        return null;
    }

    // Save new access token
    const updatedGoogle = {
        ...google,
        access_token: tokens.access_token,
        token_expires_at: Date.now() + (tokens.expires_in * 1000),
    };

    await supabaseAdmin
        .from('companies')
        .update({ integrations: { ...company.integrations, google: updatedGoogle } })
        .eq('id', companyId);

    return tokens.access_token;
}

// ═══════════════════════════════════════════════════════════════
// Google Sheets API
// ═══════════════════════════════════════════════════════════════

async function exportToGoogleSheets(
    accessToken: string,
    title: string,
    headers: string[],
    rows: unknown[][],
    options?: { companyName?: string; subtitle?: string; isRTL?: boolean; language?: string }
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
    const companyName = options?.companyName || 'TexaCore ERP';
    const subtitle = options?.subtitle || '';
    const isRTL = options?.isRTL !== false;
    const lang = options?.language || (isRTL ? 'ar' : 'en');

    // Multi-language locale support
    const localeMap: Record<string, string> = { ar: 'ar', en: 'en_US', tr: 'tr_TR', ru: 'ru_RU', uk: 'uk_UA' };
    const dateLocaleMap: Record<string, string> = { ar: 'ar-EG-u-nu-latn', en: 'en-US', tr: 'tr-TR', ru: 'ru-RU', uk: 'uk-UA' };
    const fontFamily = isRTL ? 'Cairo' : 'Inter';

    const now = new Date().toLocaleString(dateLocaleMap[lang] || 'en-US', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const finalHeaders = headers;
    const finalRows = rows;

    // 1. Create spreadsheet with RTL
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            properties: {
                title: `${title} - ${companyName}`,
                locale: localeMap[lang] || 'en_US',
            },
            sheets: [{
                properties: {
                    title: title,
                    sheetId: 0,
                    rightToLeft: isRTL,
                },
            }],
        }),
    });

    if (!createRes.ok) {
        const err = await createRes.text();
        throw new Error(`Failed to create spreadsheet: ${err}`);
    }

    const spreadsheet = await createRes.json();
    const spreadsheetId = spreadsheet.spreadsheetId;

    // ═══════════════════════════════════════════════════════════
    // 2. Build data layout — MATCHING print template EXACTLY
    // ═══════════════════════════════════════════════════════════
    // Row 0: Company name (centered, white bg, dark text + underline)
    // Row 1: Thin gold separator line  
    // Row 2: Document type "قيد يومية" (centered, bordered)
    // Row 3: Entry number (right) + Date (left) — gray bg
    // Row 4: Description/subtitle (right-aligned)
    // Row 5: Column headers (green #22c55e)
    // Row 6+: Data rows
    // Last data: Totals row
    // +2 empty: spacing
    // Signature lines + labels

    const totalCols = finalHeaders.length;
    const emptyArr = (n: number) => Array(n).fill('');

    // Build the entry number + date in a single row (split across columns)
    // Extract entry number from title (e.g. "قيد يومية - OB-SUPP-UAH-MMJX0ZZJ")
    const titleParts = title.split(' - ');
    const docTypeName = titleParts[0] || title;
    const entryNumber = titleParts.slice(1).join(' - ') || '';

    const companyRow = [companyName, ...emptyArr(totalCols - 1)];
    const sepRow1 = emptyArr(totalCols); // gold line
    const docTypeRow = [docTypeName, ...emptyArr(totalCols - 1)]; // "قيد يومية"

    // Info row: entry number on right (col 0 in RTL), date on left (last col in RTL)
    const infoRow = emptyArr(totalCols);
    if (isRTL) {
        infoRow[0] = `${isRTL ? 'رقم القيد:' : 'Entry No:'} ${entryNumber}`;
        infoRow[totalCols - 1] = `${isRTL ? 'التاريخ:' : 'Date:'} ${now}`;
    } else {
        infoRow[0] = `${isRTL ? 'التاريخ:' : 'Date:'} ${now}`;
        infoRow[totalCols - 1] = `${isRTL ? 'رقم القيد:' : 'Entry No:'} ${entryNumber}`;
    }

    const allRows: unknown[][] = [companyRow, sepRow1, docTypeRow, infoRow];

    // Description row (if subtitle exists)
    let headerRowIdx = 4; // default without subtitle
    if (subtitle) {
        const descRow = [`${isRTL ? 'البيان:' : 'Description:'} ${subtitle}`, ...emptyArr(totalCols - 1)];
        allRows.push(descRow);
        headerRowIdx = 5;
    }

    // Column headers
    allRows.push(finalHeaders);

    // Data rows
    allRows.push(...finalRows);

    // Empty spacing rows before signatures
    allRows.push(emptyArr(totalCols));
    allRows.push(emptyArr(totalCols));

    // Signature line row (dashes) — placed at start of each 1/3 group
    const sigLineRow = emptyArr(totalCols);
    const groupSize = totalCols >= 3 ? Math.floor(totalCols / 3) : 1;
    if (totalCols >= 3) {
        sigLineRow[0] = '___________';
        sigLineRow[groupSize] = '___________';
        sigLineRow[groupSize * 2] = '___________';
    }
    allRows.push(sigLineRow);

    // Signature label row — placed at start of each 1/3 group
    const sigRow = emptyArr(totalCols);
    const sigLabels = isRTL
        ? ['المحاسب', 'المدير المالي', 'المدير العام']
        : ['Accountant', 'Finance Director', 'General Manager'];
    if (totalCols >= 3) {
        sigRow[0] = sigLabels[2]; // right side in RTL = المدير العام
        sigRow[groupSize] = sigLabels[1]; // center = المدير المالي
        sigRow[groupSize * 2] = sigLabels[0]; // left side in RTL = المحاسب
    }
    allRows.push(sigRow);

    const values = allRows;

    const updateRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(title)}!A1?valueInputOption=USER_ENTERED`,
        {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ values }),
        }
    );

    if (!updateRes.ok) {
        const err = await updateRes.text();
        throw new Error(`Failed to write data: ${err}`);
    }

    // ═══════════════════════════════════════════════════════════
    // Colors — matching user's approved formatting
    // ═══════════════════════════════════════════════════════════
    const white = { red: 1, green: 1, blue: 1 };
    const darkText = { red: 0.1, green: 0.1, blue: 0.1 };                  // near black
    const grayText = { red: 0.35, green: 0.35, blue: 0.35 };               // #595959
    const gold = { red: 0.776, green: 0.655, blue: 0.310 };                // #C6A74F — separator line
    const infoGray = { red: 0.953, green: 0.957, blue: 0.965 };            // #f3f4f6 — info row bg
    const headerNavy = { red: 0.102, green: 0.212, blue: 0.365 };          // #1a365d — dark navy header
    const headerNavyDark = { red: 0.059, green: 0.149, blue: 0.278 };      // #0f2647 — header border
    const altRowGray = { red: 0.976, green: 0.980, blue: 0.984 };          // #f9fafb
    const borderGray = { red: 0.878, green: 0.898, blue: 0.922 };          // #e0e5eb

    const dataStartRow = headerRowIdx + 1;
    const numDataRows = finalRows.length;
    const numTotalRows = values.length;

    const formatRequests: any[] = [];

    // ── ROW 0: Company Name (white bg, dark bold text, centered) ──
    formatRequests.push(
        {
            mergeCells: {
                range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: totalCols },
                mergeType: 'MERGE_ALL',
            },
        },
        {
            repeatCell: {
                range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: totalCols },
                cell: {
                    userEnteredFormat: {
                        backgroundColor: white,
                        textFormat: { bold: true, fontSize: 18, foregroundColor: darkText, fontFamily },
                        horizontalAlignment: 'CENTER',
                        verticalAlignment: 'MIDDLE',
                        padding: { top: 14, bottom: 14 },
                    },
                },
                fields: 'userEnteredFormat',
            },
        },
        {
            updateDimensionProperties: {
                range: { sheetId: 0, dimension: 'ROWS', startIndex: 0, endIndex: 1 },
                properties: { pixelSize: 55 },
                fields: 'pixelSize',
            },
        }
    );

    // ── ROW 1: Gold separator line (thin) ──
    formatRequests.push(
        {
            mergeCells: {
                range: { sheetId: 0, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: totalCols },
                mergeType: 'MERGE_ALL',
            },
        },
        {
            updateDimensionProperties: {
                range: { sheetId: 0, dimension: 'ROWS', startIndex: 1, endIndex: 2 },
                properties: { pixelSize: 4 },
                fields: 'pixelSize',
            },
        },
        {
            repeatCell: {
                range: { sheetId: 0, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: totalCols },
                cell: { userEnteredFormat: { backgroundColor: gold } },
                fields: 'userEnteredFormat.backgroundColor',
            },
        }
    );

    // ── ROW 2: Document Type "قيد يومية" (centered, bordered box) ──
    formatRequests.push(
        {
            mergeCells: {
                range: { sheetId: 0, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: totalCols },
                mergeType: 'MERGE_ALL',
            },
        },
        {
            repeatCell: {
                range: { sheetId: 0, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: totalCols },
                cell: {
                    userEnteredFormat: {
                        backgroundColor: white,
                        textFormat: { bold: true, fontSize: 14, foregroundColor: darkText, fontFamily },
                        horizontalAlignment: 'CENTER',
                        verticalAlignment: 'MIDDLE',
                        padding: { top: 8, bottom: 8 },
                        borders: {
                            top: { style: 'SOLID', color: borderGray },
                            bottom: { style: 'SOLID', color: borderGray },
                        },
                    },
                },
                fields: 'userEnteredFormat',
            },
        },
        {
            updateDimensionProperties: {
                range: { sheetId: 0, dimension: 'ROWS', startIndex: 2, endIndex: 3 },
                properties: { pixelSize: 40 },
                fields: 'pixelSize',
            },
        }
    );

    // ── ROW 3: Info row (entry number + date, gray bg) ──
    formatRequests.push(
        {
            repeatCell: {
                range: { sheetId: 0, startRowIndex: 3, endRowIndex: 4, startColumnIndex: 0, endColumnIndex: totalCols },
                cell: {
                    userEnteredFormat: {
                        backgroundColor: infoGray,
                        textFormat: { bold: true, fontSize: 10, foregroundColor: grayText, fontFamily },
                        verticalAlignment: 'MIDDLE',
                        padding: { top: 4, bottom: 4, left: 8, right: 8 },
                    },
                },
                fields: 'userEnteredFormat',
            },
        }
    );
    // First col right-aligned (RTL), last col left-aligned
    if (totalCols > 1) {
        formatRequests.push(
            {
                repeatCell: {
                    range: { sheetId: 0, startRowIndex: 3, endRowIndex: 4, startColumnIndex: 0, endColumnIndex: 1 },
                    cell: { userEnteredFormat: { horizontalAlignment: isRTL ? 'RIGHT' : 'LEFT' } },
                    fields: 'userEnteredFormat.horizontalAlignment',
                },
            },
            {
                repeatCell: {
                    range: { sheetId: 0, startRowIndex: 3, endRowIndex: 4, startColumnIndex: totalCols - 1, endColumnIndex: totalCols },
                    cell: { userEnteredFormat: { horizontalAlignment: isRTL ? 'LEFT' : 'RIGHT' } },
                    fields: 'userEnteredFormat.horizontalAlignment',
                },
            }
        );
    }

    // ── ROW 4 (optional): Description/subtitle ──
    if (subtitle) {
        formatRequests.push(
            {
                mergeCells: {
                    range: { sheetId: 0, startRowIndex: 4, endRowIndex: 5, startColumnIndex: 0, endColumnIndex: totalCols },
                    mergeType: 'MERGE_ALL',
                },
            },
            {
                repeatCell: {
                    range: { sheetId: 0, startRowIndex: 4, endRowIndex: 5, startColumnIndex: 0, endColumnIndex: totalCols },
                    cell: {
                        userEnteredFormat: {
                            backgroundColor: white,
                            textFormat: { fontSize: 10, foregroundColor: grayText, fontFamily },
                            horizontalAlignment: isRTL ? 'RIGHT' : 'LEFT',
                            padding: { left: 8, right: 8 },
                        },
                    },
                    fields: 'userEnteredFormat',
                },
            }
        );
    }

    // ── TABLE HEADERS: Dark Navy #1a365d (matching user's formatting) ──
    formatRequests.push({
        repeatCell: {
            range: { sheetId: 0, startRowIndex: headerRowIdx, endRowIndex: headerRowIdx + 1, startColumnIndex: 0, endColumnIndex: totalCols },
            cell: {
                userEnteredFormat: {
                    backgroundColor: headerNavy,
                    textFormat: { bold: true, fontSize: 11, foregroundColor: white, fontFamily },
                    horizontalAlignment: 'CENTER',
                    verticalAlignment: 'MIDDLE',
                    padding: { top: 6, bottom: 6 },
                    borders: {
                        bottom: { style: 'SOLID_MEDIUM', color: headerNavyDark },
                        top: { style: 'SOLID_MEDIUM', color: headerNavyDark },
                    },
                },
            },
            fields: 'userEnteredFormat',
        },
    });

    // ── Freeze rows ──
    formatRequests.push({
        updateSheetProperties: {
            properties: { sheetId: 0, gridProperties: { frozenRowCount: headerRowIdx + 1 } },
            fields: 'gridProperties.frozenRowCount',
        },
    });

    // ── Auto resize then specific column widths ──
    formatRequests.push({
        autoResizeDimensions: {
            dimensions: { sheetId: 0, dimension: 'COLUMNS', startIndex: 0, endIndex: totalCols },
        },
    });

    // Smart column widths
    const narrowKeywords = ['#', 'Currency', 'العملة', 'Exchange', 'سعر'];
    const wideKeywords = ['Description', 'البيان', 'الوصف', 'Account Name', 'اسم الحساب'];

    for (let colIdx = 0; colIdx < totalCols; colIdx++) {
        const header = finalHeaders[colIdx] || '';
        let width = 130;
        if (header === '#') width = 40;
        else if (narrowKeywords.some(kw => header.includes(kw))) width = 80;
        else if (wideKeywords.some(kw => header.includes(kw))) width = 220;

        formatRequests.push({
            updateDimensionProperties: {
                range: { sheetId: 0, dimension: 'COLUMNS', startIndex: colIdx, endIndex: colIdx + 1 },
                properties: { pixelSize: width },
                fields: 'pixelSize',
            },
        });
    }

    // === Alternating row colors + cell borders for data ===
    for (let i = 0; i < numDataRows; i++) {
        const rowIdx = dataStartRow + i;
        const isLastRow = i === numDataRows - 1; // totals row

        if (!isLastRow && i % 2 === 1) {
            formatRequests.push({
                repeatCell: {
                    range: { sheetId: 0, startRowIndex: rowIdx, endRowIndex: rowIdx + 1, startColumnIndex: 0, endColumnIndex: totalCols },
                    cell: { userEnteredFormat: { backgroundColor: altRowGray } },
                    fields: 'userEnteredFormat.backgroundColor',
                },
            });
        }

        // Add gridline borders to all data cells (matching print template)
        if (!isLastRow) {
            formatRequests.push({
                repeatCell: {
                    range: { sheetId: 0, startRowIndex: rowIdx, endRowIndex: rowIdx + 1, startColumnIndex: 0, endColumnIndex: totalCols },
                    cell: {
                        userEnteredFormat: {
                            borders: {
                                bottom: { style: 'SOLID', color: borderGray },
                                left: { style: 'SOLID', color: borderGray },
                                right: { style: 'SOLID', color: borderGray },
                            },
                        },
                    },
                    fields: 'userEnteredFormat.borders',
                },
            });
        }
    }

    // === Number formatting for numeric columns ===
    for (let colIdx = 1; colIdx < finalHeaders.length; colIdx++) {
        const hasNumbers = finalRows.some(row => typeof row[colIdx] === 'number');
        if (hasNumbers) {
            formatRequests.push({
                repeatCell: {
                    range: { sheetId: 0, startRowIndex: dataStartRow, endRowIndex: dataStartRow + numDataRows, startColumnIndex: colIdx, endColumnIndex: colIdx + 1 },
                    cell: {
                        userEnteredFormat: {
                            numberFormat: { type: 'NUMBER', pattern: '#,##0.00' },
                            horizontalAlignment: 'CENTER',
                        },
                    },
                    fields: 'userEnteredFormat(numberFormat,horizontalAlignment)',
                },
            });
        }
    }

    // === Totals Row — simple bold, white bg (matching user's formatting) ===
    if (numDataRows > 1) {
        const totalsRowIdx = dataStartRow + numDataRows - 1;
        formatRequests.push({
            repeatCell: {
                range: { sheetId: 0, startRowIndex: totalsRowIdx, endRowIndex: totalsRowIdx + 1, startColumnIndex: 0, endColumnIndex: totalCols },
                cell: {
                    userEnteredFormat: {
                        backgroundColor: white,
                        textFormat: { bold: true, fontSize: 11, foregroundColor: darkText, fontFamily },
                        horizontalAlignment: 'CENTER',
                        verticalAlignment: 'MIDDLE',
                        borders: {
                            top: { style: 'SOLID_MEDIUM', color: borderGray },
                        },
                    },
                },
                fields: 'userEnteredFormat',
            },
        });
    }

    // === Signature rows — merge cells into 3 groups ===
    const sigLineRowIdx = numTotalRows - 2;
    const sigLabelRowIdx = numTotalRows - 1;

    // Split columns into 3 equal groups for signatures
    if (totalCols >= 3) {
        const groupSize = Math.floor(totalCols / 3);
        const groups = [
            { start: 0, end: groupSize },                                      // Group 1 (right in RTL)
            { start: groupSize, end: groupSize * 2 },                          // Group 2 (center)
            { start: groupSize * 2, end: totalCols },                          // Group 3 (left in RTL)
        ];

        for (const group of groups) {
            // Merge signature line row
            formatRequests.push({
                mergeCells: {
                    range: { sheetId: 0, startRowIndex: sigLineRowIdx, endRowIndex: sigLineRowIdx + 1, startColumnIndex: group.start, endColumnIndex: group.end },
                    mergeType: 'MERGE_ALL',
                },
            });
            // Merge signature label row
            formatRequests.push({
                mergeCells: {
                    range: { sheetId: 0, startRowIndex: sigLabelRowIdx, endRowIndex: sigLabelRowIdx + 1, startColumnIndex: group.start, endColumnIndex: group.end },
                    mergeType: 'MERGE_ALL',
                },
            });
        }
    }

    // Style signature line row (centered dashes)
    formatRequests.push({
        repeatCell: {
            range: { sheetId: 0, startRowIndex: sigLineRowIdx, endRowIndex: sigLineRowIdx + 1, startColumnIndex: 0, endColumnIndex: totalCols },
            cell: {
                userEnteredFormat: {
                    horizontalAlignment: 'CENTER',
                    textFormat: { fontSize: 9, foregroundColor: grayText, fontFamily },
                },
            },
            fields: 'userEnteredFormat',
        },
    });

    // Style signature label row (centered bold)
    formatRequests.push({
        repeatCell: {
            range: { sheetId: 0, startRowIndex: sigLabelRowIdx, endRowIndex: sigLabelRowIdx + 1, startColumnIndex: 0, endColumnIndex: totalCols },
            cell: {
                userEnteredFormat: {
                    textFormat: { bold: true, fontSize: 9, foregroundColor: grayText, fontFamily },
                    horizontalAlignment: 'CENTER',
                },
            },
            fields: 'userEnteredFormat',
        },
    });

    // === Apply all formatting ===
    await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ requests: formatRequests }),
        }
    );

    return {
        spreadsheetId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    };
}

async function importFromGoogleSheet(
    accessToken: string,
    spreadsheetId: string,
    range?: string
): Promise<{ headers: string[]; rows: unknown[][] }> {
    const sheetRange = range || 'A:ZZ';
    const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetRange}`,
        {
            headers: { Authorization: `Bearer ${accessToken}` },
        }
    );

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Failed to read spreadsheet: ${err}`);
    }

    const data = await res.json();
    const values = data.values || [];

    if (values.length === 0) return { headers: [], rows: [] };

    return {
        headers: values[0] as string[],
        rows: values.slice(1) as unknown[][],
    };
}

// ═══════════════════════════════════════════════════════════════
// Google Calendar API
// ═══════════════════════════════════════════════════════════════

async function createCalendarEvent(
    accessToken: string,
    event: {
        summary: string;
        description?: string;
        start: string; // ISO date or datetime
        end?: string;
        attendees?: string[];
        addMeetLink?: boolean;
    }
): Promise<any> {
    const isAllDay = event.start.length === 10; // YYYY-MM-DD

    const body: any = {
        summary: event.summary,
        description: event.description || '',
        start: isAllDay
            ? { date: event.start }
            : { dateTime: event.start, timeZone: 'UTC' },
        end: isAllDay
            ? { date: event.end || event.start }
            : { dateTime: event.end || new Date(new Date(event.start).getTime() + 3600000).toISOString(), timeZone: 'UTC' },
    };

    if (event.attendees?.length) {
        body.attendees = event.attendees.map(email => ({ email }));
    }

    if (event.addMeetLink) {
        body.conferenceData = {
            createRequest: {
                requestId: crypto.randomUUID(),
                conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
        };
    }

    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events${event.addMeetLink ? '?conferenceDataVersion=1' : ''}`;

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Failed to create event: ${err}`);
    }

    const createdEvent = await res.json();
    return {
        id: createdEvent.id,
        htmlLink: createdEvent.htmlLink,
        meetLink: createdEvent.hangoutLink || createdEvent.conferenceData?.entryPoints?.[0]?.uri || null,
        summary: createdEvent.summary,
        start: createdEvent.start,
        end: createdEvent.end,
    };
}

async function listCalendarEvents(
    accessToken: string,
    timeMin?: string,
    timeMax?: string,
    maxResults = 50
): Promise<any[]> {
    const params = new URLSearchParams({
        maxResults: String(maxResults),
        singleEvents: 'true',
        orderBy: 'startTime',
    });

    if (timeMin) params.set('timeMin', timeMin);
    if (timeMax) params.set('timeMax', timeMax);

    const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
        {
            headers: { Authorization: `Bearer ${accessToken}` },
        }
    );

    if (!res.ok) throw new Error('Failed to list events');

    const data = await res.json();
    return (data.items || []).map((e: any) => ({
        id: e.id,
        summary: e.summary,
        start: e.start,
        end: e.end,
        htmlLink: e.htmlLink,
        meetLink: e.hangoutLink || null,
        attendees: e.attendees?.map((a: any) => a.email) || [],
    }));
}

// ═══════════════════════════════════════════════════════════════
// Main Handler
// ═══════════════════════════════════════════════════════════════

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const lastPath = pathParts[pathParts.length - 1];

    // No GET callback needed — frontend handles Google redirect

    // ═══ All other actions (POST) ═══
    try {
        const authHeader = req.headers.get('Authorization');
        const supabaseAnon = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
            global: { headers: { Authorization: authHeader || '' } },
        });
        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Verify user
        const { data: { user } } = await supabaseAnon.auth.getUser();
        if (!user) {
            return jsonResponse({ error: 'Unauthorized' }, 401);
        }

        const body = await req.json();
        const { action, company_id } = body;

        if (!company_id) {
            return jsonResponse({ error: 'company_id required' }, 400);
        }

        // ─── AUTHORIZE: Generate OAuth URL ───
        if (action === 'authorize') {
            const redirectUrl = body.redirect_url || 'https://texacore.ai/system-config/integrations';
            const state = btoa(JSON.stringify({ company_id }));

            const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
                `client_id=${GOOGLE_CLIENT_ID}` +
                `&redirect_uri=${encodeURIComponent(redirectUrl)}` +
                `&response_type=code` +
                `&scope=${encodeURIComponent(SCOPES + ' openid email profile')}` +
                `&access_type=offline` +
                `&prompt=consent` +
                `&state=${encodeURIComponent(state)}`;

            return jsonResponse({ success: true, auth_url: authUrl });
        }

        // ─── EXCHANGE_CODE: Exchange auth code for tokens ───
        if (action === 'exchange_code') {
            const { code, redirect_uri } = body;
            if (!code || !redirect_uri) {
                return jsonResponse({ error: 'code and redirect_uri required' }, 400);
            }

            const tokens = await getTokensFromCode(code, redirect_uri);
            if (tokens.error) {
                return jsonResponse({ error: tokens.error_description || tokens.error }, 400);
            }

            // Get user info
            const userInfo = await getGoogleUserInfo(tokens.access_token);

            // Save tokens to company integrations
            const { data: company } = await supabaseAdmin
                .from('companies')
                .select('integrations')
                .eq('id', company_id)
                .single();

            const currentIntegrations = company?.integrations || {};

            const googleIntegration = {
                connected: true,
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                token_expires_at: Date.now() + (tokens.expires_in * 1000),
                scopes: tokens.scope?.split(' ') || [],
                connected_email: userInfo.email,
                connected_name: userInfo.name,
                connected_picture: userInfo.picture,
                connected_at: new Date().toISOString(),
            };

            await supabaseAdmin
                .from('companies')
                .update({
                    integrations: { ...currentIntegrations, google: googleIntegration },
                })
                .eq('id', company_id);

            console.log(`✅ Google connected for company ${company_id}: ${userInfo.email}`);

            return jsonResponse({
                success: true,
                email: userInfo.email,
                name: userInfo.name,
                picture: userInfo.picture,
            });
        }

        // ─── DISCONNECT: Revoke tokens ───
        if (action === 'disconnect') {
            const { data: company } = await supabaseAdmin
                .from('companies')
                .select('integrations')
                .eq('id', company_id)
                .single();

            const google = company?.integrations?.google;
            if (google?.access_token) {
                // Revoke token at Google
                await fetch(`https://oauth2.googleapis.com/revoke?token=${google.access_token}`, {
                    method: 'POST',
                });
            }

            // Remove google from integrations
            const updatedIntegrations = { ...company?.integrations };
            delete updatedIntegrations.google;

            await supabaseAdmin
                .from('companies')
                .update({ integrations: updatedIntegrations })
                .eq('id', company_id);

            return jsonResponse({ success: true, message: 'Google disconnected' });
        }

        // ─── STATUS: Check connection ───
        if (action === 'status') {
            const { data: company } = await supabaseAdmin
                .from('companies')
                .select('integrations')
                .eq('id', company_id)
                .single();

            const google = company?.integrations?.google;
            return jsonResponse({
                success: true,
                connected: !!google?.connected,
                email: google?.connected_email || null,
                name: google?.connected_name || null,
                picture: google?.connected_picture || null,
                connected_at: google?.connected_at || null,
                scopes: google?.scopes || [],
            });
        }

        // ═══ Actions requiring active Google connection ═══
        const accessToken = await getValidAccessToken(company_id, supabaseAdmin);
        if (!accessToken) {
            return jsonResponse({ error: 'Google not connected. Please connect first.', code: 'NOT_CONNECTED' }, 403);
        }

        // ─── EXPORT_SHEET: Export data to Google Sheets ───
        if (action === 'export_sheet') {
            const { title, headers, rows, subtitle, company_name, is_rtl, isRTL: bodyIsRTL, language } = body;
            if (!title || !headers || !rows) {
                return jsonResponse({ error: 'title, headers, rows required' }, 400);
            }

            // Get company name — localized
            const lang = language || (is_rtl !== false ? 'ar' : 'en');
            let companyName = company_name;
            if (!companyName) {
                const { data: comp } = await supabaseAdmin
                    .from('companies')
                    .select('name, name_ar, name_en, name_tr, name_ru, name_uk')
                    .eq('id', company_id)
                    .single();
                companyName = comp?.[`name_${lang}`] || comp?.name || comp?.name_en || comp?.name_ar || 'TexaCore ERP';
            }

            // Determine RTL: prefer explicit flag, fallback to language-based
            const rtlFlag = bodyIsRTL ?? is_rtl ?? (lang === 'ar');
            const result = await exportToGoogleSheets(accessToken, title, headers, rows, {
                companyName,
                subtitle: subtitle || '',
                isRTL: rtlFlag,
                language: lang,
            });
            return jsonResponse({ success: true, ...result });
        }

        // ─── IMPORT_SHEET: Import from Google Sheets ───
        if (action === 'import_sheet') {
            const { spreadsheet_url, range } = body;
            if (!spreadsheet_url) {
                return jsonResponse({ error: 'spreadsheet_url required' }, 400);
            }

            // Extract spreadsheet ID from URL
            const match = spreadsheet_url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
            if (!match) {
                return jsonResponse({ error: 'Invalid Google Sheets URL' }, 400);
            }

            const result = await importFromGoogleSheet(accessToken, match[1], range);
            return jsonResponse({ success: true, ...result });
        }

        // ─── CREATE_EVENT: Create Calendar event ───
        if (action === 'create_event') {
            const { summary, description, start, end, attendees, add_meet_link } = body;
            if (!summary || !start) {
                return jsonResponse({ error: 'summary and start required' }, 400);
            }

            const result = await createCalendarEvent(accessToken, {
                summary,
                description,
                start,
                end,
                attendees,
                addMeetLink: add_meet_link !== false, // Default: add Meet link
            });
            return jsonResponse({ success: true, event: result });
        }

        // ─── LIST_EVENTS: List Calendar events ───
        if (action === 'list_events') {
            const { time_min, time_max, max_results } = body;
            const events = await listCalendarEvents(
                accessToken,
                time_min || new Date().toISOString(),
                time_max,
                max_results || 50
            );
            return jsonResponse({ success: true, events });
        }

        return jsonResponse({ error: `Unknown action: ${action}` }, 400);

    } catch (err) {
        console.error('Google integration error:', err);
        return jsonResponse({ error: (err as Error).message }, 500);
    }
});
