// ============================================
// admin.js - Area Riservata Redazione
// Giornale Scolastico - Supabase Backend
// ============================================

// Configurazione Supabase
const SUPABASE_URL = 'https://ftazdkxyfekyzfvgrgiw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0YXpka3h5ZmVreXpmdmdyZ2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwNTE3MzQsImV4cCI6MjA4MDYyNzczNH0._V8LM9f8Dz2s9j8hcxUEWkHN8FMX9QW7YzKH3CgAzdU';

let supabase;
let currentUser = null;
let currentUserProfile = null;

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
        
        if (articleId) {
            // Update existing article
            articleToSave.autore_id = currentUser.id;
            const { data, error } = await supabase
                .from('articoli')
                .update(articleToSave)
                .eq('id', articleId)
                .select()
                .single();
                
            if (error) throw error;
            showMessage('Articolo aggiornato con successo!', 'success');
            return data;
            
        } else {
            // Create new article
            articleToSave.autore_id = currentUser.id;
            articleToSave.data_creazione = now;
            
            const { data, error } = await supabase
                .from('articoli')
                .insert([articleToSave])
                .select()
                .single();
                
            if (error) throw error;
            showMessage('Articolo creato con successo!', 'success');
            return data;
        }
        
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
