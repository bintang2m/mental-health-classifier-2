/**
 * Mental Health Classifier Frontend
 * Real-time integration with Hugging Face API
 */

const CONFIG = {
    API_URL: '/api/predict',
    MODEL_NAME: 'B1NT4N9/roberta-mental-health-id',
    
    LABELS: ["Normal", "Anxiety", "Depression", "Bipolar", "Suicidal"],
    
    LABEL_CONFIG: {
        "Normal": {
            icon: "bi-emoji-smile",
            color: "success",
            description: "Kondisi mental stabil dan sehat",
            emoji: "😊"
        },
        "Anxiety": {
            icon: "bi-emoji-expressionless",
            color: "warning",
            description: "Indikasi kecemasan atau kekhawatiran",
            emoji: "😟"
        },
        "Depression": {
            icon: "bi-emoji-frown",
            color: "danger",
            description: "Tanda-tanda depresi atau kesedihan",
            emoji: "😔"
        },
        "Bipolar": {
            icon: "bi-emoji-dizzy",
            color: "info",
            description: "Fluktuasi mood yang signifikan",
            emoji: "😵"
        },
        "Suicidal": {
            icon: "bi-emoji-angry",
            color: "dark",
            description: "Pemikiran atau isyarat bunuh diri",
            emoji: "😠"
        }
    }
};

// Application state
let state = {
    apiConnected: false,
    isProcessing: false,
    lastResult: null,
    retryCount: 0
};

// DOM elements
const dom = {
    // Status
    statusBadge: document.getElementById('statusBadge'),
    connectionStatus: document.getElementById('connectionStatus'),
    
    // Input
    inputText: document.getElementById('inputText'),
    analyzeBtn: document.getElementById('analyzeBtn'),
    charCount: document.getElementById('charCount'),
    
    // Results
    loadingState: document.getElementById('loadingState'),
    resultsContainer: document.getElementById('resultsContainer'),
    emptyState: document.getElementById('emptyState'),
    topResult: document.getElementById('topResult'),
    allResults: document.getElementById('allResults'),
    
    // Prediction displays
    topLabel: document.getElementById('topLabel'),
    topPercent: document.getElementById('topPercent'),
    topBar: document.getElementById('topBar'),
    topDesc: document.getElementById('topDesc'),
    predictionsList: document.getElementById('predictionsList'),
    
    // Info
    modelInfo: document.getElementById('modelInfo'),
    processingTime: document.getElementById('processingTime')
};

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    console.log('🧠 Mental Health Classifier Initializing...');
    
    setupEventListeners();
    updateCharCount();
    checkApiConnection();
    
    // Set default model info
    dom.modelInfo.textContent = CONFIG.MODEL_NAME;
    
    console.log('✅ Frontend initialized');
});

// Check API connection
async function checkApiConnection() {
    try {
        updateStatus('checking', 'Connecting to AI Model...');
        
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ test: true })
        });
        
        if (response.ok) {
            const data = await response.json();
            state.apiConnected = true;
            state.retryCount = 0;
            
            updateStatus('connected', 'AI Model Ready');
            
            console.log('✅ API connected:', data);
            showNotification('Model AI terhubung dan siap digunakan', 'success');
            
        } else {
            throw new Error('API not responding');
        }
        
    } catch (error) {
        console.warn('⚠️ API connection failed:', error);
        state.apiConnected = false;
        
        updateStatus('offline', 'Using Local Analysis');
        
        showNotification(
            'Menggunakan analisis lokal (AI Model sedang dimuat)',
            'warning'
        );
        
        // Auto retry after 10 seconds
        setTimeout(checkApiConnection, 10000);
    }
}

// Update status display
function updateStatus(status, message) {
    const badge = dom.statusBadge;
    const connection = dom.connectionStatus;
    
    switch(status) {
        case 'checking':
            badge.innerHTML = `<span class="badge bg-warning">
                <i class="bi bi-hourglass-split"></i> ${message}
            </span>`;
            connection.innerHTML = `<span class="badge bg-secondary">
                <i class="bi bi-wifi"></i> Connecting...
            </span>`;
            break;
            
        case 'connected':
            badge.innerHTML = `<span class="badge bg-success">
                <i class="bi bi-check-circle"></i> ${message}
            </span>`;
            connection.innerHTML = `<span class="badge bg-success">
                <i class="bi bi-wifi"></i> Online
            </span>`;
            break;
            
        case 'offline':
            badge.innerHTML = `<span class="badge bg-warning">
                <i class="bi bi-pc-display"></i> ${message}
            </span>`;
            connection.innerHTML = `<span class="badge bg-secondary">
                <i class="bi bi-wifi-off"></i> Local Mode
            </span>`;
            break;
            
        case 'error':
            badge.innerHTML = `<span class="badge bg-danger">
                <i class="bi bi-exclamation-triangle"></i> ${message}
            </span>`;
            break;
    }
}

