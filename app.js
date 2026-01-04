// ================================
// SEOLLERHAUS KASSA - MAIN APP
// ================================

/* ===== DATABASE SETUP (Dexie.js) ===== */
const db = new Dexie('SeollerhausKassa');

db.version(1).stores({
    gaeste: 'gast_id, nachname, aktiv, zimmernummer, checked_out',
    buchungen: 'buchung_id, gast_id, datum, exportiert, sync_status, [gast_id+datum]',
    artikel: 'artikel_id, kategorie_id, name, aktiv',
    kategorien: 'kategorie_id, name, sortierung',
    settings: 'key',
    exports: '++id, timestamp, anzahl_buchungen'
});

/* ===== UTILITY FUNCTIONS ===== */
const Utils = {
    // UUID Generator
    uuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    // Get Device ID
    getDeviceId() {
        let deviceId = localStorage.getItem('device_id');
        if (!deviceId) {
            deviceId = this.uuid();
            localStorage.setItem('device_id', deviceId);
        }
        return deviceId;
    },

    // Format Date
    formatDate(date) {
        if (!(date instanceof Date)) date = new Date(date);
        return date.toISOString().split('T')[0]; // YYYY-MM-DD
    },

    // Format Time
    formatTime(date) {
        if (!(date instanceof Date)) date = new Date(date);
        return date.toTimeString().split(' ')[0]; // HH:mm:ss
    },

    // Format Currency
    formatCurrency(amount) {
        return new Intl.NumberFormat('de-AT', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount);
    },

    // Hash Password (SHA-256)
    async hashPassword(password, salt = '') {
        const encoder = new TextEncoder();
        const data = encoder.encode(password + salt);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },

    // Show Toast
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'toastOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    // Debounce
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

/* ===== STATE MANAGEMENT ===== */
const State = {
    currentUser: null,
    currentPage: 'login',
    warenkorb: [],
    selectedCategory: null,
    isAdmin: false,

    setUser(user) {
        this.currentUser = user;
        localStorage.setItem('current_user_id', user.gast_id);
    },

    clearUser() {
        this.currentUser = null;
        localStorage.removeItem('current_user_id');
        localStorage.removeItem('remember_me');
    },

    addToWarenkorb(artikel, menge = 1) {
        const existing = this.warenkorb.find(item => item.artikel_id === artikel.artikel_id);
        if (existing) {
            existing.menge += menge;
        } else {
            this.warenkorb.push({ ...artikel, menge });
        }
        this.updateWarenkorbUI();
    },

    removeFromWarenkorb(artikel_id) {
        this.warenkorb = this.warenkorb.filter(item => item.artikel_id !== artikel_id);
        this.updateWarenkorbUI();
    },

    clearWarenkorb() {
        this.warenkorb = [];
        this.updateWarenkorbUI();
    },

    updateWarenkorbUI() {
        // Will be implemented in UI section
        if (typeof UI !== 'undefined' && UI.renderWarenkorb) {
            UI.renderWarenkorb();
        }
    },

    getWarenkorbTotal() {
        return this.warenkorb.reduce((sum, item) => sum + (item.preis * item.menge), 0);
    }
};

/* ===== AUTH SERVICE ===== */
const Auth = {
    async register(nachname, vorname, zimmernummer, passwort) {
        try {
            // Validate
            if (!nachname || !passwort) {
                throw new Error('Nachname und Passwort sind erforderlich');
            }

            if (passwort.length < 6) {
                throw new Error('Passwort muss mindestens 6 Zeichen lang sein');
            }

            // Check if user exists
            const existing = await db.gaeste
                .where('nachname').equalsIgnoreCase(nachname)
                .and(g => g.zimmernummer === zimmernummer)
                .first();

            if (existing) {
                throw new Error('Ein Gast mit diesem Namen und Zimmer existiert bereits');
            }

            // Create user
            const gast = {
                gast_id: Utils.uuid(),
                nachname: nachname.trim(),
                vorname: vorname?.trim() || '',
                zimmernummer: zimmernummer?.trim() || '',
                passwort_hash: await Utils.hashPassword(passwort, nachname),
                aktiv: true,
                checked_out: false,
                anreise_datum: Utils.formatDate(new Date()),
                erstellt_am: new Date().toISOString()
            };

            await db.gaeste.add(gast);
            Utils.showToast('Account erfolgreich erstellt!', 'success');
            return gast;
        } catch (error) {
            Utils.showToast(error.message, 'error');
            throw error;
        }
    },

    async login(nachname, passwort, rememberMe = false) {
        try {
            const gast = await db.gaeste
                .where('nachname').equalsIgnoreCase(nachname.trim())
                .first();

            if (!gast) {
                throw new Error('Gast nicht gefunden');
            }

            if (gast.checked_out) {
                throw new Error('Ihr Account wurde ausgecheckt. Bitte wenden Sie sich an die Rezeption.');
            }

            const hash = await Utils.hashPassword(passwort, gast.nachname);
            if (hash !== gast.passwort_hash) {
                throw new Error('Falsches Passwort');
            }

            State.setUser(gast);
            if (rememberMe) {
                localStorage.setItem('remember_me', 'true');
            }

            Utils.showToast(`Willkommen zurück, ${gast.vorname || gast.nachname}!`, 'success');
            return gast;
        } catch (error) {
            Utils.showToast(error.message, 'error');
            throw error;
        }
    },

    // ✅ FIX: Admin-Login wird in sessionStorage gemerkt
    async adminLogin(passwort) {
        const settings = await db.settings.get('admin_password');
        const storedHash = settings?.value || await Utils.hashPassword('admin123'); // Default password

        const hash = await Utils.hashPassword(passwort);
        if (hash === storedHash) {
            State.isAdmin = true;

            // ✅ Admin-Status für diese Browser-Session merken
            sessionStorage.setItem('is_admin', '1');

            Utils.showToast('Admin-Login erfolgreich', 'success');
            return true;
        } else {
            Utils.showToast('Falsches Admin-Passwort', 'error');
            return false;
        }
    },

    // ✅ FIX: Logout löscht Admin-Session
    logout() {
        State.clearUser();
        State.isAdmin = false;

        // ✅ Admin-Session löschen
        sessionStorage.removeItem('is_admin');

        Router.navigate('login');
        Utils.showToast('Erfolgreich abgemeldet', 'info');
    },

    async autoLogin() {
        const userId = localStorage.getItem('current_user_id');
        const rememberMe = localStorage.getItem('remember_me');

        if (userId && rememberMe) {
            const gast = await db.gaeste.get(userId);
            if (gast && !gast.checked_out) {
                State.setUser(gast);
                return true;
            }
        }
        return false;
    }
};

/* ===== BUCHUNGS SERVICE ===== */
const Buchungen = {
    async create(artikel, menge = 1) {
        try {
            if (!State.currentUser) {
                throw new Error('Kein Benutzer angemeldet');
            }

            const buchung = {
                buchung_id: Utils.uuid(),
                gast_id: State.currentUser.gast_id,
                gast_nachname: State.currentUser.nachname,
                gast_vorname: State.currentUser.vorname,
                gastgruppe: State.currentUser.zimmernummer,
                artikel_id: artikel.artikel_id,
                artikel_name: artikel.name,
                preis: artikel.preis,
                steuer_prozent: artikel.steuer_prozent || 10,
                menge: menge,
                datum: Utils.formatDate(new Date()),
                uhrzeit: Utils.formatTime(new Date()),
                erstellt_am: new Date().toISOString(),
                exportiert: false,
                geraet_id: Utils.getDeviceId(),
                sync_status: 'pending'
            };

            await db.buchungen.add(buchung);
            return buchung;
        } catch (error) {
            console.error('Fehler beim Erstellen der Buchung:', error);
            throw error;
        }
    },

    async createFromWarenkorb() {
        try {
            if (State.warenkorb.length === 0) {
                throw new Error('Warenkorb ist leer');
            }

            const buchungen = [];
            for (const item of State.warenkorb) {
                const buchung = await this.create(item, item.menge);
                buchungen.push(buchung);
            }

            State.clearWarenkorb();
            Utils.showToast(`${buchungen.length} Artikel erfolgreich gebucht!`, 'success');
            return buchungen;
        } catch (error) {
            Utils.showToast(error.message, 'error');
            throw error;
        }
    },

    async getByGast(gast_id, limit = null) {
        let query = db.buchungen.where('gast_id').equals(gast_id).reverse();
        if (limit) {
            query = query.limit(limit);
        }
        return await query.toArray();
    },

    async getAll(filter = {}) {
        let query = db.buchungen.toCollection();

        if (filter.exportiert !== undefined) {
            query = query.filter(b => b.exportiert === filter.exportiert);
        }

        return await query.toArray();
    },

    async markAsExported(buchung_ids) {
        try {
            for (const id of buchung_ids) {
                await db.buchungen.update(id, { exportiert: true, sync_status: 'exported' });
            }
        } catch (error) {
            console.error('Fehler beim Markieren als exportiert:', error);
            throw error;
        }
    }
};

/* ===== ARTIKEL SERVICE ===== */
const Artikel = {
    async getAll() {
        return await db.artikel.where('aktiv').equals(true).toArray();
    },

    async getByKategorie(kategorie_id) {
        return await db.artikel
            .where('kategorie_id').equals(kategorie_id)
            .and(a => a.aktiv === true)
            .sortBy('sortierung');
    },

    async importFromCSV(csvText) {
        try {
            const lines = csvText.trim().split('\n');
            const headers = lines[0].split(',').map(h => h.trim());

            // Expect: artikel_id,kategorie_id,name,name_kurz,preis,steuer_prozent,kategorie_name,aktiv,sortierung,icon
            const artikelList = [];

            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
                const row = {};
                headers.forEach((h, idx) => row[h] = values[idx]);

                artikelList.push({
                    artikel_id: parseInt(row.artikel_id, 10),
                    kategorie_id: parseInt(row.kategorie_id, 10),
                    name: row.name,
                    name_kurz: row.name_kurz || row.name,
                    preis: parseFloat(row.preis),
                    steuer_prozent: parseInt(row.steuer_prozent || '10', 10),
                    kategorie_name: row.kategorie_name || '',
                    aktiv: row.aktiv === 'true' || row.aktiv === '1' || row.aktiv === true,
                    sortierung: parseInt(row.sortierung || '0', 10),
                    icon: row.icon || ''
                });
            }

            await db.artikel.clear();
            await db.artikel.bulkAdd(artikelList);
            Utils.showToast(`${artikelList.length} Artikel importiert`, 'success');
        } catch (error) {
            Utils.showToast('Artikel-Import Fehler: ' + error.message, 'error');
            throw error;
        }
    },

    async seed() {
        // Default articles (kann später per CSV überschrieben werden)
        const defaultArtikel = [
            { artikel_id: 1, kategorie_id: 1, name: 'Apfelsaftschorle', name_kurz: 'Apfelsaft-', preis: 1.60, steuer_prozent: 10, kategorie_name: 'Alkoholfreie Getränke', aktiv: true, sortierung: 10, icon: '🍎' },
            { artikel_id: 2, kategorie_id: 1, name: 'Orangensaft 1,0 L', name_kurz: 'Orangen-', preis: 4.00, steuer_prozent: 10, kategorie_name: 'Alkoholfreie Getränke', aktiv: true, sortierung: 20, icon: '🍊' },
            { artikel_id: 3, kategorie_id: 2, name: 'Pils 0,33 L', name_kurz: 'Pils', preis: 2.00, steuer_prozent: 20, kategorie_name: 'Biere', aktiv: true, sortierung: 10, icon: '🍺' },
            { artikel_id: 4, kategorie_id: 6, name: 'Kaffee', name_kurz: 'Kaffee', preis: 3.20, steuer_prozent: 10, kategorie_name: 'Heiße Getränke', aktiv: true, sortierung: 10, icon: '☕' },
            { artikel_id: 5, kategorie_id: 6, name: 'Tee', name_kurz: 'Tee', preis: 3.20, steuer_prozent: 10, kategorie_name: 'Heiße Getränke', aktiv: true, sortierung: 20, icon: '🍵' }
        ];

        const count = await db.artikel.count();
        if (count === 0) {
            await db.artikel.bulkAdd(defaultArtikel);
        }
    }
};

