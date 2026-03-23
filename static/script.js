// Hospital data from CSV (simulated - you would load from actual CSV)
let hospitals = [];
let filteredHospitals = [];
let allCities = new Set();
let allSpecialties = new Set();



    



// DOM Elements
const searchInput = document.getElementById('hospitalSearch');
const clearSearchBtn = document.getElementById('clearSearch');
const cityFilter = document.getElementById('cityFilter');
const specialtyFilter = document.getElementById('specialtyFilter');
const hospitalResults = document.getElementById('hospitalResults');
const resultCount = document.getElementById('resultCount');

// Show more / less
const showMoreBtn = document.getElementById('showMoreBtn');
const showLessBtn = document.getElementById('showLessBtn');
const INITIAL_VISIBLE = 6;
let showingAll = false;

const gridViewBtn = document.getElementById('gridViewBtn');
const listViewBtn = document.getElementById('listViewBtn');
const hospitalModal = document.getElementById('hospitalModal');
const feedbackModal = document.getElementById('feedbackModal');
const feedbackBtn = document.getElementById('feedbackBtn');
const feedbackForm = document.getElementById('feedbackForm');
const feedbackThankYou = document.getElementById('feedbackThankYou');
const newFeedbackBtn = document.getElementById('newFeedbackBtn');
const feedbackHospitalSelect = document.getElementById('feedbackHospital');

// Statistics elements
const totalHospitalsEl = document.getElementById('totalHospitals');
const totalBedsEl = document.getElementById('totalBeds');
const totalICUEl = document.getElementById('totalICU');
const ayushmanCountEl = document.getElementById('ayushmanCount');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    loadHospitalData(); // sab kuch yahin se hoga
});


// Load hospital data (in real app, this would load from CSV file)


// Set up event listeners
function setupEventListeners() {
    // Search input
    searchInput.addEventListener('input', filterHospitals);
    
    // Clear search button
    clearSearchBtn.addEventListener('click', clearSearch);
    
    // Filter dropdowns
    cityFilter.addEventListener('change', filterHospitals);
    specialtyFilter.addEventListener('change', filterHospitals);
    
    // View toggle buttons
    gridViewBtn.addEventListener('click', () => toggleView('grid'));
    listViewBtn.addEventListener('click', () => toggleView('list'));
    
    // Feedback button
    feedbackBtn.addEventListener('click', openFeedbackModal);
    
    // Feedback form
    feedbackForm.addEventListener('submit', submitFeedback);
    newFeedbackBtn.addEventListener('click', showFeedbackForm);
    
    // Rating stars
    document.querySelectorAll('.rating-stars i').forEach(star => {
        star.addEventListener('click', setRating);
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === hospitalModal) {
            closeHospitalModal();
        }
        if (e.target === feedbackModal) {
            closeFeedbackModal();
        }
    });

    // 🔽 ADD THIS BLOCK AT THE END
    if (showMoreBtn && showLessBtn) {
        showMoreBtn.addEventListener('click', () => {
            showingAll = true;
            renderHospitals();
            document
              .querySelector('.results-container')
              .scrollIntoView({ behavior: 'smooth' });
        });

        showLessBtn.addEventListener('click', () => {
            showingAll = false;
            renderHospitals();
            document
              .querySelector('.results-container')
              .scrollIntoView({ behavior: 'smooth' });
        });
    }
}


// Populate filter dropdowns
function populateFilters() {
    // Clear existing options except first
    cityFilter.innerHTML = '<option value="all">All Cities</option>';
    specialtyFilter.innerHTML = '<option value="all">All Specialties</option>';
    
    // Add cities
    allCities.forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city;
        cityFilter.appendChild(option);
    });
    
    // Add specialties
    allSpecialties.forEach(specialty => {
        const option = document.createElement('option');
        option.value = specialty;
        option.textContent = specialty;
        specialtyFilter.appendChild(option);
    });
}

