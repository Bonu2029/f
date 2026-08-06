'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

type State = 'idle' | 'submitting' | 'success' | 'error';

export function Newsletter() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<State>('idle');
  const [message, setMessage] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
    if (!valid) {
      setState('error');
      setMessage('Enter an email address in the format name@example.com.');
      return;
    }
    setState('submitting');
    setMessage('');
    // Wired to a modular email provider at launch; nothing is transmitted yet.
    await new Promise((resolve) => setTimeout(resolve, 650));
    setState('success');
    setMessage('You are on the list. One short note a month, nothing more.');
    setEmail('');
  };

  return (
    <form onSubmit={submit} noValidate className="mt-5">
      <label htmlFor="newsletter-email" className="block text-sm text-muted">
        Email address
      </label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          id="newsletter-email"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (state === 'error') setState('idle');
          }}
          aria-invalid={state === 'error'}
          aria-describedby="newsletter-message"
          placeholder="you@example.com"
          className="w-full rounded-full border border-line bg-white px-5 py-3 text-[15px] outline-none transition-colors focus:border-accent"
        />
        <Button type="submit" disabled={state === 'submitting'} className="sm:flex-none">
          {state === 'submitting' ? 'Adding…' : 'Sign up'}
        </Button>
      </div>
      <p
        id="newsletter-message"
        role="status"
        className={`mt-2 min-h-[20px] text-sm ${
          state === 'error' ? 'text-accent-deep' : 'text-muted'
        }`}
      >
        {message}
      </p>
    </form>
  );
}
