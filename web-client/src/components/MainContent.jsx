import { useApp } from '../App';
import StudentDashboard from '../screens/student/Dashboard';
import Catalogue from '../screens/student/Catalogue';
import ResourceDetail from '../screens/student/ResourceDetail';
import Rooms from '../screens/student/Rooms';
import MyBookings from '../screens/student/MyBookings';
import Waitlist from '../screens/student/Waitlist';
import Recommendations from '../screens/student/Recommendations';
import Points from '../screens/student/Points';
import Profile from '../screens/student/Profile';
import StaffDashboard from '../screens/staff/Dashboard';
import Checkout from '../screens/staff/Checkout';
import WaitlistReview from '../screens/staff/WaitlistReview';
import Approvals from '../screens/staff/Approvals';
import Overdue from '../screens/staff/Overdue';
import ManageResources from '../screens/staff/ManageResources';
import AdminDashboard from '../screens/admin/Dashboard';
import Users from '../screens/admin/Users';
import AuditLog from '../screens/admin/AuditLog';
import Config from '../screens/admin/Config';
import AdminResources from '../screens/admin/Resources';

export default function MainContent() {
  const { page, currentRole } = useApp();

  const map = {
    dashboard: currentRole === 'admin'
      ? <AdminDashboard />
      : currentRole === 'staff'
        ? <StaffDashboard />
        : <StudentDashboard />,
    staffDash:      <StaffDashboard />,
    adminDash:      <AdminDashboard />,
    search:         <Catalogue />,
    resource:       <ResourceDetail />,
    mybookings:     <MyBookings />,
    waitlist:       <Waitlist />,
    recommend:      <Recommendations />,
    points:         <Points />,
    rooms:          <Rooms />,
    profile:        <Profile />,
    checkout:       <Checkout />,
    waitlistReview: <WaitlistReview />,
    approvals:      <Approvals />,
    overdue:        <Overdue />,
    manage:         <ManageResources />,
    users:          <Users />,
    audit:          <AuditLog />,
    config:         <Config />,
    adminResources: <AdminResources />,
  };

  return map[page] || <StudentDashboard />;
}
