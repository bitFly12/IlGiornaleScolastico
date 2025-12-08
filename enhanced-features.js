// ============================================
// Enhanced Features for Giornale Cesaris
// ============================================

const SUPABASE_URL = 'https://ftazdkxyfekyzfvgrgiw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0YXpka3h5ZmVreXpmdmdyZ2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwNTE3MzQsImV4cCI6MjA4MDYyNzczNH0._V8LM9f8Dz2s9j8hcxUEWkHN8FMX9QW7YzKH3CgAzdU';

let supabase;

// Initialize enhanced features
function initEnhancedFeatures() {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    
    // Initialize all features
    initBackToTop();
    initReadingProgress();
    initDarkMode();
    initFontSizer();
    initPrintMode();
    initShareButtons();
    initBookmarks();
    initReadingTime();
}

// ============================================
// 1. BACK TO TOP BUTTON
// ============================================
function initBackToTop() {
    const backToTop = document.createElement('button');
    backToTop.id = 'back-to-top';
    backToTop.innerHTML = '<i class="bi bi-arrow-up"></i>';
    backToTop.className = 'btn-back-to-top';
    backToTop.style.display = 'none';
    document.body.appendChild(backToTop);
    
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            backToTop.style.display = 'flex';
        } else {
            backToTop.style.display = 'none';
        }
    });
    
    backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// ============================================
// 2. READING PROGRESS INDICATOR
// ============================================
function initReadingProgress() {
    const progressBar = document.createElement('div');
    progressBar.id = 'reading-progress';
    progressBar.className = 'reading-progress-bar';
    document.body.appendChild(progressBar);
    
    window.addEventListener('scroll', () => {
        const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (winScroll / height) * 100;
        progressBar.style.width = scrolled + '%';
    });
}

// ============================================
// 3. DARK MODE TOGGLE
// ============================================
function initDarkMode() {
    // Check saved preference
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode === 'enabled') {
        document.body.classList.add('dark-mode');
    }
    
    // Create toggle button
    const darkModeToggle = document.createElement('button');
    darkModeToggle.id = 'dark-mode-toggle';
    darkModeToggle.className = 'btn-feature-toggle';
    darkModeToggle.innerHTML = savedMode === 'enabled' ? 
        '<i class="bi bi-sun"></i>' : '<i class="bi bi-moon"></i>';
    darkModeToggle.title = 'Modalità scura';
    
    // Add to page
    const featuresContainer = getOrCreateFeaturesContainer();
    featuresContainer.appendChild(darkModeToggle);
    
    darkModeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isEnabled = document.body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isEnabled ? 'enabled' : 'disabled');
        darkModeToggle.innerHTML = isEnabled ? 
            '<i class="bi bi-sun"></i>' : '<i class="bi bi-moon"></i>';
    });
}

// ============================================
// 4. FONT SIZE ADJUSTER
// ============================================
function initFontSizer() {
    const fontSizes = ['small', 'normal', 'large'];
    let currentSize = localStorage.getItem('fontSize') || 'normal';
    document.body.classList.add('font-' + currentSize);
    
    const fontToggle = document.createElement('button');
    fontToggle.id = 'font-size-toggle';
    fontToggle.className = 'btn-feature-toggle';
    fontToggle.innerHTML = '<i class="bi bi-type"></i>';
    fontToggle.title = 'Dimensione testo';
    
    const featuresContainer = getOrCreateFeaturesContainer();
    featuresContainer.appendChild(fontToggle);
    
    fontToggle.addEventListener('click', () => {
        const currentIndex = fontSizes.indexOf(currentSize);
        const nextIndex = (currentIndex + 1) % fontSizes.length;
        currentSize = fontSizes[nextIndex];
        
        fontSizes.forEach(size => document.body.classList.remove('font-' + size));
        document.body.classList.add('font-' + currentSize);
        localStorage.setItem('fontSize', currentSize);
    });
}

