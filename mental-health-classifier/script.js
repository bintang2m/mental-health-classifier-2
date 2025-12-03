// Mental Health Classifier - Main Script
// API Key: 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

// Configuration
const CONFIG = {
    API_ENDPOINT: '/api/predict', // Local API endpoint
    HUGGINGFACE_ENDPOINT: 'https://api-inference.huggingface.co/models/B1NT4N9/roberta-mental-health-id',
    USE_LOCAL_API: true, // Set to false to call Hugging Face directly (NOT RECOMMENDED)
    
    // Model Labels
    LABELS: ["Normal", "Anxiety", "Depression", "Bipolar", "Suicidal"],
    
    // Label Information
    LABEL_INFO: {
        "Normal": {
            icon: "bi-emoji-smile",
            color: "success",
            bgColor: "#4cc9f0",
            description: "Teks menunjukkan keadaan mental yang stabil dan sehat.",
            keywords: ['baik', 'senang', 'bahagia', 'puas', 'normal', 'sehat', 'stabil']
        },
        "Anxiety": {
            icon: "bi-emoji-expressionless",
            color: "warning",
            bgColor: "#f8961e",
            description: "Terdapat indikasi kecemasan atau kekhawatiran berlebihan.",
            keywords: ['cemas', 'khawatir', 'takut', 'gelisah', 'panic', 'neraka', 'gugup']
        },
        "Depression": {
            icon: "bi-emoji-frown",
            color: "danger",
            bgColor: "#f72585",
            description: "Terdapat tanda-tanda depresi atau perasaan sedih mendalam.",
            keywords: ['sedih', 'depresi', 'putus asa', 'hampa', 'lelah', 'tidak berguna', 'malah']
        },
        "Bipolar": {
            icon: "bi-emoji-dizzy",
            color: "info",
            bgColor: "#7209b7",
            description: "Terdapat fluktuasi mood yang signifikan.",
            keywords: ['naik turun', 'mood swing', 'euforia', 'marah', 'impulsif', 'berubah-ubah']
        },
        "Suicidal": {
            icon: "bi-emoji-angry",
            color: "dark",
            bgColor: "#212529",
            description: "Terdapat pemikiran atau isyarat tentang bunuh diri.",
            keywords: ['mati', 'bunuh diri', 'ending', 'habis', 'sakit hati', 'putus asa total']
        }
    },
    
    // Default Thresholds
    THRESHOLDS: {
        normal: 0.3,
        confidence: 0.15
    }
};

// Application State
let appState = {
    isAnalyzing: false,
    modelReady: false,
    lastAnalysis: null,
    currentText: "",
    sensitivity: {
        normal: 0.3,
        confidence: 0.15
    }
};

// DOM Elements
const elements = {
    // Status
    statusDot: document.getElementById('statusDot'),
    statusText: document.getElementById('statusText'),
    
    // Input
    inputText: document.getElementById('inputText'),
    charCount: document.getElementById('charCount'),
    analyzeBtn: document.getElementById('analyzeBtn'),
    
    // Sliders
    normalSensitivity: document.getElementById('normalSensitivity'),
    normalValue: document.getElementById('normalValue'),
    confidenceThreshold: document.getElementById('confidenceThreshold'),
    confidenceValue: document.getElementById('confidenceValue'),
    
    // Results
    loadingState: document.getElementById('loadingState'),
    resultsContainer: document.getElementById('resultsContainer'),
    emptyState: document.getElementById('emptyState'),
    topPrediction: document.getElementById('topPrediction'),
    allPredictions: document.getElementById('allPredictions'),
    
    // Prediction Elements
    topPredictionIcon: document.getElementById('topPredictionIcon'),
    topPredictionLabel: document.getElementById('topPredictionLabel'),
    topPredictionBar: document.getElementById('topPredictionBar'),
    topPredictionPercent: document.getElementById('topPredictionPercent'),
    topPredictionDesc: document.getElementById('topPredictionDesc'),
    
    predictionsList: document.getElementById('predictionsList'),
    normalIndicators: document.getElementById('normalIndicators'),
    emotionWords: document.getElementById('emotionWords')
};

