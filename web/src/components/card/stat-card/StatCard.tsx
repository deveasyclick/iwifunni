interface StatCardProps {
  readonly title: string;
  readonly value: string;
}
function StatCard({ title, value }: StatCardProps) {
  return (
    <div className="bg-white/5 p-4 rounded-lg">
      <p className="text-xs text-white/60">{title}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

export default StatCard;
