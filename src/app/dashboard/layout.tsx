import Page from './page';
import SideBar from '@/components/SideBar';

const Layout = () => {
  return (
    <div className="flex h-screen p-4 gap-4">
      <div className="flex w-1/5 rounded-lg bg-white shadow-sm">
        <SideBar />
      </div>
      <div className="flex w-4/5 rounded-lg bg-white shadow-sm">
        <Page />
      </div>
    </div>
  )
}

export default Layout;