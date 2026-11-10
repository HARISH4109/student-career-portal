import { QueryClientProvider } from '@tanstack/react-query';
import { Provider as ReduxProvider } from 'react-redux';
import { BrowserRouter } from 'react-router';

import { queryClient } from '@/app/query-client';
import { store } from '@/app/store';
import { AuthProvider } from '@/features/auth/components/AuthProvider';
import { AppRoutes } from '@/routes/app-routes';

export function App(): React.JSX.Element {
  return (
    <ReduxProvider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ReduxProvider>
  );
}
