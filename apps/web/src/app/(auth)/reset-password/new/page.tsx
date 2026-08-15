import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { NewPasswordForm } from './new-password-form';

export const metadata: Metadata = { title: 'Choose a new password' };

export default async function NewPasswordPage() {
  // Reaching this page requires the recovery link to have established a session.
  const user = await getUser();
  if (!user) redirect('/reset-password');
  return <NewPasswordForm />;
}
