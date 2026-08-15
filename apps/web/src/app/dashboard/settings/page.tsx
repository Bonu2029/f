import { redirect } from 'next/navigation';

/** `/dashboard/settings` has no content of its own — Account is the landing tab. */
export default function SettingsIndexPage() {
  redirect('/dashboard/settings/account');
}
