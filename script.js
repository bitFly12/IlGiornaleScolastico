// Configurazione Supabase
let supabaseClient;
let articoliCaricati = 0;
const ARTICOLI_PER_PAGINA = 6;

function initSupabase(url, key) {
    supabaseClient = supabase.createClient(url, key);
    console.log('Supabase inizializzato');
}

// 1. CARICAMENTO ARTICOLI
async function caricaUltimiArticoli() {
    try {
        const { data: articoli, error } = await supabaseClient
            .from('articoli')
            .select(`
                id,
                titolo,
                sommario,
                contenuto,
                categoria,
                autore_id,
                data_pubblicazione,
                immagine_url,
                visualizzazioni,
                profili_redattori(nome_visualizzato)
            `)
            .eq('stato', 'pubblicato')
            .order('data_pubblicazione', { ascending: false })
            .range(articoliCaricati, articoliCaricati + ARTICOLI_PER_PAGINA - 1);

        if (error) throw error;

        if (articoli.length > 0) {
            mostraArticoli(articoli);
            articoliCaricati += articoli.length;
            
            // Aggiorna contatore articoli
            document.getElementById('contatore-articoli').textContent = 
                parseInt(document.getElementById('contatore-articoli').textContent) + articoli.length;
        } else {
            document.getElementById('carica-altri').disabled = true;
            document.getElementById('carica-altri').textContent = 'Nessun altro articolo';
        }
    } catch (error) {
        console.error('Errore caricamento articoli:', error);
        document.getElementById('container-articoli').innerHTML = `
            <div class="alert alert-danger">
                Errore nel caricamento degli articoli. Riprova più tardi.
            </div>
        `;
    }
}

