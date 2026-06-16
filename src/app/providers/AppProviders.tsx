import { useEffect, type ReactNode } from 'react';
import { generateHymnSlides } from '../../workflows/generateHymnSlides';

type AppProvidersProps = {
  children: ReactNode;
};

export default function AppProviders({ children }: AppProvidersProps) {
  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }

    void generateHymnSlides(1).then((result) => {
      console.log('Temporary hymn pipeline test result:', result);
    });
  }, []);

  return <>{children}</>;
}
