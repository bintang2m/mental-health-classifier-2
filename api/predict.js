// Vercel Serverless Function - Mental Health Classifier
// API Key: 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

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Only accept POST
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            error: 'Method not allowed. Use POST.' 
        });
    }
    
    try {
        const { text, test } = req.body;
        
        // Test endpoint - untuk cek koneksi
        if (test === true) {
            return res.status(200).json({
                success: true,
                message: '✅ API is working!',
                model: 'B1NT4N9/roberta-mental-health-id',
                api_key_status: 'Active',
                timestamp: new Date().toISOString()
            });
        }
        
        // Validate input
        if (!text || typeof text !== 'string') {
            return res.status(400).json({ 
                success: false,
                error: 'Text is required',
                example: { text: 'Hari ini saya merasa...' }
            });
        }
        
        const cleanText = text.trim();
        
        if (cleanText.length < 5) {
            return res.status(400).json({ 
                success: false,
                error: 'Text too short. Minimum 5 characters.' 
            });
        }
        
        if (cleanText.length > 2000) {
            return res.status(400).json({ 
                success: false,
                error: 'Text too long. Maximum 2000 characters.' 
            });
        }
        
        console.log('📝 Processing text:', cleanText.substring(0, 50) + '...');
        
        // 🔑 YOUR NEW API KEY HERE
        const HF_API_KEY = process.env.HF_API_KEY || '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';
        const MODEL_URL = 'https://api-inference.huggingface.co/models/B1NT4N9/roberta-mental-health-id';
        
        // Call Hugging Face API
        const startTime = Date.now();
        
        console.log('🔗 Calling Hugging Face API...');
        const response = await fetch(MODEL_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HF_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                inputs: cleanText,
                parameters: {
                    return_all_scores: true
                }
            }),
            // Timeout after 30 seconds
            signal: AbortSignal.timeout(30000)
        });
        
        const processingTime = Date.now() - startTime;
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Hugging Face API Error:', response.status, errorText);
            
            // Generate smart fallback predictions
            const fallbackPredictions = generateSmartFallback(cleanText);
            
            return res.status(200).json({
                success: false,
                error: 'Model API temporarily unavailable',
                fallback: true,
                predictions: fallbackPredictions,
                processing_time: processingTime,
                model: 'B1NT4N9/roberta-mental-health-id',
                timestamp: new Date().toISOString(),
                note: 'Using intelligent fallback algorithm'
            });
        }
        
        const data = await response.json();
        console.log('✅ Hugging Face response received');
        
        // Process the API response
        const predictions = processApiResponse(data);
        
        return res.status(200).json({
            success: true,
            predictions: predictions,
            text_length: cleanText.length,
            processing_time: processingTime,
            model: 'B1NT4N9/roberta-mental-health-id',
            model_owner: 'B1NT4N9',
            api_key: 'Active',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('💥 Server Error:', error);
        
        // Always return something useful
        return res.status(200).json({
            success: false,
            error: 'Server processing error',
            fallback: true,
            predictions: generateBasicFallback(),
            timestamp: new Date().toISOString(),
            note: 'Server error fallback'
        });
    }
}

// Process Hugging Face API response
function processApiResponse(apiData) {
    try {
        // Expected format from roberta model
        // [[{label: "LABEL_0", score: 0.xx}, {label: "LABEL_1", score: ...}]]
        
        if (!Array.isArray(apiData) || !apiData[0]) {
            console.error('Invalid API data format:', apiData);
            return generateBasicFallback();
        }
        
        const rawPredictions = apiData[0];
        
        // Map labels from Hugging Face to our labels
        const labelMap = {
            "LABEL_0": "Normal",
            "LABEL_1": "Anxiety",
            "LABEL_2": "Depression",
            "LABEL_3": "Bipolar",
            "LABEL_4": "Suicidal"
        };
        
        const predictions = rawPredictions.map(item => {
            const originalLabel = item.label || '';
            const label = labelMap[originalLabel] || originalLabel;
            const score = item.score || 0;
            
            // Calculate confidence level
            let confidence = 'low';
            if (score > 0.7) confidence = 'high';
            else if (score > 0.4) confidence = 'medium';
            
            return {
                label: label,
                original_label: originalLabel,
                score: score,
                percentage: Math.round(score * 10000) / 100,
                confidence: confidence
            };
        });
        
        // Sort by score (highest first)
        predictions.sort((a, b) => b.score - a.score);
        
        console.log('📊 Processed predictions:', predictions.map(p => `${p.label}: ${p.percentage}%`));
        
        return predictions;
        
    } catch (error) {
        console.error('Error processing API response:', error);
        return generateBasicFallback();
    }
}

