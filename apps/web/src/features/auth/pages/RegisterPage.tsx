import React from 'react';
import { AuthLandingPage } from './AuthLandingPage';

export function RegisterPage(): React.JSX.Element {
  return <AuthLandingPage initialMode="register" initialModalOpen={true} />;
}
