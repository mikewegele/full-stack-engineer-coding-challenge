import { Button, ButtonProps } from '@mui/material';

type AppButtonProps = Omit<ButtonProps, 'children'> & {
  label: string;
};

export function AppButton(props: AppButtonProps): JSX.Element {
  const { label, variant = 'contained', size = 'medium', ...buttonProps } = props;

  return (
    <Button variant={variant} size={size} {...buttonProps}>
      {label}
    </Button>
  );
}
