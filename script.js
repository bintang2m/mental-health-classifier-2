/**
 * Mental Health Classifier - 100% Browser Based
 * Tidak perlu API, tidak ada CORS issue
 * Semua processing di browser user
 */

// Configuration - Semua data di local
const CONFIG = {
    // Label klasifikasi
    LABELS: ["Normal", "Anxiety", "Depression", "Bipolar", "Suicidal"],
    
    // Informasi tiap label
    LABEL_INFO: {
        "Normal": {
            icon: "bi-emoji-smile",
            color: "success",
            bgColor: "#4cc9f0",
            description: "Teks menunjukkan keadaan mental yang stabil dan sehat.",
            keywords: ['baik', 'senang', 'bahagia', 'puas', 'normal', 'sehat', 'stabil', 'gembira', 'ceria']
        },
        "Anxiety": {
            icon: "bi-emoji-expressionless",
            color: "warning",
            bgColor: "#f8961e",
            description: "Terdapat indikasi kecemasan atau kekhawatiran berlebihan.",
            keywords: ['cemas', 'khawatir', 'takut', 'gelisah', 'panic', 'gugup', 'nervous', 'deg-degan', 'was-was']
        },
        "Depression": {
            icon: "bi-emoji-frown",
            color: "danger",
            bgColor: "#f72585",
            description: "Terdapat tanda-tanda depresi atau perasaan sedih mendalam.",
            keywords: ['sedih', 'depresi', 'putus asa', 'hampa', 'lelah', 'tidak berguna', 'malah', 'tertekan', 'murung']
        },
        "Bipolar": {
            icon: "bi-emoji-dizzy",
            color: "info",
            bgColor: "#7209b7",
            description: "Terdapat fluktuasi mood yang signifikan.",
            keywords: ['naik turun', 'mood swing', 'euforia', 'marah', 'impulsif', 'berubah-ubah', 'ekstrim', 'meledak']
        },
        "Suicidal": {
            icon: "bi-emoji-angry",
            color: "dark",
            bgColor: "#212529",
            description: "Terdapat pemikiran atau isyarat tentang bunuh diri.",
            keywords: ['mati', 'bunuh diri', 'ending', 'habis', 'sakit hati', 'putus asa total', 'mengakhiri']
        }
    },
    
    // Positive words yang meningkatkan skor Normal
    POSITIVE_WORDS: [
        'bahagia', 'senang', 'gembira', 'ceria', 'puas', 'bangga', 
        'bersemangat', 'optimis', 'baik', 'hebat', 'luar biasa',
        'terima kasih', 'syukur', 'bersyukur', 'alhamdulillah'
    ],
    
    // Negative words yang menurunkan skor Normal
    NEGATIVE_WORDS: [
        'sedih', 'kecewa', 'marah', 'kesal', 'frustasi', 'stress',
        'tertekan', 'lelah', 'capek', 'bosan', 'jenuh', 'kesepian'
    ]
};

// Global State
let currentSensitivity = 5; // 1-10

// DOM Elements
const elements = {
    inputText: document.getElementById('inputText'),
    analyzeBtn: document.getElementById('analyzeBtn'),
    charCount: document.getElementById('charCount'),
    sensitivitySlider: document.getElementById('sensitivitySlider'),
    sensitivityValue: document.getElementById('sensitivityValue'),
    loadingIndicator: document.getElementById('loadingIndicator'),
    resultsArea: document.getElementById('resultsArea'),
    topResult: document.getElementById('topResult'),
    allResults: document.getElementById('allResults'),
    emptyState: document.getElementById('emptyState'),
    topIcon: document.getElementById('topIcon'),
    topLabel: document.getElementById('topLabel'),
    topBar: document.getElementById('topBar'),
    topDesc: document.getElementById('topDesc'),
    resultsList: document.getElementById('resultsList'),
    statusBadge: document.getElementById('statusBadge'),
    modeIndicator: document.getElementById('modeIndicator')
};

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Mental Health Classifier Initialized');
    
    // Setup event listeners
    setupEventListeners();
    
    // Update initial UI
    updateCharCount();
    updateSensitivityValue();
    
    // Set mode indicator
    elements.modeIndicator.textContent = "Local Processing";
    elements.modeIndicator.className = "badge bg-success";
    
    // Set status
    elements.statusBadge.innerHTML = '<i class="bi bi-check-circle"></i> READY';
    elements.statusBadge.className = 'badge bg-success';
    
    console.log('✅ System ready - No API needed');
});