// Setup event listeners
function setupEventListeners() {
    // Text input
    dom.inputText.addEventListener('input', updateCharCount);
    
    // Analyze button
    dom.analyzeBtn.addEventListener('click', analyzeText);
    
    // Enter key support
    dom.inputText.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey && !state.isProcessing) {
            e.preventDefault();
            analyzeText();
        }
    });
}

// Update character count
function updateCharCount() {
    const text = dom.inputText.value;
    const count = text.length;
    dom.charCount.textContent = count;
    
    // Enable/disable button
    dom.analyzeBtn.disabled = count < 10 || state.isProcessing;
    
    // Update button text based on connection
    if (state.apiConnected) {
        dom.analyzeBtn.innerHTML = `<i class="bi bi-robot"></i> Analyze with AI Model`;
    } else {
        dom.analyzeBtn.innerHTML = `<i class="bi bi-cpu"></i> Analyze Locally`;
    }
}

// Load example text
function loadExample(type) {
    const examples = {
        normal: "Hari ini adalah hari yang indah. Saya bangun dengan perasaan segar dan bersemangat. Berhasil menyelesaikan semua tugas kerja tepat waktu, dan nanti malam akan berkumpul dengan keluarga. Semua berjalan dengan baik.",
        
        anxiety: "Saya tidak bisa berhenti merasa cemas tentang masa depan. Pikiran terus menerus memikirkan hal-hal buruk yang mungkin terjadi. Jantung berdebar-debar setiap kali memikirkan presentasi besok. Rasanya seperti ada yang mengikat dada saya.",
        
        depression: "Sudah beberapa minggu ini rasanya semua warna telah memudar dari hidup saya. Tidak ada yang membawa kebahagiaan lagi. Setiap bangun pagi terasa seperti beban berat. Hanya ingin tidur dan tidak bangun lagi.",
        
        bipolar: "Kadang saya merasa seperti superman - penuh energi, ide-ide brilian, bisa bekerja 48 jam tanpa tidur. Tapi kemudian tiba-tiba jatuh ke lubang yang dalam. Marah tanpa alasan, menangis tanpa sebab. Seperti ada dua orang berbeda dalam diri saya.",
        
        suicidal: "Saya lelah dengan semua ini. Setiap hari adalah penderitaan yang sama. Terkadang berpikir, apa gunanya terus bertahan? Mungkin lebih baik mengakhiri semuanya. Tidak ada yang akan merindukan saya."
    };
    
    dom.inputText.value = examples[type] || examples.normal;
    updateCharCount();
    dom.inputText.focus();
}

// Main analysis function
async function analyzeText() {
    const text = dom.inputText.value.trim();
    
    // Validation
    if (text.length < 10) {
        showNotification('Teks terlalu pendek. Minimal 10 karakter.', 'warning');
        return;
    }
    
    if (text.length > 2000) {
        showNotification('Teks terlalu panjang. Maksimal 2000 karakter.', 'warning');
        return;
    }
    
    // Set processing state
    setProcessing(true);
    
    try {
        const startTime = Date.now();
        
        // Call our API
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: text })
        });
        
        const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
        dom.processingTime.textContent = `${processingTime}s`;
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success && !data.fallback) {
            throw new Error('Analysis failed');
        }
        
        // Display results
        displayResults(data.predictions, data.fallback || false);
        
        // Show success notification
        if (data.fallback) {
            showNotification('Menggunakan analisis lokal (AI Model sedang dimuat)', 'info');
        } else {
            showNotification('Analisis AI berhasil!', 'success');
        }
        
        // Reset retry count on success
        state.retryCount = 0;
        
    } catch (error) {
        console.error('Analysis error:', error);
        state.retryCount++;
        
        // Use local fallback
        const fallbackPredictions = generateLocalPredictions(text);
        displayResults(fallbackPredictions, true);
        
        showNotification('Menggunakan analisis lokal', 'warning');
        
        // Auto-retry connection
        if (state.retryCount < 3) {
            setTimeout(checkApiConnection, 5000);
        }
        
    } finally {
        setProcessing(false);
    }
}

// Display results
function displayResults(predictions, isFallback = false) {
    // Hide empty state
    dom.emptyState.style.display = 'none';
    
    // Get top prediction
    const topPrediction = predictions[0];
    const config = CONFIG.LABEL_CONFIG[topPrediction.label] || CONFIG.LABEL_CONFIG.Normal;
    
    // Update top result
    dom.topLabel.textContent = topPrediction.label;
    dom.topLabel.className = `text-${config.color} fw-bold`;
    dom.topPercent.textContent = `${topPrediction.percentage}%`;
    dom.topBar.className = `progress-bar bg-${config.color}`;
    dom.topBar.style.width = `${topPrediction.percentage}%`;
    dom.topDesc.textContent = config.description;
    
    dom.topResult.style.display = 'block';
    
    // Update all predictions
    displayAllPredictions(predictions);
    dom.allResults.style.display = 'block';
    
    // Add fallback indicator
    if (isFallback) {
        dom.resultsContainer.insertAdjacentHTML('beforeend',
            `<div class="alert alert-info mt-3">
                <i class="bi bi-info-circle"></i>
                <small>Menggunakan analisis lokal. AI Model akan aktif secara otomatis.</small>
            </div>`
        );
    }
}

