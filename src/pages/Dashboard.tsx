import React, { useState } from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  AreaChart,
  Area
} from "recharts";
import { 
  TrendingUp, 
  Users, 
  Play, 
  Clock, 
  MessageSquare,
  ArrowUpRight, 
  ArrowDownRight,
  MoreHorizontal,
  Download,
  Filter,
  Megaphone,
  ShieldCheck
} from "lucide-react";
import { cn } from "../lib/utils";
import { useVideoStats } from "../context/VideoContext";
import { useUser } from "../context/UserContext";
import { Link } from "react-router-dom";

const data = [
  { name: "Mon", views: 4000, watchTime: 2400, subs: 240 },
  { name: "Tue", views: 3000, watchTime: 1398, subs: 139 },
  { name: "Wed", views: 2000, watchTime: 9800, subs: 980 },
  { name: "Thu", views: 2780, watchTime: 3908, subs: 390 },
  { name: "Fri", views: 1890, watchTime: 4800, subs: 480 },
  { name: "Sat", views: 2390, watchTime: 3800, subs: 380 },
  { name: "Sun", views: 3490, watchTime: 4300, subs: 430 },
];

const StatCard = ({ title, value, change, icon: Icon, trend }: { title: string, value: string, change: string, icon: any, trend: "up" | "down" }) => (
  <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 space-y-4">
    <div className="flex items-center justify-between">
      <div className="p-2 bg-brand-text/5 rounded-lg">
        <Icon className="w-5 h-5 text-brand-text" />
      </div>
      <button className="text-brand-muted hover:text-brand-text transition-colors">
        <MoreHorizontal className="w-5 h-5" />
      </button>
    </div>
    <div>
      <p className="text-sm font-medium text-brand-muted">{title}</p>
      <h3 className="text-2xl font-bold mt-1">{value}</h3>
    </div>
    <div className="flex items-center gap-2">
      <div className={cn(
        "flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full",
        trend === "up" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
      )}>
        {trend === "up" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        {change}
      </div>
      <span className="text-[10px] font-medium text-brand-muted">vs last 7 days</span>
    </div>
  </div>
);

export default function Dashboard() {
  const [timeRange, setTimeRange] = useState("Last 7 days");
  const { user } = useUser();
  const { homeVideos } = useVideoStats();

  const userVideos = homeVideos.filter(v => {
    const channelName = (v.channelName || "").toLowerCase().replace(/\s+/g, '');
    const userHandle = (user.handle || "").replace('@', '').toLowerCase();
    return channelName === userHandle;
  });

  return (
    <div className="h-full overflow-y-auto no-scrollbar">
      <div className="max-w-7xl mx-auto space-y-8 p-4 md:p-8 pb-32 md:pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Creator Dashboard</h1>
          <p className="text-brand-muted font-medium line-clamp-1" title="Welcome back, Alex Rivera. Here's what's happening with your channel.">
            Welcome back, Alex Rivera. Manage your content and monetization here.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {user?.isAdmin && (
            <Link 
              to="/admin/ads" 
              className="flex items-center gap-2 bg-purple-500/10 text-purple-400 border border-purple-500/20 px-6 py-2 rounded-full font-bold text-sm hover:bg-purple-500/20 transition-all"
            >
              <Megaphone className="w-4 h-4" />
              Manage Ads
            </Link>
          )}
          <div className="flex items-center bg-brand-surface border border-brand-border rounded-full px-4 py-2 gap-2">
            <Filter className="w-4 h-4 text-brand-muted" />
            <select 
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-transparent text-sm font-bold focus:outline-none cursor-pointer"
            >
              <option>Last 7 days</option>
              <option>Last 28 days</option>
              <option>Last 90 days</option>
            </select>
          </div>
          <button className="flex items-center gap-2 bg-brand-text text-brand-bg px-6 py-2 rounded-full font-bold text-sm hover:opacity-90 transition-all">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Views" 
          value="1.2M" 
          change="+12.5%" 
          icon={Play} 
          trend="up" 
        />
        <StatCard 
          title="Watch Time (hrs)" 
          value="45.2K" 
          change="+8.2%" 
          icon={Clock} 
          trend="up" 
        />
        <StatCard 
          title="Followers" 
          value="842" 
          change="+15.4%" 
          icon={Users} 
          trend="up" 
        />
        <StatCard 
          title="Total Comments" 
          icon={MessageSquare} 
          value={String(userVideos.reduce((acc, curr) => acc + (Number(curr.comments) || 0), 0))}
          change="+5.1%"
          trend="up"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-brand-surface border border-brand-border rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">Views Performance</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-brand-text" />
                <span className="text-xs font-medium text-brand-muted">This period</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-brand-text/20" />
                <span className="text-xs font-medium text-brand-muted">Previous period</span>
              </div>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="currentColor" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="currentColor" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: "rgba(255,255,255,0.4)" }}
                  dy={10}
                  padding={{ left: 80, right: 80 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: "rgba(255,255,255,0.4)" }}
                  domain={[0, 'dataMax * 1.8']}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "#121212", 
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    fontSize: "12px"
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="views" 
                  stroke="currentColor" 
                  fillOpacity={1} 
                  fill="url(#colorViews)" 
                  strokeWidth={3}
                  dot={{ r: 4, fill: "currentColor", strokeWidth: 2, stroke: "#1e1e1e" }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 space-y-6">
          <h3 className="font-bold">Follower Growth</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: "rgba(255,255,255,0.4)" }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: "rgba(255,255,255,0.4)" }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "#121212", 
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    fontSize: "12px"
                  }}
                />
                <Bar 
                  dataKey="subs" 
                  fill="currentColor" 
                  radius={[4, 4, 0, 0]} 
                  barSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Content */}
      <div className="bg-brand-surface border border-brand-border rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-brand-border flex items-center justify-between">
          <h3 className="font-bold">Recent Content Performance</h3>
          <button className="text-sm font-bold text-brand-muted hover:text-brand-text transition-colors">
            View all
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-bold text-brand-muted uppercase tracking-wider border-b border-brand-border">
                <th className="px-6 py-4">Video</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Views</th>
                <th className="px-6 py-4">Comments</th>
                <th className="px-6 py-4">Avg. View %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {userVideos.length > 0 ? userVideos.slice(0, 5).map((video, i) => (
                <tr key={video.id} className="hover:bg-brand-text/5 transition-colors cursor-pointer group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-16 aspect-video bg-brand-bg rounded border border-brand-border overflow-hidden">
                        <img src={video.thumbnail} alt="" className="w-full h-full object-cover" />
                      </div>
                      <span className="text-sm font-bold group-hover:text-brand-text transition-colors">{video.title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-brand-muted">{new Date(video.postedAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm font-bold">{video.views}</td>
                  <td className="px-6 py-4 text-sm text-brand-text font-bold">{video.comments || 0}</td>
                  <td className="px-6 py-4 text-sm text-brand-muted">{(50 + Math.random() * 20).toFixed(0)}%</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-brand-muted font-bold">
                    No content posted yet. Start creating!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  );
}
