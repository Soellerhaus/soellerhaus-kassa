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
    currentPin: '',
    inactivityTimer: null,
    inactivityTimeout: 20000, // 20 Sekunden

    setUser(user) {
        this.currentUser = user;
        localStorage.setItem('current_user_id', user.gast_id);
        this.resetInactivityTimer();
    },

    clearUser() {
        this.currentUser = null;
        this.currentPin = '';
        localStorage.removeItem('current_user_id');
        localStorage.removeItem('remember_me');
        this.clearInactivityTimer();
    },

    resetInactivityTimer() {
        this.clearInactivityTimer();
        if (this.currentUser && this.currentPage !== 'login' && this.currentPage !== 'register') {
            this.inactivityTimer = setTimeout(() => {
                console.log('Auto-Logout: 20 Sekunden Inaktivität');
                Utils.showToast('Automatischer Logout nach Inaktivität', 'info');
                Auth.logout();
            }, this.inactivityTimeout);
        }
    },

    clearInactivityTimer() {
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
            this.inactivityTimer = null;
        }
    },

    addToWarenkorb(artikel, menge = 1) {
        const existing = this.warenkorb.find(item => item.artikel_id === artikel.artikel_id);
        if (existing) {
            existing.menge += menge;
        } else {
            this.warenkorb.push({ ...artikel, menge });
        }
        this.updateWarenkorbUI();
        this.resetInactivityTimer();
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
        if (typeof UI !== 'undefined' && UI.renderWarenkorb) {
            UI.renderWarenkorb();
        }
    },

    getWarenkorbTotal() {
        return this.warenkorb.reduce((sum, item) => sum + (item.preis * item.menge), 0);
    }
};

// Inaktivitäts-Tracking auf allen Interaktionen
['click', 'touchstart', 'touchmove', 'keydown', 'mousemove', 'scroll'].forEach(event => {
    document.addEventListener(event, () => {
        if (State.currentUser) {
            State.resetInactivityTimer();
        }
    }, { passive: true });
});

/* ===== AUTH SERVICE ===== */
const Auth = {
    async register(vorname, pin) {
        try {
            console.log('Auth.register called with vorname:', vorname, 'pin length:', pin?.length);
            
            // Validate
            if (!vorname || !vorname.trim()) {
                throw new Error('Vorname ist erforderlich');
            }

            if (!pin || pin.length < 1 || pin.length > 4) {  // Max 4 Ziffern
                throw new Error('PIN muss 1-4 Ziffern lang sein');
            }

            if (!/^\d+$/.test(pin)) {
                throw new Error('PIN darf nur Ziffern enthalten');
            }

            const vornameClean = vorname.trim();

            // Create user - doppelte Vornamen sind erlaubt
            const gast = {
                gast_id: Utils.uuid(),
                vorname: vornameClean,
                nachname: '', // Leer lassen
                zimmernummer: '', // Leer lassen
                passwort_hash: await Utils.hashPassword(pin, vornameClean),
                aktiv: true,
                checked_out: false,
                anreise_datum: Utils.formatDate(new Date()),
                erstellt_am: new Date().toISOString()
            };

            console.log('Creating gast:', {
                gast_id: gast.gast_id,
                vorname: gast.vorname,
                aktiv: gast.aktiv,
                erstellt_am: gast.erstellt_am
            });

            await db.gaeste.add(gast);
            console.log('Gast successfully added to database!');
            Utils.showToast('Account erfolgreich erstellt!', 'success');
            return gast;
        } catch (error) {
            console.error('Auth.register error:', error);
            Utils.showToast(error.message, 'error');
            throw error;
        }
    },

    async login(gast_id, pin) {
        try {
            const gast = await db.gaeste.get(gast_id);

            if (!gast) {
                throw new Error('Gast nicht gefunden');
            }

            if (gast.checked_out) {
                throw new Error('Ihr Account wurde ausgecheckt. Bitte wenden Sie sich an die Rezeption.');
            }

            const hash = await Utils.hashPassword(pin, gast.vorname);
            if (hash !== gast.passwort_hash) {
                throw new Error('Falsche PIN');
            }

            State.setUser(gast);
            Utils.showToast(`Willkommen zurück, ${gast.vorname}!`, 'success');
            return gast;
        } catch (error) {
            Utils.showToast(error.message, 'error');
            throw error;
        }
    },

    async getGaesteByLetter(letter) {
        try {
            console.log('=== GET GAESTE BY LETTER ===');
            console.log('Letter:', letter);
            
            // Alle Gäste abrufen (zum Debugging)
            const allGaeste = await db.gaeste.toArray();
            console.log('Total guests in database:', allGaeste.length);
            console.log('All guests:', allGaeste.map(g => ({
                vorname: g.vorname,
                aktiv: g.aktiv,
                checked_out: g.checked_out,
                erstellt_am: g.erstellt_am
            })));
            
            const gaeste = await db.gaeste
                .where('aktiv').equals(true)
                .and(g => {
                    // Null-Check für vorname
                    if (!g.vorname || typeof g.vorname !== 'string') {
                        console.warn('Guest with invalid vorname:', g);
                        return false;
                    }
                    return !g.checked_out && g.vorname.toUpperCase().startsWith(letter.toUpperCase());
                })
                .toArray();

            console.log('Filtered guests for letter', letter + ':', gaeste.length);
            console.log('Filtered guests:', gaeste.map(g => g.vorname));

            // Sortieren und Duplikate mit Nummerierung versehen
            const sortedGaeste = gaeste.sort((a, b) => 
                a.vorname.localeCompare(b.vorname) || 
                new Date(a.erstellt_am) - new Date(b.erstellt_am)
            );

            // Zähle Duplikate
            const nameCount = {};
            const result = sortedGaeste.map(gast => {
                const name = gast.vorname;
                nameCount[name] = (nameCount[name] || 0) + 1;
                const displayName = nameCount[name] > 1 ? `${name} (${nameCount[name]})` : name;
                return { ...gast, displayName };
            });

            console.log('Result with display names:', result.map(g => g.displayName));
            return result;
        } catch (error) {
            console.error('Fehler beim Laden der Gäste:', error);
            console.error('Error stack:', error.stack);
            return [];
        }
    },

    async adminLogin(passwort) {
        const settings = await db.settings.get('admin_password');
        const storedHash = settings?.value || await Utils.hashPassword('admin123');

        const hash = await Utils.hashPassword(passwort);
        if (hash === storedHash) {
            State.isAdmin = true;
            Utils.showToast('Admin-Login erfolgreich', 'success');
            return true;
        } else {
            Utils.showToast('Falsches Admin-Passwort', 'error');
            return false;
        }
    },

    logout() {
        State.clearUser();
        State.isAdmin = false;
        State.currentPin = '';
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

        if (filter.datum) {
            query = query.filter(b => b.datum === filter.datum);
        }

        return await query.reverse().toArray();
    },

    async markAsExported(buchung_ids) {
        await db.buchungen.bulkUpdate(
            buchung_ids.map(id => ({ key: id, changes: { exportiert: true, exportiert_am: new Date().toISOString() } }))
        );
    }
};