// Initialize Application
function initApp() {
    console.log('🚀 Initializing Mental Health Classifier...');
    
    // Initialize status
    updateStatus('loading', 'Loading model...');
    
    // Initialize event listeners
    setupEventListeners();
    
    // Check API status
    checkApiStatus();
    
    // Update UI
    updateCharCount();
    updateSliderValues();
    
    console.log('✅ App initialized');
}

// Setup Event Listeners
function setupEventListeners() {
    // Input text changes
    elements.inputText.addEventListener('input', function() {
        updateCharCount();
        updateAnalyzeButton();
        appState.currentText = this.value;
    });
    
    // Slider events are handled via oninput in HTML
    
    // Enter key to analyze
    elements.inputText.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && e.ctrlKey && !appState.isAnalyzing) {
            analyzeText();
        }
    });
}

// Update Status Indicator
function updateStatus(status, message) {
    const dot = elements.statusDot;
    const text = elements.statusText;
    
    dot.className = 'status-dot';
    text.textContent = message;
    
    switch(status) {
        case 'loading':
            dot.classList.add('loading');
            text.classList.add('text-warning');
            break;
        case 'connected':
            dot.classList.add('connected');
            text.classList.add('text-success');
            appState.modelReady = true;
            break;
        case 'error':
            dot.classList.add('disconnected');
            text.classList.add('text-danger');
            break;
    }
}

// Check API Status
async function checkApiStatus() {
    try {
        const response = await fetch('/api/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: 'test', test: true })
        });
        
        if (response.ok) {
            updateStatus('connected', 'API Connected');
        } else {
            updateStatus('error', 'API Error');
        }
    } catch (error) {
        console.warn('API check failed:', error);
        updateStatus('connected', 'Mock Mode Active');
    }
}

// Update Character Count
function updateCharCount() {
    const text = elements.inputText.value;
    const count = text.length;
    elements.charCount.textContent = count;
    
    // Update color based on length
    if (count < 50) {
        elements.charCount.classList.add('text-danger');
        elements.charCount.classList.remove('text-warning');
    } else if (count < 100) {
        elements.charCount.classList.remove('text-danger');
        elements.charCount.classList.add('text-warning');
    } else {
        elements.charCount.classList.remove('text-danger', 'text-warning');
    }
}

// Update Analyze Button State
function updateAnalyzeButton() {
    const text = elements.inputText.value.trim();
    elements.analyzeBtn.disabled = text.length < 50 || appState.isAnalyzing;
}

// Update Slider Values Display
function updateSliderValues() {
    elements.normalValue.textContent = elements.normalSensitivity.value;
    elements.confidenceValue.textContent = elements.confidenceThreshold.value;
    
    appState.sensitivity.normal = parseFloat(elements.normalSensitivity.value);
    appState.sensitivity.confidence = parseFloat(elements.confidenceThreshold.value);
}

function updateSliderValue(sliderId, valueId) {
    const slider = document.getElementById(sliderId);
    const value = document.getElementById(valueId);
    value.textContent = slider.value;
    appState.sensitivity[sliderId.replace('Sensitivity', '').toLowerCase()] = parseFloat(slider.value);
}

// Load Example Text
function loadExample(type) {
    const examples = {
        normal: "Hari ini saya merasa sangat bahagia. Pagi ini saya bangun dengan perasaan segar dan bersemangat. Saya berhasil menyelesaikan semua pekerjaan tepat waktu dan bahkan punya waktu untuk berolahraga. Malam ini saya akan makan malam bersama keluarga.",
        
        anxiety: "Saya tidak bisa berhenti merasa cemas tentang presentasi besok. Jantung saya berdebar-debar sejak pagi. Pikiran saya terus membayangkan semua hal buruk yang mungkin terjadi. Saya takut akan gagal dan dipermalukan di depan semua orang.",
        
        depression: "Sudah dua minggu saya merasa sangat sedih dan hampa. Tidak ada yang membuat saya senang lagi. Saya hanya ingin tidur sepanjang hari. Rasanya hidup ini tidak ada artinya. Semua terasa berat dan melelahkan."
    };
    
    elements.inputText.value = examples[type] || examples.normal;
    updateCharCount();
    updateAnalyzeButton();
    elements.inputText.focus();
}

