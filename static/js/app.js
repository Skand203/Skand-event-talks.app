// Application State
let appState = {
    releaseNotes: [],
    selectedUpdates: [], // Objects containing update information
    activeCategory: 'all',
    searchQuery: '',
    theme: 'dark',
    isLoading: false
};

// DOM Elements
const themeToggle = document.getElementById('themeToggle');
const refreshBtn = document.getElementById('refreshBtn');
const refreshIcon = document.getElementById('refreshIcon');
const searchInput = document.getElementById('searchInput');
const clearSearch = document.getElementById('clearSearch');
const filterCategories = document.getElementById('filterCategories');
const feedContent = document.getElementById('feedContent');
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const errorMessage = document.getElementById('errorMessage');
const emptyState = document.getElementById('emptyState');
const retryBtn = document.getElementById('retryBtn');

// Banner Elements
const selectionBanner = document.getElementById('selectionBanner');
const selectedCount = document.getElementById('selectedCount');
const clearSelectionBtn = document.getElementById('clearSelectionBtn');
const tweetSelectedBtn = document.getElementById('tweetSelectedBtn');

// Modal Elements
const tweetModal = document.getElementById('tweetModal');
const closeModal = document.getElementById('closeModal');
const tweetTextarea = document.getElementById('tweetTextarea');
const tweetLinkUrl = document.getElementById('tweetLinkUrl');
const charCountCurrent = document.getElementById('charCountCurrent');
const progressBar = document.getElementById('progressBar');
const cancelTweet = document.getElementById('cancelTweet');
const submitTweet = document.getElementById('submitTweet');

// Twitter configuration
const TWITTER_URL_LEN = 23; // Twitter shortens all URLs to 23 chars
const TWEET_MAX_LEN = 280;
let currentModalLink = "";

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    fetchReleaseNotes();
    setupEventListeners();
});

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    
    if (savedTheme === 'light' || (!savedTheme && prefersLight)) {
        appState.theme = 'light';
        document.body.classList.add('light-theme');
        themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
    } else {
        appState.theme = 'dark';
        document.body.classList.remove('light-theme');
        themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
    }
}

function toggleTheme() {
    if (appState.theme === 'dark') {
        appState.theme = 'light';
        document.body.classList.add('light-theme');
        themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
        localStorage.setItem('theme', 'light');
    } else {
        appState.theme = 'dark';
        document.body.classList.remove('light-theme');
        themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
        localStorage.setItem('theme', 'dark');
    }
}

// Fetch Release Notes
async function fetchReleaseNotes() {
    if (appState.isLoading) return;
    
    appState.isLoading = true;
    showState('loading');
    refreshBtn.disabled = true;
    refreshIcon.classList.add('spinning');
    
    try {
        const response = await fetch('/api/release-notes');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        appState.releaseNotes = data.entries || [];
        
        // Update Feed Status text
        const lastUpdated = data.updated ? new Date(data.updated).toLocaleDateString(undefined, {
            month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
        }) : 'Recent';
        
        document.getElementById('feedStatus').innerHTML = `
            <i class="fa-solid fa-circle-check" style="color: #10b981;"></i>
            Feed updated: ${lastUpdated}
        `;
        
        clearSelection();
        renderFeed();
        updateCategoryCounts();
        
    } catch (error) {
        console.error("Error fetching release notes:", error);
        errorMessage.textContent = error.message || "Could not retrieve feed data. Make sure you are connected to the internet.";
        showState('error');
        document.getElementById('feedStatus').innerHTML = `
            <i class="fa-solid fa-circle-xmark" style="color: #f43f5e;"></i>
            Fetch failed
        `;
    } finally {
        appState.isLoading = false;
        refreshBtn.disabled = false;
        refreshIcon.classList.remove('spinning');
    }
}