/* ===== EXPORT SERVICE ===== */
const ExportService = {
    async exportBuchungenCSV() {
        try {
            const buchungen = await Buchungen.getAll({ exportiert: false });

            if (buchungen.length === 0) {
                Utils.showToast('Keine neuen Buchungen zum Exportieren', 'warning');
                return null;
            }

            // CSV Header
            let csv = 'buchung_id,gast_web_uuid,gast_nachname,gast_vorname,zimmernummer,artikel_id,artikel_name,menge,preis,steuer_prozent,datum,uhrzeit,geraet_id\n';

            // CSV Rows
            buchungen.forEach(b => {
                csv += `"${b.buchung_id}","${b.gast_id}","${b.gast_nachname}","${b.gast_vorname}","${b.gastgruppe}",${b.artikel_id},"${b.artikel_name}",${b.menge},${b.preis},${b.steuer_prozent},"${b.datum}","${b.uhrzeit}","${b.geraet_id}"\n`;
            });

            // Add UTF-8 BOM for Access compatibility
            const bom = '\uFEFF';
            const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });

            // Generate filename
            const now = new Date();
            const timestamp = now.toISOString().replace(/[:.]/g, '-').split('T')[0] + '-' +
                now.getHours().toString().padStart(2, '0') +
                now.getMinutes().toString().padStart(2, '0') +
                now.getSeconds().toString().padStart(2, '0');
            const filename = `Seollerhaus-Buchungen-${timestamp}.csv`;

            // Download
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            link.click();

            // Mark as exported
            await Buchungen.markAsExported(buchungen.map(b => b.buchung_id));

            // Log export
            await db.exports.add({
                timestamp: new Date().toISOString(),
                anzahl_buchungen: buchungen.length,
                filename: filename
            });

            Utils.showToast(`${buchungen.length} Buchungen exportiert`, 'success');
            return filename;
        } catch (error) {
            Utils.showToast('Export-Fehler: ' + error.message, 'error');
            throw error;
        }
    }
};

