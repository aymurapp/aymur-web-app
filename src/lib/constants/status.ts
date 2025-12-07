/**
 * Status Constants
 * Status enums matching database values for inventory items, sales, purchases, etc.
 * Based on the DATABASE_DOCUMENTATION.md specifications
 */

// =============================================================================
// INVENTORY ITEM STATUS
// =============================================================================

/**
 * Status values for inventory items
 * Matches inventory_items.status column values
 */
export const ITEM_STATUS = {
  AVAILABLE: 'available',
  RESERVED: 'reserved',
  SOLD: 'sold',
  WORKSHOP: 'workshop',
  TRANSFERRED: 'transferred',
  DAMAGED: 'damaged',
  RETURNED: 'returned',
} as const;

export type ItemStatus = (typeof ITEM_STATUS)[keyof typeof ITEM_STATUS];

/**
 * Labels for item status display
 */
export const ITEM_STATUS_LABELS: Record<ItemStatus, string> = {
  [ITEM_STATUS.AVAILABLE]: 'Available',
  [ITEM_STATUS.RESERVED]: 'Reserved',
  [ITEM_STATUS.SOLD]: 'Sold',
  [ITEM_STATUS.WORKSHOP]: 'In Workshop',
  [ITEM_STATUS.TRANSFERRED]: 'Transferred',
  [ITEM_STATUS.DAMAGED]: 'Damaged',
  [ITEM_STATUS.RETURNED]: 'Returned',
};

/**
 * Colors for item status badges
 */
export const ITEM_STATUS_COLORS: Record<ItemStatus, string> = {
  [ITEM_STATUS.AVAILABLE]: 'success',
  [ITEM_STATUS.RESERVED]: 'warning',
  [ITEM_STATUS.SOLD]: 'default',
  [ITEM_STATUS.WORKSHOP]: 'processing',
  [ITEM_STATUS.TRANSFERRED]: 'default',
  [ITEM_STATUS.DAMAGED]: 'error',
  [ITEM_STATUS.RETURNED]: 'warning',
};

// =============================================================================
// ITEM TYPE & SOURCE TYPE
// =============================================================================

/**
 * Item types for inventory
 */
export const ITEM_TYPE = {
  RAW_MATERIAL: 'raw_material',
  COMPONENT: 'component',
  FINISHED: 'finished',
} as const;

export type ItemType = (typeof ITEM_TYPE)[keyof typeof ITEM_TYPE];

/**
 * Labels for item types
 */
export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  [ITEM_TYPE.RAW_MATERIAL]: 'Raw Material',
  [ITEM_TYPE.COMPONENT]: 'Component',
  [ITEM_TYPE.FINISHED]: 'Finished Product',
};

/**
 * Source types for inventory items
 */
export const SOURCE_TYPE = {
  PURCHASE: 'purchase',
  RECYCLED: 'recycled',
} as const;

export type SourceType = (typeof SOURCE_TYPE)[keyof typeof SOURCE_TYPE];

/**
 * Ownership types for inventory items
 */
export const OWNERSHIP_TYPE = {
  OWNED: 'owned',
  CONSIGNMENT: 'consignment',
  MEMO: 'memo',
} as const;

export type OwnershipType = (typeof OWNERSHIP_TYPE)[keyof typeof OWNERSHIP_TYPE];

/**
 * Labels for ownership types
 */
export const OWNERSHIP_TYPE_LABELS: Record<OwnershipType, string> = {
  [OWNERSHIP_TYPE.OWNED]: 'Owned',
  [OWNERSHIP_TYPE.CONSIGNMENT]: 'Consignment',
  [OWNERSHIP_TYPE.MEMO]: 'Memo',
};

// =============================================================================
// SALE STATUS
// =============================================================================

/**
 * Status values for sales
 */
export const SALE_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
} as const;

export type SaleStatus = (typeof SALE_STATUS)[keyof typeof SALE_STATUS];

/**
 * Labels for sale status display
 */
export const SALE_STATUS_LABELS: Record<SaleStatus, string> = {
  [SALE_STATUS.PENDING]: 'Pending',
  [SALE_STATUS.COMPLETED]: 'Completed',
  [SALE_STATUS.CANCELLED]: 'Cancelled',
  [SALE_STATUS.REFUNDED]: 'Refunded',
};

/**
 * Colors for sale status badges
 */
export const SALE_STATUS_COLORS: Record<SaleStatus, string> = {
  [SALE_STATUS.PENDING]: 'warning',
  [SALE_STATUS.COMPLETED]: 'success',
  [SALE_STATUS.CANCELLED]: 'default',
  [SALE_STATUS.REFUNDED]: 'error',
};

// =============================================================================
// PAYMENT STATUS
// =============================================================================

/**
 * Payment status values (used by sales, purchases, expenses)
 */