// State display management
function showState(state) {
    loadingState.classList.add('hidden');
    errorState.classList.add('hidden');
    emptyState.classList.add('hidden');
    feedContent.classList.add('hidden');
    
    if (state === 'loading') {
        loadingState.classList.remove('hidden');
    } else if (state === 'error') {
        errorState.classList.remove('hidden');
    } else if (state === 'empty') {
        emptyState.classList.remove('hidden');
    } else if (state === 'content') {
        feedContent.classList.remove('hidden');
    }
}

// Compute counts for category filters
function updateCategoryCounts() {
    let counts = { all: 0, Feature: 0, Fix: 0, Changed: 0, Notice: 0 };
    
    appState.releaseNotes.forEach(entry => {
        entry.updates.forEach(update => {
            counts.all++;
            const category = update.category;
            if (counts.hasOwnProperty(category)) {
                counts[category]++;
            }
        });
    });
    
    document.getElementById('count-all').textContent = counts.all;
    document.getElementById('count-feature').textContent = counts.Feature;
    document.getElementById('count-fix').textContent = counts.Fix;
    document.getElementById('count-changed').textContent = counts.Changed;
    document.getElementById('count-notice').textContent = counts.Notice;
}

// Check if an update matches category and search query
function matchesFilters(update, dateTitle) {
    // 1. Category Filter
    if (appState.activeCategory !== 'all' && update.category !== appState.activeCategory) {
        return false;
    }
    
    // 2. Search query filter
    if (appState.searchQuery.trim() !== '') {
        const query = appState.searchQuery.toLowerCase();
        const categoryMatch = update.category.toLowerCase().includes(query);
        const contentMatch = update.text_content.toLowerCase().includes(query);
        const dateMatch = dateTitle.toLowerCase().includes(query);
        
        return categoryMatch || contentMatch || dateMatch;
    }
    
    return true;
}

// Render Feed UI
function renderFeed() {
    feedContent.innerHTML = '';
    let totalVisibleUpdates = 0;
    
    appState.releaseNotes.forEach((entry, entryIdx) => {
        // Filter updates in this entry
        const visibleUpdates = entry.updates.filter(u => matchesFilters(u, entry.title));
        
        if (visibleUpdates.length === 0) return; // Hide date group if no matching updates
        
        totalVisibleUpdates += visibleUpdates.length;
        
        // Create Date Group card
        const dateGroup = document.createElement('div');
        dateGroup.className = 'date-group';
        
        const dateHeader = document.createElement('div');
        dateHeader.className = 'date-header';
        
        // Create anchor-link to the original source notes
        const entryAnchor = entry.anchor || `June_${entry.title.replace(/[\s,]+/g, '_')}`;
        const sourceLink = entry.link || `https://docs.cloud.google.com/bigquery/docs/release-notes#${entryAnchor}`;
        
        dateHeader.innerHTML = `
            <h2><i class="fa-regular fa-calendar-days"></i> ${entry.title}</h2>
            <a href="${sourceLink}" target="_blank" rel="noopener noreferrer" class="date-link" title="Open official release notes">
                <span>Official Notes</span>
                <i class="fa-solid fa-arrow-up-right-from-square"></i>
            </a>
        `;
        dateGroup.appendChild(dateHeader);
        
        const updatesList = document.createElement('div');
        updatesList.className = 'updates-list';
        
        visibleUpdates.forEach((update, updateIdx) => {
            // Find global unique ID for selection state tracking
            const updateId = `${entryIdx}-${update.category}-${updateIdx}`;
            const isSelected = appState.selectedUpdates.some(item => item.id === updateId);
            
            const updateItem = document.createElement('div');
            updateItem.className = `update-item ${isSelected ? 'selected' : ''}`;
            updateItem.dataset.id = updateId;
            
            const catClass = update.category.toLowerCase();
            
            updateItem.innerHTML = `
                <div class="update-meta-row">
                    <div class="update-label-area">
                        <label class="checkbox-container" title="Select to Tweet Digest">
                            <input type="checkbox" class="update-select-checkbox" data-id="${updateId}" ${isSelected ? 'checked' : ''}>
                            <span class="custom-checkbox"></span>
                        </label>
                        <span class="category-badge ${catClass}">${update.category}</span>
                    </div>
                    <div class="update-actions">
                        <button class="btn-copy-single" data-id="${updateId}" title="Copy update to clipboard">
                            <i class="fa-regular fa-copy"></i>
                        </button>
                        <button class="btn-tweet-single" data-id="${updateId}" title="Compose Tweet for this update">
                            <i class="fa-brands fa-x-twitter"></i>
                        </button>
                    </div>
                </div>
                <div class="update-body">
                    ${update.html_content}
                </div>
            `;
            
            // Add reference to original objects for Tweet generation
            updateItem.dataset.date = entry.title;
            updateItem.dataset.link = sourceLink;
            updateItem.dataset.category = update.category;
            updateItem.dataset.text = update.text_content;
            
            updatesList.appendChild(updateItem);
        });
        
        dateGroup.appendChild(updatesList);
        feedContent.appendChild(dateGroup);
    });
    
    // Toggle state displays
    if (appState.releaseNotes.length === 0) {
        showState('empty');
    } else if (totalVisibleUpdates === 0) {
        showState('empty');
    } else {
        showState('content');
    }
}

