import { createBrowserRouter } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Block from './pages/Block.jsx'
import Home from './pages/Home.jsx'
import NotFound from './pages/NotFound.jsx'
import Observe from './pages/Observe.jsx'
import Packet from './pages/Packet.jsx'
import Rehearse from './pages/Rehearse.jsx'
import School from './pages/School.jsx'
import TeacherView from './pages/TeacherView.jsx'

// Add new pages here: one entry per screen.
export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <Home /> },
      { path: 'schools/:schoolId', element: <School /> },
      { path: 'visits/:visitId', element: <Observe /> },
      { path: 'visits/:visitId/packet', element: <Packet /> },
      { path: 'visits/:visitId/rehearse', element: <Rehearse /> },
      { path: 'block', element: <Block /> },
    ],
  },
  // The teacher's link: outside Layout, so no CRP header and no auto-sync.
  { path: '/t/:token', element: <TeacherView />, errorElement: <NotFound /> },
  { path: '*', element: <NotFound /> },
])