/* ===== ROUTER ===== */
const Router = {
    routes: {},

    init() {
        window.addEventListener('popstate', () => this.handleRoute());
        this.handleRoute();
    },

    register(path, handler) {
        this.routes[path] = handler;
    },

    navigate(path) {
        history.pushState({}, '', `#${path}`);
        this.handleRoute();
    },

    handleRoute() {
        const path = location.hash.slice(1) || 'login';
        const handler = this.routes[path] || this.routes['login'];
        State.currentPage = path;
        if (handler) {
            handler();
        }
    }
};

/* ===== UI RENDERER ===== */
const UI = {
    render(html) {
        document.getElementById('app').innerHTML = html;
    }
};

// ===== LOGIN PAGE =====
Router.register('login', () => {
    UI.render(`
        <div class="main-content">
            <div style="max-width: 420px; margin: 60px auto;">
                <h1 class="page-title" style="text-align:center;">Seollerhaus Kassa</h1>
                <p style="text-align:center; color: var(--color-slate); margin-bottom: 30px;">Self-Service Buchung</p>

                <form onsubmit="handleLogin(event)">
                    <div class="form-group">
                        <label class="form-label">Nachname</label>
                        <input type="text" name="nachname" class="form-input" required autocomplete="family-name">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Passwort</label>
                        <input type="password" name="passwort" class="form-input" required>
                    </div>

                    <div class="form-group" style="display:flex; align-items:center; gap:10px;">
                        <input type="checkbox" id="remember" name="remember">
                        <label for="remember" class="text-muted" style="margin:0;">Passwort merken</label>
                    </div>

                    <button type="submit" class="btn btn-primary btn-block">Anmelden</button>

                    <div style="height: 16px;"></div>
                    <div style="text-align:center; color: #9aa4b2;">Noch kein Account?</div>
                    <button type="button" class="btn btn-secondary btn-block mt-2" onclick="Router.navigate('register')">Jetzt registrieren</button>

                    <div style="height: 10px;"></div>
                    <button type="button" class="btn btn-secondary btn-block mt-2" onclick="Router.navigate('admin-login')">Admin-Login</button>
                </form>
            </div>
        </div>
    `);
});

