/**
 * Inventory Components
 * Product management, stock tracking, catalog
 */

// Item Card - Grid display for inventory items
export { ItemCard, ItemCardSkeleton } from './ItemCard';
export type { ItemCardProps } from './ItemCard';

// Inventory Filters - Collapsible filter panel
export { InventoryFilters, InventoryFiltersCompact } from './InventoryFilters';
export type { InventoryFiltersProps } from './InventoryFilters';

// Item Detail Drawer - Full item details in slide-out panel
export { ItemDetailDrawer } from './ItemDetailDrawer';
export type { ItemDetailDrawerProps } from './ItemDetailDrawer';

// Item Form - Create/Edit form for inventory items
export { ItemForm, ItemFormSkeleton } from './ItemForm';
export type { ItemFormProps, ItemFormValues, InventoryItemData } from './ItemForm';

// Barcode Scanner - Hardware and camera-based barcode scanning
export { BarcodeScanner, BarcodeScannerSkeleton } from './BarcodeScanner';
export type { BarcodeScannerProps, ScannerMode } from './BarcodeScanner';

// Barcode Scanner Modal - Modal wrapper with history and manual entry
export { BarcodeScannerModal } from './BarcodeScannerModal';
export type { BarcodeScannerModalProps, RecentScan } from './BarcodeScannerModal';

// Barcode Input - Simple input optimized for hardware scanners
export { BarcodeInput, BarcodeInputSkeleton } from './BarcodeInput';
export type { BarcodeInputProps, BarcodeInputRef } from './BarcodeInput';

// Item Stones Manager - Manage stones attached to inventory items
export { ItemStonesManager, ItemStonesManagerSkeleton } from './ItemStonesManager';
export type { ItemStonesManagerProps, ItemStone } from './ItemStonesManager';

// Item Stone Card - Display individual stone details
export { ItemStoneCard, ItemStoneCardSkeleton } from './ItemStoneCard';
export type { ItemStoneCardProps, ItemStoneData } from './ItemStoneCard';

// Item Stone Form - Add/edit stone form
export { ItemStoneForm, ItemStoneFormSkeleton } from './ItemStoneForm';
export type { ItemStoneFormProps, ItemStoneFormValues } from './ItemStoneForm';

// Item Stone Modal - Modal wrapper for stone form
export { ItemStoneModal } from './ItemStoneModal';
export type { ItemStoneModalProps } from './ItemStoneModal';

// Barcode Label - Printable barcode label for inventory items
export { BarcodeLabel, BarcodeLabelSkeleton } from './BarcodeLabel';
export type {
  BarcodeLabelProps,
  BarcodeLabelRef,
  LabelSize,
  LabelDimensions,
} from './BarcodeLabel';

// Barcode Label Preview - Preview component with configuration options
export {
  BarcodeLabelPreview,
  BarcodeLabelPreviewSkeleton,
  DEFAULT_CONTENT_OPTIONS,
} from './BarcodeLabelPreview';
export type { BarcodeLabelPreviewProps, LabelContentOptions } from './BarcodeLabelPreview';

// Barcode Label Modal - Modal wrapper for configuring and printing labels
export { BarcodeLabelModal, BarcodeLabelModalSkeleton } from './BarcodeLabelModal';
export type { BarcodeLabelModalProps, LabelPrintItem } from './BarcodeLabelModal';

// Barcode Label Sheet - Sheet layout for batch printing multiple labels
export { BarcodeLabelSheet, BarcodeLabelSheetSkeleton } from './BarcodeLabelSheet';
export type {
  BarcodeLabelSheetProps,
  BarcodeLabelSheetRef,
  LabelSheetFormat,
  SheetFormatConfig,
} from './BarcodeLabelSheet';
