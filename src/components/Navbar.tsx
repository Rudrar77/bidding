import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { LogOut, Gavel, Bell, Coins, Menu, X } from "lucide-react";
import { useState } from "react";
import { mockNotifications } from "@/lib/mock-data";

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const unreadCount = mockNotifications.filter((n) => !n.read && n.userId === user?.id).length;

  const isLanding = location.pathname === "/";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
          <div className="w-8 h-8 rounded-lg gradient-gold-bg flex items-center justify-center">
            <Gavel className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">Code<span className="gradient-gold-text">Bidz</span></span>
        </div>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-4">
          {isAuthenticated ? (
            <>
              {user?.role === "bidder" && (
                <div className="flex items-center gap-1.5 bg-secondary rounded-full px-3 py-1.5">
                  <Coins className="w-4 h-4 text-primary" />
                  <span className="font-mono font-semibold text-sm">{user.credits} CR</span>
                </div>
              )}
              <button
                onClick={() => navigate(user?.role === "admin" ? "/admin" : "/dashboard")}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Dashboard
              </button>
              <button
                onClick={() => navigate("/auctions")}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Auctions
              </button>
              <div className="relative">
                <Bell className="w-5 h-5 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
                    {unreadCount}
                  </span>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={() => { logout(); navigate("/"); }}>
                <LogOut className="w-4 h-4 mr-1" /> Logout
              </Button>
            </>
          ) : (
            <>
              {!isLanding && (
                <button onClick={() => navigate("/")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Home
                </button>
              )}
              <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>Sign In</Button>
              <Button size="sm" className="gradient-gold-bg text-primary-foreground" onClick={() => navigate("/register")}>
                Get Started
              </Button>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl p-4 space-y-3">
          {isAuthenticated ? (
            <>
              {user?.role === "bidder" && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Coins className="w-4 h-4 text-primary" />
                  <span className="font-mono font-semibold">{user.credits} CR</span>
                </div>
              )}
              <button onClick={() => { navigate(user?.role === "admin" ? "/admin" : "/dashboard"); setMobileOpen(false); }} className="block text-sm">Dashboard</button>
              <button onClick={() => { navigate("/auctions"); setMobileOpen(false); }} className="block text-sm">Auctions</button>
              <button onClick={() => { logout(); navigate("/"); setMobileOpen(false); }} className="block text-sm text-destructive">Logout</button>
            </>
          ) : (
            <>
              <button onClick={() => { navigate("/login"); setMobileOpen(false); }} className="block text-sm">Sign In</button>
              <button onClick={() => { navigate("/register"); setMobileOpen(false); }} className="block text-sm text-primary">Get Started</button>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
