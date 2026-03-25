/**
 * 🛒 Smart Material Cart Context — V2 Wholesale Edition
 * سياق سلة المواد الذكية — نسخة البيع بالجملة
 * 
 * ✅ Constitution Compliant:
 * - Law 2: No Supabase calls — delegates to quotationService
 * - Law 5: Keep-mounted pattern for Cart Drawer
 * - RTL: Logical properties throughout
 * 
 * 📋 Business Logic:
 * - Material is the primary unit (not rolls)
 * - User specifies total quantity in meters per material+warehouse
 * - Preferred rolls are optional suggestions for warehouse keeper
 * - Same material from multiple warehouses = separate line items, grouped in UI
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/hooks/useCompany';

// ═══════════════ Types ═══════════════

/** Roll marked as preferred by sales employee */
export interface PreferredRoll {
    roll_id: string;
    roll_number: string;
    available_length: number;
}

export interface CartItem {
    id: string;
    material_id: string;
    material_name_ar: string;
    material_name_en: string;
    material_code: string;

    // Quantity — total meters (user-specified)
    quantity: number;
    unit: string; // 'meter' | 'yard' | 'kg'

    // Warehouse (required — each warehouse is a separate line)
    warehouse_id: string;
    warehouse_name_ar: string;
    warehouse_name_en?: string;

    // Stock info (for validation display)
    available_stock?: number; // total available in this warehouse

    // Preferred rolls (optional — just suggestions for warehouse keeper)
    preferred_rolls: PreferredRoll[];

    // Pricing
    unit_price: number;
    currency: string;
    subtotal: number;

    // Metadata
    added_at: string;
    notes?: string;
}

export interface CartState {
    items: CartItem[];
    customer_id?: string;
    customer_name?: string;
    draft_quotation_id?: string;
    isDrawerOpen: boolean;
}

// Computed values
export interface CartComputed {
    total_items: number;
    total_quantity: number;
    total_amount: number;
    currency: string;
    /** Items grouped by material_id for display */
    grouped_items: Map<string, CartItem[]>;
    /** Total unique materials */
    material_count: number;
}

export interface CartActions {
    addItem: (item: Omit<CartItem, 'id' | 'added_at' | 'subtotal'>) => void;
    updateItem: (id: string, updates: Partial<CartItem>) => void;
    removeItem: (id: string) => void;
    clearCart: () => void;
    setCustomer: (id: string, name: string) => void;
    clearCustomer: () => void;
    setDraftId: (id: string) => void;
    isInCart: (materialId: string, warehouseId?: string) => boolean;
    /** Check if a specific roll is marked as preferred */
    isRollPreferred: (materialId: string, warehouseId: string, rollId: string) => boolean;
    /** Toggle a roll as preferred (add/remove) */
    togglePreferredRoll: (materialId: string, warehouseId: string, roll: PreferredRoll) => void;
    /** Get the cart item for a material+warehouse combo */
    getCartItem: (materialId: string, warehouseId: string) => CartItem | undefined;
    getItemCount: () => number;
    openDrawer: () => void;
    closeDrawer: () => void;
    toggleDrawer: () => void;
}

// ═══════════════ Reducer ═══════════════

type CartAction =
    | { type: 'ADD_ITEM'; payload: CartItem }
    | { type: 'UPDATE_ITEM'; payload: { id: string; updates: Partial<CartItem> } }
    | { type: 'REMOVE_ITEM'; payload: string }
    | { type: 'CLEAR_CART' }
    | { type: 'SET_CUSTOMER'; payload: { id: string; name: string } }
    | { type: 'CLEAR_CUSTOMER' }
    | { type: 'SET_DRAFT_ID'; payload: string }
    | { type: 'LOAD_STATE'; payload: CartState }
    | { type: 'TOGGLE_PREFERRED_ROLL'; payload: { materialId: string; warehouseId: string; roll: PreferredRoll } }
    | { type: 'OPEN_DRAWER' }
    | { type: 'CLOSE_DRAWER' }
    | { type: 'TOGGLE_DRAWER' };