// ===== REGISTER PAGE =====
Router.register('register', () => {
    UI.render(`
        <div class="main-content">
            <div style="max-width: 420px; margin: 40px auto;">
                <h1 class="page-title">Registrieren</h1>

                <form onsubmit="handleRegister(event)">
                    <div class="form-group">
                        <label class="form-label">Nachname *</label>
                        <input type="text" name="nachname" class="form-input" required autocomplete="family-name">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Vorname</label>
                        <input type="text" name="vorname" class="form-input" autocomplete="given-name">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Zimmernummer</label>
                        <input type="text" name="zimmernummer" class="form-input" placeholder="z.B. 12">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Passwort *</label>
                        <input type="password" name="passwort" class="form-input" minlength="6" required>
                        <small class="text-muted">Mindestens 6 Zeichen</small>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Passwort wiederholen *</label>
                        <input type="password" name="passwort2" class="form-input" minlength="6" required>
                    </div>

                    <button type="submit" class="btn btn-primary btn-block">Account erstellen</button>
                    <button type="button" class="btn btn-secondary btn-block mt-2" onclick="Router.navigate('login')">Zurück zum Login</button>
                </form>
            </div>
        </div>
    `);
});

// ===== ADMIN LOGIN =====
Router.register('admin-login', () => {
    UI.render(`
        <div class="main-content">
            <div style="max-width: 400px; margin: 60px auto;">
                <h1 class="page-title">Admin-Login</h1>
                <form onsubmit="handleAdminLogin(event)">
                    <div class="form-group">
                        <label class="form-label">Admin-Passwort</label>
                        <input type="password" name="passwort" class="form-input" required autofocus>
                        <small class="text-muted">Standard: admin123</small>
                    </div>
                    <button type="submit" class="btn btn-primary btn-block">Anmelden</button>
                    <button type="button" class="btn btn-secondary btn-block mt-2" onclick="Router.navigate('login')">Zurück</button>
                </form>
            </div>
        </div>
    `);
});