// Setup Events
function setupEventListeners() {
    // Theme
    themeToggle.addEventListener('click', toggleTheme);
    
    // Refresh
    refreshBtn.addEventListener('click', fetchReleaseNotes);
    retryBtn.addEventListener('click', fetchReleaseNotes);
    
    // Search
    searchInput.addEventListener('input', (e) => {
        appState.searchQuery = e.target.value;
        if (appState.searchQuery.trim() !== '') {
            clearSearch.style.display = 'block';
        } else {
            clearSearch.style.display = 'none';
        }
        renderFeed();
    });
    
    clearSearch.addEventListener('click', () => {
        searchInput.value = '';
        appState.searchQuery = '';
        clearSearch.style.display = 'none';
        renderFeed();
        searchInput.focus();
    });
    
    // Category Chips
    filterCategories.addEventListener('click', (e) => {
        const chip = e.target.closest('.filter-chip');
        if (!chip) return;
        
        // Remove active class from previous
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        
        // Set new active
        chip.classList.add('active');
        appState.activeCategory = chip.dataset.category;
        renderFeed();
    });
    
    // Delegate select clicks and individual tweet clicks on feed
    feedContent.addEventListener('click', (e) => {
        // 1. Tweet single button click
        const tweetBtn = e.target.closest('.btn-tweet-single');
        if (tweetBtn) {
            const updateItem = tweetBtn.closest('.update-item');
            openTweetModalSingle(updateItem);
            return;
        }
        
        // 1.5. Copy single button click
        const copyBtn = e.target.closest('.btn-copy-single');
        if (copyBtn) {
            const updateItem = copyBtn.closest('.update-item');
            copyToClipboard(updateItem, copyBtn);
            return;
        }
        
        // 2. Checkbox selection click
        const checkbox = e.target.closest('.update-select-checkbox');
        if (checkbox) {
            const updateItem = checkbox.closest('.update-item');
            toggleUpdateSelection(updateItem, checkbox.checked);
            return;
        }
        
        // 3. Row click toggles selection (except if clicking on links or elements inside body or actions)
        const updateItem = e.target.closest('.update-item');
        if (updateItem && !e.target.closest('a') && !e.target.closest('pre') && !e.target.closest('.btn-tweet-single') && !e.target.closest('.btn-copy-single')) {
            const cb = updateItem.querySelector('.update-select-checkbox');
            cb.checked = !cb.checked;
            toggleUpdateSelection(updateItem, cb.checked);
        }
    });
    
    // Selection Banner actions
    clearSelectionBtn.addEventListener('click', clearSelection);
    tweetSelectedBtn.addEventListener('click', openTweetModalMulti);
    
    // Export CSV action
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', exportToCsv);
    }
    
    // Modal events
    closeModal.addEventListener('click', closeTweetModal);
    cancelTweet.addEventListener('click', closeTweetModal);
    tweetTextarea.addEventListener('input', updateCharCountProgress);
    submitTweet.addEventListener('click', executeTweetIntent);
    
    // Close modal on clicking overlay background
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) {
            closeTweetModal();
        }
    });
}

