import DashboardLayout from './(dashboard)/layout';
import DashboardHome from './(dashboard)/page';

export default function Home() {
  return (
    <DashboardLayout>
      <DashboardHome />
    </DashboardLayout>
  );
}
