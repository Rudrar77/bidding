import { useState, useMemo } from "react";
import { mockAuctions } from "@/lib/mock-data";
import AuctionCard from "@/components/AuctionCard";
import { Input } from "@/components/ui/input";
import { Search, Filter } from "lucide-react";
import { motion } from "framer-motion";

const categories = ["All", "Electronics", "Art", "Collectibles", "Antiques", "Books"];
const statuses = ["All", "active", "upcoming", "ended"];

export default function AuctionsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("All");

  const filtered = useMemo(() => {
    return mockAuctions.filter((a) => {
      const matchSearch = a.title.toLowerCase().includes(search.toLowerCase());
      const matchCat = category === "All" || a.category === category;
      const matchStatus = status === "All" || a.status === status;
      return matchSearch && matchCat && matchStatus;
    });
  }, [search, category, status]);

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Browse <span className="gradient-gold-text">Auctions</span></h1>
          <p className="text-muted-foreground">Discover and bid on amazing items</p>
        </motion.div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search auctions..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-secondary border-border" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {categories.map((c) => (
              <button key={c} onClick={() => setCategory(c)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${category === c ? "gradient-gold-bg text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <Filter className="w-4 h-4 text-muted-foreground mt-1" />
          {statuses.map((s) => (
            <button key={s} onClick={() => setStatus(s)} className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${status === s ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              {s === "All" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {filtered.length > 0 ? (
          <div className="auction-grid">
            {filtered.map((auction, i) => (
              <AuctionCard key={auction.id} auction={auction} index={i} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg">No auctions found</p>
            <p className="text-sm mt-1">Try adjusting your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
