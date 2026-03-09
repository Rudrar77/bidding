import { useParams, useNavigate } from "react-router-dom";
import { mockAuctions, mockBids } from "@/lib/mock-data";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import CountdownTimer from "@/components/CountdownTimer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { ArrowLeft, Gavel, TrendingUp, Clock, User, Zap, Lightbulb } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AuctionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const auction = mockAuctions.find((a) => a.id === id);
  const bids = mockBids.filter((b) => b.auctionId === id).sort((a, b) => b.amount - a.amount);

  const [bidAmount, setBidAmount] = useState("");
  const suggestedBid = auction ? auction.currentBid + Math.ceil(auction.currentBid * 0.1) || auction.minimumBid : 0;
  const autoBids = [suggestedBid, suggestedBid + 10, suggestedBid + 25, suggestedBid + 50];

  if (!auction) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <p className="text-muted-foreground">Auction not found</p>
      </div>
    );
  }

  const handleBid = (amount: number) => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (user.role !== "bidder") {
      toast({ title: "Not allowed", description: "Only bidders can place bids", variant: "destructive" });
      return;
    }
    if (amount > user.credits) {
      toast({ title: "Insufficient credits", description: `You need ${amount} CR but only have ${user.credits} CR`, variant: "destructive" });
      return;
    }
    toast({ title: "Bid placed!", description: `You bid ${amount} CR on ${auction.title}` });
    setBidAmount("");
  };

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container mx-auto px-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Image + Details */}
          <div className="lg:col-span-3 space-y-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl overflow-hidden">
              <img src={auction.image} alt={auction.title} className="w-full h-[400px] object-cover" />
            </motion.div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="outline" className="text-xs">{auction.category}</Badge>
                <Badge className={auction.status === "active" ? "bg-success/20 text-success border-success/30" : "bg-muted text-muted-foreground"}>{auction.status}</Badge>
              </div>
              <h1 className="text-3xl font-bold mb-3">{auction.title}</h1>
              <p className="text-muted-foreground">{auction.description}</p>
            </div>

            {/* Bid History */}
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Bid History</h3>
              {bids.length > 0 ? (
                <div className="space-y-3">
                  {bids.map((bid, i) => (
                    <div key={bid.id} className={`flex items-center justify-between p-3 rounded-lg ${i === 0 ? "bg-primary/10 border border-primary/20" : "bg-secondary"}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">{bid.bidderName.charAt(0)}</div>
                        <div>
                          <p className="text-sm font-medium">{bid.bidderName}</p>
                          <p className="text-xs text-muted-foreground">{new Date(bid.timestamp).toLocaleTimeString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-primary">{bid.amount} CR</p>
                        {i === 0 && <span className="text-xs text-success">Leading</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No bids yet. Be the first!</p>
              )}
            </div>
          </div>

          {/* Bid Panel */}
          <div className="lg:col-span-2">
            <div className="glass-card p-6 sticky top-24 space-y-6">
              <div>
                <p className="text-sm text-muted-foreground">Current Bid</p>
                <p className="text-4xl font-bold gradient-gold-text font-mono">
                  {auction.currentBid > 0 ? `${auction.currentBid} CR` : `${auction.minimumBid} CR`}
                </p>
                {auction.currentBidderName && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <User className="w-3 h-3" /> {auction.currentBidderName}
                  </p>
                )}
              </div>

              {auction.status === "active" && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Time Remaining</p>
                  <CountdownTimer endTime={auction.endTime} />
                </div>
              )}

              <div className="border-t border-border pt-4">
                <p className="text-xs text-muted-foreground mb-2">Min bid: {auction.minimumBid} CR · Total bids: {auction.totalBids}</p>
              </div>

              {auction.status === "active" && (
                <>
                  {/* Smart suggestions */}
                  <div>
                    <p className="text-sm font-medium flex items-center gap-1.5 mb-3">
                      <Lightbulb className="w-4 h-4 text-primary" /> Smart Suggestions
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {autoBids.map((amt) => (
                        <button
                          key={amt}
                          onClick={() => handleBid(amt)}
                          className="bg-secondary hover:bg-primary/10 border border-border hover:border-primary/30 rounded-lg p-2 text-center transition-colors"
                        >
                          <p className="font-mono font-bold text-sm">{amt} CR</p>
                          <p className="text-[10px] text-muted-foreground">+{amt - auction.currentBid}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom bid */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Custom Bid</p>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder={`Min ${suggestedBid}`}
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        className="bg-secondary border-border font-mono"
                      />
                      <Button
                        onClick={() => handleBid(Number(bidAmount))}
                        disabled={!bidAmount || Number(bidAmount) < suggestedBid}
                        className="gradient-gold-bg text-primary-foreground shrink-0"
                      >
                        <Gavel className="w-4 h-4 mr-1" /> Bid
                      </Button>
                    </div>
                  </div>

                  {/* Auto-increment */}
                  <Button variant="outline" className="w-full" onClick={() => toast({ title: "Auto-bid enabled", description: `Will auto-bid up to ${suggestedBid + 100} CR` })}>
                    <Zap className="w-4 h-4 mr-2 text-primary" /> Enable Proxy Bidding
                  </Button>
                </>
              )}

              {auction.status === "ended" && auction.winnerName && (
                <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-center">
                  <p className="text-sm text-muted-foreground">Winner</p>
                  <p className="text-lg font-bold text-primary">{auction.winnerName}</p>
                  <p className="font-mono">{auction.currentBid} CR</p>
                </div>
              )}

              {auction.status === "upcoming" && (
                <div className="bg-info/10 border border-info/20 rounded-xl p-4 text-center">
                  <p className="text-sm text-muted-foreground">Starts in</p>
                  <CountdownTimer endTime={auction.startTime} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
