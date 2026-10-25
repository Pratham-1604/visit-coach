import { createBrowserRouter } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import Observe from './pages/Observe.jsx'
import Packet from './pages/Packet.jsx'
import School from './pages/School.jsx'

// Add new pages here: one entry per screen.
export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'schools/:schoolId', element: <School /> },
      { path: 'visits/:visitId', element: <Observe /> },
      { path: 'visits/:visitId/packet', element: <Packet /> },
    ],
  },
])
