// Complete Medicine Scanner System
class MedicineScanner {
    constructor() {
        this.medicineDatabase = [];
        this.scanHistory = JSON.parse(localStorage.getItem('medScanHistory')) || [];
        this.currentScan = null;
        this.ocrWorker = null;
        this.init();
    }

    async init() {
        console.log('Initializing Medicine Scanner...');
        
        // Load medicine database
        await this.loadMedicineDatabase();
        
        // Initialize OCR
        await this.initOCR();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Update UI with initial data
        this.updateDatabaseStats();
        this.updateScanHistory();
        this.updateQuickMedicines();
        
        console.log('Medicine Scanner initialized successfully');
        this.showToast('System ready. Upload a medicine image to begin.', 'info');
    }

   async loadMedicineDatabase() {
    try {
        const response = await fetch('/static/medicines.csv');
        const csvText = await response.text();

        const rows = csvText.split('\n').slice(1);
        this.medicineDatabase = rows.map((row, index) => {
            const cols = row.split(',');

            return {
                id: index + 1,
                name: cols[0],
                generic_name: cols[1],
                type: cols[2],
                dosage: cols[3],
                manufacturer: cols[4],
                composition: cols[5],
                prescription_required: cols[6] === 'true',

                uses: [],
                side_effects: { common: [], serious: [] },
                dosage_info: {
                    adult: '',
                    pediatric: '',
                    administration: ''
                },
                precautions: [],
                interactions: [],
                storage: '',
                pregnancy_category: 'N/A'
            };
        });

        console.log('CSV medicines loaded:', this.medicineDatabase.length);
    } catch (err) {
        console.error(err);
        this.showToast('Failed to load medicines.csv', 'error');
    }
}


        async initOCR() {
    try {
        this.ocrWorker = await Tesseract.createWorker({
            logger: m => console.log(m)
        });

        await this.ocrWorker.loadLanguage('eng');
        await this.ocrWorker.initialize('eng');

        console.log('OCR engine initialized successfully');
    } catch (error) {
        console.error('OCR init failed:', error);
        this.showToast('OCR initialization failed', 'error');
    }
}


