import { Navbar } from "./_components/navbar";
import { Sidebar } from "./_components/sidebar";

const DashboardLayout = ({
    children,
}: {
    children: React.ReactNode;
}) => {
    return ( 
        <div className="min-h-screen flex flex-col dashboard-layout">
            <div className="h-[112px] fixed inset-x-0 top-0 w-full z-50">
                <Navbar />
            </div>
            <div className="hidden md:flex h-[calc(100vh-112px)] w-56 flex-col fixed inset-x-0 top-[112px] rtl:right-0 ltr:left-0 z-40">
                <Sidebar />
            </div>
            <main className="md:rtl:pr-56 md:ltr:pl-56 pt-[112px] flex-1">
                {children}
            </main>
        </div>
     );
}
 
export default DashboardLayout;