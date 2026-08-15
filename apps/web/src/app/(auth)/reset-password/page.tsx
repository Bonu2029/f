import type { Metadata } from 'next';
import { ResetRequestForm } from './reset-form';

export const metadata: Metadata = { title: 'Reset your password' };

export default function ResetPasswordPage() {
  return <ResetRequestForm />;
}
