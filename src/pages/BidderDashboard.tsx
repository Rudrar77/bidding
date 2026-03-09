import { useAuth } from "@/contexts/AuthContext";
import { mockAuctions, mockBids, mockNotifications } from "@/lib/mock-data";
import AuctionCard from "@/components/AuctionCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Coins, Gavel, Trophy, Clock, Bell, BarChart3, TrendingUp } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function BidderDashboard() {
  const { user } = useAuth();
  const myBids = mockBids.filter((b) => b.bidderId === "bidder-1");
  const activeAuctions = mockAuctions.filter((a) => a.status === "active");
  const wonAuctions = mockAuctions.filter((a) => a.winnerId === "bidder-1");
  const notifications = mockNotifications.filter((n) => n.userId === "bidder-1");

  const bidHistory = [
    { day: "Mon", amount: 50 }, { day: "Tue", amount: 120 }, { day: "Wed", amount: 80 },
    { day: "Thu", amount: 200 }, { day: "Fri", amount: 150 }, { day: "Sat", amount: 300 }, { day: "Sun", amount: 180 },
  ];

  const stats = [
    { label: "Credit Balance", value: `${user?.credits || 500} CR`, icon: Coins, color: "text-primary" },
    { label: "Active Bids", value: myBids.filter((b) => b.isWinning).length, icon: Gavel, color: "text-success" },
    { label: "Auctions Won", value: wonAuctions.length, icon: Trophy, color: "text-warning" },
    { label: "Total Bids", value: myBids.length, icon: TrendingUp, color: "text-info" },
  ];

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold">Welcome, <span className="gradient-gold-text">{user?.name || "Bidder"}</span></h1>
          <p className="text-muted-foreground">Your bidding command center</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="stat-card">
              <div className="flex items-center justify-between">
                <s.icon className={`w-5 h-5 ${s.color}`} />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <p className="text-2xl font-bold font-mono">{s.value}</p>
            </motion.div>
          ))}
        </div>

        <Tabs defaultValue="active">
          <TabsList className="bg-secondary mb-6 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="active" className="gap-1.5"><Gavel className="w-4 h-4" />Active Auctions</TabsTrigger>
            <TabsTrigger value="mybids" className="gap-1.5"><BarChart3 className="w-4 h-4" />My Bids</TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5"><Bell className="w-4 h-4" />Notifications</TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5"><Clock className="w-4 h-4" />History</TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <div className="auction-grid">
              {activeAuctions.map((a, i) => <AuctionCard key={a.id} auction={a} index={i} />)}
            </div>
          </TabsContent>

          <TabsContent value="mybids" className="space-y-6">
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-4">Bid Activity</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={bidHistory}>
                  <defs>
                    <linearGradient id="bidGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(43, 96%, 56%)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(43, 96%, 56%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" stroke="hsl(220, 12%, 35%)" fontSize={11} />
                  <YAxis stroke="hsl(220, 12%, 35%)" fontSize={11} />
                  <Tooltip contentStyle={{ background: "hsl(222, 25%, 10%)", border: "1px solid hsl(222, 18%, 18%)", borderRadius: "8px", color: "hsl(220, 15%, 92%)" }} />
                  <Area type="monotone" dataKey="amount" stroke="hsl(43, 96%, 56%)" fill="url(#bidGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="glass-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="text-left p-4 font-medium text-muted-foreground">Auction</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Amount</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Time</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {myBids.map((bid) => {
                    const auction = mockAuctions.find((a) => a.id === bid.auctionId);
                    return (
                      <tr key={bid.id} className="border-b border-border/50">
                        <td className="p-4 font-medium">{auction?.title}</td>
                        <td className="p-4 font-mono text-primary">{bid.amount} CR</td>
                        <td className="p-4 text-muted-foreground text-xs">{new Date(bid.timestamp).toLocaleString()}</td>
                        <td className="p-4">
                          <Badge variant={bid.isWinning ? "default" : "secondary"} className={bid.isWinning ? "bg-success/20 text-success border-success/30" : ""}>
                            {bid.isWinning ? "Leading" : "Outbid"}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-3">
            {notifications.map((n) => (
              <div key={n.id} className={`glass-card p-4 flex items-start gap-3 ${!n.read ? "border-primary/30" : ""}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  n.type === "outbid" ? "bg-destructive/20" : n.type === "winning" ? "bg-success/20" : "bg-primary/20"
                }`}>
                  {n.type === "outbid" ? <TrendingUp className="w-4 h-4 text-destructive" /> :
                   n.type === "winning" ? <Trophy className="w-4 h-4 text-success" /> :
                   <Coins className="w-4 h-4 text-primary" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(n.timestamp).toLocaleString()}</p>
                </div>
                {!n.read && <div className="w-2 h-2 rounded-full bg-primary mt-2" />}
              </div>
            ))}
          </TabsContent>

          <TabsContent value="history">
            {wonAuctions.length > 0 ? (
              <div className="auction-grid">
                {wonAuctions.map((a, i) => <AuctionCard key={a.id} auction={a} index={i} />)}
              </div>
            ) : (
              <div className="text-center py-20 text-muted-foreground">
                <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No auctions won yet. Keep bidding!</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
