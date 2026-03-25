/**
 * 🛒 useTransitCart — Hook لإدارة سلة حجوزات الترانزيت
 * 
 * Transit Reservation Cart State Management
 * - Add/remove items from container shipment items
 * - Customer selection
 * - Quantity management
 * - Advance payment tracking
 * - LocalStorage persistence per shipment
 * 
 * @module useTransitCart
 * @phase 13B-3
 */

import { useState, useCallback, useMemo, useEffect } from 'react';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface TransitCartItem {
    /** ID of the shipment_item */
    shipmentItemId: string;
    /** Material info */
    itemDescription: string;
    materialCode: string;
    colorName: string;
    unit: string;
    /** Available quantity (before this reservation) */
    availableQuantity: number;
    /** Reserved quantity in this cart */
    reservedQuantity: number;
    /** Suggested sell price (expected_sell_price from the item) */
    unitPrice: number;
    /** Total = reservedQuantity × unitPrice */
    totalAmount: number;
    /** Source references */
    materialId: string | null;
    colorId: string | null;
    productId: string | null;
}

export interface TransitCartCustomer {
    id: string;
    name: string;
    code: string;
    balance: number;
    creditLimit: number;
}

export interface TransitCartState {
    shipmentId: string;
    customer: TransitCartCustomer | null;
    items: TransitCartItem[];
    advanceAmount: number;
    notes: string;
}

export interface UseTransitCartReturn {
    /** Current cart state */
    cart: TransitCartState;
    /** Whether the cart drawer is open */
    isOpen: boolean;
    /** Open/close the cart drawer */
    setIsOpen: (open: boolean) => void;
    /** Number of items in cart */
    itemCount: number;
    /** Total amount */
    totalAmount: number;
    /** Set the customer */
    setCustomer: (customer: TransitCartCustomer | null) => void;
    /** Add an item to the cart */
    addItem: (item: Omit<TransitCartItem, 'totalAmount'>) => void;
    /** Remove an item from the cart */
    removeItem: (shipmentItemId: string) => void;
    /** Update item quantity */
    updateQuantity: (shipmentItemId: string, quantity: number) => void;
    /** Update item price */
    updatePrice: (shipmentItemId: string, price: number) => void;
    /** Set advance payment */
    setAdvanceAmount: (amount: number) => void;
    /** Set notes */
    setNotes: (notes: string) => void;
    /** Clear the entire cart */
    clearCart: () => void;
    /** Check if an item is in cart */
    isInCart: (shipmentItemId: string) => boolean;
    /** Get remaining available quantity for an item (considering cart) */
    getRemainingAvailable: (shipmentItemId: string, originalAvailable: number) => number;
}

// ═══════════════════════════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════════════════════════

const STORAGE_KEY_PREFIX = 'transit_cart_';

function getStorageKey(shipmentId: string): string {
    return `${STORAGE_KEY_PREFIX}${shipmentId}`;
}

function createEmptyCart(shipmentId: string): TransitCartState {
    return {
        shipmentId,
        customer: null,
        items: [],
        advanceAmount: 0,
        notes: '',
    };
}