const initialState: CartState = {
    items: [],
    customer_id: undefined,
    customer_name: undefined,
    draft_quotation_id: undefined,
    isDrawerOpen: false,
};

function cartReducer(state: CartState, action: CartAction): CartState {
    switch (action.type) {
        case 'ADD_ITEM': {
            // Check if same material+warehouse already exists
            const existingIndex = state.items.findIndex(
                (item) =>
                    item.material_id === action.payload.material_id &&
                    item.warehouse_id === action.payload.warehouse_id
            );

            if (existingIndex >= 0) {
                // Replace quantity (don't add — user is re-entering)
                const updatedItems = [...state.items];
                const existing = updatedItems[existingIndex];
                updatedItems[existingIndex] = {
                    ...existing,
                    quantity: action.payload.quantity,
                    subtotal: action.payload.quantity * existing.unit_price,
                    unit_price: action.payload.unit_price || existing.unit_price,
                };
                return { ...state, items: updatedItems };
            }

            return { ...state, items: [...state.items, action.payload] };
        }

        case 'UPDATE_ITEM': {
            const updatedItems = state.items.map((item) => {
                if (item.id !== action.payload.id) return item;
                const updated = { ...item, ...action.payload.updates };
                // Recalculate subtotal
                updated.subtotal = updated.quantity * updated.unit_price;
                return updated;
            });
            return { ...state, items: updatedItems };
        }

        case 'REMOVE_ITEM':
            return { ...state, items: state.items.filter((item) => item.id !== action.payload) };

        case 'CLEAR_CART':
            return { ...initialState };

        case 'SET_CUSTOMER':
            return { ...state, customer_id: action.payload.id, customer_name: action.payload.name };

        case 'CLEAR_CUSTOMER':
            return { ...state, customer_id: undefined, customer_name: undefined };

        case 'SET_DRAFT_ID':
            return { ...state, draft_quotation_id: action.payload };

        case 'LOAD_STATE':
            return { ...action.payload, isDrawerOpen: false };

        case 'TOGGLE_PREFERRED_ROLL': {
            const { materialId, warehouseId, roll } = action.payload;
            const updatedItems = state.items.map((item) => {
                if (item.material_id !== materialId || item.warehouse_id !== warehouseId) return item;
                const existing = item.preferred_rolls || [];
                const isAlreadyPreferred = existing.some(r => r.roll_id === roll.roll_id);
                return {
                    ...item,
                    preferred_rolls: isAlreadyPreferred
                        ? existing.filter(r => r.roll_id !== roll.roll_id) // Remove
                        : [...existing, roll], // Add
                };
            });
            return { ...state, items: updatedItems };
        }

        case 'OPEN_DRAWER':
            return { ...state, isDrawerOpen: true };

        case 'CLOSE_DRAWER':
            return { ...state, isDrawerOpen: false };

        case 'TOGGLE_DRAWER':
            return { ...state, isDrawerOpen: !state.isDrawerOpen };

        default:
            return state;
    }
}

// ═══════════════ Context ═══════════════

interface CartContextValue {
    state: CartState;
    computed: CartComputed;
    actions: CartActions;
}

const CartContext = createContext<CartContextValue | null>(null);

// ═══════════════ Provider ═══════════════