window.handleAdminLogin = async (event) => {
  event.preventDefault();
  const formData = new FormData(event.target);
  const success = await Auth.adminLogin(formData.get('passwort'));
  if (success) {
    location.hash = '#admin-dashboard';
  }
};


// ===== ADMIN DASHBOARD =====
Router.register('admin-dashboard', async () => {

  // ✅ Harter Restore: falls State verloren ging, aber Session-Flag da ist
  if (!State.isAdmin && sessionStorage.getItem('is_admin') === '1') {
    State.isAdmin = true;
  }

  // ✅ Wenn immer noch nicht Admin → zurück zum Admin-Login
  if (!State.isAdmin) {
    location.hash = '#admin-login';   // bewusst direkt, um Router-Doppelungen zu umgehen
    return;
  }

  // ... ab hier dein Dashboard-Code


    const gaeste = await db.gaeste.where('aktiv').equals(true).toArray();
    const buchungen = await Buchungen.getAll();
    const nichtExportiert = await Buchungen.getAll({ exportiert: false });

    const heute = Utils.formatDate(new Date());
    const heuteBuchungen = buchungen.filter(b => b.datum === heute);
    const heuteUmsatz = heuteBuchungen.reduce((sum, b) => sum + (b.preis * b.menge), 0);

    UI.render(`
        <div class="app-header">
            <div class="header-left">
                <div class="header-title">🔧 Admin Dashboard</div>
            </div>
            <div class="header-right">
                <button class="btn btn-secondary" onclick="Auth.logout()">Abmelden</button>
            </div>
        </div>

        <div class="main-content">
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${gaeste.length}</div>
                    <div class="stat-label">Aktive Gäste</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${heuteBuchungen.length}</div>
                    <div class="stat-label">Buchungen heute</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${nichtExportiert.length}</div>
                    <div class="stat-label">Nicht exportiert</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${Utils.formatCurrency(heuteUmsatz)}</div>
                    <div class="stat-label">Umsatz heute</div>
                </div>
            </div>

            <div class="card mt-3">
                <div class="card-header"><h2 class="card-title">Export</h2></div>
                <div class="card-body">
                    <button class="btn btn-primary" onclick="handleExportBuchungen()">Buchungen exportieren (CSV)</button>
                    <p class="text-muted mt-2">Exportiert alle neuen Buchungen und markiert sie danach als exportiert.</p>
                </div>
            </div>

            <div class="card mt-3">
                <div class="card-header"><h2 class="card-title">Artikel Import</h2></div>
                <div class="card-body">
                    <input type="file" accept=".csv" onchange="handleArtikelImport(event)">
                    <p class="text-muted mt-2">CSV mit Artikel-IDs aus Access importieren.</p>
                </div>
            </div>

            <div class="card mt-3">
                <div class="card-header"><h2 class="card-title">Checkout Import</h2></div>
                <div class="card-body">
                    <input type="file" accept=".csv" onchange="handleCheckoutImport(event)">
                    <p class="text-muted mt-2">CSV mit Gast-Web-UUIDs importieren und Gäste auschecken.</p>
                </div>
            </div>
        </div>
    `);
});