// Show All Examples
function showExamples() {
    const modalHtml = `
        <div class="modal fade" id="examplesModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title"><i class="bi bi-lightbulb me-2"></i>Contoh Teks</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <h6 class="text-success"><i class="bi bi-emoji-smile me-2"></i>Normal</h6>
                            <p class="small">"Hari ini cuaca cerah, saya merasa bersemangat untuk mulai aktivitas. Sudah menyelesaikan pekerjaan dengan baik dan berencana bertemu teman nanti malam."</p>
                            <button class="btn btn-sm btn-outline-success" onclick="loadExample('normal')">Gunakan</button>
                        </div>
                        <div class="mb-3">
                            <h6 class="text-warning"><i class="bi bi-emoji-expressionless me-2"></i>Anxiety</h6>
                            <p class="small">"Saya terus merasa cemas dan khawatir tanpa alasan yang jelas. Jantung berdebar dan sulit tidur karena memikirkan hal-hal yang belum tentu terjadi."</p>
                            <button class="btn btn-sm btn-outline-warning" onclick="loadExample('anxiety')">Gunakan</button>
                        </div>
                        <div class="mb-3">
                            <h6 class="text-danger"><i class="bi bi-emoji-frown me-2"></i>Depression</h6>
                            <p class="small">"Rasanya tidak ada harapan lagi. Semua terasa hampa dan tidak berarti. Saya lelah dengan semua ini dan ingin menyendiri saja."</p>
                            <button class="btn btn-sm btn-outline-danger" onclick="loadExample('depression')">Gunakan</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Create and show modal
    const modalDiv = document.createElement('div');
    modalDiv.innerHTML = modalHtml;
    document.body.appendChild(modalDiv);
    
    const modal = new bootstrap.Modal(document.getElementById('examplesModal'));
    modal.show();
    
    // Remove modal after hiding
    document.getElementById('examplesModal').addEventListener('hidden.bs.modal', function() {
        modalDiv.remove();
    });
}

// Scroll to Input Section
function scrollToInput() {
    document.getElementById('classifier').scrollIntoView({ behavior: 'smooth' });
    elements.inputText.focus();
}

// Main Analysis Function
async function analyzeText() {
    const text = elements.inputText.value.trim();
    
    // Validation
    if (text.length < 50) {
        showAlert('Teks terlalu pendek. Minimal 50 karakter untuk analisis akurat.', 'warning');
        return;
    }
    
    if (text.length > 2000) {
        showAlert('Teks terlalu panjang. Maksimal 2000 karakter.', 'warning');
        return;
    }
    
    // Set loading state
    setLoadingState(true);
    
    try {
        let result;
        
        if (CONFIG.USE_LOCAL_API) {
            // Use our local API (recommended)
            result = await callLocalAPI(text);
        } else {
            // Direct Hugging Face call (NOT RECOMMENDED for production)
            result = await callHuggingFaceAPI(text);
        }
        
        // Process and display results
        displayResults(result);
        
        // Store in history
        appState.lastAnalysis = result;
        
    } catch (error) {
        console.error('Analysis error:', error);
        showAlert('Gagal menganalisis teks. Silakan coba lagi.', 'danger');
        
        // Fallback to mock data
        const mockResult = await generateMockPredictions(text);
        displayResults(mockResult);
        
    } finally {
        setLoadingState(false);
    }
}

// Call Local API
async function callLocalAPI(text) {
    const startTime = Date.now();
    
    const response = await fetch(CONFIG.API_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            text: text,
            sensitivity: appState.sensitivity
        })
    });
    
    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    const analysisTime = (Date.now() - startTime) / 1000;
    
    return {
        ...data,
        analysis_time: analysisTime
    };
}

// Direct Hugging Face API Call (Fallback)
async function callHuggingFaceAPI(text) {
    // NOTE: This exposes your API key in client-side code!
    // Only use for development or if you have proper security measures
    
    const API_KEY = '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';
    
    const response = await fetch(CONFIG.HUGGINGFACE_ENDPOINT, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ inputs: text })
    });
    
    if (!response.ok) {
        throw new Error(`Hugging Face API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Process Hugging Face response format
    return processHuggingFaceResponse(data, text);
}