// Populate feedback hospital select
function populateFeedbackHospitalSelect() {
    hospitals.forEach(hospital => {
        const option = document.createElement('option');
        option.value = hospital.id;
        option.textContent = hospital.name;
        feedbackHospitalSelect.appendChild(option);
    });
}

// Filter hospitals based on search and filters
function filterHospitals() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedCity = cityFilter.value;
    const selectedSpecialty = specialtyFilter.value;
    
    filteredHospitals = hospitals.filter(hospital => {
        // Search term filter
        const matchesSearch = searchTerm === '' || 
            hospital.name.toLowerCase().includes(searchTerm) ||
            hospital.city.toLowerCase().includes(searchTerm) ||
            hospital.facilities.some(facility => facility.toLowerCase().includes(searchTerm));
        
        // City filter
        const matchesCity = selectedCity === 'all' || hospital.city === selectedCity;
        
        // Specialty filter
        const matchesSpecialty = selectedSpecialty === 'all' || 
            hospital.facilities.includes(selectedSpecialty);
        
        return matchesSearch && matchesCity && matchesSpecialty;
    });
    showingAll = false; // Reset to initial view on new filter
    renderHospitals();
    updateStatistics();
}

// Clear search and filters
function clearSearch() {
    searchInput.value = '';
    cityFilter.value = 'all';
    specialtyFilter.value = 'all';
    showingAll = false;
    filterHospitals();
}

// Toggle between grid and list view
function toggleView(viewType) {
    if (viewType === 'grid') {
        hospitalResults.classList.remove('list-view');
        gridViewBtn.classList.add('active');
        listViewBtn.classList.remove('active');
    } else {
        hospitalResults.classList.add('list-view');
        listViewBtn.classList.add('active');
        gridViewBtn.classList.remove('active');
    }
}

