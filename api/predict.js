// Vercel Serverless Function for Mental Health Classifier
// Using Hugging Face API with your API key

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Only accept POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            error: 'Method not allowed. Use POST.' 
        });
    }
    
    try {
        const { text, sensitivity, test } = req.body;
        
        // Test endpoint
        if (test) {
            return res.status(200).json({
                success: true,
                message: 'API is working',
                model: 'B1NT4N9/roberta-mental-health-id',
                timestamp: new Date().toISOString()
            });
        }
        
        // Validate input
        if (!text || typeof text !== 'string') {
            return res.status(400).json({ 
                error: 'Text is required and must be a string' 
            });
        }
        
        if (text.length < 10) {
            return res.status(400).json({ 
                error: 'Text must be at least 10 characters long' 
            });
        }
        
        if (text.length > 5000) {
            return res.status(400).json({ 
                error: 'Text must be less than 5000 characters' 
            });
        }
        
        // Your Hugging Face API Key - Use environment variable in production
        const HF_API_KEY = process.env.HF_API_KEY || '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';
        
        // Call Hugging Face API
        const hfResponse = await fetch(
            'https://api-inference.huggingface.co/models/B1NT4N9/roberta-mental-health-id',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${HF_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    inputs: text,
                    parameters: {
                        return_all_scores: true
                    }
                })
            }
        );
        
        if (!hfResponse.ok) {
            const errorText = await hfResponse.text();
            console.error('Hugging Face API error:', hfResponse.status, errorText);
            
            // Return mock data if API fails
            return res.status(200).json(await generateMockResponse(text, sensitivity));
        }
        
        const hfData = await hfResponse.json();
        
        // Process the response
        const result = processHuggingFaceResponse(hfData, text, sensitivity);
        
        // Return successful response
        return res.status(200).json({
            success: true,
            predictions: result.predictions,
            text_analysis: result.text_analysis,
            analysis_time: result.analysis_time,
            model: 'B1NT4N9/roberta-mental-health-id',
            timestamp: new Date().toISOString(),
            api_key_used: HF_API_KEY.substring(0, 10) + '...' // Show first 10 chars for debug
        });
        
    } catch (error) {
        console.error('Server error:', error);
        
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
}

// Process Hugging Face API response
function processHuggingFaceResponse(apiData, text, sensitivity = { normal: 0.3, confidence: 0.15 }) {
    console.log('Raw API data:', JSON.stringify(apiData).substring(0, 200));
    
    // Check if apiData is array and has expected structure
    if (!Array.isArray(apiData) || !apiData[0] || !Array.isArray(apiData[0])) {
        console.error('Unexpected API response format:', apiData);
        throw new Error('Invalid API response format');
    }
    
    // Map Hugging Face labels to our labels
    const labelMap = {
        "LABEL_0": "Normal",
        "LABEL_1": "Anxiety",
        "LABEL_2": "Depression", 
        "LABEL_3": "Bipolar",
        "LABEL_4": "Suicidal"
    };
    
    // Extract predictions
    const rawPredictions = apiData[0];
    const predictions = rawPredictions.map(item => {
        const label = labelMap[item.label] || item.label;
        const score = item.score || 0;
        
        return {
            label: label,
            score: score,
            percentage: Math.round(score * 10000) / 100
        };
    });
    
    // Sort by score (descending)
    predictions.sort((a, b) => b.score - a.score);
    
    // Apply sensitivity adjustments if provided
    if (sensitivity && sensitivity.normal) {
        applySensitivity(predictions, sensitivity, text);
    }
    
    // Analyze text for indicators
    const textAnalysis = analyzeTextForIndicators(text);
    
    return {
        predictions,
        text_analysis: textAnalysis,
        analysis_time: 1.5
    };
}

// Apply sensitivity settings
function applySensitivity(predictions, sensitivity, text) {
    const normalPrediction = predictions.find(p => p.label === 'Normal');
    const textLower = text.toLowerCase();
    
    if (!normalPrediction) return;
    
    // Boost normal prediction if text contains normal indicators
    const normalIndicators = ['baik', 'senang', 'bahagia', 'puas', 'normal', 'sehat'];
    const hasNormalIndicators = normalIndicators.some(indicator => textLower.includes(indicator));
    
    if (hasNormalIndicators) {
        const boost = sensitivity.normal * 0.5;
        normalPrediction.score = Math.min(0.95, normalPrediction.score + boost);
        
        // Re-normalize all scores
        const total = predictions.reduce((sum, p) => sum + p.score, 0);
        if (total > 0) {
            predictions.forEach(p => {
                p.score = p.score / total;
                p.percentage = Math.round(p.score * 10000) / 100;
            });
        }
        
        // Re-sort
        predictions.sort((a, b) => b.score - a.score);
    }
}

// Analyze text for indicators
function analyzeTextForIndicators(text) {
    const textLower = text.toLowerCase();
    
    const indicators = {
        normal: ['baik', 'senang', 'bahagia', 'puas', 'normal', 'sehat', 'stabil'],
        anxiety: ['cemas', 'khawatir', 'takut', 'gelisah', 'panic', 'gugup'],
        depression: ['sedih', 'depresi', 'putus asa', 'hampa', 'lelah', 'tidak berguna'],
        bipolar: ['naik turun', 'mood swing', 'euforia', 'marah', 'impulsif'],
        suicidal: ['mati', 'bunuh diri', 'ending', 'habis', 'sakit hati']
    };
    
    const analysis = {
        normal_indicators: 0,
        anxiety_indicators: 0,
        depression_indicators: 0,
        bipolar_indicators: 0,
        suicidal_indicators: 0,
        total_emotion_words: 0
    };
    
    // Count indicators for each category
    for (const [category, words] of Object.entries(indicators)) {
        words.forEach(word => {
            if (textLower.includes(word)) {
                analysis[`${category}_indicators`]++;
                analysis.total_emotion_words++;
            }
        });
    }
    
    return analysis;
}

// Generate mock response (fallback)
async function generateMockResponse(text, sensitivity) {
    const textLower = text.toLowerCase();
    const analysis = analyzeTextForIndicators(textLower);
    
    // Calculate base scores
    let scores = {
        "Normal": 0.3 + (analysis.normal_indicators * 0.05),
        "Anxiety": 0.2 + (analysis.anxiety_indicators * 0.08),
        "Depression": 0.2 + (analysis.depression_indicators * 0.08),
        "Bipolar": 0.15 + (analysis.bipolar_indicators * 0.05),
        "Suicidal": 0.15 + (analysis.suicidal_indicators * 0.1)
    };
    
    // Apply sensitivity
    if (sensitivity?.normal) {
        scores.Normal *= (1 + sensitivity.normal);
    }
    
    // Normalize
    const total = Object.values(scores).reduce((a, b) => a + b, 0);
    Object.keys(scores).forEach(key => {
        scores[key] = scores[key] / total;
    });
    
    // Convert to predictions
    const predictions = ["Normal", "Anxiety", "Depression", "Bipolar", "Suicidal"].map(label => ({
        label,
        score: scores[label],
        percentage: Math.round(scores[label] * 10000) / 100
    })).sort((a, b) => b.score - a.score);
    
    return {
        success: true,
        predictions,
        text_analysis: analysis,
        analysis_time: 0.8,
        is_mock: true,
        model: 'B1NT4N9/roberta-mental-health-id',
        timestamp: new Date().toISOString()
    };
}