// Generate intelligent fallback predictions
function generateSmartFallback(text) {
    const textLower = text.toLowerCase();
    
    // Keywords for each category (Indonesian mental health context)
    const keywordPatterns = {
        "Normal": {
            keywords: ['baik', 'senang', 'bahagia', 'puas', 'normal', 'sehat', 'stabil', 'gembira', 'ceria', 'alhamdulillah', 'syukur'],
            weight: 0.1,
            baseScore: 0.4
        },
        "Anxiety": {
            keywords: ['cemas', 'khawatir', 'takut', 'gelisah', 'panic', 'gugup', 'deg-degan', 'was-was', 'nervous', 'tidak tenang'],
            weight: 0.15,
            baseScore: 0.2
        },
        "Depression": {
            keywords: ['sedih', 'depresi', 'putus asa', 'hampa', 'lelah', 'tidak berguna', 'malah', 'tertekan', 'murung', 'sendiri'],
            weight: 0.15,
            baseScore: 0.2
        },
        "Bipolar": {
            keywords: ['naik turun', 'mood swing', 'euforia', 'marah', 'impulsif', 'berubah-ubah', 'ekstrim', 'meledak', 'tidak stabil'],
            weight: 0.12,
            baseScore: 0.1
        },
        "Suicidal": {
            keywords: ['mati', 'bunuh diri', 'ending', 'habis', 'sakit hati', 'putus asa total', 'mengakhiri', 'overdosis', 'gantung diri'],
            weight: 0.2, // Higher weight for critical keywords
            baseScore: 0.1
        }
    };
    
    // Calculate scores based on keywords
    let scores = {};
    
    for (const [label, config] of Object.entries(keywordPatterns)) {
        let keywordScore = config.baseScore;
        
        // Check each keyword
        config.keywords.forEach(keyword => {
            if (textLower.includes(keyword)) {
                keywordScore += config.weight;
            }
        });
        
        // Check for negation (e.g., "tidak cemas")
        if (textLower.includes('tidak ') || textLower.includes('tidaknya')) {
            const words = textLower.split(' ');
            for (let i = 0; i < words.length; i++) {
                if (words[i] === 'tidak' && i + 1 < words.length) {
                    const nextWord = words[i + 1];
                    if (config.keywords.includes(nextWord)) {
                        keywordScore -= config.weight * 0.5; // Reduce score for negation
                    }
                }
            }
        }
        
        scores[label] = Math.max(0.01, keywordScore); // Ensure minimum score
    }
    
    // Additional scoring based on text characteristics
    const textLength = text.length;
    const hasQuestionMarks = (text.match(/\?/g) || []).length;
    const hasExclamations = (text.match(/\!/g) || []).length;
    
    // Longer, descriptive texts might be more emotional
    if (textLength > 100) {
        scores["Depression"] += 0.05;
        scores["Anxiety"] += 0.05;
    }
    
    // Questions might indicate anxiety
    if (hasQuestionMarks > 2) {
        scores["Anxiety"] += 0.08;
    }
    
    // Exclamations might indicate strong emotion
    if (hasExclamations > 2) {
        scores["Bipolar"] += 0.05;
    }
    
    // Normalize scores to sum to 1
    const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
    
    const predictions = Object.entries(scores).map(([label, score]) => {
        const normalizedScore = score / totalScore;
        
        return {
            label: label,
            score: normalizedScore,
            percentage: Math.round(normalizedScore * 10000) / 100,
            confidence: 'medium',
            is_fallback: true
        };
    });
    
    // Sort by score
    predictions.sort((a, b) => b.score - a.score);
    
    return predictions;
}

// Generate basic fallback (emergency)
function generateBasicFallback() {
    return [
        { label: "Normal", score: 0.6, percentage: 60, confidence: "medium", is_fallback: true },
        { label: "Anxiety", score: 0.15, percentage: 15, confidence: "low", is_fallback: true },
        { label: "Depression", score: 0.15, percentage: 15, confidence: "low", is_fallback: true },
        { label: "Bipolar", score: 0.05, percentage: 5, confidence: "low", is_fallback: true },
        { label: "Suicidal", score: 0.05, percentage: 5, confidence: "low", is_fallback: true }
    ];
}

// Health check endpoint (optional)
export function config() {
    return {
        api: {
            bodyParser: {
                sizeLimit: '1mb'
            }
        }
    };
}