// Process Hugging Face Response
function processHuggingFaceResponse(apiData, text) {
    // Hugging Face returns labels like LABEL_0, LABEL_1, etc.
    const labelMap = {
        "LABEL_0": "Normal",
        "LABEL_1": "Anxiety",
        "LABEL_2": "Depression",
        "LABEL_3": "Bipolar",
        "LABEL_4": "Suicidal"
    };
    
    const predictions = apiData[0].map(item => ({
        label: labelMap[item.label] || item.label,
        score: item.score,
        percentage: Math.round(item.score * 10000) / 100
    })).sort((a, b) => b.score - a.score);
    
    // Analyze text for indicators
    const analysis = analyzeTextIndicators(text);
    
    return {
        success: true,
        predictions: predictions,
        text_analysis: analysis,
        analysis_time: 1.5 // Mock time
    };
}

// Generate Mock Predictions (Fallback)
async function generateMockPredictions(text) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const textLower = text.toLowerCase();
    const analysis = analyzeTextIndicators(textLower);
    
    // Calculate scores based on text analysis
    let scores = {
        "Normal": 0.3 + (analysis.normal_indicators * 0.05),
        "Anxiety": 0.2 + (analysis.anxiety_indicators * 0.08),
        "Depression": 0.2 + (analysis.depression_indicators * 0.08),
        "Bipolar": 0.15 + (analysis.bipolar_indicators * 0.05),
        "Suicidal": 0.15 + (analysis.suicidal_indicators * 0.1)
    };
    
    // Apply sensitivity settings
    scores.Normal *= (1 + appState.sensitivity.normal);
    
    // Normalize to sum to 1
    const total = Object.values(scores).reduce((a, b) => a + b, 0);
    Object.keys(scores).forEach(key => {
        scores[key] = scores[key] / total;
    });
    
    // Convert to prediction format
    const predictions = CONFIG.LABELS.map(label => ({
        label: label,
        score: scores[label],
        percentage: Math.round(scores[label] * 10000) / 100
    })).sort((a, b) => b.score - a.score);
    
    return {
        success: true,
        predictions: predictions,
        text_analysis: analysis,
        analysis_time: 0.8,
        is_mock: true
    };
}

// Analyze Text for Indicators
function analyzeTextIndicators(text) {
    const textLower = text.toLowerCase();
    let analysis = {
        normal_indicators: 0,
        anxiety_indicators: 0,
        depression_indicators: 0,
        bipolar_indicators: 0,
        suicidal_indicators: 0,
        total_emotion_words: 0
    };
    
    // Check for each label's keywords
    for (const [label, info] of Object.entries(CONFIG.LABEL_INFO)) {
        for (const keyword of info.keywords) {
            if (textLower.includes(keyword)) {
                analysis[`${label.toLowerCase()}_indicators`]++;
                analysis.total_emotion_words++;
            }
        }
    }
    
    // Additional text analysis
    analysis.text_length = text.length;
    analysis.has_positive_words = (textLower.includes('baik') || textLower.includes('senang') || textLower.includes('bahagia'));
    analysis.has_negative_words = (textLower.includes('tidak') || textLower.includes('susah') || textLower.includes('sulit'));
    
    return analysis;
}

// Set Loading State
function setLoadingState(isLoading) {
    appState.isAnalyzing = isLoading;
    
    if (isLoading) {
        // Show loading state
        elements.loadingState.style.display = 'block';
        elements.resultsContainer.style.opacity = '0.5';
        elements.analyzeBtn.disabled = true;
        elements.analyzeBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i> Menganalisis...';
        
        // Hide results
        elements.topPrediction.style.display = 'none';
        elements.allPredictions.style.display = 'none';
        elements.emptyState.style.display = 'none';
    } else {
        // Hide loading state
        elements.loadingState.style.display = 'none';
        elements.resultsContainer.style.opacity = '1';
        updateAnalyzeButton();
        elements.analyzeBtn.innerHTML = '<i class="bi bi-play-circle me-2"></i> Analisis Teks';
    }
}