// Display all predictions
function displayAllPredictions(predictions) {
    dom.predictionsList.innerHTML = '';
    
    predictions.forEach((pred, index) => {
        const config = CONFIG.LABEL_CONFIG[pred.label] || CONFIG.LABEL_CONFIG.Normal;
        const isTop = index === 0;
        
        const predictionElement = document.createElement('div');
        predictionElement.className = `prediction-item ${isTop ? 'border-primary' : ''} mb-2 p-3 rounded`;
        predictionElement.style.borderLeft = `4px solid var(--bs-${config.color})`;
        predictionElement.style.background = isTop ? `var(--bs-${config.color}-bg-subtle)` : 'white';
        
        predictionElement.innerHTML = `
            <div class="row align-items-center">
                <div class="col-1">
                    <span class="badge bg-${config.color}">${index + 1}</span>
                </div>
                <div class="col-3">
                    <div class="d-flex align-items-center">
                        <i class="bi ${config.icon} text-${config.color} fs-5 me-2"></i>
                        <strong>${pred.label}</strong>
                    </div>
                </div>
                <div class="col-5">
                    <div class="progress" style="height: 10px;">
                        <div class="progress-bar bg-${config.color}" 
                             style="width: ${pred.percentage}%">
                        </div>
                    </div>
                </div>
                <div class="col-3 text-end">
                    <span class="fw-bold fs-5">${pred.percentage}%</span>
                    <br>
                    <small class="text-muted">confidence: ${pred.confidence || 'medium'}</small>
                </div>
            </div>
        `;
        
        dom.predictionsList.appendChild(predictionElement);
    });
}

// Local fallback prediction generator
function generateLocalPredictions(text) {
    const textLower = text.toLowerCase();
    
    // Simple keyword matching
    const keywordScores = {
        "Normal": { words: ['baik', 'senang', 'bahagia', 'puas', 'normal'], score: 0.4 },
        "Anxiety": { words: ['cemas', 'khawatir', 'takut', 'gelisah'], score: 0.2 },
        "Depression": { words: ['sedih', 'depresi', 'putus asa', 'hampa'], score: 0.2 },
        "Bipolar": { words: ['naik turun', 'mood swing', 'euforia'], score: 0.1 },
        "Suicidal": { words: ['mati', 'bunuh diri', 'ending'], score: 0.1 }
    };
    
    // Calculate scores
    let scores = {};
    Object.entries(keywordScores).forEach(([label, config]) => {
        let baseScore = config.score;
        config.words.forEach(word => {
            if (textLower.includes(word)) {
                baseScore += 0.1;
            }
        });
        scores[label] = baseScore;
    });
    
    // Normalize
    const total = Object.values(scores).reduce((a, b) => a + b, 0);
    
    return Object.entries(scores).map(([label, score]) => ({
        label: label,
        score: score / total,
        percentage: Math.round((score / total) * 10000) / 100,
        confidence: 'medium',
        is_fallback: true
    })).sort((a, b) => b.score - a.score);
}

// Set processing state
function setProcessing(isProcessing) {
    state.isProcessing = isProcessing;
    
    if (isProcessing) {
        dom.loadingState.style.display = 'block';
        dom.resultsContainer.style.opacity = '0.5';
        dom.analyzeBtn.disabled = true;
        dom.analyzeBtn.innerHTML = `<i class="bi bi-hourglass-split"></i> Processing...`;
    } else {
        dom.loadingState.style.display = 'none';
        dom.resultsContainer.style.opacity = '1';
        updateCharCount();
        dom.analyzeBtn.innerHTML = state.apiConnected ? 
            `<i class="bi bi-robot"></i> Analyze with AI` : 
            `<i class="bi bi-cpu"></i> Analyze Locally`;
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existing = document.querySelector('.custom-notification');
    if (existing) existing.remove();
    
    // Create notification
    const notification = document.createElement('div');
    notification.className = `custom-notification alert alert-${type} alert-dismissible fade show`;
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        z-index: 9999;
        max-width: 350px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    const icon = type === 'success' ? 'bi-check-circle' :
                 type === 'warning' ? 'bi-exclamation-triangle' :
                 type === 'danger' ? 'bi-x-circle' : 'bi-info-circle';
    
    notification.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="bi ${icon} me-2 fs-5"></i>
            <div>${message}</div>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            const bsAlert = new bootstrap.Alert(notification);
            bsAlert.close();
        }
    }, 5000);
}

// Public functions
window.loadExample = loadExample;
window.analyzeText = analyzeText;