// Selection management
function toggleUpdateSelection(updateItem, isChecked) {
    const id = updateItem.dataset.id;
    
    if (isChecked) {
        updateItem.classList.add('selected');
        // Add to selected array if not already present
        if (!appState.selectedUpdates.some(item => item.id === id)) {
            appState.selectedUpdates.push({
                id: id,
                date: updateItem.dataset.date,
                link: updateItem.dataset.link,
                category: updateItem.dataset.category,
                text_content: updateItem.dataset.text
            });
        }
    } else {
        updateItem.classList.remove('selected');
        appState.selectedUpdates = appState.selectedUpdates.filter(item => item.id !== id);
    }
    
    updateSelectionBanner();
}

function updateSelectionBanner() {
    const count = appState.selectedUpdates.length;
    selectedCount.textContent = count;
    
    if (count > 0) {
        selectionBanner.classList.add('visible');
    } else {
        selectionBanner.classList.remove('visible');
    }
}

function clearSelection() {
    appState.selectedUpdates = [];
    document.querySelectorAll('.update-item').forEach(item => {
        item.classList.remove('selected');
        const cb = item.querySelector('.update-select-checkbox');
        if (cb) cb.checked = false;
    });
    updateSelectionBanner();
}

// Tweet Generation & Modal Logic
function openTweetModalSingle(updateItem) {
    const date = updateItem.dataset.date;
    const category = updateItem.dataset.category;
    const textContent = updateItem.dataset.text;
    const link = updateItem.dataset.link;
    
    // Compose Tweet structure:
    // 🚀 #BigQuery Update [June 17, 2026] | [Feature]:
    // You can now do X, Y, Z...
    const header = `🚀 #BigQuery Update [${date}] | [${category}]:\n`;
    
    // Character limit calculation:
    // Limit is 280, URL takes 23 characters, plus 1 spacing space = 24.
    const allowedTextLength = TWEET_MAX_LEN - header.length - TWITTER_URL_LEN - 1;
    
    let tweetBody = textContent;
    if (tweetBody.length > allowedTextLength) {
        tweetBody = tweetBody.substring(0, allowedTextLength - 3) + "...";
    }
    
    tweetTextarea.value = `${header}${tweetBody}`;
    currentModalLink = link;
    tweetLinkUrl.textContent = link;
    
    openModal();
}

function openTweetModalMulti() {
    if (appState.selectedUpdates.length === 0) return;
    
    // Multi-update digest formatting
    // If they select multiple updates, group them nicely.
    // 🚀 #BigQuery Digest:
    // • [June 17] Feature: Autonomous embedding generation...
    // • [June 15] Fix: Improved partition prune speeds...
    let header = `🚀 #BigQuery Digest:\n`;
    let body = "";
    
    // Sort selected updates chronologically (or reverse)
    // For simplicity, we keep selection order.
    appState.selectedUpdates.forEach(item => {
        // Strip out year to save characters (e.g. "June 17, 2026" -> "June 17")
        const shortDate = item.date.replace(/,\s*\d{4}/, '');
        body += `• [${shortDate}] [${item.category}]: ${item.text_content}\n`;
    });
    
    // Limit is 280, URL takes 23, spacing takes 1. Total remaining = 256.
    const allowedTextLength = TWEET_MAX_LEN - header.length - TWITTER_URL_LEN - 1;
    
    if (body.length > allowedTextLength) {
        body = body.substring(0, allowedTextLength - 4) + "\n...";
    }
    
    tweetTextarea.value = `${header}${body}`;
    // General documentation page link as fallback
    const generalLink = "https://cloud.google.com/bigquery/docs/release-notes";
    currentModalLink = generalLink;
    tweetLinkUrl.textContent = generalLink;
    
    openModal();
}