// Setup all event listeners
function setupEventListeners() {
    // Input text change
    elements.inputText.addEventListener('input', updateCharCount);
    
    // Sensitivity slider
    elements.sensitivitySlider.addEventListener('input', updateSensitivityValue);
    
    // Enter key to analyze
    elements.inputText.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            analyzeText();
        }
    });
}

// Update character count
function updateCharCount() {
    const text = elements.inputText.value;
    const count = text.length;
    elements.charCount.textContent = count;
    
    // Enable/disable button based on length
    elements.analyzeBtn.disabled = count < 10;
    
    // Color coding
    if (count < 10) {
        elements.charCount.style.color = '#dc3545';
    } else if (count < 50) {
        elements.charCount.style.color = '#fd7e14';
    } else {
        elements.charCount.style.color = '#198754';
    }
}

// Update sensitivity value display
function updateSensitivityValue() {
    currentSensitivity = parseInt(elements.sensitivitySlider.value);
    elements.sensitivityValue.textContent = currentSensitivity;
}

// Load example text
function loadExample(type) {
    const examples = {
        normal: "Hari ini saya merasa sangat bahagia. Pagi ini saya bangun dengan perasaan segar dan bersemangat. Saya berhasil menyelesaikan semua pekerjaan tepat waktu dan bahkan punya waktu untuk berolahraga. Malam ini saya akan makan malam bersama keluarga.",
        
        anxiety: "Saya tidak bisa berhenti merasa cemas tentang presentasi besok. Jantung saya berdebar-debar sejak pagi. Pikiran saya terus membayangkan semua hal buruk yang mungkin terjadi. Saya takut akan gagal dan dipermalukan di depan semua orang. Tidak bisa tidur semalaman.",
        
        depression: "Sudah dua minggu saya merasa sangat sedih dan hampa. Tidak ada yang membuat saya senang lagi. Saya hanya ingin tidur sepanjang hari. Rasanya hidup ini tidak ada artinya. Semua terasa berat dan melelahkan. Tidak punya energi untuk melakukan apapun."
    };
    
    elements.inputText.value = examples[type] || examples.normal;
    updateCharCount();
    elements.inputText.focus();
}

// Main analysis function - 100% in browser
function analyzeText() {
    const text = elements.inputText.value.trim();
    
    // Validation
    if (text.length < 10) {
        showAlert('Teks terlalu pendek. Minimal 10 karakter.', 'warning');
        return;
    }
    
    if (text.length > 1000) {
        showAlert('Teks terlalu panjang. Maksimal 1000 karakter.', 'warning');
        return;
    }
    
    // Show loading
    showLoading(true);
    
    // Simulate processing delay (bukan API call)
    setTimeout(() => {
        try {
            // Generate predictions locally
            const predictions = generatePredictions(text);
            
            // Display results
            displayResults(predictions);
            
            // Show success
            showAlert('Analisis berhasil!', 'success');
            
        } catch (error) {
            console.error('Analysis error:', error);
            showAlert('Terjadi kesalahan dalam analisis.', 'danger');
        } finally {
            // Hide loading
            showLoading(false);
        }
    }, 800); // Delay untuk efek loading
}

// Generate predictions locally (no API needed)
function generatePredictions(text) {
    const textLower = text.toLowerCase();
    
    // Base scores
    let scores = {
        "Normal": 0.4,    // Higher base for normal
        "Anxiety": 0.15,
        "Depression": 0.15,
        "Bipolar": 0.15,
        "Suicidal": 0.15
    };
    
    // Analyze text for each category
    for (const [label, info] of Object.entries(CONFIG.LABEL_INFO)) {
        let keywordCount = 0;
        
        // Count keyword matches
        info.keywords.forEach(keyword => {
            if (textLower.includes(keyword)) {
                keywordCount++;
            }
        });
        
        // Adjust score based on keywords found
        if (keywordCount > 0) {
            if (label === 'Normal') {
                scores[label] += keywordCount * 0.08;
            } else {
                scores[label] += keywordCount * 0.1;
            }
        }
    }
    
    // Check for positive/negative words
    let positiveCount = 0;
    let negativeCount = 0;
    
    CONFIG.POSITIVE_WORDS.forEach(word => {
        if (textLower.includes(word)) positiveCount++;
    });
    
    CONFIG.NEGATIVE_WORDS.forEach(word => {
        if (textLower.includes(word)) negativeCount++;
    });
    
    // Adjust based on sentiment
    if (positiveCount > negativeCount) {
        scores.Normal += positiveCount * 0.05;
    } else if (negativeCount > positiveCount) {
        scores.Normal -= negativeCount * 0.03;
        scores.Depression += negativeCount * 0.04;
        scores.Anxiety += negativeCount * 0.03;
    }
    
    // Apply sensitivity setting (1-10 scale to 0.1-2.0 multiplier)
    const sensitivityMultiplier = 0.1 + (currentSensitivity * 0.19); // 0.1 to 2.0
    scores.Normal *= sensitivityMultiplier;
    
    // Ensure no negative scores
    Object.keys(scores).forEach(key => {
        scores[key] = Math.max(0.01, scores[key]);
    });
    
    // Normalize to sum to 1
    const total = Object.values(scores).reduce((a, b) => a + b, 0);
    Object.keys(scores).forEach(key => {
        scores[key] = scores[key] / total;
    });
    
    // Convert to prediction objects
    const predictions = CONFIG.LABELS.map(label => ({
        label: label,
        score: scores[label],
        percentage: Math.round(scores[label] * 10000) / 100
    }));
    
    // Sort by score (descending)
    predictions.sort((a, b) => b.score - a.score);
    
    return predictions;
}

