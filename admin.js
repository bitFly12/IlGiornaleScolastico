// ============================================
// admin.js - Area Riservata Redazione
// Giornale Scolastico - Supabase Backend
// ============================================

// Configurazione Supabase
const SUPABASE_URL = 'https://ftazdkxyfekyzfvgrgiw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0YXpka3h5ZmVreXpmdmdyZ2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwNTE3MzQsImV4cCI6MjA4MDYyNzczNH0._V8LM9f8Dz2s9j8hcxUEWkHN8FMX9QW7YzKH3CgAzdU';

// Configurazione Gemini AI
const GEMINI_API_KEY = 'AIzaSyDXwkvfGymYKD5pN3cV0f8ofC54j9IcS90';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

let supabase;
let currentUser = null;
let currentUserProfile = null;
let generatedImageUrl = null;

// Inizializzazione
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Inizializza Supabase
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        // Controlla se l'utente è già loggato
        await checkAuthStatus();
        
        // Configura event listeners
        setupEventListeners();
        
        console.log('Admin area initialized');
    } catch (error) {
        console.error('Error initializing admin area:', error);
        showMessage('Errore di inizializzazione', 'error');
    }
});

// ============================================
// AUTENTICAZIONE
// ============================================

async function checkAuthStatus() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (session) {
            currentUser = session.user;
            await loadUserProfile();
            showAdminInterface();
            loadDashboardData();
        } else {
            showLoginInterface();
        }
    } catch (error) {
        console.error('Auth check error:', error);
        showLoginInterface();
    }
}

async function loadUserProfile() {
    try {
        const { data, error } = await supabase
            .from('profili_redattori')
            .select('*')
            .eq('id', currentUser.id)
            .single();
            
        if (error) throw error;
        
        currentUserProfile = data;
        updateUserUI();
    } catch (error) {
        console.error('Error loading user profile:', error);
        currentUserProfile = {
            nome_visualizzato: currentUser.email.split('@')[0],
            ruolo: 'Reporter'
        };
    }
}

async function handleLogin(email, password) {
    try {
        showLoading(true, 'Accesso in corso...');
        
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        currentUser = data.user;
        await loadUserProfile();
        showAdminInterface();
        showMessage('Accesso effettuato con successo!', 'success');
        loadDashboardData();
        
    } catch (error) {
        console.error('Login error:', error);
        showMessage('Credenziali non valide. Riprova.', 'error');
    } finally {
        showLoading(false);
    }
}

async function handleLogout() {
    try {
        showLoading(true, 'Uscita in corso...');
        
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        currentUser = null;
        currentUserProfile = null;
        showLoginInterface();
        showMessage('Logout effettuato', 'info');
        
    } catch (error) {
        console.error('Logout error:', error);
        showMessage('Errore durante il logout', 'error');
    } finally {
        showLoading(false);
    }
}

// ============================================
// GESTIONE ARTICOLI
// ============================================

async function loadArticles(filter = 'all', page = 1) {
    try {
        showLoading(true, 'Caricamento articoli...');
        
        let query = supabase
            .from('articoli')
            .select(`
                *,
                profili_redattori!articoli_autore_id_fkey (
                    nome_visualizzato,
                    avatar_url
                )
            `)
            .order('data_creazione', { ascending: false });
        
        // Applica filtri
        if (filter === 'my') {
            query = query.eq('autore_id', currentUser.id);
        } else if (filter === 'drafts') {
            query = query.eq('stato', 'bozza');
        } else if (filter === 'published') {
            query = query.eq('stato', 'pubblicato');
        } else if (filter === 'review') {
            query = query.eq('stato', 'in_revisione');
        }
        
        // Paginazione
        const pageSize = 10;
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        
        query = query.range(from, to);
        
        const { data: articles, error } = await query;
        
        if (error) throw error;
        
        displayArticles(articles);
        updatePagination(page, filter);
        
    } catch (error) {
        console.error('Error loading articles:', error);
        showMessage('Errore nel caricamento degli articoli', 'error');
        document.getElementById('articles-container').innerHTML = `
            <div class="alert alert-danger">
                Impossibile caricare gli articoli. Riprova più tardi.
            </div>
        `;
    } finally {
        showLoading(false);
    }
}

