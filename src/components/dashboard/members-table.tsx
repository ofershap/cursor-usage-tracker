"use client";

interface MembersTableProps {
  data: Array<{
    email: string;
    spend_cents: number;
    fast_premium_requests: number;
  }>;
}

export function MembersTable({ data }: MembersTableProps) {
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-800">
        <h3 className="text-sm font-medium text-zinc-400">All Members — Current Cycle</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500">
              <th className="text-left px-6 py-3 font-medium">User</th>
              <th className="text-right px-6 py-3 font-medium">Spend</th>
              <th className="text-right px-6 py-3 font-medium">Premium Requests</th>
              <th className="text-right px-6 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={row.email}
                className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
              >
                <td className="px-6 py-3">
                  <a
                    href={`/users/${encodeURIComponent(row.email)}`}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    {row.email}
                  </a>
                </td>
                <td className="text-right px-6 py-3 font-mono">
                  ${(row.spend_cents / 100).toFixed(2)}
                </td>
                <td className="text-right px-6 py-3 font-mono">{row.fast_premium_requests}</td>
                <td className="text-right px-6 py-3">
                  <a
                    href={`/users/${encodeURIComponent(row.email)}`}
                    className="text-xs text-zinc-500 hover:text-zinc-300"
                  >
                    Details →
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
