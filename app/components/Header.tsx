import { MagnifyingGlassIcon, Bars3Icon } from "@heroicons/react/24/outline";

interface HeaderProps {
  setSidebarOpen: (open: boolean) => void;
}

export default function Header({ setSidebarOpen }: HeaderProps) {
  return (
    <header className="bg-white shadow-sm z-10">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        <button
          className="lg:hidden text-gray-500 hover:text-gray-600"
          onClick={() => setSidebarOpen(true)}
        >
          <Bars3Icon className="h-6 w-6" />
        </button>

        <div className="flex-1 flex justify-center lg:justify-end">
          <div className="w-full max-w-xs lg:max-w-sm">
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-secondary focus:border-secondary"
                placeholder="Search employees..."
              />
            </div>
          </div>
        </div>

        <div className="ml-4 flex items-center md:ml-6">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-full overflow-hidden">
              <img
                src="https://randommer.io/images/cartoons/BB-8.webp"
                alt="User"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700">Joe Fraser</p>
              <p className="text-xs font-medium text-gray-500">System Admin</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