// Display results
function displayResults(predictions) {
    const topPrediction = predictions[0];
    const labelInfo = CONFIG.LABEL_INFO[topPrediction.label];
    
    // Hide empty state
    elements.emptyState.style.display = 'none';
    
    // Show top result
    elements.topIcon.className = `bi ${labelInfo.icon} display-4 text-${labelInfo.color}`;
    elements.topLabel.textContent = topPrediction.label;
    elements.topLabel.className = `fw-bold text-${labelInfo.color}`;
    elements.topBar.className = `progress-bar bg-${labelInfo.color}`;
    elements.topBar.style.width = `${topPrediction.percentage}%`;
    elements.topBar.textContent = `${topPrediction.percentage}%`;
    elements.topDesc.textContent = labelInfo.description;
    
    elements.topResult.style.display = 'block';
    
    // Show all results
    displayAllResults(predictions);
    elements.allResults.style.display = 'block';
}

// Display all predictions
function displayAllResults(predictions) {
    elements.resultsList.innerHTML = '';
    
    predictions.forEach((pred, index) => {
        const info = CONFIG.LABEL_INFO[pred.label];
        const isTop = index === 0;
        
        const item = document.createElement('div');
        item.className = `prediction-item ${pred.label.toLowerCase()} ${isTop ? 'border-primary' : ''}`;
        item.style.borderLeftColor = info.bgColor;
        
        if (isTop) {
            item.style.background = `${info.bgColor}15`;
        }
        
        item.innerHTML = `
            <div class="row align-items-center">
                <div class="col-2 text-center">
                    <i class="bi ${info.icon} fs-4 text-${info.color}"></i>
                </div>
                <div class="col-5">
                    <strong class="text-${info.color}">${pred.label}</strong>
                </div>
                <div class="col-3">
                    <div class="progress" style="height: 10px;">
                        <div class="progress-bar bg-${info.color}" 
                             style="width: ${pred.percentage}%">
                        </div>
                    </div>
                </div>
                <div class="col-2 text-end">
                    <span class="fw-bold">${pred.percentage}%</span>
                </div>
            </div>
        `;
        
        elements.resultsList.appendChild(item);
    });
}

// Show/hide loading indicator
function showLoading(show) {
    if (show) {
        elements.loadingIndicator.style.display = 'block';
        elements.resultsArea.style.opacity = '0.5';
        elements.analyzeBtn.disabled = true;
        elements.analyzeBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Processing...';
    } else {
        elements.loadingIndicator.style.display = 'none';
        elements.resultsArea.style.opacity = '1';
        elements.analyzeBtn.disabled = elements.inputText.value.length < 10;
        elements.analyzeBtn.innerHTML = '<i class="bi bi-play-circle"></i> Analisis Sekarang';
    }
}

// Show alert message
function showAlert(message, type = 'info') {
    // Remove existing alerts
    const existing = document.querySelector('.custom-alert');
    if (existing) existing.remove();
    
    // Create alert
    const alert = document.createElement('div');
    alert.className = `custom-alert alert alert-${type} alert-dismissible fade show position-fixed`;
    alert.style.cssText = `
        top: 70px;
        right: 20px;
        z-index: 9999;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    const icon = type === 'success' ? 'bi-check-circle' : 
                 type === 'warning' ? 'bi-exclamation-triangle' : 
                 'bi-info-circle';
    
    alert.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="bi ${icon} me-2"></i>
            <div>${message}</div>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alert);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (alert.parentNode) {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }
    }, 3000);
}

// Public functions
window.loadExample = loadExample;
window.analyzeText = analyzeText;
window.updateSensitivityValue = updateSensitivityValue;