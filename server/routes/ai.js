import express from 'express';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import * as fraudDetectionService from '../services/fraudDetectionService.js';

dotenv.config();

const router = express.Router();

// Middleware to verify JWT token and attach userId
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_here');
    req.userId = decoded.userId;
    // Assuming the user object might also attach userType, but for safety 
    // we should ideally fetch the user or trust the token if it had roles.
    // For now we just attach the decoded info.
    req.user = decoded; 
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

let groq = null;
try {
  if (process.env.GROQ_API_KEY) {
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  } else {
    console.warn("GROQ_API_KEY is not set. AI features will not work.");
  }
} catch (error) {
  console.error("Failed to initialize Groq client:", error);
}

// Route to generate auction description
router.post('/generate-description', verifyToken, async (req, res) => {
  try {
    // Only admins should generate descriptions
    if (req.user.userType !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admins only.' });
    }

    const { title, category } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (!groq) {
      // Fallback description when AI is unavailable
      const fallback = `Discover this exceptional ${category || 'item'}: "${title}". A premium offering that combines quality and value, perfect for discerning collectors and enthusiasts. Don't miss your chance to own this remarkable piece — place your bid today!`;
      return res.json({ description: fallback });
    }

    const prompt = `Write a short, compelling, and professional auction description for an item with the title: "${title}" in the category: "${category || 'General'}". The description should be 3-4 sentences long, highlighting its value and encouraging bids. Do not include any made-up specifications or fake history. Just make it sound exciting and premium.`;

    try {
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are an expert auction house appraiser and copywriter. You write concise, high-end descriptions that drive bidding."
          },
          {
            role: "user",
            content: prompt,
          }
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        max_tokens: 200,
      });

      const description = chatCompletion.choices[0]?.message?.content || "";
      res.json({ description: description.trim() });
    } catch (groqError) {
      console.error('Groq API error:', groqError.message || groqError);
      // Fallback description
      const fallback = `Discover this exceptional ${category || 'item'}: "${title}". A premium offering that combines quality and value, perfect for discerning collectors and enthusiasts. Don't miss your chance to own this remarkable piece — place your bid today!`;
      res.json({ description: fallback });
    }
  } catch (error) {
    console.error('Error generating description:', error);
    res.status(500).json({ error: 'Failed to generate description' });
  }
});

// Route to generate smart bid suggestion
router.post('/bid-suggestion', verifyToken, async (req, res) => {
  try {
    if (!groq) {
      return res.status(503).json({ error: 'AI service unavailable' });
    }

    const { auctionTitle, currentBid, startingPrice, totalBids, userCredits, reservePrice } = req.body;
    
    // Create a data context for the AI
    const currentPrice = currentBid || startingPrice || 0;
    const isHighDemand = totalBids > 10;
    
    const prompt = `I am a bidder in an auction for "${auctionTitle}". 
The current price is ${currentPrice} credits.
There have been ${totalBids} bids so far.
I have a total balance of ${userCredits} credits.

Based on basic auction theory and game theory, suggest a specific bid amount for me to place next, and provide a 1-sentence strategic reasoning.
Keep your response extremely concise. Format as JSON: {"suggestedBid": number, "reasoning": "string"}`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an expert AI bidding strategist. You output ONLY valid JSON matching the requested format."
        },
        {
          role: "user",
          content: prompt,
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.5,
      response_format: { type: "json_object" },
    });

    const content = chatCompletion.choices[0]?.message?.content || "{}";
    const suggestion = JSON.parse(content);
    
    // Safety check: don't suggest more than user has or less than current
    let finalSuggested = suggestion.suggestedBid;
    if (finalSuggested < currentPrice + 1) {
      finalSuggested = currentPrice + Math.max(1, Math.floor(currentPrice * 0.05));
    }
    if (finalSuggested > userCredits) {
      finalSuggested = userCredits;
    }

    res.json({
      suggestedBid: Math.floor(finalSuggested),
      reasoning: suggestion.reasoning || "A solid incremental bid to take the lead."
    });
  } catch (error) {
    console.error('Error generating bid suggestion:', error);
    // Fallback if AI fails
    const currentPrice = req.body.currentBid || req.body.startingPrice || 0;
    res.json({
      suggestedBid: Math.floor(currentPrice * 1.1),
      reasoning: "System fallback suggestion."
    });
  }
});

