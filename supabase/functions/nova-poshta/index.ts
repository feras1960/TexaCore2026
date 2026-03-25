/**
 * ═══════════════════════════════════════════════════════════════
 *  Nova Poshta API Edge Function — Proxy for NP API v2.0
 * ═══════════════════════════════════════════════════════════════
 *  Actions: searchCities, getWarehouses, createDocument, trackDocument,
 *           getCounterparties, getContactPersons, getSenderAddresses
 * ═══════════════════════════════════════════════════════════════
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const NP_API_URL = 'https://api.novaposhta.ua/v2.0/json/';

async function callNpApi(apiKey: string, modelName: string, calledMethod: string, methodProperties: any) {
    const response = await fetch(NP_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, modelName, calledMethod, methodProperties }),
    });
    return response.json();
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { action, apiKey, params } = await req.json();

        if (!apiKey) {
            return new Response(JSON.stringify({ success: false, error: 'API key required' }), {
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        let result;

        switch (action) {
            // ═══ Search cities by name ═══
            case 'searchCities':
                result = await callNpApi(apiKey, 'Address', 'searchSettlements', {
                    CityName: params.query,
                    Limit: '20',
                    Page: '1',
                });
                break;

            // ═══ Get warehouses/branches in a city ═══
            case 'getWarehouses':
                result = await callNpApi(apiKey, 'Address', 'getWarehouses', {
                    CityRef: params.cityRef,
                    FindByString: params.query || '',
                    Limit: params.limit || '50',
                });
                break;

            // ═══ Create internet document (TTN) ═══
            case 'createDocument':
                result = await callNpApi(apiKey, 'InternetDocument', 'save', params);
                break;

            // ═══ Track shipment status ═══
            case 'trackDocument':
                result = await callNpApi(apiKey, 'TrackingDocument', 'getStatusDocuments', {
                    Documents: params.documents,
                });
                break;

            // ═══ Get sender/recipient counterparties ═══
            case 'getCounterparties':
                result = await callNpApi(apiKey, 'Counterparty', 'getCounterparties', {
                    CounterpartyProperty: params.type || 'Sender',
                    Page: '1',
                });
                break;

            // ═══ Get contact persons for a counterparty ═══
            case 'getContactPersons':
                result = await callNpApi(apiKey, 'ContactPerson', 'getContactPersons', {
                    Ref: params.counterpartyRef,
                    Page: '1',
                });
                break;

            // ═══ Get sender addresses (warehouses) ═══
            case 'getSenderAddresses':
                result = await callNpApi(apiKey, 'Address', 'getWarehouses', {
                    CityRef: params.cityRef,
                    FindByString: params.query || '',
                    Limit: '50',
                });
                break;

            // ═══ Calculate delivery cost ═══
            case 'getDeliveryCost':
                result = await callNpApi(apiKey, 'InternetDocument', 'getDocumentPrice', {
                    CitySender: params.citySender,
                    CityRecipient: params.cityRecipient,
                    Weight: params.weight || '1',
                    ServiceType: params.serviceType || 'WarehouseWarehouse',
                    Cost: params.cost || '100',
                    CargoType: 'Cargo',
                    SeatsAmount: params.seatsAmount || '1',
                });
                break;

            // ═══ Get document list (for history) ═══
            case 'getDocumentList':
                result = await callNpApi(apiKey, 'InternetDocument', 'getDocumentList', {
                    DateTimeFrom: params.dateFrom || '',
                    DateTimeTo: params.dateTo || '',
                    Page: params.page || '1',
                    GetFullList: '0',
                });
                break;

            // ═══ Print document (get print URL) ═══
            case 'printDocument':
                result = await callNpApi(apiKey, 'InternetDocument', 'printDocument', {
                    DocumentRefs: params.refs || [],
                    Type: params.type || 'pdf', // pdf, html, html_link
                });
                break;

            default:
                return new Response(JSON.stringify({ success: false, error: `Unknown action: ${action}` }), {
                    status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
        }

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Nova Poshta API error:', error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
})
