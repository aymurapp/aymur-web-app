/**
 * Settings Domain Components Index
 *
 * Exports all settings-related domain components for use throughout the application.
 * These components are specifically designed for the settings section of the platform.
 *
 * @module components/domain/settings
 */

// =============================================================================
// SHOP SETUP WIZARD
// =============================================================================

export { ShopSetupWizard } from './ShopSetupWizard';
export type { ShopSetupWizardProps } from './ShopSetupWizard';

// =============================================================================
// PROFILE SETTINGS
// =============================================================================

export { ProfileSettingsForm } from './ProfileSettingsForm';
export type { ProfileSettingsFormProps } from './ProfileSettingsForm';

// =============================================================================
// CATALOG TABLE
// =============================================================================

export {
  CatalogTable,
  ColorIndicator,
  CategoryBadge,
  PercentageDisplay,
  createDefaultActions,
  type CatalogAction,
  type CatalogColumn,
  type CatalogTableProps,
} from './CatalogTable';

// =============================================================================
// CATALOG FORM MODAL
// =============================================================================

export {
  CatalogFormModal,
  FormField,
  FormRow,
  FormSection,
  type CatalogFormModalProps,
} from './CatalogFormModal';

// =============================================================================
// ICON SELECTOR
// =============================================================================

export {
  IconSelector,
  CategoryIcon,
  CATEGORY_ICONS,
  type IconKey,
  type IconSelectorProps,
} from './IconSelector';

// =============================================================================
// COLOR PICKER
// =============================================================================

export {
  StoneColorPicker,
  ColorSwatch,
  ColorDisplay,
  STONE_COLOR_PRESETS,
  ALL_STONE_PRESETS,
  type StoneColorPickerProps,
} from './ColorPicker';

// =============================================================================
// INVITE MEMBER MODAL
// =============================================================================

export { InviteMemberModal, type InviteMemberModalProps } from './InviteMemberModal';

// =============================================================================
// PERMISSION EDITOR
// =============================================================================

export { PermissionEditor, type PermissionEditorProps } from './PermissionEditor';

// =============================================================================
// METAL PRICE WIDGET
// =============================================================================

export { MetalPriceWidget, type MetalPriceWidgetProps } from './MetalPriceWidget';

// =============================================================================
// EXPORT DIALOG
// =============================================================================

export {
  ExportDialog,
  type ExportDialogProps,
  type ExportType,
  type ExportFormat,
} from './ExportDialog';

// =============================================================================
// IMPORT WIZARD
// =============================================================================

export { ImportWizard, type ImportWizardProps, type ImportType } from './ImportWizard';

// =============================================================================
// AUDIT LOG VIEWER
// =============================================================================

export {
  AuditLogViewer,
  type AuditLogViewerProps,
  type AuditLogEntry,
  type AuditLogFilters,
  type AuditActionType,
  type AuditEntityType,
} from './AuditLogViewer';