export const PAYMENT_STATUS = {
  UNPAID: 'unpaid',
  PARTIAL: 'partial',
  PAID: 'paid',
} as const;

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

/**
 * Labels for payment status display
 */
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  [PAYMENT_STATUS.UNPAID]: 'Unpaid',
  [PAYMENT_STATUS.PARTIAL]: 'Partial',
  [PAYMENT_STATUS.PAID]: 'Paid',
};

/**
 * Colors for payment status badges
 */
export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  [PAYMENT_STATUS.UNPAID]: 'error',
  [PAYMENT_STATUS.PARTIAL]: 'warning',
  [PAYMENT_STATUS.PAID]: 'success',
};

// =============================================================================
// PURCHASE STATUS
// =============================================================================

/**
 * Status values for purchases
 */
export const PURCHASE_STATUS = {
  PENDING: 'pending',
  ORDERED: 'ordered',
  SHIPPED: 'shipped',
  RECEIVED: 'received',
  CANCELLED: 'cancelled',
} as const;

export type PurchaseStatus = (typeof PURCHASE_STATUS)[keyof typeof PURCHASE_STATUS];

/**
 * Labels for purchase status
 */
export const PURCHASE_STATUS_LABELS: Record<PurchaseStatus, string> = {
  [PURCHASE_STATUS.PENDING]: 'Pending',
  [PURCHASE_STATUS.ORDERED]: 'Ordered',
  [PURCHASE_STATUS.SHIPPED]: 'Shipped',
  [PURCHASE_STATUS.RECEIVED]: 'Received',
  [PURCHASE_STATUS.CANCELLED]: 'Cancelled',
};

/**
 * Colors for purchase status badges
 */
export const PURCHASE_STATUS_COLORS: Record<PurchaseStatus, string> = {
  [PURCHASE_STATUS.PENDING]: 'default',
  [PURCHASE_STATUS.ORDERED]: 'processing',
  [PURCHASE_STATUS.SHIPPED]: 'processing',
  [PURCHASE_STATUS.RECEIVED]: 'success',
  [PURCHASE_STATUS.CANCELLED]: 'error',
};

// =============================================================================
// DELIVERY STATUS
// =============================================================================

/**
 * Status values for deliveries
 */
export const DELIVERY_STATUS = {
  PENDING: 'pending',
  SHIPPED: 'shipped',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  RETURNED: 'returned',
} as const;

export type DeliveryStatus = (typeof DELIVERY_STATUS)[keyof typeof DELIVERY_STATUS];

/**
 * Labels for delivery status
 */
export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  [DELIVERY_STATUS.PENDING]: 'Pending',
  [DELIVERY_STATUS.SHIPPED]: 'Shipped',
  [DELIVERY_STATUS.IN_TRANSIT]: 'In Transit',
  [DELIVERY_STATUS.DELIVERED]: 'Delivered',
  [DELIVERY_STATUS.FAILED]: 'Failed',
  [DELIVERY_STATUS.RETURNED]: 'Returned',
};

/**
 * Colors for delivery status badges
 */
export const DELIVERY_STATUS_COLORS: Record<DeliveryStatus, string> = {
  [DELIVERY_STATUS.PENDING]: 'default',
  [DELIVERY_STATUS.SHIPPED]: 'processing',
  [DELIVERY_STATUS.IN_TRANSIT]: 'processing',
  [DELIVERY_STATUS.DELIVERED]: 'success',
  [DELIVERY_STATUS.FAILED]: 'error',
  [DELIVERY_STATUS.RETURNED]: 'warning',
};

/**
 * Who pays for delivery cost
 */
export const DELIVERY_COST_PAID_BY = {
  SHOP: 'shop',
  CUSTOMER: 'customer',
} as const;

export type DeliveryCostPaidBy = (typeof DELIVERY_COST_PAID_BY)[keyof typeof DELIVERY_COST_PAID_BY];

// =============================================================================
// WORKSHOP ORDER STATUS
// =============================================================================

/**
 * Status values for workshop orders
 */
export const WORKSHOP_ORDER_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  DELIVERED: 'delivered',
  REJECTED: 'rejected',
} as const;

export type WorkshopOrderStatus =
  (typeof WORKSHOP_ORDER_STATUS)[keyof typeof WORKSHOP_ORDER_STATUS];

/**
 * Labels for workshop order status
 */
export const WORKSHOP_ORDER_STATUS_LABELS: Record<WorkshopOrderStatus, string> = {
  [WORKSHOP_ORDER_STATUS.PENDING]: 'Pending',
  [WORKSHOP_ORDER_STATUS.ACCEPTED]: 'Accepted',
  [WORKSHOP_ORDER_STATUS.IN_PROGRESS]: 'In Progress',
  [WORKSHOP_ORDER_STATUS.COMPLETED]: 'Completed',
  [WORKSHOP_ORDER_STATUS.DELIVERED]: 'Delivered',
  [WORKSHOP_ORDER_STATUS.REJECTED]: 'Rejected',
};