/* ===== ARTIKEL SERVICE ===== */
const Artikel = {
    async getAll(filter = {}) {
        let query = db.artikel.toCollection();

        if (filter.aktiv !== undefined) {
            query = query.filter(a => a.aktiv === filter.aktiv);
        }

        if (filter.kategorie_id) {
            query = query.filter(a => a.kategorie_id === filter.kategorie_id);
        }

        return await query.sortBy('sortierung');
    },

    async getById(artikel_id) {
        return await db.artikel.get(artikel_id);
    },

    async importFromCSV(csvText) {
        try {
            const lines = csvText.trim().split('\n');
            const headers = lines[0].split(',').map(h => h.trim());

            const artikel = [];
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
                const obj = {};
                headers.forEach((header, index) => {
                    obj[header] = values[index];
                });

                artikel.push({
                    artikel_id: parseInt(obj.artikel_id),
                    name: obj.name,
                    name_kurz: obj.name_kurz || obj.name,
                    preis: parseFloat(obj.preis),
                    steuer_prozent: parseFloat(obj.steuer_prozent || 10),
                    kategorie_id: parseInt(obj.kategorie_id),
                    kategorie_name: obj.kategorie_name,
                    aktiv: obj.aktiv === '1' || obj.aktiv === 'true',
                    sortierung: parseInt(obj.sortierung || 0),
                    icon: obj.icon || '🍽️'
                });
            }

            // Clear and re-add
            await db.artikel.clear();
            await db.artikel.bulkAdd(artikel);

            Utils.showToast(`${artikel.length} Artikel importiert`, 'success');
            return artikel;
        } catch (error) {
            Utils.showToast('Fehler beim Import: ' + error.message, 'error');
            throw error;
        }
    },

    async seed() {
        // Seed some default articles for testing
        const defaultArtikel = [
            { artikel_id: 101, name: 'Almdudler 0.5l', name_kurz: 'Almdudler', preis: 3.50, steuer_prozent: 10, kategorie_id: 1, kategorie_name: 'Alkoholfreie Getränke', aktiv: true, sortierung: 10, icon: '🥤' },
            { artikel_id: 102, name: 'Coca Cola 0.33l', name_kurz: 'Cola', preis: 3.00, steuer_prozent: 10, kategorie_id: 1, kategorie_name: 'Alkoholfreie Getränke', aktiv: true, sortierung: 20, icon: '🥤' },
            { artikel_id: 201, name: 'Zipfer Märzen 0.5l', name_kurz: 'Zipfer', preis: 4.20, steuer_prozent: 10, kategorie_id: 2, kategorie_name: 'Biere', aktiv: true, sortierung: 10, icon: '🍺' },
            { artikel_id: 202, name: 'Stiegl Goldbräu 0.5l', name_kurz: 'Stiegl', preis: 4.20, steuer_prozent: 10, kategorie_id: 2, kategorie_name: 'Biere', aktiv: true, sortierung: 20, icon: '🍺' },
            { artikel_id: 301, name: 'Grüner Veltliner 0.25l', name_kurz: 'Grüner V.', preis: 4.80, steuer_prozent: 10, kategorie_id: 3, kategorie_name: 'Wein Weiß', aktiv: true, sortierung: 10, icon: '🍷' },
            { artikel_id: 401, name: 'Zweigelt 0.25l', name_kurz: 'Zweigelt', preis: 5.20, steuer_prozent: 10, kategorie_id: 4, kategorie_name: 'Wein Rot', aktiv: true, sortierung: 10, icon: '🍷' },
            { artikel_id: 501, name: 'Obstler 2cl', name_kurz: 'Obstler', preis: 3.50, steuer_prozent: 10, kategorie_id: 5, kategorie_name: 'Schnäpse', aktiv: true, sortierung: 10, icon: '🥃' },
            { artikel_id: 601, name: 'Kaffee groß', name_kurz: 'Kaffee', preis: 3.50, steuer_prozent: 10, kategorie_id: 6, kategorie_name: 'Heiße Getränke', aktiv: true, sortierung: 10, icon: '☕' },
            { artikel_id: 602, name: 'Tee', name_kurz: 'Tee', preis: 3.20, steuer_prozent: 10, kategorie_id: 6, kategorie_name: 'Heiße Getränke', aktiv: true, sortierung: 20, icon: '🍵' }
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
        console.log('Navigating to:', path);
        history.pushState({}, '', `#${path}`);
        this.handleRoute();
    },

    handleRoute() {
        const path = location.hash.slice(1) || 'login';
        console.log('Current route:', path);
        const handler = this.routes[path] || this.routes['login'];
        State.currentPage = path;
        if (handler) {
            handler();
        } else {
            console.error('No handler for route:', path);
        }
    }
};

