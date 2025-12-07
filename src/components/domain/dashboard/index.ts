/**
 * Dashboard Domain Components
 *
 * Components for the dashboard view in the Aymur Platform.
 * Includes grid layout, widgets, and summary components.
 *
 * @module components/domain/dashboard
 */

// Grid layout components
export {
  DashboardGrid,
  DashboardWidget,
  WidgetSkeleton,
  type DashboardGridProps,
  type DashboardWidgetProps,
  type WidgetSkeletonProps,
  type WidgetSize,
} from './DashboardGrid';

// Widget components
export { PaymentRemindersWidget, type PaymentRemindersWidgetProps } from './PaymentRemindersWidget';

export { QuickActionsWidget, type QuickActionsWidgetProps } from './QuickActionsWidget';

export { RecentActivityWidget, type RecentActivityWidgetProps } from './RecentActivityWidget';

export { LowStockAlertWidget, type LowStockAlertWidgetProps } from './LowStockAlertWidget';

export { PaymentsDueWidget, type PaymentsDueWidgetProps } from './PaymentsDueWidget';
