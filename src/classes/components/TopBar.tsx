import type { ReactNode } from 'react';
import { HostHeader } from '../../components/HostHeader';

export function TopBar({ children }: { children?: ReactNode }) {
  return (
    <HostHeader>{children}</HostHeader>
  );
}
