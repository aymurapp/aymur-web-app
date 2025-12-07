/**
 * Expense Components
 *
 * Domain-specific components for expense management including:
 * - Expense form for creating/editing expenses
 * - Expense approval modal for review workflow
 * - Expense tracking, categories, and reporting
 * - Budget allocation form and charts
 *
 * @module components/domain/expenses
 */

// Expense Form - Create and edit expenses
export { ExpenseForm, type ExpenseFormProps } from './ExpenseForm';

// Expense Approval Modal - Review and approve/reject expenses
export { ExpenseApprovalModal, type ExpenseApprovalModalProps } from './ExpenseApprovalModal';

// Budget Allocation Form - Create budget allocations for categories/periods
export { BudgetAllocationForm } from './BudgetAllocationForm';

// Budget Chart - Visualize budget vs actual spending
export { BudgetChart } from './BudgetChart';
