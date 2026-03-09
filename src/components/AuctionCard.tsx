import { Auction } from "@/lib/types";
import CountdownTimer from "./CountdownTimer";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Gavel, TrendingUp, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AuctionCardProps {
  auction: Auction;
  index?: number;
}

export default function AuctionCard({ auction, index = 0 }: AuctionCardProps) {
  const navigate = useNavigate();
  const statusColors: Record<string, string> = {
    active: "bg-success/20 text-success border-success/30",
    upcoming: "bg-info/20 text-info border-info/30",
    ended: "bg-muted text-muted-foreground border-border",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      onClick={() => navigate(`/auction/${auction.id}`)}
      className="glass-card overflow-hidden cursor-pointer group hover:border-primary/30 transition-all duration-300"
    >
      <div className="relative h-48 overflow-hidden">
        <img
          src={auction.image}
          alt={auction.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
        <Badge className={`absolute top-3 right-3 ${statusColors[auction.status]} border`}>
          {auction.status}
        </Badge>
        {auction.status === "active" && (
          <div className="absolute bottom-3 left-3">
            <CountdownTimer endTime={auction.endTime} compact />
          </div>
        )}
      </div>
      <div className="p-4 space-y-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{auction.category}</p>
          <h3 className="font-semibold text-lg mt-1 group-hover:text-primary transition-colors">{auction.title}</h3>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Current Bid</p>
            <p className="text-xl font-bold text-primary font-mono">
              {auction.currentBid > 0 ? `${auction.currentBid} CR` : "No bids"}
            </p>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground text-sm">
            <span className="flex items-center gap-1"><Gavel className="w-3.5 h-3.5" />{auction.totalBids}</span>
            <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{Math.floor(Math.random() * 50) + 10}</span>
          </div>
        </div>
        {auction.currentBidderName && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingUp className="w-3 h-3 text-success" />
            <span>Leading: <span className="text-foreground">{auction.currentBidderName}</span></span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