function openModal() {
    tweetModal.classList.add('visible');
    updateCharCountProgress();
    setTimeout(() => tweetTextarea.focus(), 150);
}

function closeTweetModal() {
    tweetModal.classList.remove('visible');
}

function updateCharCountProgress() {
    const text = tweetTextarea.value;
    // Calculate character count treating link as exactly 23 characters
    const textLenWithoutLink = text.length;
    // Space (1) + Link (23)
    const hasLink = currentModalLink ? true : false;
    const computedTotalLength = textLenWithoutLink + (hasLink ? (TWITTER_URL_LEN + 1) : 0);
    
    charCountCurrent.textContent = computedTotalLength;
    
    // Progress percentage
    const percent = Math.min((computedTotalLength / TWEET_MAX_LEN) * 100, 100);
    progressBar.style.width = `${percent}%`;
    
    // Style adjustments based on limits
    const charCounter = document.getElementById('charCounter');
    
    // Reset classes
    charCounter.className = 'char-counter';
    progressBar.className = 'progress-bar';
    submitTweet.disabled = false;
    
    if (computedTotalLength > TWEET_MAX_LEN) {
        charCounter.classList.add('danger');
        progressBar.classList.add('danger');
        submitTweet.disabled = true; // Block sharing if over limit
    } else if (computedTotalLength > TWEET_MAX_LEN - 20) {
        charCounter.classList.add('warning');
        progressBar.classList.add('warning');
    }
}

function executeTweetIntent() {
    const text = tweetTextarea.value;
    const tweetText = `${text} ${currentModalLink}`.trim();
    const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    
    window.open(twitterIntentUrl, '_blank', 'noopener,noreferrer');
    closeTweetModal();
}

// Copy update details to clipboard
async function copyToClipboard(updateItem, button) {
    const date = updateItem.dataset.date;
    const category = updateItem.dataset.category;
    const textContent = updateItem.dataset.text;
    const link = updateItem.dataset.link;
    
    const formattedText = `BigQuery Update [${date}] | [${category}]:\n${textContent}\n\nRead more: ${link}`;
    
    try {
        await navigator.clipboard.writeText(formattedText);
        
        // Success animation feedback
        button.classList.add('success');
        const icon = button.querySelector('i');
        icon.className = 'fa-solid fa-check';
        
        setTimeout(() => {
            button.classList.remove('success');
            icon.className = 'fa-regular fa-copy';
        }, 1500);
    } catch (err) {
        console.error('Failed to copy text: ', err);
        alert('Could not copy text to clipboard. Please select and copy manually.');
    }
}

// Export currently filtered list to CSV
function exportToCsv() {
    const visibleCards = document.querySelectorAll('.update-item');
    if (visibleCards.length === 0) {
        alert("No visible updates to export.");
        return;
    }
    
    let csvRows = [];
    // Header
    csvRows.push(['Date', 'Category', 'Update Content', 'Source Link'].map(escapeCsvValue).join(','));
    
    visibleCards.forEach(card => {
        const date = card.dataset.date;
        const category = card.dataset.category;
        const text = card.dataset.text;
        const link = card.dataset.link;
        
        csvRows.push([date, category, text, link].map(escapeCsvValue).join(','));
    });
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `bigquery_release_notes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Helper to escape CSV values according to RFC 4180
function escapeCsvValue(val) {
    if (val === undefined || val === null) return '';
    let stringVal = String(val);
    if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n') || stringVal.includes('\r')) {
        stringVal = stringVal.replace(/"/g, '""');
        return `"${stringVal}"`;
    }
    return stringVal;
}
