export default function AdminLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div>
        <div className="h-3 w-24 bg-panel rounded mb-3" />
        <div className="h-10 w-72 bg-panel rounded" />
        <div className="h-4 w-96 max-w-full bg-panel rounded mt-3" />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="card">
            <div className="h-3 w-28 bg-panel rounded" />
            <div className="h-10 w-20 bg-panel rounded mt-4" />
          </div>
        ))}
      </div>

      <div className="card space-y-4">
        <div className="h-5 w-48 bg-panel rounded" />
        <div className="h-4 w-full bg-panel rounded" />
        <div className="h-4 w-5/6 bg-panel rounded" />
        <div className="h-4 w-4/6 bg-panel rounded" />
      </div>
    </div>
  );
}