/* ===== UI COMPONENTS ===== */
const UI = {
    render(html) {
        document.getElementById('app').innerHTML = html;
    },

    renderPinPad(onComplete, onCancel = null, title = 'PIN eingeben') {
        const pinDisplay = State.currentPin.split('').map(() => '●').join('');
        const pinLength = State.currentPin.length;

        return `
            <div class="pin-pad-container">
                <div class="pin-pad-title">${title}</div>
                <div class="pin-display">
                    <div class="pin-dots">${pinDisplay || '───'}</div>
                    <div class="pin-length">${pinLength} / 4</div>
                </div>
                <div class="pin-buttons">
                    ${[1,2,3,4,5,6,7,8,9].map(n => `
                        <button class="pin-btn" onclick="handlePinInput('${n}')">${n}</button>
                    `).join('')}
                    <button class="pin-btn pin-btn-delete" onclick="handlePinDelete()">
                        <span style="font-size: 1.5rem;">⌫</span>
                    </button>
                    <button class="pin-btn" onclick="handlePinInput('0')">0</button>
                    <button class="pin-btn pin-btn-ok" onclick="${onComplete}()">
                        <span style="font-size: 1.2rem;">✓ OK</span>
                    </button>
                </div>
                ${onCancel ? `
                    <button class="btn btn-secondary btn-block mt-2" onclick="${onCancel}()" style="max-width: 400px; margin: 16px auto 0;">
                        Abbrechen
                    </button>
                ` : ''}
            </div>
        `;
    },

    renderAlphabet(onLetterClick) {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        return `
            <div class="alphabet-container">
                <div class="alphabet-title">Wählen Sie den ersten Buchstaben:</div>
                <div class="alphabet-grid">
                    ${alphabet.map(letter => `
                        <button class="alphabet-btn" onclick="${onLetterClick}('${letter}')">
                            ${letter}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    },

    renderNameList(gaeste, onSelectGast) {
        if (!gaeste || gaeste.length === 0) {
            return `
                <div class="name-list-empty">
                    <p>Keine Einträge gefunden</p>
                    <button class="btn btn-secondary btn-block" onclick="handleBackToLogin()">
                        Zurück
                    </button>
                </div>
            `;
        }

        return `
            <div class="name-list-container">
                <div class="name-list-title">Wählen Sie Ihren Namen:</div>
                <div class="name-list">
                    ${gaeste.map(gast => `
                        <button class="name-list-item" onclick="${onSelectGast}('${gast.gast_id}')">
                            <span class="name-text">${gast.displayName}</span>
                            <span class="name-arrow">→</span>
                        </button>
                    `).join('')}
                </div>
                <button class="btn btn-secondary btn-block mt-3" onclick="handleBackToLogin()">
                    Zurück
                </button>
            </div>
        `;
    },

    renderQuantityPad(artikel, onComplete, onCancel) {
        return `
            <div class="modal-container active" id="quantity-modal">
                <div class="modal-backdrop" onclick="${onCancel}"></div>
                <div class="modal-content" style="max-width: 400px;">
                    <h2 style="margin-bottom: 1rem;">${artikel.name}</h2>
                    <p style="margin-bottom: 1.5rem; color: var(--color-stone-dark);">
                        Preis: ${Utils.formatCurrency(artikel.preis)}
                    </p>
                    
                    <div class="quantity-display">
                        <div class="quantity-value" id="quantity-value">1</div>
                        <div class="quantity-label">Anzahl</div>
                    </div>

                    <div class="pin-buttons" style="margin-bottom: 1rem;">
                        ${[1,2,3,4,5,6,7,8,9].map(n => `
                            <button class="pin-btn" onclick="handleQuantityInput('${n}')">${n}</button>
                        `).join('')}
                        <button class="pin-btn pin-btn-delete" onclick="handleQuantityDelete()">
                            <span style="font-size: 1.5rem;">⌫</span>
                        </button>
                        <button class="pin-btn" onclick="handleQuantityInput('0')">0</button>
                        <button class="pin-btn" style="visibility: hidden;"></button>
                    </div>

                    <div style="display: flex; gap: 1rem;">
                        <button class="btn btn-secondary" style="flex: 1;" onclick="${onCancel}">
                            Abbrechen
                        </button>
                        <button class="btn btn-primary" style="flex: 1;" onclick="${onComplete}">
                            Hinzufügen
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    renderWarenkorb() {
        const container = document.querySelector('.warenkorb');
        if (!container || State.warenkorb.length === 0) {
            if (container) container.remove();
            return;
        }

        const total = State.getWarenkorbTotal();
        const itemsHTML = State.warenkorb.map(item => `
            <div class="warenkorb-item">
                <span>${item.name_kurz || item.name} × ${item.menge}</span>
                <span>${Utils.formatCurrency(item.preis * item.menge)}</span>
            </div>
        `).join('');

        container.innerHTML = `
            <div class="warenkorb-header">
                <div class="warenkorb-title">🛒 Warenkorb (${State.warenkorb.length})</div>
                <button class="btn-icon" onclick="State.clearWarenkorb()">✕</button>
            </div>
            <div class="warenkorb-items">${itemsHTML}</div>
            <div class="warenkorb-total">
                <span>Gesamt:</span>
                <span>${Utils.formatCurrency(total)}</span>
            </div>
            <button class="btn btn-primary btn-block" onclick="handleBuchen()">Jetzt buchen</button>
        `;
    }
};

/* ===== PAGE HANDLERS ===== */

// Login Page
Router.register('login', () => {
    State.currentPin = '';
    window.selectedGastId = null;
    window.currentLetter = null;
    
    UI.render(`
        <div class="main-content">
            <div style="text-align: center; margin-top: 40px;">
                <div class="mountain-logo" style="margin: 0 auto 24px;">
                    <svg viewBox="0 0 100 60" class="mountain-svg" style="width: 120px; height: 72px; color: var(--color-mountain-blue);">
                        <path d="M0,60 L20,30 L35,45 L50,15 L65,40 L80,25 L100,60 Z" fill="currentColor"/>
                    </svg>
                </div>
                <h1 style="font-family: var(--font-display); font-size: var(--text-3xl); margin-bottom: 8px;">Seollerhaus Kassa</h1>
                <p style="color: var(--color-stone-dark); margin-bottom: 40px;">Self-Service Buchung</p>

                <div style="max-width: 600px; margin: 0 auto;">
                    ${UI.renderAlphabet('handleLetterSelect')}

                    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid var(--color-stone-medium);">
                        <p style="color: var(--color-stone-dark); margin-bottom: 16px;">Noch kein Account?</p>
                        <button class="btn btn-primary btn-block" style="max-width: 400px; margin: 0 auto;" onclick="handleRegisterClick()">
                            Neu registrieren
                        </button>
                    </div>

                    <div style="margin-top: 24px;">
                        <button class="btn btn-secondary" onclick="handleAdminClick()" style="font-size: 0.9rem;">
                            Admin-Login
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `);
});

// Helper functions for navigation
window.handleRegisterClick = () => {
    console.log('Register button clicked');
    Router.navigate('register');
};

window.handleAdminClick = () => {
    console.log('Admin button clicked');
    Router.navigate('admin-login');
};

window.handleBackToLogin = () => {
    console.log('Back to login clicked');
    Router.navigate('login');
};

// Name Selection Page
Router.register('name-select', async () => {
    console.log('Name-select page, current letter:', window.currentLetter);
    
    if (!window.currentLetter) {
        console.log('No letter selected, going back to login');
        Router.navigate('login');
        return;
    }

    const gaeste = await Auth.getGaesteByLetter(window.currentLetter);
    console.log('Found guests:', gaeste.length);

    UI.render(`
        <div class="main-content">
            <div style="max-width: 600px; margin: 40px auto;">
                <h1 class="page-title" style="text-align: center;">
                    Buchstabe: ${window.currentLetter}
                </h1>
                ${UI.renderNameList(gaeste, 'handleNameSelect')}
            </div>
        </div>
    `);
});

// PIN Entry Page
Router.register('pin-entry', () => {
    console.log('PIN-entry page, selected guest:', window.selectedGastId);
    State.currentPin = '';  // Reset PIN
    
    if (!window.selectedGastId) {
        console.log('No guest selected, going back to login');
        Router.navigate('login');
        return;
    }

    UI.render(`
        <div class="main-content">
            <div style="max-width: 500px; margin: 60px auto;">
                ${UI.renderPinPad('handlePinLogin', 'handlePinCancel', 'PIN eingeben')}
            </div>
        </div>
    `);
});

// Register Page
Router.register('register', () => {
    console.log('Register page loaded');
    State.currentPin = '';
    
    UI.render(`
        <div class="main-content">
            <div style="max-width: 500px; margin: 40px auto;">
                <h1 class="page-title" style="text-align: center;">Neu registrieren</h1>
                
                <div class="form-group">
                    <label class="form-label">Vorname *</label>
                    <input type="text" 
                           id="register-vorname" 
                           class="form-input" 
                           placeholder="z.B. Maria" 
                           required 
                           autofocus
                           style="font-size: 1.2rem; padding: 16px;">
                </div>

                <div style="margin-top: 32px; padding: 24px; background: var(--color-stone-light); border-radius: var(--radius-lg);">
                    ${UI.renderPinPad('handleRegisterPinComplete', 'handleBackToLogin', 'PIN festlegen (1-4 Ziffern)')}
                </div>

                <button class="btn btn-secondary btn-block mt-3" onclick="handleBackToLogin()">
                    Zurück zum Login
                </button>
            </div>
        </div>
    `);
    
    // Focus on the input field after render
    setTimeout(() => {
        const input = document.getElementById('register-vorname');
        if (input) input.focus();
    }, 100);
});

// Dashboard Page (Continued in next file due to length...)

/* ===== GLOBAL EVENT HANDLERS ===== */

// PIN Input Handlers (ohne komplettes Re-Rendering)
window.handlePinInput = (digit) => {
    console.log('PIN input:', digit, 'Current length:', State.currentPin.length);
    if (State.currentPin.length < 4) {  // Max 4 Ziffern
        State.currentPin += digit;
        updatePinDisplay();
    }
};

window.handlePinDelete = () => {
    console.log('PIN delete, current:', State.currentPin);
    State.currentPin = State.currentPin.slice(0, -1);
    updatePinDisplay();
};

window.updatePinDisplay = () => {
    const dotsElement = document.querySelector('.pin-dots');
    const lengthElement = document.querySelector('.pin-length');
    
    if (dotsElement) {
        const pinDisplay = State.currentPin.split('').map(() => '●').join('');
        dotsElement.textContent = pinDisplay || '───';
    }
    
    if (lengthElement) {
        lengthElement.textContent = `${State.currentPin.length} / 4`;  // Max 4 Ziffern
    }
    
    console.log('PIN display updated:', State.currentPin.length, 'digits');
};

window.handlePinCancel = () => {
    State.currentPin = '';
    window.selectedGastId = null;
    Router.navigate('login');
};

// Alphabet / Name Selection Handlers
window.handleLetterSelect = async (letter) => {
    console.log('Letter selected:', letter);
    window.currentLetter = letter;
    Router.navigate('name-select');
};

window.handleNameSelect = (gast_id) => {
    console.log('Name selected, gast_id:', gast_id);
    window.selectedGastId = gast_id;
    State.currentPin = '';
    Router.navigate('pin-entry');
};

// Login Handler
window.handlePinLogin = async () => {
    console.log('=== PIN LOGIN CLICKED ===');
    console.log('Current PIN:', State.currentPin);
    console.log('Selected Gast ID:', window.selectedGastId);
    
    if (State.currentPin.length < 1) {
        console.log('ERROR: No PIN entered');
        Utils.showToast('Bitte PIN eingeben', 'warning');
        return;
    }

    console.log('Attempting login...');
    try {
        await Auth.login(window.selectedGastId, State.currentPin);
        console.log('Login successful!');
        State.currentPin = '';
        window.selectedGastId = null;
        window.currentLetter = null;
        Router.navigate('dashboard');
    } catch (error) {
        console.error('Login error:', error);
        State.currentPin = '';
        Router.handleRoute(); // Re-render to clear PIN display
    }
};

// Register Handlers
window.handleRegisterPinComplete = async () => {
    console.log('=== REGISTER PIN COMPLETE CLICKED ===');
    console.log('Current PIN:', State.currentPin);
    console.log('PIN Length:', State.currentPin.length);
    
    const vornameInput = document.getElementById('register-vorname');
    console.log('Vorname input element:', vornameInput);
    
    const vorname = vornameInput ? vornameInput.value : '';
    console.log('Vorname value:', vorname);

    if (!vorname || !vorname.trim()) {
        console.log('ERROR: Vorname ist leer');
        Utils.showToast('Bitte Vorname eingeben', 'warning');
        return;
    }

    if (State.currentPin.length < 1 || State.currentPin.length > 4) {  // Max 4 Ziffern
        console.log('ERROR: PIN-Länge ungültig:', State.currentPin.length);
        Utils.showToast('PIN muss 1-4 Ziffern lang sein', 'warning');
        return;
    }

    console.log('Validation passed! Registering user:', vorname.trim(), 'PIN length:', State.currentPin.length);

    try {
        const newGast = await Auth.register(vorname.trim(), State.currentPin);
        console.log('Registration successful! Gast:', newGast);
        State.currentPin = '';
        Utils.showToast('Registrierung erfolgreich! Bitte melden Sie sich an.', 'success');
        setTimeout(() => {
            console.log('Navigating to login...');
            Router.navigate('login');
        }, 1500);
    } catch (error) {
        console.error('Registration error:', error);
        State.currentPin = '';
        Router.handleRoute();
    }
};

// Long-Press Handler for Artikel
let longPressTimer = null;
let longPressTriggered = false;
let currentArtikelId = null;

window.handleArtikelPointerDown = (event, artikel_id) => {
    event.preventDefault();
    longPressTriggered = false;
    currentArtikelId = artikel_id;
    
    longPressTimer = setTimeout(async () => {
        longPressTriggered = true;
        const artikel = await Artikel.getById(artikel_id);
        if (artikel) {
            showQuantityModal(artikel);
        }
    }, 700); // 700ms für Long-Press
};

window.handleArtikelPointerUp = (event) => {
    if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
    }

    // Nur normales Click verarbeiten wenn kein Long-Press
    if (!longPressTriggered && currentArtikelId) {
        addArtikel(currentArtikelId);
    }

    longPressTriggered = false;
    currentArtikelId = null;
};

// Quantity Modal
let currentQuantity = '1';

function showQuantityModal(artikel) {
    currentQuantity = '1';
    const modalHTML = UI.renderQuantityPad(
        artikel,
        'handleQuantityComplete(' + artikel.artikel_id + ')',
        'closeQuantityModal()'
    );
    
    const container = document.createElement('div');
    container.innerHTML = modalHTML;
    document.body.appendChild(container.firstElementChild);
}

window.closeQuantityModal = () => {
    const modal = document.getElementById('quantity-modal');
    if (modal) modal.remove();
    currentQuantity = '1';
};

window.handleQuantityInput = (digit) => {
    if (currentQuantity === '1' && digit !== '0') {
        currentQuantity = digit;
    } else if (currentQuantity.length < 3) {
        currentQuantity += digit;
    }
    document.getElementById('quantity-value').textContent = currentQuantity;
};

window.handleQuantityDelete = () => {
    if (currentQuantity.length > 1) {
        currentQuantity = currentQuantity.slice(0, -1);
    } else {
        currentQuantity = '1';
    }
    document.getElementById('quantity-value').textContent = currentQuantity;
};

window.handleQuantityComplete = async (artikel_id) => {
    const menge = parseInt(currentQuantity);
    if (menge < 1) {
        Utils.showToast('Menge muss mindestens 1 sein', 'warning');
        return;
    }

    const artikel = await Artikel.getById(artikel_id);
    if (artikel) {
        State.addToWarenkorb(artikel, menge);
        Utils.showToast(`${menge}× ${artikel.name_kurz || artikel.name} zum Warenkorb hinzugefügt`, 'success');
    }

    closeQuantityModal();
};

// Original handlers (updated)
window.addArtikel = async (artikel_id) => {
    const artikel = await Artikel.getById(artikel_id);
    State.addToWarenkorb(artikel, 1);
    Utils.showToast(`${artikel.name_kurz || artikel.name} zum Warenkorb hinzugefügt`, 'success');
};

window.handleBuchen = async () => {
    try {
        await Buchungen.createFromWarenkorb();
        Router.navigate('dashboard');
    } catch (error) {
        // Error handled in Buchungen
    }
};

/* ===== APP INITIALIZATION ===== */
(async function initApp() {
    // Hide loading screen after short delay
    setTimeout(() => {
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('app').style.display = 'block';
    }, 1500);

    // Seed default articles
    await Artikel.seed();

    // Try auto-login
    const loggedIn = await Auth.autoLogin();
    if (loggedIn) {
        Router.navigate('dashboard');
    } else {
        Router.init();
    }
})();

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
                    ${b.exportiert ? '<small class="badge badge-success">✓ Gespeichert</small>' : '<small class="badge badge-warning">⏳ Ausstehend</small>'}
                </div>
            </div>
        </div>
    `).join('') || '<p class="text-muted text-center">Noch keine Buchungen vorhanden</p>';

    UI.render(`
        <div class="app-header">
            <div class="header-left">
                <button class="menu-btn" onclick="showMenu()">☰</button>
                <div class="header-title">Seollerhaus</div>
            </div>
            <div class="header-right">
                <div class="user-badge">👤 ${State.currentUser.vorname || State.currentUser.nachname}</div>
            </div>
        </div>

        <div class="main-content">
            <h1 style="font-family: var(--font-display); font-size: var(--text-2xl); margin-bottom: 24px;">
                Guten Tag, ${State.currentUser.vorname || State.currentUser.nachname}!
            </h1>

            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${heuteBuchungen.length}</div>
                    <div class="stat-label">Artikel heute</div>
                    <div style="margin-top: 8px; font-size: var(--text-lg); font-weight: 600;">${Utils.formatCurrency(heuteSum)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${wocheBuchungen.length}</div>
                    <div class="stat-label">Diese Woche</div>
                    <div style="margin-top: 8px; font-size: var(--text-lg); font-weight: 600;">${Utils.formatCurrency(wocheSum)}</div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">💰 Gesamtsumme (offen)</h2>
                </div>
                <div style="text-align: center; padding: 24px;">
                    <div style="font-family: var(--font-display); font-size: var(--text-4xl); font-weight: 700; color: var(--color-mountain-blue);">
                        ${Utils.formatCurrency(gesamtSum)}
                    </div>
                    <small class="text-muted">seit ${State.currentUser.anreise_datum || 'Ankunft'}</small>
                </div>
            </div>

            <div class="card mt-3">
                <div class="card-header">
                    <h2 class="card-title">📝 Letzte Buchungen</h2>
                    <button class="btn btn-secondary" onclick="Router.navigate('historie')">Alle anzeigen</button>
                </div>
                <div class="card-body">
                    ${buchungenHTML}
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

    const kategorien = await db.kategorien.toArray();
    const artikel = await Artikel.getAll({ aktiv: true });

    const kategorieTabs = `
        <div class="category-tabs">
            <div class="category-tab ${!State.selectedCategory ? 'active' : ''}" onclick="filterCategory(null)">Alle</div>
            ${kategorien.map(k => `
                <div class="category-tab ${State.selectedCategory === k.kategorie_id ? 'active' : ''}" 
                     onclick="filterCategory(${k.kategorie_id})">
                    ${k.name}
                </div>
            `).join('')}
        </div>
    `;

    const filteredArtikel = State.selectedCategory 
        ? artikel.filter(a => a.kategorie_id === State.selectedCategory)
        : artikel;

    const artikelGrid = `
        <div class="artikel-grid">
            ${filteredArtikel.map(a => {
                const color = getCategoryColor(a.kategorie_id);
                return `
                    <div class="artikel-tile" 
                         style="--tile-color: ${color}" 
                         data-artikel-id="${a.artikel_id}"
                         onpointerdown="handleArtikelPointerDown(event, ${a.artikel_id})"
                         onpointerup="handleArtikelPointerUp(event)"
                         onpointercancel="handleArtikelPointerUp(event)"
                         onpointerleave="handleArtikelPointerUp(event)">
                        <div class="artikel-icon">${a.icon}</div>
                        <div class="artikel-name">${a.name_kurz || a.name}</div>
                        <div class="artikel-price">${Utils.formatCurrency(a.preis)}</div>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    UI.render(`
        <div class="app-header">
            <div class="header-left">
                <button class="menu-btn" onclick="Router.navigate('dashboard')">←</button>
                <div class="header-title">Artikel buchen</div>
            </div>
            <div class="header-right">
                <div class="user-badge">👤 ${State.currentUser.vorname}</div>
            </div>
        </div>

        <div class="main-content">
            <div class="form-group">
                <input type="text" class="form-input" placeholder="🔍 Artikel suchen..." oninput="searchArtikel(this.value)">
            </div>

            ${kategorieTabs}
            ${artikelGrid}
        </div>

        ${State.warenkorb.length > 0 ? '<div class="warenkorb"></div>' : ''}

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

    UI.renderWarenkorb();
});

// ===== HISTORIE PAGE =====
Router.register('historie', async () => {
    if (!State.currentUser) {
        Router.navigate('login');
        return;
    }

    const buchungen = await Buchungen.getByGast(State.currentUser.gast_id);
    const total = buchungen.reduce((sum, b) => sum + (b.preis * b.menge), 0);

    // Group by date
    const byDate = {};
    buchungen.forEach(b => {
        if (!byDate[b.datum]) byDate[b.datum] = [];
        byDate[b.datum].push(b);
    });

    const buchungenHTML = Object.keys(byDate).sort().reverse().map(datum => {
        const items = byDate[datum];
        const dayTotal = items.reduce((sum, b) => sum + (b.preis * b.menge), 0);
        
        return `
            <div style="margin-bottom: 32px;">
                <h3 style="font-size: var(--text-lg); font-weight: 600; margin-bottom: 12px; color: var(--color-mountain-blue);">
                    ${new Date(datum).toLocaleDateString('de-AT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </h3>
                ${items.map(b => `
                    <div class="list-item ${b.exportiert ? 'exportiert' : 'pending'}">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="font-weight: 500;">${b.artikel_name} × ${b.menge}</div>
                                <small class="text-muted">${b.uhrzeit.substring(0, 5)} Uhr</small>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-weight: 700;">${Utils.formatCurrency(b.preis * b.menge)}</div>
                                ${b.exportiert ? '<small class="badge badge-success">✓</small>' : '<small class="badge badge-warning">⏳</small>'}
                            </div>
                        </div>
                    </div>
                `).join('')}
                <div style="text-align: right; margin-top: 8px; font-weight: 600; color: var(--color-stone-dark);">
                    Summe: ${Utils.formatCurrency(dayTotal)}
                </div>
            </div>
        `;
    }).join('') || '<p class="text-muted text-center">Noch keine Buchungen vorhanden</p>';

    UI.render(`
        <div class="app-header">
            <div class="header-left">
                <button class="menu-btn" onclick="Router.navigate('dashboard')">←</button>
                <div class="header-title">Meine Buchungen</div>
            </div>
            <div class="header-right">
                <div class="user-badge">👤 ${State.currentUser.vorname || State.currentUser.nachname}</div>
            </div>
        </div>

        <div class="main-content">
            <div class="card mb-3">
                <div class="card-header">
                    <h2 class="card-title">💰 Gesamtsumme</h2>
                </div>
                <div style="text-align: center; padding: 16px;">
                    <div style="font-family: var(--font-display); font-size: var(--text-3xl); font-weight: 700; color: var(--color-mountain-blue);">
                        ${Utils.formatCurrency(total)}
                    </div>
                    <small class="text-muted">${buchungen.length} Artikel insgesamt</small>
                </div>
            </div>

            ${buchungenHTML}
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
Router.register('profil', () => {
    if (!State.currentUser) {
        Router.navigate('login');
        return;
    }

    UI.render(`
        <div class="app-header">
            <div class="header-left">
                <button class="menu-btn" onclick="Router.navigate('dashboard')">←</button>
                <div class="header-title">Mein Profil</div>
            </div>
        </div>

        <div class="main-content">
            <div class="card mb-3">
                <div class="card-header">
                    <h2 class="card-title">👤 Persönliche Daten</h2>
                </div>
                <div class="card-body">
                    <div style="margin-bottom: 12px;">
                        <strong>Nachname:</strong> ${State.currentUser.nachname}
                    </div>
                    <div style="margin-bottom: 12px;">
                        <strong>Vorname:</strong> ${State.currentUser.vorname || '-'}
                    </div>
                    <div style="margin-bottom: 12px;">
                        <strong>Zimmer:</strong> ${State.currentUser.zimmernummer || '-'}
                    </div>
                    <div>
                        <strong>Anreise:</strong> ${State.currentUser.anreise_datum || '-'}
                    </div>
                </div>
            </div>

            <div class="card mb-3">
                <div class="card-header">
                    <h2 class="card-title">ℹ️ Hilfe & Info</h2>
                </div>
                <div class="card-body">
                    <p style="margin-bottom: 12px;">Bei Fragen wenden Sie sich bitte an die Rezeption.</p>
                    <p style="margin-bottom: 12px;"><strong>Telefon:</strong> +43 XXX XXX XXX</p>
                    <p><strong>Email:</strong> info@seollerhaus.at</p>
                </div>
            </div>

            <button class="btn btn-danger btn-block" onclick="Auth.logout()">Abmelden</button>
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
        Router.navigate('admin-dashboard');
    }
};

// ===== ADMIN DASHBOARD =====
Router.register('admin-dashboard', async () => {
    if (!State.isAdmin) {
        Router.navigate('admin-login');
        return;
    }

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

            <div class="card mb-3">
                <div class="card-header">
                    <h2 class="card-title">🔄 Daten-Management</h2>
                </div>
                <div class="card-body">
                    <div style="padding: 16px; background: var(--color-stone-light); border-radius: var(--radius-md); margin-bottom: 16px;">
                        <h3 style="font-weight: 600; margin-bottom: 8px;">📤 Buchungen exportieren</h3>
                        <p style="color: var(--color-stone-dark); margin-bottom: 12px;">
                            ${nichtExportiert.length} neue Buchungen zum Exportieren
                        </p>
                        <button class="btn btn-primary" onclick="handleExportBuchungen()">
                            Export starten →
                        </button>
                    </div>

                    <div style="padding: 16px; background: var(--color-stone-light); border-radius: var(--radius-md); margin-bottom: 16px;">
                        <h3 style="font-weight: 600; margin-bottom: 8px;">📥 Artikel importieren</h3>
                        <p style="color: var(--color-stone-dark); margin-bottom: 12px;">
                            Preise & Sortiment aus Access aktualisieren
                        </p>
                        <input type="file" id="artikel-import" accept=".csv" style="display:none" onchange="handleArtikelImport(event)">
                        <button class="btn btn-secondary" onclick="document.getElementById('artikel-import').click()">
                            CSV hochladen →
                        </button>
                    </div>

                    <div style="padding: 16px; background: var(--color-stone-light); border-radius: var(--radius-md);">
                        <h3 style="font-weight: 600; margin-bottom: 8px;">🚪 Checkout-Liste importieren</h3>
                        <p style="color: var(--color-stone-dark); margin-bottom: 12px;">
                            Ausgecheckte Gäste deaktivieren
                        </p>
                        <input type="file" id="checkout-import" accept=".csv" style="display:none" onchange="handleCheckoutImport(event)">
                        <button class="btn btn-secondary" onclick="document.getElementById('checkout-import').click()">
                            CSV hochladen →
                        </button>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">👥 Gäste-Übersicht</h2>
                </div>
                <div class="card-body">
                    ${gaeste.length > 0 ? gaeste.map(g => `
                        <div class="list-item">
                            <strong>${g.nachname}, ${g.vorname}</strong><br>
                            <small class="text-muted">Zimmer: ${g.zimmernummer || '-'} | Anreise: ${g.anreise_datum || '-'}</small>
                        </div>
                    `).join('') : '<p class="text-muted">Keine Gäste vorhanden</p>'}
                </div>
            </div>
        </div>
    `);
});

// ===== HELPER FUNCTIONS =====
window.filterCategory = (kategorie_id) => {
    State.selectedCategory = kategorie_id;
    Router.navigate('buchen');
};

window.addArtikel = async (artikel_id) => {
    const artikel = await Artikel.getById(artikel_id);
    State.addToWarenkorb(artikel);
    Utils.showToast(`${artikel.name_kurz || artikel.name} zum Warenkorb hinzugefügt`, 'success');
};

window.getCategoryColor = (kategorie_id) => {
    const colors = {
        1: '#FF6B6B', // Alkoholfrei
        2: '#FFD93D', // Biere
        3: '#95E1D3', // Wein Weiß
        4: '#AA4465', // Wein Rot
        5: '#F38181', // Schnäpse
        6: '#6C5B7B', // Heiß
        7: '#F8B500', // Süß
        8: '#4A5859'  // Sonstiges
    };
    return colors[kategorie_id] || '#2C5F7C';
};

window.searchArtikel = Utils.debounce(async (query) => {
    // Implement search functionality
    console.log('Searching for:', query);
}, 300);

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
        const headers = lines[0].split(',').map(h => h.trim());

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
