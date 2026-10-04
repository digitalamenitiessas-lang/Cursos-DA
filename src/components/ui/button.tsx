import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-white/90',
        destructive: 'bg-red-500/15 text-red-300 hover:bg-red-500/25',
        outline: 'border border-border bg-transparent hover:bg-white/5',
        secondary: 'bg-white/8 text-white hover:bg-white/12',
        ghost: 'hover:bg-white/5 text-muted-foreground hover:text-white',
        link: 'text-accent underline-offset-4 hover:underline',
      },
      size: { default: 'h-11 px-5 py-2', sm: 'h-9 px-3', lg: 'h-12 px-7', icon: 'size-10' },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);
function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
export { Button, buttonVariants };
