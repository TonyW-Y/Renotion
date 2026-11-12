import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { AppProviders } from '@/app/AppProviders';

const LandingPage = lazy(() => import('@/pages/LandingPage'));
const EditorPage = lazy(() => import('@/pages/EditorPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));
const ProjectsPage = lazy(() => import('@/pages/ProjectsPage'));
const SharePage = lazy(() => import('@/pages/SharePage'));

function Page({ children }: { children: ReactNode }) {
  return <Suspense fallback={<div className="h-dvh bg-bg" />}>{children}</Suspense>;
}

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <Page>
        <LandingPage />
      </Page>
    ),
  },
  {
    path: '/editor',
    element: (
      <Page>
        <EditorPage />
      </Page>
    ),
  },
  {
    path: '/projects',
    element: (
      <Page>
        <ProjectsPage />
      </Page>
    ),
  },
  {
    path: '/share/:token',
    element: (
      <Page>
        <SharePage />
      </Page>
    ),
  },
  {
    path: '*',
    element: (
      <Page>
        <NotFoundPage />
      </Page>
    ),
  },
]);

export default function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