    setupEventListeners() {
        // Upload buttons
        document.getElementById('cameraBtn').addEventListener('click', () => {
            document.getElementById('imageInput').setAttribute('capture', 'environment');
            document.getElementById('imageInput').click();
        });

        document.getElementById('browseBtn').addEventListener('click', () => {
            document.getElementById('imageInput').removeAttribute('capture');
            document.getElementById('imageInput').click();
        });

        document.getElementById('imageInput').addEventListener('change', (e) => {
            this.handleImageUpload(e.target.files[0]);
        });

        // Retake button
        document.getElementById('retakeBtn').addEventListener('click', () => {
            this.resetScanner();
        });

        // New scan button
        document.getElementById('newScanBtn').addEventListener('click', () => {
            this.resetScanner();
        });

        // Save report button
        document.getElementById('saveReportBtn').addEventListener('click', () => {
            this.saveReport();
        });

        // Print button
        document.getElementById('printBtn').addEventListener('click', () => {
            this.printReport();
        });

        // View database button
        document.getElementById('viewDbBtn').addEventListener('click', () => {
            this.showDatabaseModal();
        });

        // Close modal button
        document.getElementById('closeModalBtn').addEventListener('click', () => {
            this.hideDatabaseModal();
        });

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Medicine search
        document.getElementById('medicineSearch').addEventListener('input', (e) => {
            this.searchMedicines(e.target.value);
        });

        // Drag and drop for image upload
        const uploadArea = document.getElementById('uploadArea');
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = 'var(--primary-color)';
            uploadArea.style.background = 'rgba(37, 99, 235, 0.05)';
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.style.borderColor = 'var(--border-color)';
            uploadArea.style.background = 'white';
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = 'var(--border-color)';
            uploadArea.style.background = 'white';
            
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                this.handleImageUpload(file);
            } else {
                this.showToast('Please upload an image file', 'error');
            }
        });
    }

    async handleImageUpload(file) {
        if (!file) return;

        if (!this.ocrWorker) {
            this.showToast('OCR engine not ready. Please wait.', 'error');
            return;
        }

        // Show loading
        this.showLoading('Analyzing medicine image...', 10);

        try {
            // Create preview
            const imageUrl = URL.createObjectURL(file);
            const imagePreview = document.getElementById('imagePreview');
            const previewSection = document.getElementById('previewSection');
            
            imagePreview.src = imageUrl;
            previewSection.style.display = 'block';
            
            this.updateLoadingProgress(30, 'Processing image...');

            // Extract text using OCR
            const extractedText = await this.extractTextFromImage(file);
            this.currentScan = {
                file: file,
                imageUrl: imageUrl,
                extractedText: extractedText,
                timestamp: new Date().toISOString()
            };

            this.updateLoadingProgress(60, 'Matching with database...');

            // Display extracted text
            document.getElementById('extractedText').textContent = extractedText;

            // Find matching medicines
            const matches = this.findMedicineMatches(extractedText);
            
            if (matches.length === 0) {
                this.updateLoadingProgress(100, 'No matches found');
                this.showNoMatchResults();
                return;
            }

            this.updateLoadingProgress(80, 'Loading medicine information...');

            // Display best match
            const bestMatch = matches[0];
            this.displayMedicineInfo(bestMatch);

            // Add to scan history
            this.addToScanHistory(bestMatch, extractedText);
            
            this.updateLoadingProgress(100, 'Complete!');
            
            // Show results
            setTimeout(() => {
                this.hideLoading();
                document.getElementById('resultsCard').style.display = 'block';
                this.showToast(`Found ${matches.length} matching medicine(s)`, 'success');
            }, 500);

        } catch (error) {
            console.error('Image processing error:', error);
            this.hideLoading();
            this.showToast('Failed to process image. Please try again.', 'error');
        }
    }

  async extractTextFromImage(file) {
    try {
        const image = await file.arrayBuffer();
        const { data } = await this.ocrWorker.recognize(image);
        return data.text.toLowerCase().trim();
    } catch (err) {
        console.error(err);
        throw new Error('OCR failed');
    }
    }


    findMedicineMatches(extractedText) {
        const matches = [];
        const searchWords = extractedText.split(/\s+/);
        
        this.medicineDatabase.forEach(medicine => {
            let score = 0;
            let matchedKeywords = [];
            
            // Check medicine name (highest weight)
            if (medicine.name) {
                const nameWords = medicine.name.toLowerCase().split(/\s+/);
                const nameMatches = nameWords.filter(word => 
                    searchWords.some(searchWord => this.fuzzyMatch(searchWord, word))
                );
                
                if (nameMatches.length > 0) {
                    score += (nameMatches.length / nameWords.length) * 40;
                    matchedKeywords.push(...nameMatches);
                }
            }
            
            // Check generic name
            if (medicine.generic_name) {
                const genericWords = medicine.generic_name.toLowerCase().split(/\s+/);
                const genericMatches = genericWords.filter(word => 
                    searchWords.some(searchWord => this.fuzzyMatch(searchWord, word))
                );
                
                if (genericMatches.length > 0) {
                    score += (genericMatches.length / genericWords.length) * 30;
                    matchedKeywords.push(...genericMatches);
                }
            }
            
            // Check composition
            if (medicine.composition) {
                const compWords = medicine.composition.toLowerCase().split(/\s+/);
                const compMatches = compWords.filter(word => 
                    searchWords.some(searchWord => this.fuzzyMatch(searchWord, word))
                );
                
                if (compMatches.length > 0) {
                    score += (compMatches.length / compWords.length) * 20;
                    matchedKeywords.push(...compMatches);
                }
            }
            
            // Check type
            if (medicine.type) {
                const typeWords = medicine.type.toLowerCase().split(/\s+/);
                const typeMatches = typeWords.filter(word => 
                    searchWords.some(searchWord => this.fuzzyMatch(searchWord, word))
                );
                
                if (typeMatches.length > 0) {
                    score += 10;
                    matchedKeywords.push(...typeMatches);
                }
            }
            
            if (score > 20) { // Threshold for considering a match
                matches.push({
                    medicine: medicine,
                    score: Math.min(Math.round(score), 100),
                    matchedKeywords: [...new Set(matchedKeywords)], // Remove duplicates
                    matchStrength: this.getMatchStrength(score)
                });
            }
        });
        
        // Sort by score (highest first)
        return matches.sort((a, b) => b.score - a.score);
    }

    fuzzyMatch(str1, str2) {
        str1 = str1.toLowerCase();
        str2 = str2.toLowerCase();
        
        // Exact match
        if (str1 === str2) return true;
        
        // Contains match
        if (str1.includes(str2) || str2.includes(str1)) return true;
        
        // Remove special characters and compare
        const cleanStr1 = str1.replace(/[^a-z0-9]/g, '');
        const cleanStr2 = str2.replace(/[^a-z0-9]/g, '');
        
        if (cleanStr1 === cleanStr2) return true;
        if (cleanStr1.includes(cleanStr2) || cleanStr2.includes(cleanStr1)) return true;
        
        return false;
    }

    getMatchStrength(score) {
        if (score >= 80) return 'strong';
        if (score >= 50) return 'moderate';
        return 'weak';
    }

    displayMedicineInfo(match) {
        const medicine = match.medicine;
        
        // Update medicine header
        document.getElementById('medicineName').textContent = medicine.name;
        document.getElementById('medicineType').innerHTML = `<i class="fas fa-tag"></i> ${medicine.type}`;
        document.getElementById('medicineDosage').innerHTML = `<i class="fas fa-weight"></i> ${medicine.dosage}`;
        document.getElementById('medicineManufacturer').innerHTML = `<i class="fas fa-industry"></i> ${medicine.manufacturer}`;
        
        // Update match badge
        const matchBadge = document.getElementById('matchBadge');
        matchBadge.innerHTML = `<span>${match.matchStrength.toUpperCase()} MATCH (${match.score}%)</span>`;
        matchBadge.style.background = match.score >= 80 ? '#d1fae5' : 
                                      match.score >= 50 ? '#fef3c7' : '#fee2e2';
        matchBadge.style.color = match.score >= 80 ? '#065f46' : 
                                 match.score >= 50 ? '#92400e' : '#991b1b';
        
        // Update tabs content
        this.updateUsesTab(medicine);
        this.updateSideEffectsTab(medicine);
        this.updateDosageTab(medicine);
        this.updatePrecautionsTab(medicine);
        this.updateInteractionsTab(medicine);
        
        // Update prescription information
        document.getElementById('prescriptionRequired').textContent = 
            medicine.prescription_required ? 'Yes' : 'No';
        document.getElementById('storageConditions').textContent = medicine.storage;
        document.getElementById('pregnancyCategory').textContent = medicine.pregnancy_category;
        
        // Update analysis details
        document.getElementById('confidenceScore').textContent = `${match.score}%`;
        document.getElementById('confidenceBar').style.width = `${match.score}%`;
        document.getElementById('databaseMatch').textContent = `${match.matchedKeywords.length} keywords matched`;
        document.getElementById('processingTime').textContent = '2-3s';
        
        // Switch to uses tab
        this.switchTab('uses');
    }

    updateUsesTab(medicine) {
        const usesContent = document.getElementById('usesContent');
        usesContent.innerHTML = '';
        
        medicine.uses.forEach(use => {
            const div = document.createElement('div');
            div.className = 'info-item';
            div.innerHTML = `
                <i class="fas fa-check-circle"></i>
                <span>${use}</span>
            `;
            usesContent.appendChild(div);
        });
    }

    updateSideEffectsTab(medicine) {
        const commonEffects = document.getElementById('commonEffects');
        const seriousEffects = document.getElementById('seriousEffects');
        
        commonEffects.innerHTML = '';
        seriousEffects.innerHTML = '';
        
        medicine.side_effects.common.forEach(effect => {
            const div = document.createElement('div');
            div.style.borderLeftColor = 'var(--warning-color)';
            div.textContent = effect;
            commonEffects.appendChild(div);
        });
        
        medicine.side_effects.serious.forEach(effect => {
            const div = document.createElement('div');
            div.style.borderLeftColor = 'var(--danger-color)';
            div.textContent = effect;
            seriousEffects.appendChild(div);
        });
    }

    updateDosageTab(medicine) {
        document.getElementById('adultDosage').textContent = medicine.dosage_info.adult;
        document.getElementById('pediatricDosage').textContent = medicine.dosage_info.pediatric;
        document.getElementById('administrationInfo').textContent = medicine.dosage_info.administration;
    }

    updatePrecautionsTab(medicine) {
        const precautionsList = document.getElementById('precautionsList');
        precautionsList.innerHTML = '';
        
        medicine.precautions.forEach(precaution => {
            const div = document.createElement('div');
            div.innerHTML = `
                <i class="fas fa-exclamation-circle"></i>
                <span>${precaution}</span>
            `;
            precautionsList.appendChild(div);
        });
    }

    updateInteractionsTab(medicine) {
        const interactionsList = document.getElementById('interactionsList');
        interactionsList.innerHTML = '';
        
        medicine.interactions.forEach(interaction => {
            const div = document.createElement('div');
            div.className = 'interaction-item';
            div.innerHTML = `
                <div class="interaction-name">${interaction.drug}</div>
                <div class="interaction-effect">${interaction.effect}</div>
            `;
            interactionsList.appendChild(div);
        });
    }

    switchTab(tabName) {
        // Remove active class from all tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        
        // Add active class to selected tab
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}Tab`).classList.add('active');
    }

    showNoMatchResults() {
        // Update medicine header with generic info
        document.getElementById('medicineName').textContent = 'No Match Found';
        document.getElementById('medicineType').innerHTML = '<i class="fas fa-tag"></i> Unknown';
        document.getElementById('medicineDosage').innerHTML = '<i class="fas fa-weight"></i> N/A';
        document.getElementById('medicineManufacturer').innerHTML = '<i class="fas fa-industry"></i> Unknown';
        
        // Update match badge
        const matchBadge = document.getElementById('matchBadge');
        matchBadge.innerHTML = '<span>NO MATCH FOUND</span>';
        matchBadge.style.background = '#fee2e2';
        matchBadge.style.color = '#991b1b';
        
        // Clear all tabs
        document.getElementById('usesContent').innerHTML = `
            <div class="info-item">
                <i class="fas fa-exclamation-circle"></i>
                <span>No matching medicine found in database. Try taking a clearer photo of the medicine name.</span>
            </div>
        `;
        
        // Show results card
        setTimeout(() => {
            this.hideLoading();
            document.getElementById('resultsCard').style.display = 'block';
            this.showToast('No matching medicine found. Please try again.', 'warning');
        }, 500);
    }

    addToScanHistory(match, extractedText) {
        const historyItem = {
            id: Date.now(),
            medicineName: match.medicine.name,
            matchScore: match.score,
            timestamp: new Date().toISOString(),
            extractedText: extractedText.substring(0, 100) + '...'
        };
        
        this.scanHistory.unshift(historyItem);
        
        // Keep only last 10 scans
        if (this.scanHistory.length > 10) {
            this.scanHistory = this.scanHistory.slice(0, 10);
        }
        
        // Save to localStorage
        localStorage.setItem('medScanHistory', JSON.stringify(this.scanHistory));
        
        // Update history display
        this.updateScanHistory();
    }

    updateScanHistory() {
        const historyList = document.getElementById('scanHistory');
        const scanCount = document.getElementById('scanCount');
        
        scanCount.textContent = this.scanHistory.length;
        
        if (this.scanHistory.length === 0) {
            historyList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-camera"></i>
                    <p>No scans yet. Upload a medicine image to begin.</p>
                </div>
            `;
            return;
        }
        
        let historyHTML = '';
        this.scanHistory.forEach(scan => {
            const time = new Date(scan.timestamp).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
            historyHTML += `
                <div class="medicine-item" onclick="window.scanner.viewHistoryScan(${scan.id})">
                    <div>
                        <div class="medicine-name">${scan.medicineName}</div>
                        <div style="font-size: 0.8rem; color: var(--gray-color);">
                            Scanned at ${time}
                        </div>
                    </div>
                    <div class="medicine-type" style="background: ${scan.matchScore >= 80 ? '#d1fae5' : '#fef3c7'}; color: ${scan.matchScore >= 80 ? '#065f46' : '#92400e'}">
                        ${scan.matchScore}%
                    </div>
                </div>
            `;
        });
        
        historyList.innerHTML = historyHTML;
    }

    viewHistoryScan(scanId) {
        const scan = this.scanHistory.find(s => s.id === scanId);
        if (scan) {
            // Find the medicine in database
            const medicine = this.medicineDatabase.find(m => m.name === scan.medicineName);
            if (medicine) {
                const match = {
                    medicine: medicine,
                    score: scan.matchScore,
                    matchStrength: this.getMatchStrength(scan.matchScore)
                };
                
                this.displayMedicineInfo(match);
                document.getElementById('resultsCard').style.display = 'block';
                
                // Show extracted text
                document.getElementById('extractedText').textContent = scan.extractedText;
                
                this.showToast(`Loaded scan from history`, 'info');
            }
        }
    }

    updateDatabaseStats() {
        const totalMedicines = document.getElementById('totalMedicines');
        const totalManufacturers = document.getElementById('totalManufacturers');
        const medicineTypes = document.getElementById('medicineTypes');
        const dbCount = document.getElementById('dbCount');
        const medicineCount = document.getElementById('medicineCount');
        
        const uniqueManufacturers = [...new Set(this.medicineDatabase.map(m => m.manufacturer))];
        const uniqueTypes = [...new Set(this.medicineDatabase.map(m => m.type))];
        
        totalMedicines.textContent = this.medicineDatabase.length;
        totalManufacturers.textContent = uniqueManufacturers.length;
        medicineTypes.textContent = uniqueTypes.length;
        dbCount.textContent = `${this.medicineDatabase.length} medicines`;
        medicineCount.textContent = `${this.medicineDatabase.length} medicines`;
    }

    updateQuickMedicines() {
        const quickList = document.getElementById('quickMedicineList');
        
        // Show first 5 medicines as quick access
        const quickMedicines = this.medicineDatabase.slice(0, 5);
        
        let html = '';
        quickMedicines.forEach(medicine => {
            html += `
                <div class="medicine-item" onclick="window.scanner.selectQuickMedicine(${medicine.id})">
                    <div class="medicine-name">${medicine.name}</div>
                    <div class="medicine-type">${medicine.type.split(' ')[0]}</div>
                </div>
            `;
        });
        
        quickList.innerHTML = html;
    }

    selectQuickMedicine(medicineId) {
        const medicine = this.medicineDatabase.find(m => m.id === medicineId);
        if (medicine) {
            const match = {
                medicine: medicine,
                score: 95,
                matchStrength: 'strong'
            };
            
            this.displayMedicineInfo(match);
            document.getElementById('resultsCard').style.display = 'block';
            
            // Show message about manual selection
            document.getElementById('extractedText').textContent = 
                `Manually selected: ${medicine.name}. For accurate scanning, please upload an image of the actual medicine.`;
            
            this.showToast(`Showing information for ${medicine.name}`, 'info');
        }
    }

    searchMedicines(searchTerm) {
        if (!searchTerm.trim()) {
            this.updateQuickMedicines();
            return;
        }
        
        const searchLower = searchTerm.toLowerCase();
        const filtered = this.medicineDatabase.filter(medicine => 
            medicine.name.toLowerCase().includes(searchLower) ||
            medicine.generic_name.toLowerCase().includes(searchLower) ||
            medicine.type.toLowerCase().includes(searchLower)
        );
        
        const quickList = document.getElementById('quickMedicineList');
        let html = '';
        
        filtered.slice(0, 5).forEach(medicine => {
            html += `
                <div class="medicine-item" onclick="window.scanner.selectQuickMedicine(${medicine.id})">
                    <div class="medicine-name">${medicine.name}</div>
                    <div class="medicine-type">${medicine.type.split(' ')[0]}</div>
                </div>
            `;
        });
        
        if (filtered.length === 0) {
            html = `
                <div class="empty-state" style="height: auto; padding: 1rem;">
                    <i class="fas fa-search"></i>
                    <p>No medicines found matching "${searchTerm}"</p>
                </div>
            `;
        }
        
        quickList.innerHTML = html;
    }

    showDatabaseModal() {
        const modal = document.getElementById('databaseModal');
        const databaseTable = document.getElementById('medicineDatabaseTable');
        
        let html = `
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: var(--light-color);">
                        <th style="padding: 1rem; text-align: left;">Medicine Name</th>
                        <th style="padding: 1rem; text-align: left;">Type</th>
                        <th style="padding: 1rem; text-align: left;">Dosage</th>
                        <th style="padding: 1rem; text-align: left;">Uses</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        this.medicineDatabase.forEach(medicine => {
            html += `
                <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 1rem;">
                        <strong>${medicine.name}</strong><br>
                        <small style="color: var(--gray-color);">${medicine.generic_name}</small>
                    </td>
                    <td style="padding: 1rem;">${medicine.type}</td>
                    <td style="padding: 1rem;">${medicine.dosage}</td>
                    <td style="padding: 1rem;">
                        <div style="max-height: 100px; overflow-y: auto;">
                            ${medicine.uses.slice(0, 2).map(use => 
                                `<div style="margin-bottom: 0.3rem;"><i class="fas fa-check" style="color: var(--success-color); margin-right: 0.5rem;"></i>${use}</div>`
                            ).join('')}
                        </div>
                    </td>
                </tr>
            `;
        });
        
        html += `</tbody></table>`;
        databaseTable.innerHTML = html;
        
        modal.style.display = 'flex';
    }

    hideDatabaseModal() {
        document.getElementById('databaseModal').style.display = 'none';
    }

    resetScanner() {
        // Hide results and preview
        document.getElementById('resultsCard').style.display = 'none';
        document.getElementById('previewSection').style.display = 'none';
        
        // Clear file input
        document.getElementById('imageInput').value = '';
        
        // Clear current scan data
        if (this.currentScan && this.currentScan.imageUrl) {
            URL.revokeObjectURL(this.currentScan.imageUrl);
        }
        this.currentScan = null;
        
        // Reset extracted text
        document.getElementById('extractedText').textContent = 'Text will appear here after processing...';
        
        this.showToast('Scanner reset. Ready for new scan.', 'info');
    }

    saveReport() {
        if (!this.currentScan) {
            this.showToast('No scan data to save', 'warning');
            return;
        }
        
        const report = {
            scanData: this.currentScan,
            timestamp: new Date().toISOString(),
            medicineInfo: this.getCurrentMedicineInfo()
        };
        
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `medicine-scan-report-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showToast('Report saved successfully', 'success');
    }

    getCurrentMedicineInfo() {
        // Get current medicine info from displayed data
        return {
            name: document.getElementById('medicineName').textContent,
            type: document.getElementById('medicineType').textContent.replace('Type', '').trim(),
            dosage: document.getElementById('medicineDosage').textContent.replace('Dosage', '').trim(),
            confidence: document.getElementById('confidenceScore').textContent
        };
    }

    printReport() {
        const printWindow = window.open('', '_blank');
        const medicineName = document.getElementById('medicineName').textContent;
        
        printWindow.document.write(`
            <html>
                <head>
                    <title>Medicine Report - ${medicineName}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
                        .section { margin-bottom: 20px; }
                        .label { font-weight: bold; color: #666; }
                        .value { margin-bottom: 10px; }
                        .timestamp { color: #999; font-size: 0.9em; margin-bottom: 30px; }
                    </style>
                </head>
                <body>
                    <h1>Medicine Information Report</h1>
                    <div class="timestamp">Generated: ${new Date().toLocaleString()}</div>
                    
                    <div class="section">
                        <div class="label">Medicine Name:</div>
                        <div class="value">${medicineName}</div>
                    </div>
                    
                    <div class="section">
                        <div class="label">Type:</div>
                        <div class="value">${document.getElementById('medicineType').textContent.replace('Type', '').trim()}</div>
                    </div>
                    
                    <div class="section">
                        <div class="label">Dosage:</div>
                        <div class="value">${document.getElementById('medicineDosage').textContent.replace('Dosage', '').trim()}</div>
                    </div>
                    
                    <div class="section">
                        <div class="label">Match Confidence:</div>
                        <div class="value">${document.getElementById('confidenceScore').textContent}</div>
                    </div>
                    
                    <div class="section">
                        <div class="label">Extracted Text:</div>
                        <div class="value">${document.getElementById('extractedText').textContent}</div>
                    </div>
                    
                    <script>
                        window.onload = function() {
                            window.print();
                            window.onafterprint = function() {
                                window.close();
                            };
                        };
                    </script>
                </body>
            </html>
        `);
        
        printWindow.document.close();
    }

    showLoading(message, progress = 0) {
        document.getElementById('loadingOverlay').style.display = 'flex';
        document.getElementById('loadingMessage').textContent = message;
        document.getElementById('loadingProgress').style.width = `${progress}%`;
        document.getElementById('progressText').textContent = `${progress}%`;
    }

    updateLoadingProgress(progress, message = null) {
        document.getElementById('loadingProgress').style.width = `${progress}%`;
        document.getElementById('progressText').textContent = `${progress}%`;
        if (message) {
            document.getElementById('loadingMessage').textContent = message;
        }
    }

    hideLoading() {
        document.getElementById('loadingOverlay').style.display = 'none';
        document.getElementById('loadingProgress').style.width = '0%';
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        const toastIcon = document.querySelector('.toast-icon');
        
        // Set icon based on type
        switch(type) {
            case 'success':
                toastIcon.className = 'fas fa-check-circle toast-icon';
                toastIcon.style.color = 'var(--success-color)';
                break;
            case 'error':
                toastIcon.className = 'fas fa-exclamation-circle toast-icon';
                toastIcon.style.color = 'var(--danger-color)';
                break;
            case 'warning':
                toastIcon.className = 'fas fa-exclamation-triangle toast-icon';
                toastIcon.style.color = 'var(--warning-color)';
                break;
            default:
                toastIcon.className = 'fas fa-info-circle toast-icon';
                toastIcon.style.color = 'var(--info-color)';
        }
        
        toastMessage.textContent = message;
        toast.style.display = 'block';
        
        // Hide after 3 seconds
        setTimeout(() => {
            toast.style.display = 'none';
        }, 3000);
    }
}

// Initialize the scanner when page loads
document.addEventListener("DOMContentLoaded", () => {
    window.scanner = new MedicineScanner();
});

;