// ===== DASHBOARD PAGE =====
Router.register('dashboard', async () => {
    if (!State.currentUser) {
        Router.navigate('login');
        return;
    }

    const buchungen = await Buchungen.getByGast(State.currentUser.gast_id, 5);
    const alleBuchungen = await Buchungen.getByGast(State.currentUser.gast_id);

    const heute = Utils.formatDate(new Date());
    const heuteBuchungen = alleBuchungen.filter(b => b.datum === heute);
    const heuteSum = heuteBuchungen.reduce((sum, b) => sum + (b.preis * b.menge), 0);

    const wocheStart = new Date();
    wocheStart.setDate(wocheStart.getDate() - 7);
    const wocheBuchungen = alleBuchungen.filter(b => new Date(b.datum) >= wocheStart);
    const wocheSum = wocheBuchungen.reduce((sum, b) => sum + (b.preis * b.menge), 0);

    const gesamtSum = alleBuchungen.reduce((sum, b) => sum + (b.preis * b.menge), 0);

    const buchungenHTML = buchungen.map(b => `
        <div class="list-item ${b.exportiert ? 'exportiert' : 'pending'}">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-weight: 500;">${b.artikel_name} × ${b.menge}</div>
                    <small class="text-muted">Heute, ${b.uhrzeit.substring(0, 5)}</small>
                </div>
                <div style="text-align: right;">
                    <div style="font-weight: 700; color: var(--color-mountain-blue);">${Utils.formatCurrency(b.preis * b.menge)}</div>
                    ${b.exportiert ? `<small class="text-muted">exportiert</small>` : `<small class="text-muted">neu</small>`}
                </div>
            </div>
        </div>
    `).join('');

    UI.render(`
        <div class="app-header">
            <div class="header-left">
                <button class="menu-btn" onclick="showMenu()">☰</button>
                <div class="header-title">Seollerhaus Kassa</div>
            </div>
            <div class="header-right">
                <div class="user-badge">👤 ${State.currentUser.nachname}</div>
            </div>
        </div>

        <div class="main-content">
            <h1 class="page-title">Übersicht</h1>

            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${Utils.formatCurrency(heuteSum)}</div>
                    <div class="stat-label">Heute</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${Utils.formatCurrency(wocheSum)}</div>
                    <div class="stat-label">Letzte 7 Tage</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${Utils.formatCurrency(gesamtSum)}</div>
                    <div class="stat-label">Gesamt</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${alleBuchungen.length}</div>
                    <div class="stat-label">Buchungen</div>
                </div>
            </div>

            <div class="card mt-3">
                <div class="card-header">
                    <h2 class="card-title">Letzte Buchungen</h2>
                </div>
                <div class="card-body">
                    ${buchungenHTML || `<div class="empty-state">Noch keine Buchungen</div>`}
                </div>
            </div>
        </div>

        <div class="bottom-nav">
            <div class="nav-item active" onclick="Router.navigate('dashboard')">
                <div class="nav-icon">🏠</div>
                <div>Start</div>
            </div>
            <div class="nav-item" onclick="Router.navigate('buchen')">
                <div class="nav-icon">🍺</div>
                <div>Buchen</div>
            </div>
            <div class="nav-item" onclick="Router.navigate('historie')">
                <div class="nav-icon">📋</div>
                <div>Liste</div>
            </div>
            <div class="nav-item" onclick="Router.navigate('profil')">
                <div class="nav-icon">👤</div>
                <div>Profil</div>
            </div>
        </div>
    `);
});

// ===== BUCHEN PAGE =====
Router.register('buchen', async () => {
    if (!State.currentUser) {
        Router.navigate('login');
        return;
    }

    const kategorien = await db.kategorien.orderBy('sortierung').toArray();
    const artikel = State.selectedCategory
        ? await Artikel.getByKategorie(State.selectedCategory)
        : await Artikel.getAll();

    const catsHTML = kategorien.map(k => `
        <button class="chip ${State.selectedCategory === k.kategorie_id ? 'active' : ''}"
                onclick="State.selectedCategory=${k.kategorie_id}; Router.navigate('buchen')">
            ${k.name}
        </button>
    `).join('');

    const artikelHTML = artikel.map(a => `
        <button class="artikel-card" onclick="State.addToWarenkorb(${JSON.stringify(a).replace(/"/g, '&quot;')}, 1)">
            <div class="artikel-icon">${a.icon || '🧾'}</div>
            <div class="artikel-name">${a.name}</div>
            <div class="artikel-price">${Utils.formatCurrency(a.preis)}</div>
        </button>
    `).join('');

    UI.render(`
        <div class="app-header">
            <div class="header-left">
                <button class="menu-btn" onclick="Router.navigate('dashboard')">←</button>
                <div class="header-title">Buchen</div>
            </div>
            <div class="header-right">
                <div class="user-badge">👤 ${State.currentUser.nachname}</div>
            </div>
        </div>

        <div class="main-content">
            <div class="chips-row">
                <button class="chip ${!State.selectedCategory ? 'active' : ''}"
                        onclick="State.selectedCategory=null; Router.navigate('buchen')">Alle</button>
                ${catsHTML}
            </div>

            <div class="grid">
                ${artikelHTML}
            </div>

            <div class="card mt-3">
                <div class="card-header">
                    <h2 class="card-title">Warenkorb</h2>
                </div>
                <div class="card-body" id="warenkorb-area">
                    <div>Gesamt: <b>${Utils.formatCurrency(State.getWarenkorbTotal())}</b></div>
                    <button class="btn btn-primary mt-2" onclick="handleBuchen()">Jetzt buchen</button>
                    <button class="btn btn-secondary mt-2" onclick="State.clearWarenkorb()">Warenkorb leeren</button>
                </div>
            </div>
        </div>

        <div class="bottom-nav">
            <div class="nav-item" onclick="Router.navigate('dashboard')">
                <div class="nav-icon">🏠</div>
                <div>Start</div>
            </div>
            <div class="nav-item active" onclick="Router.navigate('buchen')">
                <div class="nav-icon">🍺</div>
                <div>Buchen</div>
            </div>
            <div class="nav-item" onclick="Router.navigate('historie')">
                <div class="nav-icon">📋</div>
                <div>Liste</div>
            </div>
            <div class="nav-item" onclick="Router.navigate('profil')">
                <div class="nav-icon">👤</div>
                <div>Profil</div>
            </div>
        </div>
    `);
});

