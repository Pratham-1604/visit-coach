import { createBrowserRouter } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import School from './pages/School.jsx'

// Add new pages here: one entry per screen.
export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'schools/:schoolId', element: <School /> },
    ],
  },
])
