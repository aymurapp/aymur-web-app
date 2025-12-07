'use client';

/**
 * Point of Sale (POS) Page
 *
 * Full-screen POS interface with split layout for efficient sales processing.
 * Features:
 * - Left panel (60%): Product search, category tabs, item grid
 * - Right panel (40%): Shopping cart with line items, totals, checkout
 * - Bottom bar: Quick actions (Scan, Hold, Retrieve, Clear)
 * - Keyboard shortcuts for power users
 * - Barcode scanner integration
 * - Customer selection
 * - Hold/retrieve sales functionality
 *
 * Keyboard Shortcuts:
 * - F2: Focus search
 * - F3: Toggle scanner
 * - F4: Open customer selector
 * - F8: Hold current sale
 * - F9: Retrieve held sale
 * - F12: Proceed to checkout
 * - Escape: Clear search / Close modals
 *
 * @module app/(platform)/[locale]/[shopId]/sales/pos/page
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';

import {
  ClearOutlined,
  CloseOutlined,
  CreditCardOutlined,
  DeleteOutlined,
  HistoryOutlined,
  KeyOutlined,
  MinusOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ScanOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  Avatar,
  Badge,
  Divider,
  Empty,
  Input,
  InputNumber,
  List,
  message,
  Modal,
  Spin,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { useTranslations } from 'next-intl';

import { EmptyState } from '@/components/common/data/EmptyState';
import { ItemCard, ItemCardSkeleton } from '@/components/domain/inventory/ItemCard';
import { Button } from '@/components/ui/Button';
import { useCategories } from '@/lib/hooks/data/useCategories';
import { useCustomers, type Customer } from '@/lib/hooks/data/useCustomers';
import {
  useInventoryItems,
  type InventoryItemWithRelations,
} from '@/lib/hooks/data/useInventoryItems';
// useInventoryItemByBarcode available for barcode lookup when implementing full barcode support
import { useCreateSale } from '@/lib/hooks/data/useSales';
import { usePermissions } from '@/lib/hooks/permissions';
import { useShop } from '@/lib/hooks/shop';
import { useBarcodeScanner, isCameraScanningSupported } from '@/lib/hooks/utils/useBarcodeScanner';
import { useDebounce } from '@/lib/hooks/utils/useDebounce';
import { useMobile } from '@/lib/hooks/utils/useMediaQuery';
// Router import available when implementing full checkout flow
// import { useRouter } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils/cn';

import type { InputRef } from 'antd';

const { Text } = Typography;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Cart line item
 */
interface CartItem {
  id: string;
  itemId: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  weight?: number;
  metalType?: string;
  purity?: string;
  imageUrl?: string;
}

/**
 * Held sale for later retrieval
 */