// Render hospitals to the page
function renderHospitals() {
    if (filteredHospitals.length === 0) {
        hospitalResults.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <h3>No hospitals found</h3>
                <p>Try adjusting your search or filters</p>
            </div>
        `;
        resultCount.textContent = '(0 found)';
        if (showMoreBtn && showLessBtn) {
            showMoreBtn.style.display = 'none';
            showLessBtn.style.display = 'none';
        }
        return;
    }

    resultCount.textContent = `(${filteredHospitals.length} found)`;

    // Decide which hospitals to show
    const listToShow = showingAll
        ? filteredHospitals
        : filteredHospitals.slice(0, INITIAL_VISIBLE);

    let hospitalsHTML = '';

    listToShow.forEach(hospital => {
        hospitalsHTML += `
            <div class="hospital-card" data-id="${hospital.id}">
                <div class="hospital-header">
                    <h3><i class="fas fa-hospital"></i> ${hospital.name}</h3>
                    <div class="rating">
                        <i class="fas fa-star"></i>
                        <span>${hospital.rating}</span>
                        <span class="city-badge">${hospital.city}</span>
                    </div>
                </div>
                <div class="hospital-body">
                    <div class="info-row">
                        <i class="fas fa-procedures"></i>
                        <div>
                            <h4>Bed Capacity</h4>
                            <p>${hospital.bed_capacity} beds</p>
                        </div>
                    </div>
                    <div class="info-row">
                        <i class="fas fa-bed"></i>
                        <div>
                            <h4>ICU Seats</h4>
                            <p>${hospital.icu_seats} seats</p>
                        </div>
                    </div>
                    <div class="info-row">
                        <i class="fas fa-shield-alt"></i>
                        <div>
                            <h4>Ayushman Enabled</h4>
                            <p>${hospital.ayushman_enabled}</p>
                        </div>
                    </div>

                    <div class="facilities">
                        <h4><i class="fas fa-clipboard-list"></i> Key Facilities</h4>
                        <div class="facilities-tags">
                            ${hospital.facilities.slice(0, 4).map(facility => `
                                <span class="facility-tag">${facility}</span>
                            `).join('')}
                            ${hospital.facilities.length > 4
                                ? `<span class="facility-tag">+${hospital.facilities.length - 4} more</span>`
                                : ''}
                        </div>
                    </div>

                    <div class="hospital-actions">
                        <button class="action-btn directions" onclick="openDirections(${hospital.id})">
                            <i class="fas fa-directions"></i> Directions
                        </button>
                        <button class="action-btn details" onclick="showHospitalDetails(${hospital.id})">
                            <i class="fas fa-info-circle"></i> Details
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    hospitalResults.innerHTML = hospitalsHTML;

    // Handle visibility of show more / less
    if (showMoreBtn && showLessBtn) {
        if (filteredHospitals.length <= INITIAL_VISIBLE) {
            showMoreBtn.style.display = 'none';
            showLessBtn.style.display = 'none';
        } else if (showingAll) {
            showMoreBtn.style.display = 'none';
            showLessBtn.style.display = 'inline-block';
        } else {
            showMoreBtn.style.display = 'inline-block';
            showLessBtn.style.display = 'none';
        }
    }
}


// Update statistics
function updateStatistics() {
    totalHospitalsEl.textContent = filteredHospitals.length;
    
    const totalBeds = filteredHospitals.reduce((sum, hospital) => sum + hospital.bed_capacity, 0);
    const totalICU = filteredHospitals.reduce((sum, hospital) => sum + hospital.icu_seats, 0);
    const ayushmanCount = filteredHospitals.filter(hospital => hospital.ayushman_enabled === "Yes").length;
    
    totalBedsEl.textContent = totalBeds.toLocaleString();
    totalICUEl.textContent = totalICU.toLocaleString();
    ayushmanCountEl.textContent = ayushmanCount;
}

// Show hospital details in modal
function showHospitalDetails(hospitalId) {
    const hospital = hospitals.find(h => h.id === hospitalId);
    if (!hospital) return;
    
    // Set modal content
    document.getElementById('modalHospitalName').textContent = hospital.name;
    document.getElementById('modalCity').textContent = hospital.city;
    document.getElementById('modalBeds').textContent = `${hospital.bed_capacity} beds`;
    document.getElementById('modalICU').textContent = `${hospital.icu_seats} seats`;
    document.getElementById('modalAyushman').textContent = hospital.ayushman_enabled;
    document.getElementById('modalRating').textContent = `${hospital.rating}/5`;
    document.getElementById('modalContact').textContent = hospital.contact;
    document.getElementById('modalAddress').textContent = hospital.address;
    
    // Set facilities
    const facilitiesList = document.getElementById('modalFacilities');
    facilitiesList.innerHTML = hospital.facilities.map(facility => 
        `<span class="facility-tag-large">${facility}</span>`
    ).join('');
    
    // Set directions link
    const directionsBtn = document.getElementById('directionsBtn');
    const addressForMaps = encodeURIComponent(`${hospital.name}, ${hospital.address}, ${hospital.city}`);
    directionsBtn.href = `https://www.google.com/maps/search/?api=1&query=${addressForMaps}`;
    
    // Show modal
    hospitalModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Open directions in Google Maps
function openDirections(hospitalId) {
    const hospital = hospitals.find(h => h.id === hospitalId);
    if (!hospital) return;
    
    const addressForMaps = encodeURIComponent(`${hospital.name}, ${hospital.address}, ${hospital.city}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${addressForMaps}`, '_blank');
}

// Close hospital modal
function closeHospitalModal() {
    hospitalModal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Open feedback modal
function openFeedbackModal() {
    feedbackModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    showFeedbackForm(); // Reset form when opening
}

// Close feedback modal
function closeFeedbackModal() {
    feedbackModal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Show feedback form (hide thank you message)
function showFeedbackForm() {
    feedbackForm.reset();
    feedbackForm.style.display = 'block';
    feedbackThankYou.style.display = 'none';
    
    // Reset stars
    document.querySelectorAll('.rating-stars i').forEach(star => {
        star.classList.remove('fas', 'active');
        star.classList.add('far');
    });
    document.getElementById('feedbackRating').value = 0;
}

// Set rating with stars
function setRating(e) {
    const rating = parseInt(e.target.getAttribute('data-rating'));
    document.getElementById('feedbackRating').value = rating;
    
    // Update star display
    const stars = document.querySelectorAll('.rating-stars i');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.remove('far');
            star.classList.add('fas', 'active');
        } else {
            star.classList.remove('fas', 'active');
            star.classList.add('far');
        }
    });
}

// Submit feedback form
function submitFeedback(e) {
    e.preventDefault();
    
    const name = document.getElementById('feedbackName').value;
    const email = document.getElementById('feedbackEmail').value;
    const hospitalId = document.getElementById('feedbackHospital').value;
    const rating = document.getElementById('feedbackRating').value;
    const message = document.getElementById('feedbackMessage').value;
    
    // In a real app, you would send this data to a server
    console.log('Feedback submitted:', { name, email, hospitalId, rating, message });
    
    // Show thank you message
    feedbackForm.style.display = 'none';
    feedbackThankYou.style.display = 'block';
    
    // In a real app, you might want to save the feedback to localStorage or send to a server
    saveFeedbackToLocalStorage({ name, email, hospitalId, rating, message });
}

// Save feedback to localStorage (for demo purposes)
function saveFeedbackToLocalStorage(feedback) {
    let feedbacks = JSON.parse(localStorage.getItem('hospitalFeedbacks')) || [];
    feedbacks.push({
        ...feedback,
        date: new Date().toISOString()
    });
    localStorage.setItem('hospitalFeedbacks', JSON.stringify(feedbacks));
}

// Close modals with X buttons
document.querySelector('.close-modal').addEventListener('click', closeHospitalModal);
document.querySelector('.close-feedback-modal').addEventListener('click', closeFeedbackModal);

// For demonstration, add some CSS for city badges
const style = document.createElement('style');
style.textContent = `
    .city-badge {
        background: rgba(255, 255, 255, 0.2);
        padding: 3px 10px;
        border-radius: 20px;
        font-size: 0.8rem;
        margin-left: 10px;
    }
`;
document.head.appendChild(style);


async function loadHospitalData() {
    const response = await fetch("./static/hospitals.csv");

    const csvText = await response.text();

    const parsed = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true
    });

    hospitals = parsed.data.map(h => ({
        id: Number(h.id),
        name: h.name,
        city: h.city,
        bed_capacity: Number(h.bed_capacity),
        icu_seats: Number(h.icu_seats),
        ayushman_enabled: h.ayushman_enabled,
        rating: Number(h.rating),
        contact: h.contact,
        address: h.address,

        // 🔥 IMPORTANT
        facilities: h.facilities
    ? h.facilities.split("|").map(f => f.trim())
    : []

    }));

    filteredHospitals = [...hospitals];
    allCities.clear();
    allSpecialties.clear();

    hospitals.forEach(h => {
        allCities.add(h.city);
        h.facilities.forEach(f => allSpecialties.add(f));
    });

    console.log("Hospitals Loaded (FIXED):", hospitals);

    populateFilters();
    populateFeedbackHospitalSelect();
    updateStatistics();
    renderHospitals();
}
  // Sidebar toggle
        const menuToggle = document.getElementById('menuToggle');
        const sidebar = document.getElementById('sidebar');

        if (menuToggle && sidebar) {
            menuToggle.addEventListener('click', () => {
                sidebar.classList.toggle('open');
            });
        }

        // Chat widget click
        const chatWidget = document.getElementById('chatWidget');
document.addEventListener("DOMContentLoaded", () => {
  const mini = document.getElementById("chatbot-mini");
  const full = document.getElementById("chatbot-full");
  const close = document.getElementById("chatbot-close");

  if (!mini || !full || !close) {
    console.error("Chatbot elements not found");
    return;
  }

  mini.addEventListener("click", () => {
    full.style.display = "flex";
    document.body.style.overflow = "hidden";
  });

  close.addEventListener("click", () => {
    full.style.display = "none";
    document.body.style.overflow = "";
  });
});