// Route to get comprehensive AI bidding analysis
router.post('/bidding-analysis', verifyToken, async (req, res) => {
  try {
    if (!groq) {
      return res.status(503).json({ error: 'AI service unavailable' });
    }

    const {
      auctionId,
      auctionTitle,
      currentBid,
      startingPrice,
      minimumBid,
      totalBids,
      activeBidders,
      remainingTime,
      userCredits,
      userCurrentBid,
      recentBids
    } = req.body;

    const currentPrice = currentBid || startingPrice || 0;
    const timeLeftMinutes = Math.max(0, remainingTime / 60000); // Convert ms to minutes

    // Generate comprehensive analysis
    const prompt = `Analyze this auction and provide comprehensive bidding insights:

Auction: "${auctionTitle}"
Current Price: ${currentPrice} credits
Starting Price: ${startingPrice} credits
Minimum Bid: ${minimumBid || 1} credits
Total Bids: ${totalBids}
Active Bidders: ${activeBidders}
Time Remaining: ${timeLeftMinutes.toFixed(1)} minutes
Your Credits: ${userCredits}
Your Current Bid: ${userCurrentBid || 0} credits

Recent Bids: ${recentBids ? recentBids.map(b => `${b.amount} credits`).join(', ') : 'None'}

Provide a comprehensive JSON response with:
1. Suggested bid amount
2. Winning probability (0-100)
3. Strategy explanation
4. A 1-2 sentence explanation of why the winning probability is likely (brief, data-grounded)
4. Auction intelligence insights

Format as JSON: {
  "suggestedBid": number,
  "winningProbability": number,
  "strategy": "string",
  "winningProbabilityReason": "string",
  "auctionIntelligence": {
    "auctionMood": "string",
    "bidSpeed": "string",
    "predictedFinalRange": "string",
    "bidWarProbability": number
  }
}`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an expert AI auction analyst. Provide data-driven insights and strategic recommendations. Output ONLY valid JSON."
        },
        {
          role: "user",
          content: prompt,
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.6,
      response_format: { type: "json_object" },
    });

    const content = chatCompletion.choices[0]?.message?.content || "{}";
    const analysis = JSON.parse(content);

    // Validate and sanitize response
    const winningProbabilityReasonRaw =
      analysis.winningProbabilityReason ||
      analysis.explanation ||
      "";
    const winningProbabilityReason =
      typeof winningProbabilityReasonRaw === 'string'
        ? winningProbabilityReasonRaw.trim()
        : "";

    const result = {
      suggestedBid: Math.floor(Math.max(analysis.suggestedBid || currentPrice + 1, currentPrice + 1)),
      winningProbability: Math.min(100, Math.max(0, analysis.winningProbability || 50)),
      strategy: analysis.strategy || "Consider placing a competitive bid to maintain position.",
      winningProbabilityReason:
        winningProbabilityReason ||
        "Your odds depend on your bid vs the current price, competition level, and time left.",
      // Backwards-compatible alias for older UI code paths
      explanation:
        winningProbabilityReason ||
        "Your odds depend on your bid vs the current price, competition level, and time left.",
      auctionIntelligence: {
        auctionMood: analysis.auctionIntelligence?.auctionMood || "Neutral",
        bidSpeed: analysis.auctionIntelligence?.bidSpeed || "Moderate",
        predictedFinalRange: analysis.auctionIntelligence?.predictedFinalRange || `${currentPrice + 50} - ${currentPrice + 200} credits`,
        bidWarProbability: Math.min(100, Math.max(0, analysis.auctionIntelligence?.bidWarProbability || 30))
      }
    };

    res.json(result);
  } catch (error) {
    console.error('Error generating bidding analysis:', error);
    res.status(500).json({
      suggestedBid: Math.floor((req.body.currentBid || req.body.startingPrice || 0) * 1.1),
      winningProbability: 50,
      strategy: "System fallback analysis.",
      winningProbabilityReason: "Probability unavailable; using a conservative default based on limited data.",
      explanation: "Probability unavailable; using a conservative default based on limited data.",
      auctionIntelligence: {
        auctionMood: "Neutral",
        bidSpeed: "Moderate",
        predictedFinalRange: "Data unavailable",
        bidWarProbability: 30
      }
    });
  }
});

// Route to get winning probability explanation
router.post('/winning-probability', verifyToken, async (req, res) => {
  try {
    if (!groq) {
      return res.status(503).json({ error: 'AI service unavailable' });
    }

    const {
      auctionTitle,
      currentBid,
      userBid,
      startingPrice,
      totalBids,
      activeBidders,
      remainingTime,
      userCredits
    } = req.body;

    const currentPrice = currentBid || startingPrice || 0;
    const timeLeftMinutes = Math.max(0, remainingTime / 60000);

    const prompt = `Calculate and explain the winning probability for this auction:

Auction: "${auctionTitle}"
Current Price: ${currentPrice} credits
Your Bid: ${userBid || 0} credits
Starting Price: ${startingPrice} credits
Total Bids: ${totalBids}
Active Bidders: ${activeBidders}
Time Remaining: ${timeLeftMinutes.toFixed(1)} minutes
Your Credits: ${userCredits}

Based on this data, calculate a winning probability (0-100) and provide a clear explanation of why the probability is high or low. Focus on actionable insights.

Format as JSON: {
  "winningProbability": number,
  "explanation": "string"
}`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an expert AI probability analyst. Provide clear, actionable explanations. Output ONLY valid JSON."
        },
        {
          role: "user",
          content: prompt,
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.5,
      response_format: { type: "json_object" },
    });

    const content = chatCompletion.choices[0]?.message?.content || "{}";
    const result = JSON.parse(content);

    res.json({
      winningProbability: Math.min(100, Math.max(0, result.winningProbability || 50)),
      explanation: result.explanation || "Probability calculated based on current auction dynamics."
    });
  } catch (error) {
    console.error('Error calculating winning probability:', error);
    res.status(500).json({
      winningProbability: 50,
      explanation: "Unable to calculate probability at this time."
    });
  }
});