export function CartProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const { company } = useCompany();
    const [state, dispatch] = useReducer(cartReducer, initialState);

    const storageKey = useMemo(() => {
        if (!user?.id || !company?.id) return null;
        return `texacore_cart_${user.id}_${company.id}`;
    }, [user?.id, company?.id]);

    // ─── Load from localStorage on mount ───
    useEffect(() => {
        if (!storageKey) return;
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const parsed = JSON.parse(saved) as CartState;
                if (parsed.items?.length > 0) {
                    // Ensure preferred_rolls exists for old cart data
                    parsed.items = parsed.items.map(item => ({
                        ...item,
                        preferred_rolls: item.preferred_rolls || [],
                    }));
                    dispatch({ type: 'LOAD_STATE', payload: parsed });
                }
            }
        } catch (e) {
            console.warn('Failed to load cart from localStorage:', e);
        }
    }, [storageKey]);

    // ─── Save to localStorage on changes ───
    useEffect(() => {
        if (!storageKey) return;
        try {
            const toSave: CartState = {
                items: state.items,
                customer_id: state.customer_id,
                customer_name: state.customer_name,
                draft_quotation_id: state.draft_quotation_id,
                isDrawerOpen: false, // Never persist drawer state
            };
            localStorage.setItem(storageKey, JSON.stringify(toSave));
        } catch (e) {
            console.warn('Failed to save cart to localStorage:', e);
        }
    }, [state.items, state.customer_id, state.customer_name, state.draft_quotation_id, storageKey]);

    // ─── Computed values ───
    const computed = useMemo<CartComputed>(() => {
        const items = state.items;

        // Group by material_id
        const grouped = new Map<string, CartItem[]>();
        items.forEach(item => {
            const existing = grouped.get(item.material_id) || [];
            existing.push(item);
            grouped.set(item.material_id, existing);
        });

        return {
            total_items: items.length,
            total_quantity: items.reduce((sum, i) => sum + i.quantity, 0),
            total_amount: items.reduce((sum, i) => sum + i.subtotal, 0),
            currency: items[0]?.currency || 'UAH',
            grouped_items: grouped,
            material_count: grouped.size,
        };
    }, [state.items]);

    // ─── Actions ───
    const actions = useMemo<CartActions>(() => ({
        addItem: (itemData) => {
            const item: CartItem = {
                ...itemData,
                id: crypto.randomUUID(),
                added_at: new Date().toISOString(),
                subtotal: itemData.quantity * itemData.unit_price,
                preferred_rolls: itemData.preferred_rolls || [],
            };
            dispatch({ type: 'ADD_ITEM', payload: item });
        },

        updateItem: (id, updates) => {
            dispatch({ type: 'UPDATE_ITEM', payload: { id, updates } });
        },

        removeItem: (id) => {
            dispatch({ type: 'REMOVE_ITEM', payload: id });
        },

        clearCart: () => {
            dispatch({ type: 'CLEAR_CART' });
            if (storageKey) {
                localStorage.removeItem(storageKey);
            }
        },

        setCustomer: (id, name) => {
            dispatch({ type: 'SET_CUSTOMER', payload: { id, name } });
        },

        clearCustomer: () => {
            dispatch({ type: 'CLEAR_CUSTOMER' });
        },

        setDraftId: (id) => {
            dispatch({ type: 'SET_DRAFT_ID', payload: id });
        },

        isInCart: (materialId, warehouseId?) => {
            return state.items.some(
                (item) =>
                    item.material_id === materialId &&
                    (!warehouseId || item.warehouse_id === warehouseId)
            );
        },

        isRollPreferred: (materialId, warehouseId, rollId) => {
            const item = state.items.find(
                i => i.material_id === materialId && i.warehouse_id === warehouseId
            );
            return item?.preferred_rolls?.some(r => r.roll_id === rollId) || false;
        },

        togglePreferredRoll: (materialId, warehouseId, roll) => {
            dispatch({
                type: 'TOGGLE_PREFERRED_ROLL',
                payload: { materialId, warehouseId, roll },
            });
        },

        getCartItem: (materialId, warehouseId) => {
            return state.items.find(
                i => i.material_id === materialId && i.warehouse_id === warehouseId
            );
        },

        getItemCount: () => state.items.length,

        openDrawer: () => dispatch({ type: 'OPEN_DRAWER' }),
        closeDrawer: () => dispatch({ type: 'CLOSE_DRAWER' }),
        toggleDrawer: () => dispatch({ type: 'TOGGLE_DRAWER' }),
    }), [state.items, storageKey]);

    const value = useMemo(
        () => ({ state, computed, actions }),
        [state, computed, actions]
    );

    return (
        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>
    );
}

// ═══════════════ Hook ═══════════════

export function useCart(): CartContextValue {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
}

export default CartContext;