interface HeldSale {
  id: string;
  items: CartItem[];
  customer: Customer | null;
  heldAt: Date;
  note?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Debounce delay for search input */
const SEARCH_DEBOUNCE_MS = 300;

/** Number of items to show in grid */
const PAGE_SIZE = 12;

/** Local storage key for held sales */
const HELD_SALES_KEY = 'pos_held_sales';

/** Keyboard shortcuts config */
const KEYBOARD_SHORTCUTS = [
  { key: 'F2', action: 'search', label: 'Search' },
  { key: 'F3', action: 'scanner', label: 'Scanner' },
  { key: 'F4', action: 'customer', label: 'Customer' },
  { key: 'F8', action: 'hold', label: 'Hold Sale' },
  { key: 'F9', action: 'retrieve', label: 'Retrieve' },
  { key: 'F12', action: 'checkout', label: 'Checkout' },
] as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format currency with locale awareness
 */
function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Generate unique cart item ID
 */
function generateCartItemId(): string {
  return `cart_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Load held sales from local storage
 */
function loadHeldSales(): HeldSale[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const stored = localStorage.getItem(HELD_SALES_KEY);
    if (!stored) {
      return [];
    }
    const parsed = JSON.parse(stored);
    return parsed.map((sale: HeldSale) => ({
      ...sale,
      heldAt: new Date(sale.heldAt),
    }));
  } catch {
    return [];
  }
}

/**
 * Save held sales to local storage
 */
function saveHeldSales(sales: HeldSale[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(HELD_SALES_KEY, JSON.stringify(sales));
  } catch {
    // Ignore storage errors
  }
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Search Input Component for POS
 */
function POSSearchInput({
  value,
  onChange,
  onClear,
  placeholder,
  inputRef,
}: {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder: string;
  inputRef: RefObject<InputRef>;
}): JSX.Element {
  return (
    <Input
      ref={inputRef as React.Ref<InputRef>}
      prefix={<SearchOutlined className="text-stone-400" />}
      suffix={
        value ? (
          <CloseOutlined
            className="text-stone-400 cursor-pointer hover:text-stone-600"
            onClick={onClear}
          />
        ) : (
          <Tag className="text-xs">F2</Tag>
        )
      }
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      size="large"
      className="w-full"
      data-barcode-input
    />
  );
}

/**
 * Cart Item Row Component
 */
function CartItemRow({
  item,
  onQuantityChange,
  onRemove,
  currency,
}: {
  item: CartItem;
  onQuantityChange: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
  currency: string;
}): JSX.Element {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-stone-100 last:border-0">
      {/* Item Image */}
      <div className="w-12 h-12 bg-stone-100 rounded-md overflow-hidden flex-shrink-0">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingCartOutlined className="text-stone-300" />
          </div>
        )}
      </div>

      {/* Item Details */}
      <div className="flex-1 min-w-0">
        <Text strong className="block truncate text-sm">
          {item.name}
        </Text>
        <Text type="secondary" className="text-xs block">
          {item.sku}
        </Text>
        {item.metalType && (
          <Text type="secondary" className="text-xs">
            {item.metalType} {item.purity && `- ${item.purity}`}
          </Text>
        )}
      </div>

      {/* Quantity Controls */}
      <div className="flex items-center gap-1">
        <Button
          type="text"
          size="small"
          icon={<MinusOutlined />}
          onClick={() => onQuantityChange(item.id, item.quantity - 1)}
          disabled={item.quantity <= 1}
          className="!w-6 !h-6 !min-w-0"
        />
        <InputNumber
          min={1}
          max={99}
          value={item.quantity}
          onChange={(val) => onQuantityChange(item.id, val || 1)}
          controls={false}
          className="!w-10 text-center"
          size="small"
        />
        <Button
          type="text"
          size="small"
          icon={<PlusOutlined />}
          onClick={() => onQuantityChange(item.id, item.quantity + 1)}
          className="!w-6 !h-6 !min-w-0"
        />
      </div>

      {/* Price and Remove */}
      <div className="flex flex-col items-end gap-1">
        <Text strong className="text-amber-600">
          {formatCurrency(item.price * item.quantity, currency)}
        </Text>
        <Button
          type="text"
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => onRemove(item.id)}
          className="!w-6 !h-6 !min-w-0"
        />
      </div>
    </div>
  );
}

/**
 * Customer Selector Modal
 */
function CustomerSelectorModal({
  open,
  onClose,
  onSelect,
  selectedCustomer,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (customer: Customer | null) => void;
  selectedCustomer: Customer | null;
}): JSX.Element {
  const t = useTranslations();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, SEARCH_DEBOUNCE_MS);

  const { customers, isLoading } = useCustomers({
    search: debouncedSearch,
    pageSize: 10,
    enabled: open,
  });

  return (
    <Modal
      title={t('customers.selectCustomer')}
      open={open}
      onCancel={onClose}
      footer={null}
      width={480}
    >
      <div className="space-y-4">
        <Input
          prefix={<SearchOutlined />}
          placeholder={t('customers.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          autoFocus
        />

        {selectedCustomer && (
          <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-center gap-3">
              <Avatar icon={<UserOutlined />} className="bg-amber-500" />
              <div>
                <Text strong>{selectedCustomer.full_name}</Text>
                <Text type="secondary" className="block text-xs">
                  {selectedCustomer.phone}
                </Text>
              </div>
            </div>
            <Button type="text" size="small" onClick={() => onSelect(null)}>
              {t('common.actions.clear')}
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spin />
          </div>
        ) : customers.length === 0 ? (
          <Empty
            description={
              debouncedSearch ? t('common.messages.noResults') : t('customers.noCustomers')
            }
          />
        ) : (
          <List
            dataSource={customers}
            renderItem={(customer) => (
              <List.Item
                className={cn(
                  'cursor-pointer hover:bg-stone-50 rounded-lg transition-colors',
                  selectedCustomer?.id_customer === customer.id_customer && 'bg-amber-50'
                )}
                onClick={() => {
                  onSelect(customer);
                  onClose();
                }}
              >
                <List.Item.Meta
                  avatar={<Avatar icon={<UserOutlined />} />}
                  title={customer.full_name}
                  description={customer.phone || customer.email}
                />
              </List.Item>
            )}
          />
        )}
      </div>
    </Modal>
  );
}

/**
 * Held Sales Modal
 */
function HeldSalesModal({
  open,
  onClose,
  heldSales,
  onRetrieve,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  heldSales: HeldSale[];
  onRetrieve: (sale: HeldSale) => void;
  onDelete: (id: string) => void;
}): JSX.Element {
  const t = useTranslations();

  return (
    <Modal
      title={
        <span className="flex items-center gap-2">
          <HistoryOutlined />
          {t('sales.heldSales')}
        </span>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={520}
    >
      {heldSales.length === 0 ? (
        <Empty description={t('sales.noHeldSales')} />
      ) : (
        <List
          dataSource={heldSales}
          renderItem={(sale) => (
            <List.Item
              actions={[
                <Button
                  key="retrieve"
                  type="primary"
                  size="small"
                  onClick={() => {
                    onRetrieve(sale);
                    onClose();
                  }}
                >
                  {t('sales.retrieve')}
                </Button>,
                <Button
                  key="delete"
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => onDelete(sale.id)}
                />,
              ]}
            >
              <List.Item.Meta
                avatar={
                  <Badge count={sale.items.length}>
                    <Avatar icon={<ShoppingCartOutlined />} className="bg-amber-500" />
                  </Badge>
                }
                title={sale.customer?.full_name || t('sales.walkInCustomer')}
                description={
                  <div className="text-xs text-stone-500">
                    <div>
                      {sale.items.length} {t('common.labels.items')}
                    </div>
                    <div>
                      {new Intl.DateTimeFormat('en-US', {
                        hour: 'numeric',
                        minute: 'numeric',
                        hour12: true,
                      }).format(sale.heldAt)}
                    </div>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Modal>
  );
}

/**
 * Scanner Modal
 */
function ScannerModal({
  open,
  onClose,
  onScan,
}: {
  open: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}): JSX.Element {
  const t = useTranslations();
  const { cameraRef, startCameraScanner, stopCameraScanner, status, error } = useBarcodeScanner({
    onScan: (barcode) => {
      onScan(barcode);
      onClose();
    },
    scannerType: 'camera',
  });

  useEffect(() => {
    if (open) {
      startCameraScanner();
    }
    return () => {
      stopCameraScanner();
    };
  }, [open, startCameraScanner, stopCameraScanner]);

  return (
    <Modal
      title={
        <span className="flex items-center gap-2">
          <ScanOutlined />
          {t('inventory.scanBarcode')}
        </span>
      }
      open={open}
      onCancel={() => {
        stopCameraScanner();
        onClose();
      }}
      footer={null}
      width={400}
    >
      <div className="space-y-4">
        <div
          ref={cameraRef}
          className="w-full aspect-square bg-stone-900 rounded-lg overflow-hidden"
        />
        {status === 'permission_denied' && (
          <Text type="danger" className="text-center block">
            {t('common.messages.cameraPermissionDenied')}
          </Text>
        )}
        {error && (
          <Text type="danger" className="text-center block">
            {error.message}
          </Text>
        )}
        <Text type="secondary" className="text-center block text-sm">
          {t('inventory.positionBarcode')}
        </Text>
      </div>
    </Modal>
  );
}

/**
 * Keyboard Shortcuts Help Modal
 */
function KeyboardShortcutsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}): JSX.Element {
  const t = useTranslations();

  return (
    <Modal
      title={
        <span className="flex items-center gap-2">
          <KeyOutlined />
          {t('common.keyboardShortcuts')}
        </span>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={360}
    >
      <List<(typeof KEYBOARD_SHORTCUTS)[number]>
        dataSource={[...KEYBOARD_SHORTCUTS]}
        renderItem={(shortcut) => (
          <List.Item>
            <div className="flex items-center justify-between w-full">
              <Text>{shortcut.label}</Text>
              <Tag className="font-mono">{shortcut.key}</Tag>
            </div>
          </List.Item>
        )}
      />
    </Modal>
  );
}

/**
 * Quick Action Button
 */
function QuickActionButton({
  icon,
  label,
  shortcut,
  onClick,
  disabled,
  danger,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  badge?: number;
}): JSX.Element {
  const buttonContent = (
    <Button
      type="default"
      size="large"
      icon={icon}
      onClick={onClick}
      disabled={disabled}
      danger={danger}
      className={cn(
        'flex flex-col items-center justify-center h-16 w-full',
        'hover:border-amber-400 hover:text-amber-600'
      )}
    >
      <span className="text-xs mt-1">{label}</span>
      {shortcut && <span className="text-[10px] text-stone-400 mt-0.5">{shortcut}</span>}
    </Button>
  );

  if (badge && badge > 0) {
    return (
      <Badge count={badge} size="small">
        {buttonContent}
      </Badge>
    );
  }

  return buttonContent;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Point of Sale Page
 */
export default function POSPage(): JSX.Element {
  // Translation hooks
  const tCommon = useTranslations('common');
  const tSales = useTranslations('sales');
  const tInventory = useTranslations('inventory');

  const { can } = usePermissions();
  const { shop } = useShop();
  const isMobile = useMobile();

  // Refs
  const searchInputRef = useRef<InputRef>(null);

  // ==========================================================================
  // STATE
  // ==========================================================================

  // Search and filters
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, SEARCH_DEBOUNCE_MS);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Cart state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Held sales
  const [heldSales, setHeldSales] = useState<HeldSale[]>([]);

  // Modal states
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showHeldSalesModal, setShowHeldSalesModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // Mobile view toggle
  const [mobileView, setMobileView] = useState<'products' | 'cart'>('products');

  // Currency
  const currency = shop?.currency || 'USD';

  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================

  // Categories
  const { data: categories } = useCategories();

  // Inventory items
  const {
    items: products,
    isLoading: productsLoading,
    isFetching,
  } = useInventoryItems({
    search: debouncedSearch || undefined,
    status: ['available'],
    id_category: selectedCategory !== 'all' ? [selectedCategory] : undefined,
    page_size: PAGE_SIZE,
    sort_by: 'item_name',
    sort_order: 'asc',
  });

  // Create sale mutation - available for checkout implementation
  useCreateSale();

  // Barcode scanner for hardware scanners
  useBarcodeScanner({
    onScan: handleBarcodeScan,
    scannerType: 'keyboard',
  });

  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================

  // Cart totals
  const cartTotals = useMemo(() => {
    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    return { subtotal, itemCount };
  }, [cartItems]);

  // Category tabs
  const categoryTabs = useMemo(() => {
    const tabs = [{ key: 'all', label: tCommon('labels.all') }];
    if (categories) {
      categories.forEach((cat) => {
        tabs.push({ key: cat.id_category, label: cat.category_name });
      });
    }
    return tabs;
  }, [categories, tCommon]);

  // ==========================================================================
  // EFFECTS
  // ==========================================================================

  // Load held sales on mount
  useEffect(() => {
    setHeldSales(loadHeldSales());
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input (except barcode input)
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      const isBarcodeInput = target.hasAttribute('data-barcode-input');

      if (isInput && !isBarcodeInput && e.key !== 'Escape') {
        return;
      }

      switch (e.key) {
        case 'F2':
          e.preventDefault();
          searchInputRef.current?.focus();
          break;
        case 'F3':
          e.preventDefault();
          if (isCameraScanningSupported()) {
            setShowScannerModal(true);
          }
          break;
        case 'F4':
          e.preventDefault();
          setShowCustomerModal(true);
          break;
        case 'F8':
          e.preventDefault();
          handleHoldSale();
          break;
        case 'F9':
          e.preventDefault();
          setShowHeldSalesModal(true);
          break;
        case 'F12':
          e.preventDefault();
          if (cartItems.length > 0) {
            handleCheckout();
          }
          break;
        case 'Escape':
          if (searchInput) {
            setSearchInput('');
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // Note: handleHoldSale and handleCheckout are intentionally not in deps
    // to avoid re-registering listeners on every cart change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput, cartItems.length]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  /**
   * Handle barcode scan
   */
  function handleBarcodeScan(barcode: string): void {
    // TODO: Look up item by barcode and add to cart
    message.info(`${tInventory('scanned')}: ${barcode}`);
  }

  /**
   * Add item to cart
   */
  const handleAddToCart = useCallback(
    (item: InventoryItemWithRelations) => {
      setCartItems((prev) => {
        // Check if item already in cart
        const existing = prev.find((ci) => ci.itemId === item.id_item);
        if (existing) {
          return prev.map((ci) =>
            ci.itemId === item.id_item ? { ...ci, quantity: ci.quantity + 1 } : ci
          );
        }

        // Add new item
        const cartItem: CartItem = {
          id: generateCartItemId(),
          itemId: item.id_item,
          name: item.item_name || 'Unknown Item',
          sku: item.sku || '-',
          price: item.purchase_price || 0, // TODO: Use selling_price when available
          quantity: 1,
          weight: item.weight_grams || undefined,
          metalType: item.metal_type?.type_name,
          purity: item.metal_purity?.purity_name,
          imageUrl: undefined, // TODO: Add image URL when available
        };

        return [...prev, cartItem];
      });

      // Switch to cart view on mobile
      if (isMobile) {
        setMobileView('cart');
      }

      message.success(tSales('itemAdded'));
    },
    [isMobile, tSales]
  );

  /**
   * Update cart item quantity
   */
  const handleQuantityChange = useCallback((id: string, quantity: number) => {
    if (quantity < 1) {
      return;
    }
    setCartItems((prev) => prev.map((item) => (item.id === id ? { ...item, quantity } : item)));
  }, []);

  /**
   * Remove item from cart
   */
  const handleRemoveItem = useCallback((id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  /**
   * Clear entire cart
   */
  const handleClearCart = useCallback(() => {
    Modal.confirm({
      title: tSales('clearCart'),
      content: tSales('clearCartConfirm'),
      okText: tCommon('actions.clear'),
      cancelText: tCommon('actions.cancel'),
      okButtonProps: { danger: true },
      onOk: () => {
        setCartItems([]);
        setSelectedCustomer(null);
        message.success(tSales('cartCleared'));
      },
    });
  }, [tSales, tCommon]);

  /**
   * Hold current sale
   */
  const handleHoldSale = useCallback(() => {
    if (cartItems.length === 0) {
      message.warning(tSales('cartEmpty'));
      return;
    }

    const heldSale: HeldSale = {
      id: `hold_${Date.now()}`,
      items: [...cartItems],
      customer: selectedCustomer,
      heldAt: new Date(),
    };

    const updatedHeldSales = [...heldSales, heldSale];
    setHeldSales(updatedHeldSales);
    saveHeldSales(updatedHeldSales);

    // Clear current cart
    setCartItems([]);
    setSelectedCustomer(null);

    message.success(tSales('saleHeld'));
  }, [cartItems, selectedCustomer, heldSales, tSales]);

  /**
   * Retrieve held sale
   */
  const handleRetrieveSale = useCallback(
    (sale: HeldSale) => {
      // If current cart has items, offer to hold or discard
      if (cartItems.length > 0) {
        Modal.confirm({
          title: tSales('currentCartNotEmpty'),
          content: tSales('replaceCartConfirm'),
          okText: tSales('replace'),
          cancelText: tCommon('actions.cancel'),
          onOk: () => {
            setCartItems(sale.items);
            setSelectedCustomer(sale.customer);

            // Remove from held sales
            const updatedHeldSales = heldSales.filter((s) => s.id !== sale.id);
            setHeldSales(updatedHeldSales);
            saveHeldSales(updatedHeldSales);

            message.success(tSales('saleRetrieved'));
          },
        });
      } else {
        setCartItems(sale.items);
        setSelectedCustomer(sale.customer);

        // Remove from held sales
        const updatedHeldSales = heldSales.filter((s) => s.id !== sale.id);
        setHeldSales(updatedHeldSales);
        saveHeldSales(updatedHeldSales);

        message.success(tSales('saleRetrieved'));
      }
    },
    [cartItems.length, heldSales, tSales, tCommon]
  );

  /**
   * Delete held sale
   */
  const handleDeleteHeldSale = useCallback(
    (id: string) => {
      const updatedHeldSales = heldSales.filter((s) => s.id !== id);
      setHeldSales(updatedHeldSales);
      saveHeldSales(updatedHeldSales);
      message.success(tSales('heldSaleDeleted'));
    },
    [heldSales, tSales]
  );

  /**
   * Proceed to checkout
   */
  const handleCheckout = useCallback(async () => {
    if (cartItems.length === 0) {
      message.warning(tSales('cartEmpty'));
      return;
    }

    // Navigate to checkout page with cart data
    // For now, we'll just show a message
    // TODO: Implement full checkout flow
    message.info(tSales('proceedingToCheckout'));

    // Example of using createSale mutation:
    // try {
    //   const saleData: CreateSaleData = {
    //     sale: {
    //       sale_number: generateSaleNumber(),
    //       sale_date: new Date().toISOString(),
    //       currency,
    //       subtotal_amount: cartTotals.subtotal,
    //       total_amount: cartTotals.subtotal,
    //       id_customer: selectedCustomer?.id_customer,
    //       created_by: user?.id_user || '',
    //     },
    //     items: cartItems.map(item => ({
    //       id_item: item.itemId,
    //       item_name: item.name,
    //       unit_price: item.price,
    //       quantity: item.quantity,
    //       total_price: item.price * item.quantity,
    //     })),
    //   };
    //   await createSale.mutateAsync(saleData);
    //   message.success(tSales('saleCompleted'));
    //   setCartItems([]);
    //   setSelectedCustomer(null);
    // } catch (error) {
    //   message.error(tCommon('messages.operationFailed'));
    // }
  }, [cartItems, tSales]);

  // ==========================================================================
  // PERMISSION CHECK
  // ==========================================================================

  if (!can('sales.create')) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <EmptyState
          title={tCommon('messages.accessDenied')}
          description={tCommon('messages.noPermission')}
        />
      </div>
    );
  }

  // ==========================================================================
  // RENDER - MOBILE VIEW
  // ==========================================================================

  if (isMobile) {
    return (
      <div className="pos-page flex flex-col h-[calc(100vh-4rem)]">
        {/* Mobile Tab Toggle */}
        <div className="flex border-b border-stone-200">
          <button
            className={cn(
              'flex-1 py-3 text-center font-medium transition-colors',
              mobileView === 'products'
                ? 'text-amber-600 border-b-2 border-amber-500'
                : 'text-stone-500'
            )}
            onClick={() => setMobileView('products')}
          >
            {tInventory('title')}
          </button>
          <button
            className={cn(
              'flex-1 py-3 text-center font-medium transition-colors relative',
              mobileView === 'cart'
                ? 'text-amber-600 border-b-2 border-amber-500'
                : 'text-stone-500'
            )}
            onClick={() => setMobileView('cart')}
          >
            {tSales('cart')}
            {cartTotals.itemCount > 0 && (
              <Badge count={cartTotals.itemCount} size="small" className="absolute -top-1 end-4" />
            )}
          </button>
        </div>

        {/* Mobile Content */}
        <div className="flex-1 overflow-hidden">
          {mobileView === 'products' ? (
            <div className="h-full flex flex-col">
              {/* Search */}
              <div className="p-3 border-b border-stone-200">
                <POSSearchInput
                  value={searchInput}
                  onChange={setSearchInput}
                  onClear={() => setSearchInput('')}
                  placeholder={tInventory('select.placeholder')}
                  inputRef={searchInputRef}
                />
              </div>

              {/* Category Tabs */}
              <div className="border-b border-stone-200">
                <Tabs
                  activeKey={selectedCategory}
                  onChange={setSelectedCategory}
                  items={categoryTabs.map((tab) => ({
                    key: tab.key,
                    label: tab.label,
                  }))}
                  tabBarStyle={{ marginBottom: 0, paddingInline: 12 }}
                  size="small"
                />
              </div>

              {/* Products Grid */}
              <div className="flex-1 overflow-auto p-3">
                {productsLoading ? (
                  <div className="grid grid-cols-2 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <ItemCardSkeleton key={i} />
                    ))}
                  </div>
                ) : products.length === 0 ? (
                  <EmptyState title={tCommon('messages.noResults')} size="sm" />
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {products.map((item) => (
                      <ItemCard
                        key={item.id_item}
                        item={item}
                        onClick={handleAddToCart}
                        showActions={false}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {/* Cart Items */}
              <div className="flex-1 overflow-auto p-3">
                {cartItems.length === 0 ? (
                  <EmptyState
                    icon={<ShoppingCartOutlined />}
                    title={tSales('cartEmpty')}
                    description={tSales('addItemsToCart')}
                    size="sm"
                  />
                ) : (
                  <div>
                    {cartItems.map((item) => (
                      <CartItemRow
                        key={item.id}
                        item={item}
                        onQuantityChange={handleQuantityChange}
                        onRemove={handleRemoveItem}
                        currency={currency}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Cart Summary */}
              {cartItems.length > 0 && (
                <div className="border-t border-stone-200 p-3 bg-white">
                  <div className="flex justify-between mb-3">
                    <Text type="secondary">{tCommon('labels.subtotal')}</Text>
                    <Text strong>{formatCurrency(cartTotals.subtotal, currency)}</Text>
                  </div>
                  <Button
                    type="primary"
                    size="large"
                    block
                    icon={<CreditCardOutlined />}
                    onClick={handleCheckout}
                  >
                    {tSales('checkout')} ({cartTotals.itemCount})
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile Quick Actions */}
        <div className="grid grid-cols-4 gap-2 p-2 bg-stone-50 border-t border-stone-200">
          <Button
            size="large"
            icon={<ScanOutlined />}
            onClick={() => setShowScannerModal(true)}
            className="flex flex-col h-14"
          >
            <span className="text-xs">{tInventory('scan')}</span>
          </Button>
          <Button
            size="large"
            icon={<UserOutlined />}
            onClick={() => setShowCustomerModal(true)}
            className="flex flex-col h-14"
          >
            <span className="text-xs">{tCommon('labels.customer')}</span>
          </Button>
          <Badge count={heldSales.length} size="small">
            <Button
              size="large"
              icon={<PauseCircleOutlined />}
              onClick={() => setShowHeldSalesModal(true)}
              className="flex flex-col h-14 w-full"
            >
              <span className="text-xs">{tSales('held')}</span>
            </Button>
          </Badge>
          <Button
            size="large"
            danger
            icon={<ClearOutlined />}
            onClick={handleClearCart}
            disabled={cartItems.length === 0}
            className="flex flex-col h-14"
          >
            <span className="text-xs">{tCommon('actions.clear')}</span>
          </Button>
        </div>

        {/* Modals */}
        <CustomerSelectorModal
          open={showCustomerModal}
          onClose={() => setShowCustomerModal(false)}
          onSelect={setSelectedCustomer}
          selectedCustomer={selectedCustomer}
        />
        <HeldSalesModal
          open={showHeldSalesModal}
          onClose={() => setShowHeldSalesModal(false)}
          heldSales={heldSales}
          onRetrieve={handleRetrieveSale}
          onDelete={handleDeleteHeldSale}
        />
        {isCameraScanningSupported() && (
          <ScannerModal
            open={showScannerModal}
            onClose={() => setShowScannerModal(false)}
            onScan={handleBarcodeScan}
          />
        )}
      </div>
    );
  }

  // ==========================================================================
  // RENDER - DESKTOP VIEW
  // ==========================================================================

  return (
    <div className="pos-page flex flex-col h-[calc(100vh-4rem)]">
      {/* Main Content - Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Products (60%) */}
        <div className="w-[60%] flex flex-col border-e border-stone-200 bg-stone-50">
          {/* Search Bar */}
          <div className="p-4 bg-white border-b border-stone-200">
            <div className="flex gap-3">
              <div className="flex-1">
                <POSSearchInput
                  value={searchInput}
                  onChange={setSearchInput}
                  onClear={() => setSearchInput('')}
                  placeholder={tInventory('select.placeholder')}
                  inputRef={searchInputRef}
                />
              </div>
              {isCameraScanningSupported() && (
                <Tooltip title={`${tInventory('scan')} (F3)`}>
                  <Button
                    size="large"
                    icon={<ScanOutlined />}
                    onClick={() => setShowScannerModal(true)}
                  />
                </Tooltip>
              )}
              <Tooltip title={tCommon('keyboardShortcuts')}>
                <Button
                  size="large"
                  icon={<KeyOutlined />}
                  onClick={() => setShowShortcutsModal(true)}
                />
              </Tooltip>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="bg-white border-b border-stone-200">
            <Tabs
              activeKey={selectedCategory}
              onChange={setSelectedCategory}
              items={categoryTabs.map((tab) => ({
                key: tab.key,
                label: tab.label,
              }))}
              tabBarStyle={{ marginBottom: 0, paddingInline: 16 }}
            />
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-auto p-4">
            {productsLoading ? (
              <div className="grid grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <ItemCardSkeleton key={i} />
                ))}
              </div>
            ) : products.length === 0 ? (
              <EmptyState
                icon={<ShoppingCartOutlined />}
                title={
                  debouncedSearch ? tCommon('messages.noResults') : tCommon('messages.noItems')
                }
                description={debouncedSearch ? undefined : tInventory('addItem')}
                size="lg"
              />
            ) : (
              <div className="grid grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map((item) => (
                  <ItemCard
                    key={item.id_item}
                    item={item}
                    onClick={handleAddToCart}
                    showActions={false}
                  />
                ))}
              </div>
            )}

            {/* Loading indicator for fetching */}
            {isFetching && !productsLoading && (
              <div className="flex justify-center py-4">
                <Spin size="small" />
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Cart (40%) */}
        <div className="w-[40%] flex flex-col bg-white">
          {/* Customer Selection */}
          <div className="p-4 border-b border-stone-200">
            <div
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors',
                selectedCustomer
                  ? 'bg-amber-50 border border-amber-200'
                  : 'bg-stone-50 hover:bg-stone-100 border border-stone-200'
              )}
              onClick={() => setShowCustomerModal(true)}
            >
              <Avatar
                icon={<UserOutlined />}
                size="large"
                className={selectedCustomer ? 'bg-amber-500' : 'bg-stone-400'}
              />
              <div className="flex-1">
                {selectedCustomer ? (
                  <>
                    <Text strong>{selectedCustomer.full_name}</Text>
                    <Text type="secondary" className="block text-xs">
                      {selectedCustomer.phone || selectedCustomer.email}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text type="secondary">{tSales('selectCustomer')}</Text>
                    <Text type="secondary" className="block text-xs">
                      {tSales('walkInCustomer')}
                    </Text>
                  </>
                )}
              </div>
              <Tag className="text-xs">F4</Tag>
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-auto px-4">
            {cartItems.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <EmptyState
                  icon={<ShoppingCartOutlined />}
                  title={tSales('cartEmpty')}
                  description={tSales('addItemsToCart')}
                  size="sm"
                />
              </div>
            ) : (
              <div className="py-2">
                {cartItems.map((item) => (
                  <CartItemRow
                    key={item.id}
                    item={item}
                    onQuantityChange={handleQuantityChange}
                    onRemove={handleRemoveItem}
                    currency={currency}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Cart Summary */}
          <div className="border-t border-stone-200 p-4 bg-stone-50">
            {/* Item Count */}
            <div className="flex justify-between mb-2">
              <Text type="secondary">
                {cartTotals.itemCount} {tCommon('labels.items')}
              </Text>
            </div>

            <Divider className="!my-3" />

            {/* Subtotal */}
            <div className="flex justify-between mb-2">
              <Text type="secondary">{tCommon('labels.subtotal')}</Text>
              <Text>{formatCurrency(cartTotals.subtotal, currency)}</Text>
            </div>

            {/* Total */}
            <div className="flex justify-between mb-4">
              <Text strong className="text-lg">
                {tCommon('labels.total')}
              </Text>
              <Text strong className="text-lg text-amber-600">
                {formatCurrency(cartTotals.subtotal, currency)}
              </Text>
            </div>

            {/* Checkout Button */}
            <Button
              type="primary"
              size="large"
              block
              icon={<CreditCardOutlined />}
              onClick={handleCheckout}
              disabled={cartItems.length === 0}
              className="h-12 text-base"
            >
              {tSales('checkout')}
              <Tag className="ms-2 text-xs bg-amber-600 border-amber-600 text-white">F12</Tag>
            </Button>
          </div>
        </div>
      </div>

      {/* Bottom Quick Actions Bar */}
      <div className="h-20 bg-white border-t border-stone-200 px-4 py-2">
        <div className="grid grid-cols-6 gap-3 h-full">
          <QuickActionButton
            icon={<ScanOutlined />}
            label={tInventory('scan')}
            shortcut="F3"
            onClick={() => setShowScannerModal(true)}
          />
          <QuickActionButton
            icon={<UserOutlined />}
            label={tSales('customer')}
            shortcut="F4"
            onClick={() => setShowCustomerModal(true)}
          />
          <QuickActionButton
            icon={<PauseCircleOutlined />}
            label={tSales('hold')}
            shortcut="F8"
            onClick={handleHoldSale}
            disabled={cartItems.length === 0}
          />
          <QuickActionButton
            icon={<PlayCircleOutlined />}
            label={tSales('retrieve')}
            shortcut="F9"
            onClick={() => setShowHeldSalesModal(true)}
            badge={heldSales.length}
          />
          <QuickActionButton
            icon={<ClearOutlined />}
            label={tCommon('actions.clear')}
            onClick={handleClearCart}
            disabled={cartItems.length === 0}
            danger
          />
          <QuickActionButton
            icon={<CreditCardOutlined />}
            label={tSales('checkout')}
            shortcut="F12"
            onClick={handleCheckout}
            disabled={cartItems.length === 0}
          />
        </div>
      </div>

      {/* Modals */}
      <CustomerSelectorModal
        open={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        onSelect={setSelectedCustomer}
        selectedCustomer={selectedCustomer}
      />
      <HeldSalesModal
        open={showHeldSalesModal}
        onClose={() => setShowHeldSalesModal(false)}
        heldSales={heldSales}
        onRetrieve={handleRetrieveSale}
        onDelete={handleDeleteHeldSale}
      />
      {isCameraScanningSupported() && (
        <ScannerModal
          open={showScannerModal}
          onClose={() => setShowScannerModal(false)}
          onScan={handleBarcodeScan}
        />
      )}
      <KeyboardShortcutsModal
        open={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />
    </div>
  );
}
