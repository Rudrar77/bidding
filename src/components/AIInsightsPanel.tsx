import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  TrendingUp, 
  Target, 
  BarChart3, 
  Brain, 
  AlertTriangle, 
  Clock, 
  Users, 
  DollarSign,
  RefreshCw,
  Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSocket } from '@/contexts/SocketContext';
import { API_SERVICE } from '@/services/api';

interface AIInsightsPanelProps {
  auctionId: number | string;
  currentBid: number;
  startingPrice: number;
  totalBids: number;
  activeBidders: number;
  remainingTime: number;
  userCredits: number;
  userCurrentBid?: number;
  recentBids?: any[];
  onBidAmount?: (amount: number) => void;
  className?: string;
}

interface AIAnalysis {
  suggestedBid: number;
  winningProbability: number;
  strategy: string;
  winningProbabilityReason?: string;
  explanation?: string;
  auctionIntelligence: {
    auctionMood: string;
    bidSpeed: string;
    predictedFinalRange: string;
    bidWarProbability: number;
  };
}

interface WinningProbability {
  winningProbability: number;
  explanation: string;
}

interface AuctionIntelligence {
  auctionMood: string;
  bidSpeed: string;
  predictedFinalRange: string;
  bidWarProbability: number;
  strategicInsights: string;
}