/**
 * Colors for workshop order status badges
 */
export const WORKSHOP_ORDER_STATUS_COLORS: Record<WorkshopOrderStatus, string> = {
  [WORKSHOP_ORDER_STATUS.PENDING]: 'default',
  [WORKSHOP_ORDER_STATUS.ACCEPTED]: 'processing',
  [WORKSHOP_ORDER_STATUS.IN_PROGRESS]: 'processing',
  [WORKSHOP_ORDER_STATUS.COMPLETED]: 'success',
  [WORKSHOP_ORDER_STATUS.DELIVERED]: 'success',
  [WORKSHOP_ORDER_STATUS.REJECTED]: 'error',
};

// =============================================================================
// EXPENSE STATUS
// =============================================================================

/**
 * Approval status values for expenses
 */
export const APPROVAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export type ApprovalStatus = (typeof APPROVAL_STATUS)[keyof typeof APPROVAL_STATUS];

/**
 * Labels for approval status
 */
export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  [APPROVAL_STATUS.PENDING]: 'Pending Approval',
  [APPROVAL_STATUS.APPROVED]: 'Approved',
  [APPROVAL_STATUS.REJECTED]: 'Rejected',
};

/**
 * Colors for approval status badges
 */
export const APPROVAL_STATUS_COLORS: Record<ApprovalStatus, string> = {
  [APPROVAL_STATUS.PENDING]: 'warning',
  [APPROVAL_STATUS.APPROVED]: 'success',
  [APPROVAL_STATUS.REJECTED]: 'error',
};

// =============================================================================
// PAYMENT TYPE
// =============================================================================

/**
 * Payment method types
 */
export const PAYMENT_TYPE = {
  CASH: 'cash',
  CHEQUE: 'cheque',
  BANK_TRANSFER: 'bank_transfer',
  CARD: 'card',
  MOBILE_PAYMENT: 'mobile_payment',
} as const;

export type PaymentType = (typeof PAYMENT_TYPE)[keyof typeof PAYMENT_TYPE];

/**
 * Labels for payment types
 */
export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  [PAYMENT_TYPE.CASH]: 'Cash',
  [PAYMENT_TYPE.CHEQUE]: 'Cheque',
  [PAYMENT_TYPE.BANK_TRANSFER]: 'Bank Transfer',
  [PAYMENT_TYPE.CARD]: 'Card',
  [PAYMENT_TYPE.MOBILE_PAYMENT]: 'Mobile Payment',
};

// =============================================================================
// CHEQUE STATUS
// =============================================================================

/**
 * Status values for cheques
 */
export const CHEQUE_STATUS = {
  PENDING: 'pending',
  CLEARED: 'cleared',
  BOUNCED: 'bounced',
} as const;

export type ChequeStatus = (typeof CHEQUE_STATUS)[keyof typeof CHEQUE_STATUS];

/**
 * Labels for cheque status
 */
export const CHEQUE_STATUS_LABELS: Record<ChequeStatus, string> = {
  [CHEQUE_STATUS.PENDING]: 'Pending',
  [CHEQUE_STATUS.CLEARED]: 'Cleared',
  [CHEQUE_STATUS.BOUNCED]: 'Bounced',
};

/**
 * Colors for cheque status badges
 */
export const CHEQUE_STATUS_COLORS: Record<ChequeStatus, string> = {
  [CHEQUE_STATUS.PENDING]: 'warning',
  [CHEQUE_STATUS.CLEARED]: 'success',
  [CHEQUE_STATUS.BOUNCED]: 'error',
};

// =============================================================================
// SALARY/PAYROLL STATUS
// =============================================================================

/**
 * Status values for salary records
 */
export const SALARY_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  PAID: 'paid',
  CANCELLED: 'cancelled',
} as const;

export type SalaryStatus = (typeof SALARY_STATUS)[keyof typeof SALARY_STATUS];

/**
 * Labels for salary status
 */
export const SALARY_STATUS_LABELS: Record<SalaryStatus, string> = {
  [SALARY_STATUS.DRAFT]: 'Draft',
  [SALARY_STATUS.PENDING]: 'Pending',
  [SALARY_STATUS.APPROVED]: 'Approved',
  [SALARY_STATUS.PAID]: 'Paid',
  [SALARY_STATUS.CANCELLED]: 'Cancelled',
};

/**
 * Status values for salary periods
 */
export const SALARY_PERIOD_STATUS = {
  OPEN: 'open',
  PROCESSING: 'processing',
  CLOSED: 'closed',
} as const;

export type SalaryPeriodStatus = (typeof SALARY_PERIOD_STATUS)[keyof typeof SALARY_PERIOD_STATUS];

