import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppShell } from './app/AppShell'
import { CreateLKPDPage } from './pages/CreateLKPDPage'
import { DashboardPage } from './pages/DashboardPage'
import { EditorPage } from './pages/EditorPage'
import { GeminiTestPage } from './pages/GeminiTestPage'
import { NotFoundPage } from './pages/NotFoundPage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: <NotFoundPage />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'create', element: <CreateLKPDPage /> },
      { path: 'editor/:id', element: <EditorPage /> },
      { path: 'ai-test', element: <GeminiTestPage /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
