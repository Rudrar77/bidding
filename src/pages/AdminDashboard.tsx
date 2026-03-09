import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { mockAuctions, mockUsers, mockBids, mockStats, bidActivityData } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BidHeatmap from "@/components/analytics/BidHeatmap";
import CategorySunburst from "@/components/analytics/CategorySunburst";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import {
  LayoutDashboard, Package, Users, BarChart3, Plus, Coins,
  TrendingUp, Gavel, Trophy, Sparkles, Eye
} from "lucide-react";

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [aiDesc, setAiDesc] = useState("");
  const [generating, setGenerating] = useState(false);

  const bidders = mockUsers.filter((u) => u.role === "bidder");
  const statCards = [
    { label: "Total Auctions", value: mockStats.totalAuctions, icon: Package, color: "text-primary" },
    { label: "Active Auctions", value: mockStats.activeAuctions, icon: Gavel, color: "text-success" },
    { label: "Total Bids", value: mockStats.totalBids, icon: TrendingUp, color: "text-info" },
    { label: "Credits Distributed", value: mockStats.totalCreditsDistributed, icon: Coins, color: "text-warning" },
  ];

  const generateDescription = () => {
    setGenerating(true);
    setTimeout(() => {
      setAiDesc("A rare and exquisite item available for bidding. This premium piece features exceptional craftsmanship and has been authenticated by leading experts. Don't miss this opportunity to own something truly special.");
      setGenerating(false);
      toast({ title: "AI Description Generated", description: "You can edit the generated description below." });
    }, 1500);
  };

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold">Admin <span className="gradient-gold-text">Dashboard</span></h1>
          <p className="text-muted-foreground">Welcome back, {user?.name}</p>
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-secondary mb-8 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="overview" className="gap-1.5"><LayoutDashboard className="w-4 h-4" />Overview</TabsTrigger>
            <TabsTrigger value="auctions" className="gap-1.5"><Package className="w-4 h-4" />Auctions</TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5"><Users className="w-4 h-4" />Users</TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5"><BarChart3 className="w-4 h-4" />Analytics</TabsTrigger>
            <TabsTrigger value="create" className="gap-1.5"><Plus className="w-4 h-4" />Create</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {statCards.map((s, i) => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="stat-card">
                  <div className="flex items-center justify-between">
                    <s.icon className={`w-5 h-5 ${s.color}`} />
                    <span className="text-xs text-muted-foreground">{s.label}</span>
                  </div>
                  <p className="text-3xl font-bold font-mono">{s.value}</p>
                </motion.div>
              ))}
            </div>

            {/* Bid activity chart */}
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-4">Bid Activity (24h)</h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={bidActivityData}>
                  <defs>
                    <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(43, 96%, 56%)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(43, 96%, 56%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="hour" stroke="hsl(220, 12%, 35%)" fontSize={11} />
                  <YAxis stroke="hsl(220, 12%, 35%)" fontSize={11} />
                  <Tooltip contentStyle={{ background: "hsl(222, 25%, 10%)", border: "1px solid hsl(222, 18%, 18%)", borderRadius: "8px", color: "hsl(220, 15%, 92%)" }} />
                  <Area type="monotone" dataKey="bids" stroke="hsl(43, 96%, 56%)" fill="url(#goldGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Recent bids */}
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2"><Eye className="w-4 h-4 text-primary" /> Live Bids</h3>
              <div className="space-y-2">
                {mockBids.slice(0, 5).map((bid) => {
                  const auction = mockAuctions.find((a) => a.id === bid.auctionId);
                  return (
                    <div key={bid.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">{bid.bidderName.charAt(0)}</div>
                        <div>
                          <p className="text-sm font-medium">{bid.bidderName}</p>
                          <p className="text-xs text-muted-foreground">{auction?.title}</p>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-primary">{bid.amount} CR</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* Auctions */}
          <TabsContent value="auctions" className="space-y-4">
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50">
                      <th className="text-left p-4 font-medium text-muted-foreground">Auction</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Current Bid</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Bids</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Winner</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockAuctions.map((a) => (
                      <tr key={a.id} className="border-b border-border/50 hover:bg-secondary/30">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <img src={a.image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                            <div>
                              <p className="font-medium">{a.title}</p>
                              <p className="text-xs text-muted-foreground">{a.category}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4"><Badge variant="outline">{a.status}</Badge></td>
                        <td className="p-4 font-mono">{a.currentBid} CR</td>
                        <td className="p-4">{a.totalBids}</td>
                        <td className="p-4">{a.winnerName || "-"}</td>
                        <td className="p-4">
                          {a.status === "active" && (
                            <Button size="sm" variant="outline" onClick={() => toast({ title: "Auction closed", description: `${a.title} has been closed.` })}>
                              <Trophy className="w-3 h-3 mr-1" /> Close
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* Users */}
          <TabsContent value="users" className="space-y-4">
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50">
                      <th className="text-left p-4 font-medium text-muted-foreground">User</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Role</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Credits</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bidders.map((u) => (
                      <tr key={u.id} className="border-b border-border/50 hover:bg-secondary/30">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">{u.name.charAt(0)}</div>
                            <div>
                              <p className="font-medium">{u.name}</p>
                              <p className="text-xs text-muted-foreground">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4"><Badge variant="outline">{u.role}</Badge></td>
                        <td className="p-4 font-mono">{u.credits} CR</td>
                        <td className="p-4">
                          <Button size="sm" variant="outline" onClick={() => toast({ title: "Credits assigned", description: `Added 100 credits to ${u.name}` })}>
                            <Coins className="w-3 h-3 mr-1" /> +100 CR
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* Analytics */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <BidHeatmap />
              <CategorySunburst />
            </div>
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-4">Bids per Category</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={[
                  { cat: "Electronics", bids: 24 }, { cat: "Art", bids: 18 },
                  { cat: "Collectibles", bids: 15 }, { cat: "Antiques", bids: 12 }, { cat: "Books", bids: 5 },
                ]}>
                  <XAxis dataKey="cat" stroke="hsl(220, 12%, 35%)" fontSize={11} />
                  <YAxis stroke="hsl(220, 12%, 35%)" fontSize={11} />
                  <Tooltip contentStyle={{ background: "hsl(222, 25%, 10%)", border: "1px solid hsl(222, 18%, 18%)", borderRadius: "8px", color: "hsl(220, 15%, 92%)" }} />
                  <Bar dataKey="bids" fill="hsl(43, 96%, 56%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          {/* Create Auction */}
          <TabsContent value="create">
            <div className="glass-card p-6 max-w-2xl">
              <h3 className="text-xl font-bold mb-6">Create New Auction</h3>
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); toast({ title: "Auction created!", description: "Your auction is now live." }); }}>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input placeholder="Auction title" className="bg-secondary border-border" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={generateDescription} disabled={generating}>
                      <Sparkles className="w-3.5 h-3.5 mr-1 text-primary" /> {generating ? "Generating..." : "AI Generate"}
                    </Button>
                  </div>
                  <Textarea placeholder="Describe the auction item..." className="bg-secondary border-border min-h-[100px]" value={aiDesc} onChange={(e) => setAiDesc(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Input placeholder="e.g. Electronics" className="bg-secondary border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label>Minimum Bid (Credits)</Label>
                    <Input type="number" placeholder="50" className="bg-secondary border-border" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Input type="datetime-local" className="bg-secondary border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Input type="datetime-local" className="bg-secondary border-border" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Image URL</Label>
                  <Input placeholder="https://..." className="bg-secondary border-border" />
                </div>
                <Button type="submit" className="gradient-gold-bg text-primary-foreground">
                  <Plus className="w-4 h-4 mr-2" /> Create Auction
                </Button>
              </form>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