// Route to get auction intelligence insights
router.post('/auction-intelligence', verifyToken, async (req, res) => {
  try {
    if (!groq) {
      return res.status(503).json({ error: 'AI service unavailable' });
    }

    const {
      auctionTitle,
      currentBid,
      startingPrice,
      totalBids,
      activeBidders,
      remainingTime,
      bidFrequency,
      averageIncrement
    } = req.body;

    const currentPrice = currentBid || startingPrice || 0;
    const timeLeftMinutes = Math.max(0, remainingTime / 60000);

    const prompt = `Analyze this auction's real-time dynamics and provide strategic insights:

Auction: "${auctionTitle}"
Current Price: ${currentPrice} credits
Starting Price: ${startingPrice} credits
Total Bids: ${totalBids}
Active Bidders: ${activeBidders}
Time Remaining: ${timeLeftMinutes.toFixed(1)} minutes
Bid Frequency: ${bidFrequency || 'Unknown'} bids per minute
Average Increment: ${averageIncrement || 'Unknown'} credits

Analyze the bidding patterns and provide strategic insights about the auction's competitiveness and predicted outcome.

Format as JSON: {
  "auctionMood": "string",
  "bidSpeed": "string",
  "predictedFinalRange": "string",
  "bidWarProbability": number,
  "strategicInsights": "string"
}`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an expert AI auction intelligence analyst. Provide strategic insights based on real-time data. Output ONLY valid JSON."
        },
        {
          role: "user",
          content: prompt,
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const content = chatCompletion.choices[0]?.message?.content || "{}";
    const insights = JSON.parse(content);

    res.json({
      auctionMood: insights.auctionMood || "Neutral",
      bidSpeed: insights.bidSpeed || "Moderate",
      predictedFinalRange: insights.predictedFinalRange || "Data unavailable",
      bidWarProbability: Math.min(100, Math.max(0, insights.bidWarProbability || 30)),
      strategicInsights: insights.strategicInsights || "Monitor bidding patterns for optimal timing."
    });
  } catch (error) {
    console.error('Error generating auction intelligence:', error);
    res.status(500).json({
      auctionMood: "Neutral",
      bidSpeed: "Moderate",
      predictedFinalRange: "Data unavailable",
      bidWarProbability: 30,
      strategicInsights: "Unable to analyze at this time."
    });
  }
});

// Route to analyze auction for fraud patterns
router.get('/fraud-analysis/:auctionId', verifyToken, async (req, res) => {
  try {
    // Only admins should access fraud analysis
    if (req.user.userType !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admins only.' });
    }

    const auctionId = req.params.auctionId;
    
    const analysis = await fraudDetectionService.analyzeBiddingPatterns(auctionId);
    
    if (!analysis) {
      return res.status(404).json({ error: 'Auction not found or no bids to analyze' });
    }

    res.json(analysis);
  } catch (error) {
    console.error('Error analyzing fraud patterns:', error);
    res.status(500).json({ error: 'Failed to analyze fraud patterns' });
  }
});

// Route to get fraud detection summary for admin dashboard
router.get('/fraud-summary', verifyToken, async (req, res) => {
  try {
    // Only admins should access fraud summary
    if (req.user.userType !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admins only.' });
    }

    const limit = parseInt(req.query.limit) || 50;
    const summary = await fraudDetectionService.getFraudDetectionSummary(limit);
    
    res.json(summary);
  } catch (error) {
    console.error('Error getting fraud summary:', error);
    res.status(500).json({ error: 'Failed to get fraud summary' });
  }
});

// Route to validate bid for fraud before processing
router.post('/validate-bid', verifyToken, async (req, res) => {
  try {
    const { auctionId, bidAmount } = req.body;
    const bidderId = req.userId;

    const validation = await fraudDetectionService.validateBidForFraud(auctionId, bidderId, bidAmount);
    
    res.json(validation);
  } catch (error) {
    console.error('Error validating bid:', error);
    res.status(500).json({ error: 'Failed to validate bid' });
  }
});

export default router;
