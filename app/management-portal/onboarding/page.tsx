export default function Page() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Employee Onboarding
        </h1>
        <button className="btn btn-primary">Add New Employee</button>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Current Onboarding Processes
        </h2>
        <p className="text-gray-500">
          Onboarding content will be displayed here.
        </p>
      </div>
    </div>
  );
}
