import { PropsWithChildren } from 'react';

interface Props {
  condition: boolean | undefined;
}

export function If(props: PropsWithChildren<Props>): JSX.Element | null {
  const { condition, children } = props;

  if (!condition) {
    return null;
  }

  return <>{children}</>;
}
