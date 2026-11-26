import React from 'react';
import { AuthLandingPage } from './AuthLandingPage';

export function LoginPage(): React.JSX.Element {
  return <AuthLandingPage initialMode="login" initialModalOpen={true} />;
}