// Display Results
function displayResults(result) {
    const predictions = result.predictions;
    const textAnalysis = result.text_analysis;
    const topPrediction = predictions[0];
    
    // Hide empty state
    elements.emptyState.style.display = 'none';
    
    // Display top prediction
    displayTopPrediction(topPrediction);
    
    // Display all predictions
    displayAllPredictions(predictions);
    
    // Display text analysis
    displayTextAnalysis(textAnalysis);
    
    // Show elements
    elements.topPrediction.style.display = 'block';
    elements.allPredictions.style.display = 'block';
}

// Display Top Prediction
function displayTopPrediction(prediction) {
    const info = CONFIG.LABEL_INFO[prediction.label];
    
    // Set icon
    elements.topPredictionIcon.className = `prediction-icon ${prediction.label.toLowerCase()} bi ${info.icon}`;
    
    // Set label
    elements.topPredictionLabel.textContent = prediction.label;
    elements.topPredictionLabel.className = `text-${info.color} fw-bold`;
    
    // Set progress bar
    elements.topPredictionBar.className = `progress-bar bg-${info.color}`;
    elements.topPredictionBar.style.width = `${prediction.percentage}%`;
    elements.topPredictionBar.setAttribute('aria-valuenow', prediction.percentage);
    elements.topPredictionBar.textContent = `${prediction.percentage}%`;
    
    // Set percentage
    elements.topPredictionPercent.textContent = `${prediction.percentage}%`;
    elements.topPredictionPercent.className = `text-${info.color} fw-bold`;
    
    // Set description
    elements.topPredictionDesc.textContent = info.description;
}

// Display All Predictions
function displayAllPredictions(predictions) {
    elements.predictionsList.innerHTML = '';
    
    predictions.forEach((pred, index) => {
        const info = CONFIG.LABEL_INFO[pred.label];
        const isTop = index === 0;
        
        const predElement = document.createElement('div');
        predElement.className = `prediction-item mb-3 p-3 rounded ${isTop ? 'border border-2' : 'border'}`;
        predElement.style.borderColor = `var(--${info.color})`;
        predElement.style.background = isTop ? `${info.bgColor}10` : 'transparent';
        
        predElement.innerHTML = `
            <div class="row align-items-center">
                <div class="col-1">
                    <span class="badge bg-${info.color}">${index + 1}</span>
                </div>
                <div class="col-3">
                    <div class="d-flex align-items-center">
                        <i class="bi ${info.icon} text-${info.color} fs-4 me-2"></i>
                        <strong class="text-${info.color}">${pred.label}</strong>
                    </div>
                </div>
                <div class="col-5">
                    <div class="progress" style="height: 10px;">
                        <div class="progress-bar bg-${info.color}" 
                             style="width: ${pred.percentage}%"
                             role="progressbar">
                        </div>
                    </div>
                </div>
                <div class="col-3 text-end">
                    <span class="fw-bold fs-5 text-${info.color}">${pred.percentage}%</span>
                    <br>
                    <small class="text-muted">${pred.score.toFixed(4)}</small>
                </div>
            </div>
        `;
        
        elements.predictionsList.appendChild(predElement);
    });
}

// Display Text Analysis
function displayTextAnalysis(analysis) {
    elements.normalIndicators.textContent = analysis.normal_indicators;
    elements.emotionWords.textContent = analysis.total_emotion_words;
}

// Show Alert
function showAlert(message, type = 'info') {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.custom-alert');
    existingAlerts.forEach(alert => alert.remove());
    
    // Create alert
    const alert = document.createElement('div');
    alert.className = `custom-alert alert alert-${type} alert-dismissible fade show position-fixed`;
    alert.style.cssText = `
        top: 20px;
        right: 20px;
        z-index: 9999;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    alert.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="bi ${type === 'success' ? 'bi-check-circle' : type === 'warning' ? 'bi-exclamation-triangle' : 'bi-info-circle'} me-2 fs-4"></i>
            <div>${message}</div>
        </div>
        <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
    `;
    
    document.body.appendChild(alert);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, 5000);
}

// Show API Status
function showApiStatus() {
    const status = appState.modelReady ? 'connected' : 'loading';
    const message = appState.modelReady ? 
        'API terhubung dan siap digunakan' : 
        'Sedang memuat model...';
    
    showAlert(`Status: ${message}`, status === 'connected' ? 'success' : 'warning');
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initApp);