function displayArticles(articles) {
    const container = document.getElementById('articles-container');
    
    if (!articles || articles.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="bi bi-newspaper display-1 text-muted"></i>
                <p class="mt-3">Nessun articolo trovato</p>
            </div>
        `;
        return;
    }
    
    const articlesHTML = articles.map(article => `
        <div class="card mb-3 article-card" data-id="${article.id}">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <div class="d-flex align-items-center gap-2 mb-2">
                            <span class="badge ${getStatusBadgeClass(article.stato)}">
                                ${getStatusText(article.stato)}
                            </span>
                            ${article.in_evidenza ? '<span class="badge bg-warning">⭐ In Evidenza</span>' : ''}
                            <span class="badge bg-secondary">${article.categoria || 'Generale'}</span>
                        </div>
                        
                        <h5 class="card-title mb-1">${article.titolo || 'Senza titolo'}</h5>
                        
                        <p class="card-text text-muted small mb-2">
                            ${article.sommario ? article.sommario.substring(0, 150) + '...' : 'Nessun sommario'}
                        </p>
                        
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <small class="text-muted">
                                    <i class="bi bi-person"></i> 
                                    ${article.profili_redattori?.nome_visualizzato || 'Autore sconosciuto'}
                                </small>
                                <small class="text-muted ms-3">
                                    <i class="bi bi-calendar"></i> 
                                    ${formatDate(article.data_creazione)}
                                </small>
                                ${article.visualizzazioni > 0 ? `
                                    <small class="text-muted ms-3">
                                        <i class="bi bi-eye"></i> 
                                        ${article.visualizzazioni}
                                    </small>
                                ` : ''}
                            </div>
                            
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-primary" onclick="editArticle('${article.id}')">
                                    <i class="bi bi-pencil"></i> Modifica
                                </button>
                                ${canDeleteArticle(article) ? `
                                    <button class="btn btn-outline-danger" onclick="deleteArticle('${article.id}')">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = articlesHTML;
}

async function createOrUpdateArticle(articleData, articleId = null) {
    try {
        showLoading(true, articleId ? 'Salvataggio modifiche...' : 'Creazione articolo...');
        
        const now = new Date().toISOString();
        let articleToSave = {
            ...articleData,
            data_modifica: now
        };
        
        let wasPublished = false;
        let savedArticle = null;
        
        if (articleId) {
            // Check if article is being published now
            const { data: oldArticle } = await supabase
                .from('articoli')
                .select('stato')
                .eq('id', articleId)
                .single();
            
            wasPublished = oldArticle?.stato !== 'pubblicato' && articleData.stato === 'pubblicato';
            
            // Update existing article
            articleToSave.autore_id = currentUser.id;
            const { data, error } = await supabase
                .from('articoli')
                .update(articleToSave)
                .eq('id', articleId)
                .select()
                .single();
                
            if (error) throw error;
            savedArticle = data;
            showMessage('Articolo aggiornato con successo!', 'success');
            
        } else {
            // Create new article
            articleToSave.autore_id = currentUser.id;
            articleToSave.data_creazione = now;
            
            // Check if creating as published
            wasPublished = articleData.stato === 'pubblicato';
            
            const { data, error } = await supabase
                .from('articoli')
                .insert([articleToSave])
                .select()
                .single();
                
            if (error) throw error;
            savedArticle = data;
            showMessage('Articolo creato con successo!', 'success');
        }
        
        // Send newsletter if article was just published
        if (wasPublished && savedArticle) {
            try {
                showMessage('Invio newsletter in corso...', 'info');
                await sendNewsletterForArticle(savedArticle.id);
            } catch (newsletterError) {
                console.error('Newsletter error:', newsletterError);
                showMessage('Articolo salvato, ma errore nell\'invio newsletter', 'warning');
            }
        }
        
        return savedArticle;
        
    } catch (error) {
        console.error('Error saving article:', error);
        showMessage('Errore nel salvataggio dell\'articolo', 'error');
        throw error;
    } finally {
        showLoading(false);
    }
}

async function deleteArticle(articleId) {
    if (!confirm('Sei sicuro di voler eliminare questo articolo? Questa azione non può essere annullata.')) {
        return;
    }
    
    try {
        showLoading(true, 'Eliminazione in corso...');
        
        const { error } = await supabase
            .from('articoli')
            .delete()
            .eq('id', articleId);
            
        if (error) throw error;
        
        showMessage('Articolo eliminato con successo', 'success');
        loadArticles(getCurrentFilter());
        
    } catch (error) {
        console.error('Error deleting article:', error);
        showMessage('Errore durante l\'eliminazione', 'error');
    } finally {
        showLoading(false);
    }
}

async function changeArticleStatus(articleId, newStatus) {
    try {
        showLoading(true, 'Aggiornamento stato...');
        
        const { error } = await supabase
            .from('articoli')
            .update({ 
                stato: newStatus,
                data_pubblicazione: newStatus === 'pubblicato' ? new Date().toISOString() : null
            })
            .eq('id', articleId);
            
        if (error) throw error;
        
        showMessage(`Articolo ${getStatusText(newStatus).toLowerCase()}`, 'success');
        loadArticles(getCurrentFilter());
        
    } catch (error) {
        console.error('Error changing article status:', error);
        showMessage('Errore nell\'aggiornamento dello stato', 'error');
    } finally {
        showLoading(false);
    }
}

// ============================================
// EDITOR ARTICOLI
// ============================================

function openArticleEditor(article = null) {
    const modal = new bootstrap.Modal(document.getElementById('articleEditorModal'));
    const form = document.getElementById('articleForm');
    
    // Reset form
    form.reset();
    
    if (article) {
        // Modifica articolo esistente
        document.getElementById('editorTitle').textContent = 'Modifica Articolo';
        document.getElementById('articleId').value = article.id;
        document.getElementById('articleTitle').value = article.titolo || '';
        document.getElementById('articleSummary').value = article.sommario || '';
        document.getElementById('articleContent').value = article.contenuto || '';
        document.getElementById('articleCategory').value = article.categoria || 'Notizie';
        document.getElementById('articleStatus').value = article.stato || 'bozza';
        document.getElementById('articleFeatured').checked = article.in_evidenza || false;
        document.getElementById('articleImage').value = article.immagine_url || '';
    } else {
        // Nuovo articolo
        document.getElementById('editorTitle').textContent = 'Nuovo Articolo';
        document.getElementById('articleId').value = '';
        document.getElementById('articleStatus').value = 'bozza';
    }
    
    modal.show();
}

async function saveArticle() {
    const form = document.getElementById('articleForm');
    const formData = new FormData(form);
    
    const articleData = {
        titolo: formData.get('title'),
        sommario: formData.get('summary'),
        contenuto: formData.get('content'),
        categoria: formData.get('category'),
        stato: formData.get('status'),
        in_evidenza: formData.get('featured') === 'on',
        immagine_url: formData.get('image') || null
    };
    
    const articleId = formData.get('articleId');
    
    try {
        await createOrUpdateArticle(articleData, articleId || null);
        
        // Chiudi il modal e ricarica gli articoli
        bootstrap.Modal.getInstance(document.getElementById('articleEditorModal')).hide();
        loadArticles(getCurrentFilter());
        
    } catch (error) {
        console.error('Save article error:', error);
    }
}

// ============================================
// DASHBOARD E STATISTICHE
// ============================================

async function loadDashboardData() {
    if (!currentUser) return;
    
    try {
        // Statistiche articoli
        const { count: totalArticles } = await supabase
            .from('articoli')
            .select('*', { count: 'exact', head: true })
            .eq('autore_id', currentUser.id);
        
        const { count: publishedArticles } = await supabase
            .from('articoli')
            .select('*', { count: 'exact', head: true })
            .eq('autore_id', currentUser.id)
            .eq('stato', 'pubblicato');
        
        const { count: draftArticles } = await supabase
            .from('articoli')
            .select('*', { count: 'exact', head: true })
            .eq('autore_id', currentUser.id)
            .eq('stato', 'bozza');
        
        // Totale visualizzazioni
        const { data: viewsData } = await supabase
            .from('articoli')
            .select('visualizzazioni')
            .eq('autore_id', currentUser.id)
            .eq('stato', 'pubblicato');
        
        const totalViews = viewsData?.reduce((sum, article) => sum + (article.visualizzazioni || 0), 0) || 0;
        
        // Aggiorna UI
        document.getElementById('totalArticles').textContent = totalArticles || 0;
        document.getElementById('publishedArticles').textContent = publishedArticles || 0;
        document.getElementById('draftArticles').textContent = draftArticles || 0;
        document.getElementById('totalViews').textContent = totalViews;
        
        // Carica attività recente
        loadRecentActivity();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

async function loadRecentActivity() {
    try {
        const { data: activities, error } = await supabase
            .from('articoli')
            .select('titolo, stato, data_modifica')
            .eq('autore_id', currentUser.id)
            .order('data_modifica', { ascending: false })
            .limit(5);
            
        if (error) throw error;
        
        const container = document.getElementById('recentActivity');
        if (!container) return;
        
        if (!activities || activities.length === 0) {
            container.innerHTML = '<p class="text-muted">Nessuna attività recente</p>';
            return;
        }
        
        const activityHTML = activities.map(activity => `
            <div class="mb-2">
                <strong>${activity.titolo}</strong>
                <div class="d-flex justify-content-between">
                    <small class="text-muted">${getStatusText(activity.stato)}</small>
                    <small class="text-muted">${formatDate(activity.data_modifica)}</small>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = activityHTML;
        
    } catch (error) {
        console.error('Error loading recent activity:', error);
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function showLoginInterface() {
    document.getElementById('login-section').classList.remove('d-none');
    document.getElementById('admin-dashboard').classList.add('d-none');
}

function showAdminInterface() {
    document.getElementById('login-section').classList.add('d-none');
    document.getElementById('admin-dashboard').classList.remove('d-none');
    
    // Mostra il nome dell'utente
    const userName = currentUserProfile?.nome_visualizzato || currentUser.email;
    document.getElementById('userName').textContent = userName;
    document.getElementById('userRole').textContent = currentUserProfile?.ruolo || 'Reporter';
}

function updateUserUI() {
    if (!currentUserProfile) return;
    
    // Aggiorna header
    document.getElementById('userName').textContent = currentUserProfile.nome_visualizzato;
    document.getElementById('userRole').textContent = currentUserProfile.ruolo;
    document.getElementById('userEmail').textContent = currentUser.email;
    
    // Mostra/gestisci funzioni in base al ruolo
    const isEditor = ['Caporedattore', 'Editore'].includes(currentUserProfile.ruolo);
    document.querySelectorAll('.editor-only').forEach(el => {
        el.style.display = isEditor ? 'block' : 'none';
    });
}

function showLoading(show, message = '') {
    const loader = document.getElementById('loadingOverlay');
    const loaderText = document.getElementById('loadingText');
    
    if (loader) {
        loader.style.display = show ? 'flex' : 'none';
        if (loaderText && message) {
            loaderText.textContent = message;
        }
    }
}

function showMessage(text, type = 'info') {
    // Rimuovi messaggi precedenti
    const existingAlerts = document.querySelectorAll('.alert-dismissible');
    existingAlerts.forEach(alert => alert.remove());
    
    const alertClass = {
        'success': 'alert-success',
        'error': 'alert-danger',
        'warning': 'alert-warning',
        'info': 'alert-info'
    }[type] || 'alert-info';
    
    const alertHTML = `
        <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
            ${text}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    const container = document.getElementById('messages-container');
    if (container) {
        container.insertAdjacentHTML('afterbegin', alertHTML);
        
        // Rimuovi automaticamente dopo 5 secondi
        setTimeout(() => {
            const alert = container.querySelector('.alert');
            if (alert) alert.remove();
        }, 5000);
    }
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function getStatusText(status) {
    const statusMap = {
        'bozza': 'Bozza',
        'in_revisione': 'In Revisione',
        'pubblicato': 'Pubblicato'
    };
    return statusMap[status] || status;
}

function getStatusBadgeClass(status) {
    const classMap = {
        'bozza': 'bg-secondary',
        'in_revisione': 'bg-warning text-dark',
        'pubblicato': 'bg-success'
    };
    return classMap[status] || 'bg-secondary';
}

function getCurrentFilter() {
    const activeTab = document.querySelector('.nav-link.active[data-filter]');
    return activeTab ? activeTab.getAttribute('data-filter') : 'all';
}

function canDeleteArticle(article) {
    if (!currentUser) return false;
    
    const isOwner = article.autore_id === currentUser.id;
    const isEditor = currentUserProfile?.ruolo && ['Caporedattore', 'Editore'].includes(currentUserProfile.ruolo);
    
    return isOwner || isEditor;
}

function setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            handleLogin(email, password);
        });
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Filter tabs
    document.querySelectorAll('[data-filter]').forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Aggiorna tab attivo
            document.querySelectorAll('[data-filter]').forEach(t => {
                t.classList.remove('active');
            });
            this.classList.add('active');
            
            // Carica articoli con il filtro selezionato
            loadArticles(this.getAttribute('data-filter'));
        });
    });
    
    // New article button
    const newArticleBtn = document.getElementById('newArticleBtn');
    if (newArticleBtn) {
        newArticleBtn.addEventListener('click', () => openArticleEditor());
    }
    
    // Save article form
    const articleForm = document.getElementById('articleForm');
    if (articleForm) {
        articleForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveArticle();
        });
    }
    
    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => loadArticles(getCurrentFilter()));
    }
}

// ============================================
// FUNZIONI ESPORTATE PER L'USO IN HTML
// ============================================

window.editArticle = async function(articleId) {
    try {
        showLoading(true, 'Caricamento articolo...');
        
        const { data: article, error } = await supabase
            .from('articoli')
            .select('*')
            .eq('id', articleId)
            .single();
            
        if (error) throw error;
        
        openArticleEditor(article);
        
    } catch (error) {
        console.error('Error loading article:', error);
        showMessage('Errore nel caricamento dell\'articolo', 'error');
    } finally {
        showLoading(false);
    }
};

window.deleteArticle = deleteArticle;

window.publishArticle = function(articleId) {
    changeArticleStatus(articleId, 'pubblicato');
};

window.sendToReview = function(articleId) {
    changeArticleStatus(articleId, 'in_revisione');
};

window.saveAsDraft = function(articleId) {
    changeArticleStatus(articleId, 'bozza');
};

window.toggleFeatured = async function(articleId, currentState) {
    try {
        showLoading(true, 'Aggiornamento...');
        
        const { error } = await supabase
            .from('articoli')
            .update({ in_evidenza: !currentState })
            .eq('id', articleId);
            
        if (error) throw error;
        
        showMessage('Articolo aggiornato', 'success');
        loadArticles(getCurrentFilter());
        
    } catch (error) {
        console.error('Error toggling featured:', error);
        showMessage('Errore nell\'aggiornamento', 'error');
    } finally {
        showLoading(false);
    }
};

// ============================================
// INIZIALIZZAZIONE AUTOMATICA
// ============================================

// Avvia il sistema quando la pagina è caricata
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAdmin);
} else {
    initializeAdmin();
}

async function initializeAdmin() {
    try {
        // Inizializza Supabase se non già fatto
        if (typeof supabaseClient === 'undefined') {
            console.error('Supabase client non trovato. Assicurati di includere il CDN di Supabase.');
            return;
        }
        
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        await checkAuthStatus();
        setupEventListeners();
        
    } catch (error) {
        console.error('Errore di inizializzazione:', error);
    }
}

// Supporto per errori di rete
window.addEventListener('online', () => {
    showMessage('Connessione ripristinata', 'success');
    loadArticles(getCurrentFilter());
});

window.addEventListener('offline', () => {
    showMessage('Connessione persa. Alcune funzioni potrebbero non funzionare.', 'warning');
});

// ============================================
// GEMINI AI IMAGE GENERATION
// ============================================

/**
 * Generate AI image based on article title and content
 */
async function generateAIImage() {
    const title = document.getElementById('article-title')?.value || '';
    const content = document.getElementById('article-content')?.value || '';
    
    if (!title || !content) {
        showMessage('Inserisci titolo e contenuto prima di generare l\'immagine', 'error');
        return;
    }
    
    // Show loading
    document.getElementById('ai-loading').style.display = 'block';
    document.getElementById('ai-image-preview').style.display = 'none';
    document.getElementById('generate-ai-image').disabled = true;
    
    try {
        // Step 1: Use Gemini to generate image search keywords
        const keywords = await generateImageKeywords(title, content);
        
        // Step 2: Fetch image from Unsplash based on keywords
        const imageUrl = await fetchUnsplashImage(keywords);
        
        if (imageUrl) {
            generatedImageUrl = imageUrl;
            
            // Show preview
            document.getElementById('ai-preview-img').src = imageUrl;
            document.getElementById('ai-image-preview').style.display = 'block';
            document.getElementById('ai-loading').style.display = 'none';
            
            showMessage('Immagine generata con successo!', 'success');
        } else {
            throw new Error('Impossibile generare l\'immagine');
        }
    } catch (error) {
        console.error('Error generating AI image:', error);
        showMessage('Errore nella generazione dell\'immagine: ' + error.message, 'error');
        document.getElementById('ai-loading').style.display = 'none';
    } finally {
        document.getElementById('generate-ai-image').disabled = false;
    }
}

/**
 * Use Gemini AI to generate professional image search keywords
 */
async function generateImageKeywords(title, content) {
    const prompt = `Based on this news article, generate 3-5 professional, realistic photo search keywords that would be suitable for a news publication. Focus on real-world photography, not illustrations or cartoons.

Article Title: ${title}
Article Summary: ${content.substring(0, 500)}

Respond with ONLY comma-separated keywords, nothing else. Example: "students, classroom, education, learning"`;

    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });
        
        if (!response.ok) {
            throw new Error('Gemini API error: ' + response.status);
        }
        
        const data = await response.json();
        const keywords = data.candidates[0]?.content?.parts[0]?.text?.trim() || 'school, students, education';
        
        console.log('Generated keywords:', keywords);
        return keywords;
    } catch (error) {
        console.error('Gemini API error:', error);
        // Fallback keywords
        return 'school, students, education, learning';
    }
}

/**
 * Fetch professional image from Unsplash
 */
async function fetchUnsplashImage(keywords) {
    // Using Unsplash Source API (no key required, but limited)
    // For production, use official Unsplash API with proper authentication
    
    const query = encodeURIComponent(keywords.split(',')[0].trim());
    const unsplashUrl = `https://source.unsplash.com/1200x600/?${query},professional,news`;
    
    return unsplashUrl;
}

/**
 * Confirm and use the generated AI image
 */
function confirmAIImage() {
    if (generatedImageUrl) {
        document.getElementById('article-image').value = generatedImageUrl;
        showMessage('Immagine selezionata! Salva l\'articolo per confermare.', 'success');
        
        // Switch back to manual tab to show the URL
        const manualTab = new bootstrap.Tab(document.getElementById('manual-tab'));
        manualTab.show();
    }
}

/**
 * Regenerate AI image with different parameters
 */
async function regenerateAIImage() {
    await generateAIImage();
}


// ============================================
// NEWSLETTER SYSTEM
// ============================================

/**
 * Send newsletter to all subscribers when article is published
 */
async function sendNewsletterForArticle(articleId) {
    try {
        console.log('Sending newsletter for article:', articleId);
        
        // Call Supabase Edge Function
        const { data, error } = await supabase.functions.invoke('send-newsletter', {
            body: { articleId }
        });
        
        if (error) {
            console.error('Newsletter send error:', error);
            throw error;
        }
        
        console.log('Newsletter sent successfully:', data);
        
        if (data.sentCount > 0) {
            showMessage(`Newsletter inviata a ${data.sentCount} iscritti!`, 'success');
        } else {
            showMessage('Nessun iscritto attivo per la newsletter', 'info');
        }
        
        return data;
        
    } catch (error) {
        console.error('Error in sendNewsletterForArticle:', error);
        throw error;
    }
}

/**
 * Preview newsletter before sending (for testing)
 */
async function previewNewsletter(articleId) {
    try {
        const { data: article, error } = await supabase
            .from('articoli')
            .select(`
                id,
                titolo,
                sommario,
                immagine_url,
                profili_redattori(nome_visualizzato)
            `)
            .eq('id', articleId)
            .single();
        
        if (error) throw error;
        
        const author = article.profili_redattori?.nome_visualizzato || 'Redazione Cesaris';
        const articleUrl = `${window.location.origin}/articolo/${article.id}`;
        
        const previewHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #1e3a8a 0%, #1e293b 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1>📰 Giornale Cesaris</h1>
                    <p>Nuovo Articolo Pubblicato!</p>
                </div>
                <div style="background: white; padding: 30px; border: 1px solid #e2e8f0;">
                    <h2>${article.titolo}</h2>
                    ${article.immagine_url ? `<img src="${article.immagine_url}" style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 8px; margin: 20px 0;">` : ''}
                    <p>${article.sommario || ''}</p>
                    <p><strong>Autore:</strong> ${author}</p>
                    <a href="${articleUrl}" style="display: inline-block; background: #fbbf24; color: #1e3a8a; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0;">
                        Leggi l'articolo completo
                    </a>
                </div>
                <div style="background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-radius: 0 0 10px 10px;">
                    <p>&copy; 2025 Giornale Cesaris. Tutti i diritti riservati.</p>
                </div>
            </div>
        `;
        
        // Open preview in new window
        const previewWindow = window.open('', 'Newsletter Preview', 'width=700,height=800');
        previewWindow.document.write(previewHtml);
        previewWindow.document.close();
        
    } catch (error) {
        console.error('Error previewing newsletter:', error);
        showMessage('Errore nel caricamento preview', 'error');
    }
}
