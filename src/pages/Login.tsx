import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gavel, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const success = await login(email, password);
    setLoading(false);
    if (success) {
      const isAdmin = email.includes("admin");
      toast({ title: "Welcome back!", description: `Logged in as ${isAdmin ? "Admin" : "Bidder"}` });
      navigate(isAdmin ? "/admin" : "/dashboard");
    }
  };

  const demoLogin = async (role: "admin" | "bidder") => {
    const email = role === "admin" ? "admin@codebidz.com" : "alice@example.com";
    setLoading(true);
    await login(email, "demo");
    setLoading(false);
    toast({ title: "Demo login", description: `Signed in as ${role}` });
    navigate(role === "admin" ? "/admin" : "/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 pt-20">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl gradient-gold-bg flex items-center justify-center mx-auto mb-4">
            <Gavel className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold">Welcome Back</h1>
          <p className="text-muted-foreground mt-2">Sign in to your CodeBidz account</p>
        </div>

        <div className="glass-card p-6 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-secondary border-border" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="bg-secondary border-border" />
            </div>
            <Button type="submit" className="w-full gradient-gold-bg text-primary-foreground" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">or try a demo</span></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" size="sm" onClick={() => demoLogin("admin")} className="text-xs">Demo Admin</Button>
            <Button variant="outline" size="sm" onClick={() => demoLogin("bidder")} className="text-xs">Demo Bidder</Button>
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Don't have an account? <Link to="/register" className="text-primary hover:underline">Register</Link>
        </p>
      </div>
    </div>
  );
}
