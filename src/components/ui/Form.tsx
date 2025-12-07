'use client';

/**
 * Form Component
 *
 * A form wrapper that integrates React Hook Form with Zod validation
 * and Ant Design Form components for a seamless form experience.
 *
 * @example
 * const schema = z.object({
 *   name: z.string().min(2),
 *   email: z.string().email(),
 * });
 *
 * <Form schema={schema} onSubmit={handleSubmit}>
 *   <Form.Item name="name" label="Name">
 *     <Input />
 *   </Form.Item>
 *   <Form.Item name="email" label="Email">
 *     <Input />
 *   </Form.Item>
 *   <Button type="primary" htmlType="submit">Submit</Button>
 * </Form>
 */

import React, { createContext, useContext, useCallback, useMemo, type ReactNode } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Form as AntForm } from 'antd';
import {
  useForm,
  Controller,
  FormProvider,
  useFormContext,
  type UseFormReturn,
  type FieldValues,
  type FieldPath,
  type ControllerRenderProps,
  type ControllerFieldState,
  type UseFormStateReturn,
  type DefaultValues,
} from 'react-hook-form';

import { cn } from '@/lib/utils/cn';

import type { FormProps as AntFormProps, FormItemProps as AntFormItemProps } from 'antd';
import type { z } from 'zod';

/**
 * Form context to share form instance
 */
interface FormContextValue<T extends FieldValues = FieldValues> {
  form: UseFormReturn<T>;
}

const FormContext = createContext<FormContextValue | null>(null);

/**
 * Hook to access the form context
 */
export function useFormInstance<T extends FieldValues = FieldValues>() {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useFormInstance must be used within a Form component');
  }
  return context.form as UseFormReturn<T>;
}

/**
 * Props for the Form component
 */
export interface FormProps<TFormValues extends FieldValues> extends Omit<
  AntFormProps,
  'onFinish' | 'form'
> {
  /**
   * Zod schema for form validation
   */
  schema: z.ZodType<TFormValues>;

  /**
   * Callback when form is submitted with valid data
   */
  onSubmit: (data: TFormValues) => void | Promise<void>;

  /**
   * Default values for the form fields
   */
  defaultValues?: DefaultValues<TFormValues>;

  /**
   * Form children (Form.Item components)
   */
  children: ReactNode;

  /**
   * Additional class name for styling
   */
  className?: string;

  /**
   * Whether the form is currently submitting
   */
  isSubmitting?: boolean;
}

/**
 * Form component with Zod validation integration
 */
function FormRoot<TFormValues extends FieldValues>({
  schema,
  onSubmit,
  defaultValues,
  children,
  className,
  layout = 'vertical',
  ...antFormProps
}: FormProps<TFormValues>) {
  // Initialize React Hook Form with Zod resolver
  const form = useForm<TFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    defaultValues,
    mode: 'onBlur',
  });

  // Handle form submission
  const handleSubmit = useCallback(
    async (data: TFormValues) => {
      try {
        await onSubmit(data);
      } catch (error) {
        // Error handling is delegated to the parent component
        console.error('Form submission error:', error);
        throw error;
      }
    },
    [onSubmit]
  );

  // Context value
  const contextValue = useMemo(() => ({ form }), [form]);

  return (
    <FormContext.Provider value={contextValue as FormContextValue}>
      <FormProvider {...form}>
        <AntForm
          layout={layout}
          onFinish={form.handleSubmit(handleSubmit)}
          className={cn('w-full', className)}
          {...antFormProps}
        >
          {children}
        </AntForm>
      </FormProvider>
    </FormContext.Provider>
  );
}

/**
 * Props for Form.Item component
 */
export interface FormItemProps<TFieldValues extends FieldValues = FieldValues> extends Omit<
  AntFormItemProps,
  'name' | 'rules' | 'children'
> {
  /**
   * Field name matching the schema
   */
  name: FieldPath<TFieldValues>;

  /**
   * Children can be a React element or a render function
   */
  children:
    | React.ReactElement
    | ((props: {
        field: ControllerRenderProps<TFieldValues, FieldPath<TFieldValues>>;
        fieldState: ControllerFieldState;
        formState: UseFormStateReturn<TFieldValues>;
      }) => React.ReactElement);
}

/**
 * Form.Item component that connects to React Hook Form
 */
function FormItem<TFieldValues extends FieldValues = FieldValues>({
  name,
  label,
  children,
  className,
  required,
  ...antFormItemProps
}: FormItemProps<TFieldValues>) {
  const { control } = useFormContext<TFieldValues>();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState, formState }) => {
        // Determine validation status
        const validateStatus = fieldState.error ? 'error' : undefined;
        const help = fieldState.error?.message;

        // Render child element with field props
        const childElement =
          typeof children === 'function'
            ? children({ field, fieldState, formState })
            : React.isValidElement(children)
              ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
                  ...field,
                  id: name,
                  'aria-invalid': !!fieldState.error,
                  'aria-describedby': fieldState.error ? `${name}-error` : undefined,
                })
              : children;

        return (
          <AntForm.Item
            label={label}
            required={required}
            validateStatus={validateStatus}
            help={help}
            className={cn(className)}
            {...antFormItemProps}
          >
            {childElement}
          </AntForm.Item>
        );
      }}
    />
  );
}

/**
 * Form.Submit component for submit button with automatic loading state
 */
interface FormSubmitProps {
  children: ReactNode;
  className?: string;
}

function FormSubmit({ children, className }: FormSubmitProps) {
  const {
    formState: { isSubmitting },
  } = useFormContext();

  return (
    <AntForm.Item className={cn('mb-0', className)}>
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
            loading: isSubmitting,
            htmlType: 'submit',
          })
        : children}
    </AntForm.Item>
  );
}

/**
 * Form.ErrorSummary component to display all form errors
 */
interface FormErrorSummaryProps {
  className?: string;
}

function FormErrorSummary({ className }: FormErrorSummaryProps) {
  const {
    formState: { errors },
  } = useFormContext();

  const errorMessages = Object.values(errors)
    .filter((error): error is { message: string } => !!error?.message)
    .map((error) => error.message);

  if (errorMessages.length === 0) {
    return null;
  }

  return (
    <div
      className={cn('rounded-lg border border-red-200 bg-red-50 p-4 mb-4', className)}
      role="alert"
      aria-live="polite"
    >
      <ul className="list-disc list-inside space-y-1 text-sm text-red-600">
        {errorMessages.map((message, index) => (
          <li key={index}>{message}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Compound Form component
 */
export const Form = Object.assign(FormRoot, {
  Item: FormItem,
  Submit: FormSubmit,
  ErrorSummary: FormErrorSummary,
  useForm: useFormInstance,
});

export default Form;