// ===== HISTORIE PAGE =====
Router.register('historie', async () => {
    if (!State.currentUser) {
        Router.navigate('login');
        return;
    }

    const alleBuchungen = await Buchungen.getByGast(State.currentUser.gast_id);

    const rows = alleBuchungen.map(b => `
        <div class="list-item ${b.exportiert ? 'exportiert' : 'pending'}">
            <div style="display:flex; justify-content:space-between;">
                <div>
                    <div style="font-weight:500;">${b.artikel_name} × ${b.menge}</div>
                    <small class="text-muted">${b.datum} ${b.uhrzeit.substring(0,5)}</small>
                </div>
                <div style="font-weight:700; color: var(--color-mountain-blue);">
                    ${Utils.formatCurrency(b.preis * b.menge)}
                </div>
            </div>
        </div>
    `).join('');

    UI.render(`
        <div class="app-header">
            <div class="header-left">
                <button class="menu-btn" onclick="Router.navigate('dashboard')">←</button>
                <div class="header-title">Liste</div>
            </div>
            <div class="header-right">
                <div class="user-badge">👤 ${State.currentUser.nachname}</div>
            </div>
        </div>

        <div class="main-content">
            <h1 class="page-title">Alle Buchungen</h1>
            ${rows || `<div class="empty-state">Noch keine Buchungen</div>`}
        </div>

        <div class="bottom-nav">
            <div class="nav-item" onclick="Router.navigate('dashboard')">
                <div class="nav-icon">🏠</div>
                <div>Start</div>
            </div>
            <div class="nav-item" onclick="Router.navigate('buchen')">
                <div class="nav-icon">🍺</div>
                <div>Buchen</div>
            </div>
            <div class="nav-item active" onclick="Router.navigate('historie')">
                <div class="nav-icon">📋</div>
                <div>Liste</div>
            </div>
            <div class="nav-item" onclick="Router.navigate('profil')">
                <div class="nav-icon">👤</div>
                <div>Profil</div>
            </div>
        </div>
    `);
});

// ===== PROFIL PAGE =====
Router.register('profil', async () => {
    if (!State.currentUser) {
        Router.navigate('login');
        return;
    }

    UI.render(`
        <div class="app-header">
            <div class="header-left">
                <button class="menu-btn" onclick="Router.navigate('dashboard')">←</button>
                <div class="header-title">Profil</div>
            </div>
            <div class="header-right">
                <div class="user-badge">👤 ${State.currentUser.nachname}</div>
            </div>
        </div>

        <div class="main-content">
            <h1 class="page-title">Profil</h1>

            <div class="card">
                <div class="card-body">
                    <p><b>Nachname:</b> ${State.currentUser.nachname}</p>
                    <p><b>Vorname:</b> ${State.currentUser.vorname || '-'}</p>
                    <p><b>Zimmer:</b> ${State.currentUser.zimmernummer || '-'}</p>
                    <button class="btn btn-secondary mt-2" onclick="Auth.logout()">Abmelden</button>
                </div>
            </div>
        </div>

        <div class="bottom-nav">
            <div class="nav-item" onclick="Router.navigate('dashboard')">
                <div class="nav-icon">🏠</div>
                <div>Start</div>
            </div>
            <div class="nav-item" onclick="Router.navigate('buchen')">
                <div class="nav-icon">🍺</div>
                <div>Buchen</div>
            </div>
            <div class="nav-item" onclick="Router.navigate('historie')">
                <div class="nav-icon">📋</div>
                <div>Liste</div>
            </div>
            <div class="nav-item active" onclick="Router.navigate('profil')">
                <div class="nav-icon">👤</div>
                <div>Profil</div>
            </div>
        </div>
    `);
});

