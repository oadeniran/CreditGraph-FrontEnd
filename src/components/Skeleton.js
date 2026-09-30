export function SkeletonLine({ short = false, tall = false }) {
  const cls = `skeleton skeleton-line${tall ? " tall" : ""}${short ? " short" : ""}`;
  return <div className={cls} />;
}

export function SkeletonCard() {
  return (
    <div className="card">
      <SkeletonLine short tall />
      <SkeletonLine />
      <SkeletonLine short />
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div>
      <SkeletonCard />
      <div className="flex-gap">
        <SkeletonLine tall />
        <SkeletonLine tall />
      </div>
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}