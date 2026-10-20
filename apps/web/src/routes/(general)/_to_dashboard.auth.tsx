import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

import { SignInForm } from '#~/features/auth/components/sign-in-form';
import { SignUpForm } from '#~/features/auth/components/sign-up-form';

export const Route = createFileRoute('/(general)/_to_dashboard/auth')({
  component: RouteComponent,
});

function RouteComponent() {
  const [shouldShowSignIn, setShouldShowSignIn] = useState(true);

  return shouldShowSignIn ? (
    <SignInForm onSwitchToSignUp={() => setShouldShowSignIn(false)} />
  ) : (
    <SignUpForm onSwitchToSignIn={() => setShouldShowSignIn(true)} />
  );
}