export const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({
  auctionId,
  currentBid,
  startingPrice,
  totalBids,
  activeBidders,
  remainingTime,
  userCredits,
  userCurrentBid = 0,
  recentBids = [],
  onBidAmount,
  className = ''
}) => {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [winningProbability, setWinningProbability] = useState<WinningProbability | null>(null);
  const [auctionIntelligence, setAuctionIntelligence] = useState<AuctionIntelligence | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'analysis' | 'probability' | 'intelligence'>('analysis');
  const { toast } = useToast();
  const { socket, isConnected } = useSocket();

  const generateAnalysis = async () => {
    if (!auctionId) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast({
          title: "Authentication Required",
          description: "Please log in to access AI insights.",
          variant: "destructive"
        });
        return;
      }

      const data = {
        auctionId,
        auctionTitle: `Auction ${auctionId}`,
        currentBid,
        startingPrice,
        minimumBid: 1,
        totalBids,
        activeBidders,
        remainingTime,
        userCredits,
        userCurrentBid,
        recentBids
      };

      const result = await API_SERVICE.ai.getBiddingAnalysis(data, token);
      setAnalysis(result);
      setActiveTab('analysis');

      toast({
        title: "AI Analysis Complete",
        description: "Comprehensive bidding insights generated.",
      });
    } catch (error) {
      console.error('Error generating AI analysis:', error);
      toast({
        title: "Analysis Failed",
        description: "Could not generate AI insights. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getWinningProbability = async () => {
    if (!auctionId) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const data = {
        auctionTitle: `Auction ${auctionId}`,
        currentBid,
        userBid: userCurrentBid,
        startingPrice,
        totalBids,
        activeBidders,
        remainingTime,
        userCredits
      };

      const result = await API_SERVICE.ai.getWinningProbability(data, token);
      setWinningProbability(result);
      setActiveTab('probability');

      toast({
        title: "Probability Calculated",
        description: "Winning probability updated.",
      });
    } catch (error) {
      console.error('Error calculating winning probability:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAuctionIntelligence = async () => {
    if (!auctionId) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const data = {
        auctionTitle: `Auction ${auctionId}`,
        currentBid,
        startingPrice,
        totalBids,
        activeBidders,
        remainingTime,
        bidFrequency: totalBids / Math.max(1, remainingTime / 60000),
        averageIncrement: 1
      };

      const result = await API_SERVICE.ai.getAuctionIntelligence(data, token);
      setAuctionIntelligence(result);
      setActiveTab('intelligence');

      toast({
        title: "Intelligence Updated",
        description: "Auction intelligence insights generated.",
      });
    } catch (error) {
      console.error('Error generating auction intelligence:', error);
    } finally {
      setLoading(false);
    }
  };

  // Socket.IO real-time AI insights updates
  useEffect(() => {
    if (!socket || !auctionId) return;

    // Listen for AI insights updates
    const handleAIInsightsUpdate = (data: any) => {
      if (data.auctionId === auctionId) {
        console.log('AI insights updated:', data);
        // Refresh all AI insights when new data is available
        if (data.type === 'analysis') {
          setAnalysis(data.analysis);
        } else if (data.type === 'probability') {
          setWinningProbability(data.probability);
        } else if (data.type === 'intelligence') {
          setAuctionIntelligence(data.intelligence);
        }
      }
    };

    // Listen for auction state changes that might affect AI analysis
    const handleAuctionStateChange = (data: any) => {
      if (data.auctionId === auctionId && data.type === 'state_change') {
        // Refresh AI analysis when auction state changes significantly
        generateAnalysis();
      }
    };

    socket.on('ai:insights_update', handleAIInsightsUpdate);
    socket.on('auction:state_change', handleAuctionStateChange);

    return () => {
      socket.off('ai:insights_update', handleAIInsightsUpdate);
      socket.off('auction:state_change', handleAuctionStateChange);
    };
  }, [socket, auctionId]);

  // Auto-generate analysis when component mounts or data changes
  useEffect(() => {
    generateAnalysis();
  }, [auctionId, currentBid, totalBids, activeBidders, remainingTime]);

  const getProbabilityColor = (probability: number) => {
    if (probability >= 80) return 'bg-green-500';
    if (probability >= 60) return 'bg-blue-500';
    if (probability >= 40) return 'bg-yellow-500';
    if (probability >= 20) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getMoodColor = (mood: string) => {
    const moodLower = mood.toLowerCase();
    if (moodLower.includes('aggressive') || moodLower.includes('competitive')) return 'bg-red-500';
    if (moodLower.includes('active') || moodLower.includes('busy')) return 'bg-blue-500';
    if (moodLower.includes('neutral') || moodLower.includes('steady')) return 'bg-gray-500';
    if (moodLower.includes('slow') || moodLower.includes('quiet')) return 'bg-green-500';
    return 'bg-gray-500';
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="w-5 h-5" />
                AI Insights
              </CardTitle>
              <p className="text-xs text-muted-foreground">Real-time auction intelligence</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={generateAnalysis}
              disabled={loading}
              className="text-xs"
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Tab Navigation */}
        <div className="flex border-b bg-muted/50">
          <button
            onClick={() => setActiveTab('analysis')}
            className={`flex-1 flex items-center gap-2 p-3 text-sm font-medium transition-colors ${
              activeTab === 'analysis' ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Target className="w-4 h-4" />
            Bid Analysis
          </button>
          <button
            onClick={() => setActiveTab('probability')}
            className={`flex-1 flex items-center gap-2 p-3 text-sm font-medium transition-colors ${
              activeTab === 'probability' ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Win Probability
          </button>
          <button
            onClick={() => setActiveTab('intelligence')}
            className={`flex-1 flex items-center gap-2 p-3 text-sm font-medium transition-colors ${
              activeTab === 'intelligence' ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Market Intel
          </button>
        </div>

        {/* Analysis Tab */}
        {activeTab === 'analysis' && analysis && (
          <div className="p-4 space-y-4">
            {/* Suggested Bid */}
            <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Zap className="w-4 h-4 text-green-500" />
                  AI Suggested Bid
                </h4>
                <Badge variant="outline" className="text-green-600 border-green-500/30">
                  {analysis.suggestedBid} CR
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{analysis.strategy}</p>
              {onBidAmount && (
                <Button
                  onClick={() => onBidAmount(analysis.suggestedBid)}
                  className="w-full mt-3 bg-green-500 hover:bg-green-600 text-white"
                >
                  Place AI Suggested Bid
                </Button>
              )}
            </div>

            {/* Auction Intelligence Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-secondary rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Auction Mood</span>
                  <Badge className={`${getMoodColor(analysis.auctionIntelligence.auctionMood)} text-white`}>
                    {analysis.auctionIntelligence.auctionMood}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>{analysis.auctionIntelligence.bidSpeed}</span>
                </div>
              </div>
              
              <div className="bg-secondary rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Bid War Risk</span>
                  <Badge variant="destructive">
                    {analysis.auctionIntelligence.bidWarProbability}%
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span>{activeBidders} active bidders</span>
                </div>
              </div>
            </div>

            {/* Predicted Range */}
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Predicted Final Range</span>
                <DollarSign className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-lg font-bold">{analysis.auctionIntelligence.predictedFinalRange}</p>
            </div>
          </div>
        )}

        {/* Probability Tab */}
        {activeTab === 'probability' && winningProbability && (
          <div className="p-4 space-y-4">
            {/* Probability Gauge */}
            <div className="text-center">
              <div className="relative inline-flex items-center justify-center">
                <div className="w-24 h-24 rounded-full border-8 border-muted relative">
                  <div 
                    className={`absolute top-0 left-0 w-24 h-24 rounded-full ${getProbabilityColor(winningProbability.winningProbability)} opacity-20`}
                    style={{
                      clipPath: `polygon(50% 50%, 50% 0%, ${50 + Math.sin((winningProbability.winningProbability / 100) * Math.PI) * 50}% ${50 - Math.cos((winningProbability.winningProbability / 100) * Math.PI) * 50}%, 50% 50%)`
                    }}
                  />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold">{winningProbability.winningProbability}%</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">Winning Probability</p>
            </div>

            {/* Explanation */}
            <div className="bg-secondary rounded-lg p-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-primary" />
                AI Analysis
              </h4>
              <p className="text-sm text-muted-foreground">{winningProbability.explanation}</p>
            </div>

            {/* Current Status */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="text-xs text-muted-foreground mb-1">Current Bid</div>
                <div className="text-lg font-bold">{currentBid} CR</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="text-xs text-muted-foreground mb-1">Your Credits</div>
                <div className="text-lg font-bold">{userCredits} CR</div>
              </div>
            </div>
          </div>
        )}

        {/* Intelligence Tab */}
        {activeTab === 'intelligence' && auctionIntelligence && (
          <div className="p-4 space-y-4">
            {/* Market Overview */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Market Sentiment</span>
                  <Badge className={`${getMoodColor(auctionIntelligence.auctionMood)} text-white`}>
                    {auctionIntelligence.auctionMood}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <span>{auctionIntelligence.bidSpeed}</span>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Competition Level</span>
                  <Badge variant="destructive">
                    {auctionIntelligence.bidWarProbability}%
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span>{activeBidders} bidders</span>
                </div>
              </div>
            </div>

            {/* Predicted Outcome */}
            <div className="bg-secondary rounded-lg p-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Predicted Final Range
              </h4>
              <p className="text-lg font-bold text-primary">{auctionIntelligence.predictedFinalRange}</p>
            </div>

            {/* Strategic Insights */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" />
                Strategic Insights
              </h4>
              <p className="text-sm text-muted-foreground">{auctionIntelligence.strategicInsights}</p>
            </div>

            {/* Current Stats */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-muted/50 rounded-lg p-2">
                <div className="text-xs text-muted-foreground">Total Bids</div>
                <div className="text-lg font-bold">{totalBids}</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-2">
                <div className="text-xs text-muted-foreground">Time Left</div>
                <div className="text-lg font-bold">{formatTime(remainingTime)}</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-2">
                <div className="text-xs text-muted-foreground">Avg Increment</div>
                <div className="text-lg font-bold">~1 CR</div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">Analyzing auction data...</p>
          </div>
        )}

        {/* Empty State */}
        {!analysis && !winningProbability && !auctionIntelligence && !loading && (
          <div className="p-6 text-center">
            <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-sm text-muted-foreground">Click "Refresh" to generate AI insights</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};