// =============================================================================
// SHOP TRANSFER STATUS
// =============================================================================

/**
 * Status values for shop transfers
 */
export const TRANSFER_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  SHIPPED: 'shipped',
  RECEIVED: 'received',
  CANCELLED: 'cancelled',
} as const;

export type TransferStatus = (typeof TRANSFER_STATUS)[keyof typeof TRANSFER_STATUS];

/**
 * Labels for transfer status
 */
export const TRANSFER_STATUS_LABELS: Record<TransferStatus, string> = {
  [TRANSFER_STATUS.PENDING]: 'Pending',
  [TRANSFER_STATUS.APPROVED]: 'Approved',
  [TRANSFER_STATUS.SHIPPED]: 'Shipped',
  [TRANSFER_STATUS.RECEIVED]: 'Received',
  [TRANSFER_STATUS.CANCELLED]: 'Cancelled',
};

// =============================================================================
// ENTITY STATUS (Generic active/inactive)
// =============================================================================

/**
 * Generic active/inactive status
 */
export const ENTITY_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;

export type EntityStatus = (typeof ENTITY_STATUS)[keyof typeof ENTITY_STATUS];

/**
 * Labels for entity status
 */
export const ENTITY_STATUS_LABELS: Record<EntityStatus, string> = {
  [ENTITY_STATUS.ACTIVE]: 'Active',
  [ENTITY_STATUS.INACTIVE]: 'Inactive',
};

// =============================================================================
// SUBSCRIPTION STATUS
// =============================================================================

/**
 * Status values for subscriptions
 */
export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  PAST_DUE: 'past_due',
  CANCELLED: 'cancelled',
  UNPAID: 'unpaid',
  TRIALING: 'trialing',
} as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUS)[keyof typeof SUBSCRIPTION_STATUS];

/**
 * Labels for subscription status
 */
export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  [SUBSCRIPTION_STATUS.ACTIVE]: 'Active',
  [SUBSCRIPTION_STATUS.PAST_DUE]: 'Past Due',
  [SUBSCRIPTION_STATUS.CANCELLED]: 'Cancelled',
  [SUBSCRIPTION_STATUS.UNPAID]: 'Unpaid',
  [SUBSCRIPTION_STATUS.TRIALING]: 'Trial',
};

/**
 * Colors for subscription status badges
 */
export const SUBSCRIPTION_STATUS_COLORS: Record<SubscriptionStatus, string> = {
  [SUBSCRIPTION_STATUS.ACTIVE]: 'success',
  [SUBSCRIPTION_STATUS.PAST_DUE]: 'warning',
  [SUBSCRIPTION_STATUS.CANCELLED]: 'default',
  [SUBSCRIPTION_STATUS.UNPAID]: 'error',
  [SUBSCRIPTION_STATUS.TRIALING]: 'processing',
};

// =============================================================================
// TRANSACTION TYPES
// =============================================================================

/**
 * Transaction types for ledger entries
 */
export const TRANSACTION_TYPE = {
  // Customer transactions
  SALE: 'sale',
  PAYMENT: 'payment',
  REFUND: 'refund',
  ADJUSTMENT: 'adjustment',
  // Supplier transactions
  PURCHASE: 'purchase',
  // Courier transactions
  DELIVERY: 'delivery',
  // Workshop transactions
  ORDER: 'order',
} as const;

export type TransactionType = (typeof TRANSACTION_TYPE)[keyof typeof TRANSACTION_TYPE];

/**
 * Labels for transaction types
 */
export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  [TRANSACTION_TYPE.SALE]: 'Sale',
  [TRANSACTION_TYPE.PAYMENT]: 'Payment',
  [TRANSACTION_TYPE.REFUND]: 'Refund',
  [TRANSACTION_TYPE.ADJUSTMENT]: 'Adjustment',
  [TRANSACTION_TYPE.PURCHASE]: 'Purchase',
  [TRANSACTION_TYPE.DELIVERY]: 'Delivery',
  [TRANSACTION_TYPE.ORDER]: 'Order',
};

// =============================================================================
// STAFF INVITATION STATUS
// =============================================================================

/**
 * Status values for staff invitations
 */
export const INVITATION_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  EXPIRED: 'expired',
  REVOKED: 'revoked',
} as const;

export type InvitationStatus = (typeof INVITATION_STATUS)[keyof typeof INVITATION_STATUS];

/**
 * Labels for invitation status
 */
export const INVITATION_STATUS_LABELS: Record<InvitationStatus, string> = {
  [INVITATION_STATUS.PENDING]: 'Pending',
  [INVITATION_STATUS.ACCEPTED]: 'Accepted',
  [INVITATION_STATUS.EXPIRED]: 'Expired',
  [INVITATION_STATUS.REVOKED]: 'Revoked',
};