/* ===== GLOBAL EVENT HANDLERS ===== */
window.handleLogin = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);

    try {
        await Auth.login(
            formData.get('nachname'),
            formData.get('passwort'),
            formData.get('remember')
        );
        Router.navigate('dashboard');
    } catch (error) {
        // Error handled in Auth.login
    }
};

window.handleRegister = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);

    const passwort = formData.get('passwort');
    const passwort2 = formData.get('passwort2');

    if (passwort !== passwort2) {
        Utils.showToast('Passwörter stimmen nicht überein', 'error');
        return;
    }

    try {
        await Auth.register(
            formData.get('nachname'),
            formData.get('vorname'),
            formData.get('zimmernummer'),
            passwort
        );
        Router.navigate('login');
    } catch (error) {
        // Error handled in Auth.register
    }
};

window.handleBuchen = async () => {
    try {
        await Buchungen.createFromWarenkorb();
        Router.navigate('dashboard');
    } catch (error) {
        // Error handled in Buchungen
    }
};

window.handleExportBuchungen = async () => {
    await ExportService.exportBuchungenCSV();
    Router.navigate('admin-dashboard'); // Refresh
};

window.handleArtikelImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const text = await file.text();
    await Artikel.importFromCSV(text);
    Router.navigate('admin-dashboard');
};

window.handleCheckoutImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        const lines = text.trim().split('\n');

        let count = 0;
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            const gast_web_uuid = values[0];

            const gast = await db.gaeste.get(gast_web_uuid);
            if (gast) {
                await db.gaeste.update(gast_web_uuid, {
                    checked_out: true,
                    checkout_datum: new Date().toISOString()
                });
                count++;
            }
        }

        Utils.showToast(`${count} Gäste ausgecheckt`, 'success');
        Router.navigate('admin-dashboard');
    } catch (error) {
        Utils.showToast('Fehler beim Import: ' + error.message, 'error');
    }
};

window.showMenu = () => {
    Utils.showToast('Menü öffnen - Noch nicht implementiert', 'info');
};

// Seed some categories if none exist
(async function seedCategories() {
    const count = await db.kategorien.count();
    if (count === 0) {
        await db.kategorien.bulkAdd([
            { kategorie_id: 1, name: 'Alkoholfreie Getränke', sortierung: 10 },
            { kategorie_id: 2, name: 'Biere', sortierung: 20 },
            { kategorie_id: 3, name: 'Wein Weiß', sortierung: 30 },
            { kategorie_id: 4, name: 'Wein Rot', sortierung: 40 },
            { kategorie_id: 5, name: 'Schnäpse', sortierung: 50 },
            { kategorie_id: 6, name: 'Heiße Getränke', sortierung: 60 },
            { kategorie_id: 7, name: 'Süßes/Salziges', sortierung: 70 },
            { kategorie_id: 8, name: 'Sonstiges', sortierung: 80 }
        ]);
    }
})();

/* ===== APP INITIALIZATION ===== */
(async function initApp() {
    // ✅ Admin-Status aus Session wiederherstellen
    State.isAdmin = sessionStorage.getItem('is_admin') === '1';

    // Hide loading screen after short delay
    setTimeout(() => {
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('app').style.display = 'block';
    }, 1500);

    // Seed default articles
    await Artikel.seed();

    // ✅ Router IMMER initialisieren (damit #admin-dashboard stabil ist)
    Router.init();

    // Try auto-login (Gast)
    const loggedIn = await Auth.autoLogin();
    if (loggedIn) {
        Router.navigate('dashboard');
    }
})();

// ✅ WICHTIG: Global verfügbar machen (für onclick=...)
// (weil app.js als type="module" geladen wird)
window.Router = Router;
window.State = State;
window.Utils = Utils;
window.Auth = Auth;
window.Buchungen = Buchungen;
window.Artikel = Artikel;
window.ExportService = ExportService;