// ============================================
// 5. PRINT-FRIENDLY VIEW
// ============================================
function initPrintMode() {
    const printBtn = document.createElement('button');
    printBtn.id = 'print-button';
    printBtn.className = 'btn-feature-toggle';
    printBtn.innerHTML = '<i class="bi bi-printer"></i>';
    printBtn.title = 'Stampa articolo';
    
    const featuresContainer = getOrCreateFeaturesContainer();
    featuresContainer.appendChild(printBtn);
    
    printBtn.addEventListener('click', () => {
        window.print();
    });
}

// ============================================
// 6. SOCIAL SHARING
// ============================================
function initShareButtons() {
    // Share buttons are added dynamically to articles
}

async function shareArticle(articleId, title, platform) {
    const url = `${window.location.origin}/index.html#article-${articleId}`;
    
    // Track share
    try {
        await supabase.from('article_shares').insert([{
            article_id: articleId,
            platform: platform
        }]);
    } catch (error) {
        console.error('Error tracking share:', error);
    }
    
    // Share based on platform
    switch (platform) {
        case 'facebook':
            window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
            break;
        case 'twitter':
            window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, '_blank');
            break;
        case 'whatsapp':
            window.open(`https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`, '_blank');
            break;
        case 'telegram':
            window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, '_blank');
            break;
        case 'email':
            window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`;
            break;
        case 'copy':
            navigator.clipboard.writeText(url).then(() => {
                alert('Link copiato negli appunti!');
            });
            break;
    }
}

// ============================================
// 7. ARTICLE BOOKMARKS
// ============================================
function initBookmarks() {
    // Bookmarks are managed per-article
}

async function toggleBookmark(articleId) {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        alert('Devi effettuare l\'accesso per salvare gli articoli');
        window.location.href = 'login.html';
        return;
    }
    
    try {
        // Check if already bookmarked
        const { data: existing } = await supabase
            .from('article_bookmarks')
            .select('id')
            .eq('user_id', session.user.id)
            .eq('article_id', articleId)
            .single();
        
        if (existing) {
            // Remove bookmark
            await supabase
                .from('article_bookmarks')
                .delete()
                .eq('id', existing.id);
            return false;
        } else {
            // Add bookmark
            await supabase
                .from('article_bookmarks')
                .insert([{
                    user_id: session.user.id,
                    article_id: articleId
                }]);
            return true;
        }
    } catch (error) {
        console.error('Error toggling bookmark:', error);
        alert('Errore nel salvataggio');
    }
}

// ============================================
// 8. READING TIME ESTIMATOR
// ============================================
function initReadingTime() {
    // Reading time is displayed on article cards
}

function calculateReadingTime(content) {
    const wordsPerMinute = 200;
    const wordCount = content.trim().split(/\s+/).length;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    return minutes;
}

function displayReadingTime(minutes) {
    return minutes === 1 ? '1 minuto' : `${minutes} minuti`;
}

// ============================================
// 9. RELATED ARTICLES
// ============================================
async function getRelatedArticles(articleId, limit = 3) {
    try {
        const { data, error } = await supabase
            .rpc('get_related_articles', {
                p_article_id: articleId,
                p_limit: limit
            });
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching related articles:', error);
        return [];
    }
}

// ============================================
// 10. POPULAR ARTICLES WIDGET
// ============================================
async function getPopularArticles(limit = 5) {
    try {
        const { data, error } = await supabase
            .rpc('get_popular_articles', {
                p_limit: limit
            });
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching popular articles:', error);
        return [];
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================
function getOrCreateFeaturesContainer() {
    let container = document.getElementById('features-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'features-container';
        container.className = 'features-toolbar';
        document.body.appendChild(container);
    }
    return container;
}

// ============================================
// AUTO-INITIALIZE ON PAGE LOAD
// ============================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEnhancedFeatures);
} else {
    initEnhancedFeatures();
}

// Export functions for global use
window.shareArticle = shareArticle;
window.toggleBookmark = toggleBookmark;
window.calculateReadingTime = calculateReadingTime;
window.displayReadingTime = displayReadingTime;
window.getRelatedArticles = getRelatedArticles;
window.getPopularArticles = getPopularArticles;