export function useTransitCart(shipmentId: string): UseTransitCartReturn {
    const [isOpen, setIsOpen] = useState(false);

    // Initialize from localStorage
    const [cart, setCart] = useState<TransitCartState>(() => {
        if (!shipmentId) return createEmptyCart('');
        try {
            const stored = localStorage.getItem(getStorageKey(shipmentId));
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.warn('Failed to load transit cart from storage:', e);
        }
        return createEmptyCart(shipmentId);
    });

    // Persist to localStorage
    useEffect(() => {
        if (!shipmentId) return;
        try {
            if (cart.items.length > 0 || cart.customer) {
                localStorage.setItem(getStorageKey(shipmentId), JSON.stringify(cart));
            } else {
                localStorage.removeItem(getStorageKey(shipmentId));
            }
        } catch (e) {
            console.warn('Failed to save transit cart to storage:', e);
        }
    }, [cart, shipmentId]);

    // Reset when shipmentId changes
    useEffect(() => {
        if (!shipmentId) return;
        try {
            const stored = localStorage.getItem(getStorageKey(shipmentId));
            if (stored) {
                setCart(JSON.parse(stored));
            } else {
                setCart(createEmptyCart(shipmentId));
            }
        } catch {
            setCart(createEmptyCart(shipmentId));
        }
    }, [shipmentId]);

    // ── Computed ──
    const itemCount = cart.items.length;
    const totalAmount = useMemo(
        () => cart.items.reduce((sum, item) => sum + item.totalAmount, 0),
        [cart.items]
    );

    // ── Actions ──
    const setCustomer = useCallback((customer: TransitCartCustomer | null) => {
        setCart(prev => ({ ...prev, customer }));
    }, []);

    const addItem = useCallback((item: Omit<TransitCartItem, 'totalAmount'>) => {
        setCart(prev => {
            // Check if already exists
            const existing = prev.items.find(i => i.shipmentItemId === item.shipmentItemId);
            if (existing) {
                // Update quantity
                return {
                    ...prev,
                    items: prev.items.map(i =>
                        i.shipmentItemId === item.shipmentItemId
                            ? {
                                ...i,
                                reservedQuantity: Math.min(
                                    i.reservedQuantity + item.reservedQuantity,
                                    item.availableQuantity
                                ),
                                totalAmount: Math.min(
                                    i.reservedQuantity + item.reservedQuantity,
                                    item.availableQuantity
                                ) * i.unitPrice,
                            }
                            : i
                    ),
                };
            }
            // Add new item
            const newItem: TransitCartItem = {
                ...item,
                totalAmount: item.reservedQuantity * item.unitPrice,
            };
            return { ...prev, items: [...prev.items, newItem] };
        });
    }, []);

    const removeItem = useCallback((shipmentItemId: string) => {
        setCart(prev => ({
            ...prev,
            items: prev.items.filter(i => i.shipmentItemId !== shipmentItemId),
        }));
    }, []);

    const updateQuantity = useCallback((shipmentItemId: string, quantity: number) => {
        setCart(prev => ({
            ...prev,
            items: prev.items.map(i =>
                i.shipmentItemId === shipmentItemId
                    ? {
                        ...i,
                        reservedQuantity: Math.max(0, Math.min(quantity, i.availableQuantity)),
                        totalAmount: Math.max(0, Math.min(quantity, i.availableQuantity)) * i.unitPrice,
                    }
                    : i
            ),
        }));
    }, []);

    const updatePrice = useCallback((shipmentItemId: string, price: number) => {
        setCart(prev => ({
            ...prev,
            items: prev.items.map(i =>
                i.shipmentItemId === shipmentItemId
                    ? { ...i, unitPrice: price, totalAmount: i.reservedQuantity * price }
                    : i
            ),
        }));
    }, []);

    const setAdvanceAmount = useCallback((amount: number) => {
        setCart(prev => ({ ...prev, advanceAmount: Math.max(0, amount) }));
    }, []);

    const setNotes = useCallback((notes: string) => {
        setCart(prev => ({ ...prev, notes }));
    }, []);

    const clearCart = useCallback(() => {
        setCart(createEmptyCart(shipmentId));
        if (shipmentId) {
            localStorage.removeItem(getStorageKey(shipmentId));
        }
    }, [shipmentId]);

    const isInCart = useCallback(
        (sid: string) => cart.items.some(i => i.shipmentItemId === sid),
        [cart.items]
    );

    const getRemainingAvailable = useCallback(
        (sid: string, originalAvailable: number) => {
            const cartItem = cart.items.find(i => i.shipmentItemId === sid);
            return cartItem ? originalAvailable - cartItem.reservedQuantity : originalAvailable;
        },
        [cart.items]
    );

    return {
        cart,
        isOpen,
        setIsOpen,
        itemCount,
        totalAmount,
        setCustomer,
        addItem,
        removeItem,
        updateQuantity,
        updatePrice,
        setAdvanceAmount,
        setNotes,
        clearCart,
        isInCart,
        getRemainingAvailable,
    };
}