function mostraArticoli(articoli) {
    const container = document.getElementById('container-articoli');
    
    // Rimuovi spinner se presente
    const spinner = container.querySelector('.spinner-border');
    if (spinner) spinner.remove();
    
    articoli.forEach(articolo => {
        const autore = articolo.profili_redattori?.nome_visualizzato || 'Redazione';
        const data = new Date(articolo.data_pubblicazione).toLocaleDateString('it-IT');
        
        const articleHTML = `
            <div class="col-md-6 col-lg-4">
                <div class="card card-article h-100">
                    ${articolo.immagine_url ? 
                        `<img src="${articolo.immagine_url}" class="card-img-top" alt="${articolo.titolo}">` : 
                        `<div class="card-img-top bg-secondary d-flex align-items-center justify-content-center">
                            <i class="bi bi-newspaper text-white display-4"></i>
                        </div>`
                    }
                    <div class="card-body d-flex flex-column">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <span class="badge bg-primary">${articolo.categoria || 'Generale'}</span>
                            <small class="text-muted">${data}</small>
                        </div>
                        <h5 class="card-title">${articolo.titolo}</h5>
                        <p class="card-text flex-grow-1">${articolo.sommario || ''}</p>
                        <div class="d-flex justify-content-between align-items-center mt-auto">
                            <small class="text-muted">Di ${autore}</small>
                            <a href="#" class="btn btn-sm btn-outline-primary" 
                               onclick="leggiArticolo('${articolo.id}')">
                                Leggi <i class="bi bi-arrow-right"></i>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML += articleHTML;
    });
}

// 2. ARTICOLI IN EVIDENZA
async function caricaArticoliInEvidenza() {
    try {
        const { data: articoli, error } = await supabaseClient
            .from('articoli')
            .select('*')
            .eq('stato', 'pubblicato')
            .eq('in_evidenza', true)
            .order('data_pubblicazione', { ascending: false })
            .limit(5);

        if (error) throw error;

        const carouselInner = document.getElementById('carousel-inner');
        carouselInner.innerHTML = '';

        articoli.forEach((articolo, index) => {
            const activeClass = index === 0 ? 'active' : '';
            const data = new Date(articolo.data_pubblicazione).toLocaleDateString('it-IT');
            
            carouselInner.innerHTML += `
                <div class="carousel-item ${activeClass}">
                    <div class="carousel-item-content">
                        <h3>${articolo.titolo}</h3>
                        <p>${articolo.sommario}</p>
                        <div class="d-flex justify-content-between">
                            <span class="badge bg-warning">IN EVIDENZA</span>
                            <a href="#" class="btn btn-light" onclick="leggiArticolo('${articolo.id}')">
                                Leggi l'articolo completo
                            </a>
                        </div>
                    </div>
                </div>
            `;
        });
    } catch (error) {
        console.error('Errore caricamento articoli in evidenza:', error);
    }
}

// 3. FUNZIONE PER LEGGERE ARTICOLO COMPLETO
function leggiArticolo(id) {
    // Incrementa contatore visualizzazioni
    supabaseClient
        .from('articoli')
        .update({ visualizzazioni: supabaseClient.increment(1) })
        .eq('id', id);
    
    // Mostra articolo in modal
    const modalHTML = `
        <div class="modal fade" id="modal-articolo">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Caricamento...</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="text-center">
                            <div class="spinner-border text-primary"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = new bootstrap.Modal(document.getElementById('modal-articolo'));
    modal.show();
    
    // Carica articolo completo
    caricaArticoloCompleto(id, modal);
}

async function caricaArticoloCompleto(id, modal) {
    try {
        const { data: articolo, error } = await supabaseClient
            .from('articoli')
            .select(`
                *,
                profili_redattori(nome_visualizzato, ruolo)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;

        const modalElement = document.getElementById('modal-articolo');
        const data = new Date(articolo.data_pubblicazione).toLocaleDateString('it-IT');
        const autore = articolo.profili_redattori?.nome_visualizzato || 'Redazione';
        const ruolo = articolo.profili_redattori?.ruolo || 'Reporter';

        modalElement.querySelector('.modal-title').textContent = articolo.titolo;
        modalElement.querySelector('.modal-body').innerHTML = `
            <article>
                <div class="mb-4">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <div>
                            <span class="badge bg-primary">${articolo.categoria}</span>
                            <span class="badge bg-secondary ms-2">${data}</span>
                        </div>
                        <small class="text-muted">${articolo.visualizzazioni || 0} visualizzazioni</small>
                    </div>
                    
                    ${articolo.immagine_url ? 
                        `<img src="${articolo.immagine_url}" class="img-fluid rounded mb-4" alt="${articolo.titolo}">` : ''
                    }
                    
                    <div class="alert alert-info">
                        <i class="bi bi-person-circle"></i> 
                        <strong>${autore}</strong> - ${ruolo}
                    </div>
                    
                    <div class="articolo-contenuto">
                        ${articolo.contenuto || '<p>Contenuto non disponibile</p>'}
                    </div>
                </div>
                
                <div class="d-flex justify-content-between border-top pt-3">
                    <button class="btn btn-outline-primary" onclick="condividiArticolo('${articolo.id}', '${articolo.titolo}')">
                        <i class="bi bi-share"></i> Condividi
                    </button>
                    <button class="btn btn-primary" data-bs-dismiss="modal">
                        Chiudi
                    </button>
                </div>
            </article>
        `;
    } catch (error) {
        console.error('Errore caricamento articolo:', error);
        modalElement.querySelector('.modal-body').innerHTML = `
            <div class="alert alert-danger">
                Errore nel caricamento dell'articolo. Riprova più tardi.
            </div>
        `;
    }
}

// 4. CATEGORIE
async function caricaCategorie() {
    try {
        const { data: categorie, error } = await supabaseClient
            .from('articoli')
            .select('categoria')
            .eq('stato', 'pubblicato');

        if (error) throw error;

        const categorieUniche = [...new Set(categorie.map(c => c.categoria).filter(Boolean))];
        const container = document.getElementById('categorie-list');
        
        categorieUniche.forEach(categoria => {
            container.innerHTML += `
                <a href="#" class="badge-categoria" onclick="filtraPerCategoria('${categoria}')">
                    ${categoria}
                </a>
            `;
        });
    } catch (error) {
        console.error('Errore caricamento categorie:', error);
    }
}

function filtraPerCategoria(categoria) {
    alert(`Filtro per categoria: ${categoria}\n(Questa funzionalità sarà implementata nella prossima versione!)`);
}

// 5. STATISTICHE
async function caricaStatistiche() {
    try {
        // Conta articoli pubblicati
        const { count: articoliCount } = await supabaseClient
            .from('articoli')
            .select('*', { count: 'exact', head: true })
            .eq('stato', 'pubblicato');

        // Conta redattori attivi
        const { count: redattoriCount } = await supabaseClient
            .from('profili_redattori')
            .select('*', { count: 'exact', head: true });

        document.getElementById('contatore-articoli').textContent = articoliCount || 0;
        document.getElementById('contatore-redattori').textContent = redattoriCount || 0;
    } catch (error) {
        console.error('Errore caricamento statistiche:', error);
    }
}

// 6. FUNZIONALITÀ AGGIUNTIVE
function caricaAltriArticoli() {
    document.getElementById('carica-altri').disabled = true;
    document.getElementById('carica-altri').innerHTML = `
        <span class="spinner-border spinner-border-sm"></span> Caricamento...
    `;
    
    caricaUltimiArticoli().then(() => {
        document.getElementById('carica-altri').disabled = false;
        document.getElementById('carica-altri').innerHTML = `
            <i class="bi bi-plus-circle"></i> Carica Altri Articoli
        `;
    });
}

function ordinaArticoli(criterio) {
    alert(`Ordina per: ${criterio}\n(Implementazione in corso...)`);
}

function iscrivitiNewsletter() {
    const email = document.getElementById('email-newsletter')?.value || '';
    
    if (email && email.includes('@')) {
        // Salva su Supabase
        supabaseClient
            .from('newsletter')
            .insert([{ email: email, data_iscrizione: new Date().toISOString() }])
            .then(() => {
                alert('Grazie per esserti iscritto alla newsletter!');
            });
    } else {
        alert('Per favore, inserisci un indirizzo email valido.');
    }
}

function condividiArticolo(id, titolo) {
    if (navigator.share) {
        navigator.share({
            title: titolo,
            text: 'Leggi questo articolo sul Giornale Scolastico:',
            url: `${window.location.origin}/articolo.html?id=${id}`
        });
    } else {
        // Fallback per browser che non supportano Web Share API
        navigator.clipboard.writeText(`${window.location.origin}/articolo.html?id=${id}`);
        alert('Link copiato negli appunti!');
    }
}

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const icon = document.querySelector('[onclick="toggleDarkMode()"] i');
    
    if (document.body.classList.contains('dark-mode')) {
        icon.className = 'bi bi-sun';
        localStorage.setItem('darkMode', 'enabled');
    } else {
        icon.className = 'bi bi-moon';
        localStorage.setItem('darkMode', 'disabled');
    }
}

// Controlla preferenza dark mode salvata
if (localStorage.getItem('darkMode') === 'enabled') {
    document.body.classList.add('dark-mode');
    const icon = document.querySelector('[onclick="toggleDarkMode()"] i');
    if (icon) icon.className = 'bi bi-sun';
}

// 7. VERIFICA LOGIN
async function verificaLoginStatus() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (session) {
        // Utente loggato
        const btnRedazione = document.querySelector('a[href="area-riservata.html"]');
        if (btnRedazione) {
            btnRedazione.innerHTML = `<i class="bi bi-person-check"></i> Area Redazione`;
            btnRedazione.classList.remove('btn-warning');
            btnRedazione.classList.add('btn-success');
        }
    }
}
