// ================================
// SEOLLERHAUS KASSA - MAIN APP v2.0
// Persistente Gästeregistrierung & Artikelverwaltung
// ================================

const db = new Dexie('SeollerhausKassa');

db.version(1).stores({
    gaeste: 'gast_id, nachname, aktiv, zimmernummer, checked_out',
    buchungen: 'buchung_id, gast_id, datum, exportiert, sync_status, [gast_id+datum]',
    artikel: 'artikel_id, kategorie_id, name, aktiv',
    kategorien: 'kategorie_id, name, sortierung',
    settings: 'key',
    exports: '++id, timestamp, anzahl_buchungen'
});

db.version(2).stores({
    gaeste: 'gast_id, nachname, aktiv, zimmernummer, checked_out',
    buchungen: 'buchung_id, gast_id, datum, exportiert, sync_status, [gast_id+datum]',
    artikel: 'artikel_id, sku, kategorie_id, name, aktiv',
    kategorien: 'kategorie_id, name, sortierung',
    settings: 'key',
    exports: '++id, timestamp, anzahl_buchungen',
    registeredGuests: '++id, firstName, passwordHash, createdAt, lastLoginAt'
});

const DataProtection = {
    async createBackup() {
        try {
            const data = {
                gaeste: await db.gaeste.toArray(),
                buchungen: await db.buchungen.toArray(),
                registeredGuests: await db.registeredGuests.toArray(),
                artikel: await db.artikel.toArray(),
                timestamp: Date.now(),
                version: '2.0'
            };
            localStorage.setItem('kassa_backup', JSON.stringify(data));
            console.log('🔄 Backup:', data.registeredGuests.length, 'Gäste,', data.artikel.length, 'Artikel');
            return true;
        } catch (e) { return false; }
    },

    async restoreIfNeeded() {
        try {
            const regCount = await db.registeredGuests.count();
            if (regCount === 0) {
                const backup = JSON.parse(localStorage.getItem('kassa_backup') || '{}');
                if (backup.registeredGuests) {
                    for (const g of backup.registeredGuests) { try { await db.registeredGuests.add(g); } catch(e) {} }
                }
                if (backup.artikel) {
                    for (const a of backup.artikel) { try { await db.artikel.add(a); } catch(e) {} }
                }
                if (backup.buchungen) {
                    for (const b of backup.buchungen) { try { await db.buchungen.add(b); } catch(e) {} }
                }
                console.log('✅ Daten wiederhergestellt');
            }
        } catch (e) { console.error(e); }
    },

    async requestPersistentStorage() {
        if (navigator.storage?.persist) {
            try { await navigator.storage.persist(); } catch(e) {}
        }
    },

    async manualExport() {
        const data = {
            registeredGuests: await db.registeredGuests.toArray(),
            artikel: await db.artikel.toArray(),
            buchungen: await db.buchungen.toArray(),
            kategorien: await db.kategorien.toArray(),
            exportDatum: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `kassa_backup_${Date.now()}.json`;
        a.click();
        Utils.showToast('Backup heruntergeladen!', 'success');
    },

    async exportGuestsCSV() {
        const guests = await db.registeredGuests.toArray();
        if (!guests.length) { Utils.showToast('Keine Gäste', 'warning'); return; }
        let csv = '\uFEFFID;Vorname;Erstellt;Letzter Login\n';
        guests.forEach(g => { csv += `${g.id};"${g.firstName}";"${g.createdAt}";"${g.lastLoginAt||'-'}"\n`; });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([csv], {type: 'text/csv;charset=utf-8;'}));
        a.download = `gaeste_${Date.now()}.csv`;
        a.click();
        Utils.showToast(`${guests.length} Gäste exportiert`, 'success');
    },

    async exportArticlesCSV() {
        const articles = await db.artikel.toArray();
        if (!articles.length) { Utils.showToast('Keine Artikel', 'warning'); return; }
        let csv = '\uFEFFID;SKU;Name;Kurzname;Preis;Kategorie;Aktiv\n';
        articles.forEach(a => { csv += `${a.artikel_id};"${a.sku||''}";"${a.name}";"${a.name_kurz||''}";"${String(a.preis).replace('.',',')}";"${a.kategorie_name||''}";"${a.aktiv?'Ja':'Nein'}"\n`; });
        const el = document.createElement('a');
        el.href = URL.createObjectURL(new Blob([csv], {type: 'text/csv;charset=utf-8;'}));
        el.download = `artikel_${Date.now()}.csv`;
        el.click();
        Utils.showToast(`${articles.length} Artikel exportiert`, 'success');
    }
};
window.DataProtection = DataProtection;

db.open().then(async () => {
    await DataProtection.requestPersistentStorage();
    await DataProtection.restoreIfNeeded();
    await DataProtection.createBackup();
    console.log('📊 DB bereit');
}).catch(e => console.error('DB Fehler:', e));

const Utils = {
    uuid: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random()*16|0; return (c=='x'?r:(r&0x3|0x8)).toString(16); }),
    getDeviceId() { let d = localStorage.getItem('device_id'); if(!d) { d = this.uuid(); localStorage.setItem('device_id', d); } return d; },
    formatDate: d => (d instanceof Date ? d : new Date(d)).toISOString().split('T')[0],
    formatTime: d => (d instanceof Date ? d : new Date(d)).toTimeString().split(' ')[0],
    formatCurrency: a => new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR' }).format(a),
    generateSalt: () => { const a = new Uint8Array(16); crypto.getRandomValues(a); return Array.from(a, b => b.toString(16).padStart(2,'0')).join(''); },
    async hashPassword(p, s='') { const d = new TextEncoder().encode(s+p); const h = await crypto.subtle.digest('SHA-256', d); return Array.from(new Uint8Array(h), b => b.toString(16).padStart(2,'0')).join(''); },
    showToast(msg, type='info') {
        const c = document.getElementById('toast-container');
        const t = document.createElement('div');
        t.className = `toast ${type}`;
        t.textContent = msg;
        c.appendChild(t);
        setTimeout(() => { t.style.animation = 'toastOut 0.3s ease forwards'; setTimeout(() => t.remove(), 300); }, 3000);
    },
    debounce(fn, w) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), w); }; },
    // Bild verkleinern und als Base64 zurückgeben
    async resizeImage(file, maxSize = 150) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let w = img.width, h = img.height;
                    if (w > h) { if (w > maxSize) { h = h * maxSize / w; w = maxSize; } }
                    else { if (h > maxSize) { w = w * maxSize / h; h = maxSize; } }
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, w, h);
                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    },
    parseCSVLine(line, delimiter=null) {
        // Auto-detect delimiter from first line
        if (!delimiter) {
            const semicolonCount = (line.match(/;/g) || []).length;
            const commaCount = (line.match(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/g) || []).length;
            delimiter = semicolonCount > commaCount ? ';' : ',';
        }
        const r = []; let c = '', q = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                if (q && line[i+1] === '"') { c += '"'; i++; } // Escaped quote
                else q = !q;
            }
            else if (ch === delimiter && !q) { r.push(c.trim()); c = ''; }
            else c += ch;
        }
        r.push(c.trim());
        return r;
    }
};
window.Utils = Utils;

const State = {
    currentUser: null, currentPage: 'login', selectedCategory: null,
    isAdmin: false, currentPin: '', inactivityTimer: null, inactivityTimeout: 120000,
    sessionId: null,
    setUser(u) { 
        this.currentUser = u; 
        this.sessionId = Utils.uuid(); // Neue Session starten
        localStorage.setItem('current_user_id', u.id || u.gast_id); 
        localStorage.setItem('current_user_type', u.id ? 'registered' : 'legacy'); 
        this.resetInactivityTimer(); 
    },
    clearUser() { 
        this.currentUser = null; 
        this.currentPin = ''; 
        this.sessionId = null;
        localStorage.removeItem('current_user_id'); 
        localStorage.removeItem('current_user_type'); 
        this.clearInactivityTimer(); 
    },
    resetInactivityTimer() { this.clearInactivityTimer(); if (this.currentUser && !['login','register'].includes(this.currentPage)) { this.inactivityTimer = setTimeout(() => { Utils.showToast('Auto-Logout', 'info'); Auth.logout(); }, this.inactivityTimeout); } },
    clearInactivityTimer() { if (this.inactivityTimer) { clearTimeout(this.inactivityTimer); this.inactivityTimer = null; } }
};
window.State = State;

['click','touchstart','keydown','mousemove'].forEach(e => document.addEventListener(e, () => { if(State.currentUser) State.resetInactivityTimer(); }, {passive:true}));

const RegisteredGuests = {
    async register(firstName, password) {
        if (!firstName?.trim()) throw new Error('Vorname erforderlich');
        if (!password) throw new Error('Passwort erforderlich');
        const salt = Utils.generateSalt();
        const guest = { firstName: firstName.trim(), passwordHash: await Utils.hashPassword(password, salt), salt, createdAt: new Date().toISOString(), lastLoginAt: null };
        guest.id = await db.registeredGuests.add(guest);
        await DataProtection.createBackup();
        Utils.showToast('Registrierung erfolgreich!', 'success');
        return guest;
    },
    async login(id, password) {
        const g = await db.registeredGuests.get(id);
        if (!g) throw new Error('Gast nicht gefunden');
        if (await Utils.hashPassword(password, g.salt) !== g.passwordHash) throw new Error('Falsches Passwort');
        await db.registeredGuests.update(id, { lastLoginAt: new Date().toISOString() });
        State.setUser(g);
        Utils.showToast(`Willkommen, ${g.firstName}!`, 'success');
        return g;
    },
    async getByFirstLetter(letter) {
        const all = await db.registeredGuests.toArray();
        const filtered = all.filter(g => g.firstName?.toUpperCase().startsWith(letter.toUpperCase())).sort((a,b) => a.firstName.localeCompare(b.firstName));
        const cnt = {};
        return filtered.map(g => { cnt[g.firstName] = (cnt[g.firstName]||0)+1; return {...g, displayName: cnt[g.firstName] > 1 ? `${g.firstName} (${cnt[g.firstName]})` : g.firstName}; });
    },
    async getAll() { return db.registeredGuests.toArray(); },
    async delete(id) { await db.registeredGuests.delete(id); await DataProtection.createBackup(); Utils.showToast('Gast gelöscht', 'success'); }
};

const Auth = {
    async login(id, pin) {
        if (typeof id === 'number') return RegisteredGuests.login(id, pin);
        const g = await db.gaeste.get(id);
        if (!g) throw new Error('Nicht gefunden');
        if (g.checked_out) throw new Error('Ausgecheckt');
        if (await Utils.hashPassword(pin, g.vorname) !== g.passwort_hash) throw new Error('Falsche PIN');
        State.setUser(g);
        Utils.showToast(`Willkommen, ${g.vorname}!`, 'success');
        return g;
    },
    async getGaesteByLetter(letter) {
        const reg = await RegisteredGuests.getByFirstLetter(letter);
        const legacy = (await db.gaeste.toArray()).filter(g => g.vorname?.toUpperCase().startsWith(letter.toUpperCase()) && g.aktiv && !g.checked_out).map(g => ({...g, firstName: g.vorname, displayName: g.vorname, isLegacy: true}));
        return [...reg, ...legacy].sort((a,b) => (a.firstName||a.vorname).localeCompare(b.firstName||b.vorname));
    },
    async adminLogin(pw) {
        const s = await db.settings.get('admin_password');
        const stored = s?.value || await Utils.hashPassword('admin123');
        if (await Utils.hashPassword(pw) === stored) { State.isAdmin = true; Utils.showToast('Admin-Login OK', 'success'); return true; }
        Utils.showToast('Falsches Passwort', 'error'); return false;
    },
    logout() { 
        // Buchungen der Session als fix markieren (nicht mehr stornierbar durch Gast)
        Buchungen.fixSessionBuchungen().then(() => {
            State.clearUser(); 
            State.isAdmin = false; 
            Router.navigate('login'); 
            Utils.showToast('Abgemeldet', 'info'); 
        });
    },
    async autoLogin() {
        const id = localStorage.getItem('current_user_id');
        const type = localStorage.getItem('current_user_type');
        if (id && localStorage.getItem('remember_me')) {
            const g = type === 'registered' ? await db.registeredGuests.get(parseInt(id)) : await db.gaeste.get(id);
            if (g && !g.checked_out) { State.setUser(g); return true; }
        }
        return false;
    }
};

const Buchungen = {
    async create(artikel, menge=1) {
        if (!State.currentUser) throw new Error('Nicht angemeldet');
        const b = {
            buchung_id: Utils.uuid(),
            gast_id: State.currentUser.id || State.currentUser.gast_id,
            gast_vorname: State.currentUser.firstName || State.currentUser.vorname,
            gast_nachname: State.currentUser.nachname || '',
            gastgruppe: State.currentUser.zimmernummer || '',
            artikel_id: artikel.artikel_id, artikel_name: artikel.name, preis: artikel.preis,
            steuer_prozent: artikel.steuer_prozent || 10, menge,
            datum: Utils.formatDate(new Date()), uhrzeit: Utils.formatTime(new Date()),
            erstellt_am: new Date().toISOString(), exportiert: false, geraet_id: Utils.getDeviceId(), sync_status: 'pending',
            session_id: State.sessionId,
            storniert: false,
            fix: false  // wird true wenn Gast sich abmeldet
        };
        await db.buchungen.add(b);
        await DataProtection.createBackup();
        return b;
    },
    async storno(buchung_id) {
        const b = await db.buchungen.where('buchung_id').equals(buchung_id).first();
        if (!b) throw new Error('Buchung nicht gefunden');
        // Gast kann nur eigene, nicht-fixe Buchungen stornieren
        if (!State.isAdmin && b.fix) throw new Error('Buchung bereits abgeschlossen');
        await db.buchungen.update(b.buchung_id, { storniert: true, storniert_am: new Date().toISOString() });
        await DataProtection.createBackup();
        Utils.showToast('Buchung storniert', 'success');
    },
    async fixSessionBuchungen() {
        // Alle Buchungen der aktuellen Session als fix markieren
        if (!State.sessionId) return;
        const bs = await db.buchungen.where('session_id').equals(State.sessionId).toArray();
        for (const b of bs) {
            if (!b.storniert) await db.buchungen.update(b.buchung_id, { fix: true });
        }
        await DataProtection.createBackup();
    },
    async getByGast(id, limit=null) {
        let r = await db.buchungen.where('gast_id').equals(id).reverse().toArray();
        r = r.filter(b => !b.storniert); // Stornierte ausblenden
        return limit ? r.slice(0, limit) : r;
    },
    async getSessionBuchungen() {
        if (!State.sessionId) return [];
        let r = await db.buchungen.where('session_id').equals(State.sessionId).toArray();
        return r.filter(b => !b.storniert).reverse();
    },
    async getAll(filter={}) {
        let r = await db.buchungen.toArray();
        if (filter.exportiert !== undefined) r = r.filter(b => b.exportiert === filter.exportiert);
        if (filter.datum) r = r.filter(b => b.datum === filter.datum);
        if (filter.includeStorniert !== true) r = r.filter(b => !b.storniert);
        return r.reverse();
    },
    async getAuffuellliste() {
        // Alle nicht-exportierten, nicht-stornierten Buchungen gruppiert nach Kategorie und Artikel
        const bs = await db.buchungen.toArray();
        const aktiv = bs.filter(b => !b.storniert && !b.exportiert);
        
        // Gruppieren nach Artikel
        const byArtikel = {};
        for (const b of aktiv) {
            const key = b.artikel_id;
            if (!byArtikel[key]) {
                const artikel = await Artikel.getById(b.artikel_id);
                byArtikel[key] = {
                    artikel_id: b.artikel_id,
                    name: b.artikel_name,
                    kategorie_id: artikel?.kategorie_id || 0,
                    kategorie_name: artikel?.kategorie_name || 'Sonstiges',
                    menge: 0
                };
            }
            byArtikel[key].menge += b.menge;
        }
        
        // Nach Kategorie gruppieren und sortieren
        const liste = Object.values(byArtikel);
        liste.sort((a, b) => {
            if (a.kategorie_id !== b.kategorie_id) return a.kategorie_id - b.kategorie_id;
            return b.menge - a.menge; // Innerhalb Kategorie nach Menge absteigend
        });
        
        return liste;
    },
    async resetAuffuellliste() {
        // Alle nicht-exportierten Buchungen als exportiert markieren
        const bs = await db.buchungen.toArray();
        const ids = bs.filter(b => !b.exportiert && !b.storniert).map(b => b.buchung_id);
        for (const id of ids) {
            await db.buchungen.update(id, { exportiert: true, exportiert_am: new Date().toISOString() });
        }
        await DataProtection.createBackup();
        Utils.showToast(`${ids.length} Buchungen zurückgesetzt`, 'success');
    },
    async markAsExported(ids) { for (const id of ids) await db.buchungen.update(id, { exportiert: true, exportiert_am: new Date().toISOString() }); }
};

const Artikel = {
    async getAll(f={}) {
        let r = await db.artikel.toArray();
        if (f.aktiv !== undefined) r = r.filter(a => a.aktiv === f.aktiv);
        if (f.kategorie_id) r = r.filter(a => a.kategorie_id === f.kategorie_id);
        if (f.search) { const q = f.search.toLowerCase(); r = r.filter(a => a.name.toLowerCase().includes(q) || a.sku?.toLowerCase().includes(q)); }
        return r.sort((a,b) => (a.sortierung||0) - (b.sortierung||0));
    },
    async getById(id) { return db.artikel.get(id); },
    async getBySku(sku) { return db.artikel.where('sku').equals(sku).first(); },
    async create(data) {
        if (!data.artikel_id) { const m = await db.artikel.orderBy('artikel_id').last(); data.artikel_id = (m?.artikel_id||0)+1; }
        await db.artikel.add(data);
        await DataProtection.createBackup();
        Utils.showToast('Artikel erstellt', 'success');
        return data;
    },
    async update(id, changes) { 
        // Platztausch wenn Position geändert wird
        if (changes.sortierung !== undefined) {
            const artikel = await this.getById(id);
            if (artikel && changes.sortierung !== artikel.sortierung) {
                const katId = changes.kategorie_id || artikel.kategorie_id;
                const newPos = changes.sortierung;
                const oldPos = artikel.sortierung || 0;
                
                // Finde Artikel der aktuell auf der neuen Position ist
                const allArtikel = await db.artikel.where('kategorie_id').equals(katId).toArray();
                const conflicting = allArtikel.find(a => a.artikel_id !== id && a.sortierung === newPos);
                
                // Platztausch: Der andere Artikel bekommt die alte Position
                if (conflicting) {
                    await db.artikel.update(conflicting.artikel_id, { sortierung: oldPos });
                }
            }
        }
        await db.artikel.update(id, changes); 
        await DataProtection.createBackup(); 
        Utils.showToast('Artikel aktualisiert', 'success'); 
    },
    async delete(id) { await db.artikel.delete(id); await DataProtection.createBackup(); Utils.showToast('Artikel gelöscht', 'success'); },
    async importFromCSV(text) {
        // Clean up text - handle Windows line endings and BOM
        text = text.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n').replace(/\r/g,'\n').trim();
        const lines = text.split('\n').filter(l => l.trim());
        
        if (lines.length < 2) throw new Error('CSV ungültig');
        
        // Parse header - detect delimiter (this CSV uses comma)
        const firstLine = lines[0];
        const h = Utils.parseCSVLine(firstLine, ',').map(x => x.toLowerCase().trim().replace(/^"|"$/g,''));
        
        console.log('CSV Headers:', h);
        console.log('Header count:', h.length);
        
        // Find column indices - support Access column names
        const idx = { 
            id: h.findIndex(x => x==='id'), 
            name: h.findIndex(x => x==='artikelname'), 
            kurz: h.findIndex(x => x==='artikelkurz'), 
            preis: h.findIndex(x => x==='preis'), 
            kat: h.findIndex(x => x==='warengruppe'),  // Last column!
            sort: h.findIndex(x => x==='artikelreihenfolge'),
            steuer: h.findIndex(x => x==='steuer')
        };
        
        console.log('Column indices:', idx);
        
        // Verify we found required columns
        if (idx.id < 0 || idx.name < 0 || idx.preis < 0) {
            console.error('Missing required columns! Found:', idx);
            throw new Error('CSV fehlt: ID, Artikelname oder Preis Spalte');
        }
        
        // Category mapping based on Warengruppe values (1-8)
        const katMap = {
            0: 'Sonstiges',
            1: 'Alkoholfreie Getränke',
            2: 'Biere',
            3: 'Wein',
            4: 'Spirituosen',
            5: 'Heiße Getränke',
            6: 'Sonstiges',
            7: 'Snacks',
            8: 'Diverses'
        };
        const iconMap = {0:'🍽️',1:'🥤',2:'🍺',3:'🍷',4:'🥃',5:'☕',6:'🍽️',7:'🍿',8:'📦'};
        
        let imp=0, upd=0, skip=0;
        
        for (let i=1; i<lines.length; i++) {
            if (!lines[i].trim()) continue;
            
            const v = Utils.parseCSVLine(lines[i], ',');
            
            // Get ID
            const id = parseInt(v[idx.id]?.replace(/"/g,''));
            if (!id || isNaN(id)) { 
                console.log(`Row ${i}: Skipping - no valid ID`);
                skip++; 
                continue; 
            }
            
            // Get name - skip if empty
            let name = v[idx.name]?.replace(/^"|"$/g,'').trim();
            if (!name) { 
                console.log(`Row ${i}: Skipping ID ${id} - no name`);
                skip++; 
                continue; 
            }
            
            // Parse price - handle German format "3,90€" or "3,90 €"
            let preis = 0;
            if (idx.preis >= 0 && v[idx.preis]) {
                let preisStr = v[idx.preis]
                    .replace(/"/g, '')      // Remove quotes
                    .replace(/€/g, '')      // Remove Euro sign
                    .replace(/\s/g, '')     // Remove spaces
                    .trim();
                // German format: 3,90 -> 3.90
                preis = parseFloat(preisStr.replace(',', '.')) || 0;
            }
            
            // Skip items with price 0 (inactive/placeholder)
            if (preis <= 0) {
                console.log(`Row ${i}: Skipping ID ${id} "${name}" - price is 0`);
                skip++;
                continue;
            }
            
            // Get category from Warengruppe
            let katId = 6; // Default: Sonstiges
            if (idx.kat >= 0 && v[idx.kat] !== undefined) {
                katId = parseInt(v[idx.kat]?.replace(/"/g,'')) || 6;
                if (katId < 0 || katId > 8) katId = 6;
            }
            
            // Get sort order
            let sort = 0;
            if (idx.sort >= 0 && v[idx.sort]) {
                sort = parseInt(v[idx.sort]?.replace(/"/g,'')) || 0;
            }
            
            // Get tax rate
            let steuer = 10;
            if (idx.steuer >= 0 && v[idx.steuer]) {
                steuer = parseInt(v[idx.steuer]?.replace(/"/g,'')) || 10;
            }
            
            // Short name
            let nameKurz = v[idx.kurz]?.replace(/^"|"$/g,'').trim() || name.substring(0, 15);
            
            const data = { 
                name, 
                name_kurz: nameKurz, 
                sku: null,
                preis, 
                steuer_prozent: steuer, 
                kategorie_id: katId, 
                kategorie_name: katMap[katId] || 'Sonstiges', 
                aktiv: true,
                sortierung: sort, 
                icon: iconMap[katId] || '🍽️' 
            };
            
            console.log(`Row ${i}: ID=${id}, Name="${name}", Preis=${preis}, Kat=${katId}`);
            
            // Check if article exists by ID
            const existing = await this.getById(id);
            if (existing) { 
                await db.artikel.update(id, data); 
                upd++; 
            } else { 
                data.artikel_id = id;
                try {
                    await db.artikel.add(data); 
                    imp++; 
                } catch(e) {
                    console.error('Import error for ID', id, e);
                    skip++;
                }
            }
        }
        
        await DataProtection.createBackup();
        const msg = `✅ ${imp} neu, ${upd} aktualisiert, ${skip} übersprungen`;
        console.log(msg);
        Utils.showToast(msg, 'success');
        return {imp, upd, skip};
    },
    async seed() {
        if (await db.artikel.count() === 0) {
            await db.artikel.bulkAdd([
                {artikel_id:101,sku:'ALM-05',name:'Almdudler 0.5l',name_kurz:'Almdudler',preis:3.5,steuer_prozent:10,kategorie_id:1,kategorie_name:'Alkoholfreie Getränke',aktiv:true,sortierung:10,icon:'🥤'},
                {artikel_id:102,sku:'COL-033',name:'Coca Cola 0.33l',name_kurz:'Cola',preis:3,steuer_prozent:10,kategorie_id:1,kategorie_name:'Alkoholfreie Getränke',aktiv:true,sortierung:20,icon:'🥤'},
                {artikel_id:201,sku:'ZIP-05',name:'Zipfer Märzen 0.5l',name_kurz:'Zipfer',preis:4.2,steuer_prozent:10,kategorie_id:2,kategorie_name:'Biere',aktiv:true,sortierung:10,icon:'🍺'},
                {artikel_id:301,sku:'GV-025',name:'Grüner Veltliner 0.25l',name_kurz:'Grüner V.',preis:4.8,steuer_prozent:10,kategorie_id:3,kategorie_name:'Wein',aktiv:true,sortierung:10,icon:'🍷'},
                {artikel_id:501,sku:'OBS-02',name:'Obstler 2cl',name_kurz:'Obstler',preis:3.5,steuer_prozent:10,kategorie_id:4,kategorie_name:'Spirituosen',aktiv:true,sortierung:10,icon:'🥃'},
                {artikel_id:601,sku:'KAF-GR',name:'Kaffee groß',name_kurz:'Kaffee',preis:3.5,steuer_prozent:10,kategorie_id:5,kategorie_name:'Heiße Getränke',aktiv:true,sortierung:10,icon:'☕'}
            ]);
        }
    }
};

const ExportService = {
    async exportBuchungenCSV() {
        const bs = await Buchungen.getAll({ exportiert: false });
        if (!bs.length) { Utils.showToast('Keine neuen Buchungen', 'warning'); return; }
        let csv = 'buchung_id,gast_id,gast_vorname,artikel_id,artikel_name,menge,preis,datum,uhrzeit\n';
        bs.forEach(b => { csv += `"${b.buchung_id}","${b.gast_id}","${b.gast_vorname}",${b.artikel_id},"${b.artikel_name}",${b.menge},${b.preis},"${b.datum}","${b.uhrzeit}"\n`; });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8;'}));
        a.download = `buchungen_${Date.now()}.csv`;
        a.click();
        await Buchungen.markAsExported(bs.map(b => b.buchung_id));
        Utils.showToast(`${bs.length} Buchungen exportiert`, 'success');
    }
};

const Router = {
    routes: {},
    init() { window.addEventListener('popstate', () => this.handleRoute()); this.handleRoute(); },
    register(p, h) { this.routes[p] = h; },
    navigate(p) { history.pushState({}, '', `#${p}`); this.handleRoute(); },
    handleRoute() { const p = location.hash.slice(1) || 'login'; State.currentPage = p; (this.routes[p] || this.routes['login'])?.(); }
};
window.Router = Router;

const UI = {
    render(html) { document.getElementById('app').innerHTML = html; },
    renderAlphabet(onClick) {
        return `<div class="alphabet-container"><div class="alphabet-title">Wählen Sie den ersten Buchstaben:</div><div class="alphabet-grid">${'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(l => `<button class="alphabet-btn" onclick="${onClick}('${l}')">${l}</button>`).join('')}</div></div>`;
    },
    renderNameList(gaeste, onSelect) {
        if (!gaeste?.length) return `<div class="name-list-empty"><p>Keine Einträge</p><button class="btn btn-secondary btn-block" onclick="handleBackToLogin()">Zurück</button></div>`;
        return `<div class="name-list-container"><div class="name-list-title">Wählen Sie Ihren Namen:</div><div class="name-list">${gaeste.map(g => `<button class="name-list-item" onclick="${onSelect}(${g.id || `'${g.gast_id}'`})"><span class="name-text">${g.displayName}</span><span class="name-arrow">→</span></button>`).join('')}</div><button class="btn btn-secondary btn-block mt-3" onclick="handleBackToLogin()">Zurück</button></div>`;
    }
};

// Routes
Router.register('login', () => {
    State.currentPin = ''; window.selectedGastId = null; window.currentLetter = null;
    UI.render(`<div class="main-content"><div style="text-align:center;margin-top:40px;"><div class="mountain-logo" style="margin:0 auto 24px;"><svg viewBox="0 0 100 60" class="mountain-svg" style="width:120px;height:72px;color:var(--color-mountain-blue);"><path d="M0,60 L20,30 L35,45 L50,15 L65,40 L80,25 L100,60 Z" fill="currentColor"/></svg></div><h1 style="font-family:var(--font-display);font-size:var(--text-3xl);margin-bottom:8px;">Seollerhaus Kassa</h1><p style="color:var(--color-stone-dark);margin-bottom:40px;">Self-Service Buchung</p><div style="max-width:600px;margin:0 auto;">${UI.renderAlphabet('handleLetterSelect')}<div style="margin-top:32px;padding-top:24px;border-top:1px solid var(--color-stone-medium);"><p style="color:var(--color-stone-dark);margin-bottom:16px;">Noch kein Account?</p><button class="btn btn-primary btn-block" style="max-width:400px;margin:0 auto;" onclick="handleRegisterClick()">Neu registrieren</button></div><div style="margin-top:24px;"><button class="btn btn-secondary" onclick="handleAdminClick()">Admin-Login</button></div></div></div></div>`);
});

Router.register('register', () => {
    window.registerPin = '';
    UI.render(`<div class="main-content"><div style="max-width:500px;margin:40px auto;">
        <h1 class="page-title" style="text-align:center;">Neu registrieren</h1>
        <div class="card">
            <div class="form-group">
                <label class="form-label">Vorname *</label>
                <input type="text" id="register-vorname" class="form-input" placeholder="z.B. Maria" autofocus style="font-size:1.2rem;padding:16px;">
            </div>
            <div class="form-group">
                <label class="form-label" style="text-align:center;display:block;">4-stelliger PIN-Code *</label>
                <div class="pin-display" id="register-pin-display" style="display:flex;justify-content:center;gap:12px;margin:16px 0;">
                    <div class="pin-dot"></div><div class="pin-dot"></div><div class="pin-dot"></div><div class="pin-dot"></div>
                </div>
                <div class="pin-buttons">
                    ${[1,2,3,4,5,6,7,8,9].map(n => `<button type="button" class="pin-btn" onclick="handleRegisterPinInput('${n}')">${n}</button>`).join('')}
                    <button type="button" class="pin-btn" style="visibility:hidden;"></button>
                    <button type="button" class="pin-btn" onclick="handleRegisterPinInput('0')">0</button>
                    <button type="button" class="pin-btn pin-btn-delete" onclick="handleRegisterPinDelete()">⌫</button>
                </div>
            </div>
            <button class="btn btn-primary btn-block" onclick="handleRegisterSubmit()" style="margin-top:24px;">✓ Registrieren</button>
        </div>
        <button class="btn btn-secondary btn-block mt-3" onclick="handleBackToLogin()">← Zurück</button>
    </div></div>`);
});

window.handleRegisterPinInput = (d) => {
    if (window.registerPin.length < 4) {
        window.registerPin += d;
        updateRegisterPinDisplay();
    }
};
window.handleRegisterPinDelete = () => {
    window.registerPin = window.registerPin.slice(0, -1);
    updateRegisterPinDisplay();
};
function updateRegisterPinDisplay() {
    const dots = document.querySelectorAll('#register-pin-display .pin-dot');
    dots.forEach((dot, i) => {
        dot.classList.toggle('filled', i < window.registerPin.length);
    });
}

Router.register('name-select', async () => {
    if (!window.currentLetter) { Router.navigate('login'); return; }
    const gaeste = await Auth.getGaesteByLetter(window.currentLetter);
    UI.render(`<div class="main-content"><div style="max-width:600px;margin:40px auto;"><h1 class="page-title" style="text-align:center;">Buchstabe: ${window.currentLetter}</h1>${UI.renderNameList(gaeste, 'handleNameSelect')}</div></div>`);
});

Router.register('pin-entry', () => {
    if (!window.selectedGastId) { Router.navigate('login'); return; }
    window.loginPin = '';
    UI.render(`<div class="main-content"><div style="max-width:500px;margin:60px auto;">
        <div class="card">
            <label class="form-label" style="text-align:center;display:block;font-size:1.2rem;margin-bottom:16px;">PIN eingeben</label>
            <div class="pin-display" id="login-pin-display" style="display:flex;justify-content:center;gap:12px;margin:16px 0;">
                <div class="pin-dot"></div><div class="pin-dot"></div><div class="pin-dot"></div><div class="pin-dot"></div>
            </div>
            <div class="pin-buttons">
                ${[1,2,3,4,5,6,7,8,9].map(n => `<button type="button" class="pin-btn" onclick="handleLoginPinInput('${n}')">${n}</button>`).join('')}
                <button type="button" class="pin-btn" style="visibility:hidden;"></button>
                <button type="button" class="pin-btn" onclick="handleLoginPinInput('0')">0</button>
                <button type="button" class="pin-btn pin-btn-delete" onclick="handleLoginPinDelete()">⌫</button>
            </div>
            <button class="btn btn-primary btn-block" onclick="handlePinLogin()" style="margin-top:16px;">✓ Anmelden</button>
        </div>
        <button class="btn btn-secondary btn-block mt-3" onclick="handlePinCancel()">← Zurück</button>
    </div></div>`);
});

window.handleLoginPinInput = (d) => {
    if (window.loginPin.length < 4) {
        window.loginPin += d;
        updateLoginPinDisplay();
        // Auto-Login bei 4 Stellen
        if (window.loginPin.length === 4) {
            setTimeout(() => handlePinLogin(), 200);
        }
    }
};
window.handleLoginPinDelete = () => {
    window.loginPin = window.loginPin.slice(0, -1);
    updateLoginPinDisplay();
};
function updateLoginPinDisplay() {
    const dots = document.querySelectorAll('#login-pin-display .pin-dot');
    dots.forEach((dot, i) => {
        dot.classList.toggle('filled', i < window.loginPin.length);
    });
}
window.handlePinLogin = async () => {
    if (window.loginPin.length !== 4) {
        Utils.showToast('Bitte 4-stelligen PIN eingeben', 'warning');
        return;
    }
    try {
        await Auth.login(window.selectedGastId, window.loginPin);
        Router.navigate('buchen');
    } catch (e) {
        Utils.showToast(e.message, 'error');
        window.loginPin = '';
        updateLoginPinDisplay();
    }
};

Router.register('admin-login', () => {
    UI.render(`<div class="main-content"><div style="max-width:500px;margin:60px auto;"><h1 class="page-title" style="text-align:center;">🔐 Admin-Login</h1><div class="card"><div class="form-group"><label class="form-label">Admin-Passwort</label><input type="password" id="admin-password" class="form-input" placeholder="Passwort" onkeydown="if(event.key==='Enter')handleAdminLogin()" style="font-size:1.2rem;padding:16px;"></div><button class="btn btn-primary btn-block" onclick="handleAdminLogin()">Anmelden</button></div><button class="btn btn-secondary btn-block mt-3" onclick="handleBackToLogin()">← Zurück</button></div></div>`);
    setTimeout(() => document.getElementById('admin-password')?.focus(), 100);
});

Router.register('admin-dashboard', async () => {
    if (!State.isAdmin) { Router.navigate('admin-login'); return; }
    const guests = await RegisteredGuests.getAll();
    const artCount = await db.artikel.count();
    const bs = await Buchungen.getAll();
    const heute = Utils.formatDate(new Date());
    const heuteB = bs.filter(b => b.datum === heute);
    const nichtExp = bs.filter(b => !b.exportiert);
    UI.render(`<div class="app-header"><div class="header-left"><div class="header-title">🔧 Admin Dashboard</div></div><div class="header-right"><button class="btn btn-secondary" onclick="handleLogout()">Abmelden</button></div></div>
    <div class="main-content">
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-value">${guests.length}</div><div class="stat-label">Gäste</div></div>
            <div class="stat-card"><div class="stat-value">${artCount}</div><div class="stat-label">Artikel</div></div>
            <div class="stat-card"><div class="stat-value">${heuteB.length}</div><div class="stat-label">Buchungen heute</div></div>
            <div class="stat-card"><div class="stat-value">${Utils.formatCurrency(heuteB.reduce((s,b) => s+b.preis*b.menge, 0))}</div><div class="stat-label">Umsatz heute</div></div>
        </div>
        
        <button class="btn btn-primary btn-block" onclick="Router.navigate('admin-auffuellliste')" style="padding:20px;font-size:1.2rem;margin-bottom:24px;">
            🍺 Auffüllliste (${nichtExp.length} Buchungen)
        </button>
        
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:24px;">
            <button class="btn btn-primary" onclick="Router.navigate('admin-guests')" style="padding:24px;">👥 Gästeverwaltung</button>
            <button class="btn btn-primary" onclick="Router.navigate('admin-articles')" style="padding:24px;">📦 Artikelverwaltung</button>
        </div>
        
        <div class="card">
            <div class="card-header"><h2 class="card-title">🔄 Daten-Management</h2></div>
            <div class="card-body">
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;">
                    <div style="padding:16px;background:var(--color-stone-light);border-radius:var(--radius-md);">
                        <h3 style="font-weight:600;margin-bottom:8px;">💾 Backup</h3>
                        <button class="btn btn-secondary" onclick="DataProtection.manualExport()">JSON herunterladen</button>
                    </div>
                    <div style="padding:16px;background:var(--color-stone-light);border-radius:var(--radius-md);">
                        <h3 style="font-weight:600;margin-bottom:8px;">📤 Buchungen CSV</h3>
                        <button class="btn btn-secondary" onclick="handleExportBuchungen()">Exportieren</button>
                    </div>
                    <div style="padding:16px;background:var(--color-stone-light);border-radius:var(--radius-md);">
                        <h3 style="font-weight:600;margin-bottom:8px;">👥 Gäste Export</h3>
                        <button class="btn btn-secondary" onclick="DataProtection.exportGuestsCSV()">CSV</button>
                    </div>
                    <div style="padding:16px;background:var(--color-stone-light);border-radius:var(--radius-md);">
                        <h3 style="font-weight:600;margin-bottom:8px;">📦 Artikel Export</h3>
                        <button class="btn btn-secondary" onclick="DataProtection.exportArticlesCSV()">CSV</button>
                    </div>
                </div>
            </div>
        </div>
    </div>`);
});

// Auffüllliste Route
Router.register('admin-auffuellliste', async () => {
    if (!State.isAdmin) { Router.navigate('admin-login'); return; }
    const liste = await Buchungen.getAuffuellliste();
    
    // Nach Kategorie gruppieren
    const byKat = {};
    liste.forEach(item => {
        if (!byKat[item.kategorie_name]) byKat[item.kategorie_name] = [];
        byKat[item.kategorie_name].push(item);
    });
    
    const total = liste.reduce((s, i) => s + i.menge, 0);
    
    UI.render(`<div class="app-header"><div class="header-left"><button class="menu-btn" onclick="Router.navigate('admin-dashboard')">←</button><div class="header-title">🍺 Auffüllliste</div></div><div class="header-right"><button class="btn btn-secondary" onclick="handleLogout()">Abmelden</button></div></div>
    <div class="main-content">
        <div class="card mb-3" style="background:var(--color-alpine-green);color:white;">
            <div style="padding:20px;text-align:center;">
                <div style="font-size:2rem;font-weight:700;">${total} Getränke</div>
                <div>zum Auffüllen</div>
            </div>
        </div>
        
        <div style="display:flex;gap:12px;margin-bottom:24px;">
            <button class="btn btn-primary" onclick="printAuffuellliste()" style="flex:1;">🖨️ Drucken</button>
            <button class="btn btn-danger" onclick="resetAuffuellliste()" style="flex:1;">🔄 Zurücksetzen</button>
        </div>
        
        <div id="auffuellliste-print">
            ${Object.keys(byKat).length ? Object.keys(byKat).sort().map(kat => `
                <div class="card mb-3">
                    <div class="card-header" style="background:var(--color-stone-light);">
                        <h3 style="font-weight:600;margin:0;">${kat}</h3>
                    </div>
                    <div class="card-body" style="padding:0;">
                        <table style="width:100%;border-collapse:collapse;">
                            ${byKat[kat].map(item => `
                                <tr style="border-bottom:1px solid var(--color-stone-medium);">
                                    <td style="padding:12px;font-weight:500;">${item.name}</td>
                                    <td style="padding:12px;text-align:right;font-size:1.3rem;font-weight:700;color:var(--color-alpine-green);">${item.menge}×</td>
                                </tr>
                            `).join('')}
                        </table>
                    </div>
                </div>
            `).join('') : '<p class="text-muted text-center" style="padding:40px;">Keine Getränke zum Auffüllen</p>'}
        </div>
    </div>`);
});

// Auffüllliste drucken
window.printAuffuellliste = () => {
    const content = document.getElementById('auffuellliste-print');
    if (!content) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Auffüllliste - ${new Date().toLocaleDateString('de-AT')}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { text-align: center; margin-bottom: 20px; }
                h3 { background: #f0f0f0; padding: 10px; margin: 20px 0 0 0; }
                table { width: 100%; border-collapse: collapse; }
                td { padding: 8px; border-bottom: 1px solid #ddd; }
                td:last-child { text-align: right; font-weight: bold; font-size: 1.2em; }
                .footer { margin-top: 30px; text-align: center; color: #888; font-size: 0.9em; }
                @media print { 
                    body { padding: 0; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <h1>🍺 Auffüllliste</h1>
            <p style="text-align:center;">${new Date().toLocaleDateString('de-AT', {weekday:'long', year:'numeric', month:'long', day:'numeric'})}</p>
            ${content.innerHTML}
            <div class="footer">Seollerhaus Kassa</div>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
};

// Auffüllliste zurücksetzen
window.resetAuffuellliste = async () => {
    if (confirm('Alle Buchungen als "aufgefüllt" markieren?\\n\\nDies setzt die Auffüllliste auf 0 zurück.')) {
        await Buchungen.resetAuffuellliste();
        Router.navigate('admin-auffuellliste');
    }
};

Router.register('admin-guests', async () => {
    if (!State.isAdmin) { Router.navigate('admin-login'); return; }
    const guests = await RegisteredGuests.getAll();
    UI.render(`<div class="app-header"><div class="header-left"><button class="menu-btn" onclick="Router.navigate('admin-dashboard')">←</button><div class="header-title">👥 Gästeverwaltung</div></div><div class="header-right"><button class="btn btn-secondary" onclick="handleLogout()">Abmelden</button></div></div><div class="main-content"><div class="card"><div class="card-header"><h2 class="card-title">Registrierte Gäste (${guests.length})</h2><button class="btn btn-secondary" onclick="DataProtection.exportGuestsCSV()">📥 Export</button></div><div class="card-body"><div class="form-group"><input type="text" class="form-input" placeholder="🔍 Suchen..." oninput="filterGuestList(this.value)"></div><div id="guest-list">${guests.length ? guests.map(g => `<div class="list-item guest-item" data-name="${g.firstName.toLowerCase()}"><div style="flex:1;"><strong>${g.firstName}</strong><br><small class="text-muted">ID: ${g.id} | ${new Date(g.createdAt).toLocaleDateString('de-AT')}</small></div><button class="btn btn-danger" onclick="handleDeleteGuest(${g.id})" style="padding:8px 16px;">🗑️</button></div>`).join('') : '<p class="text-muted text-center">Keine Gäste</p>'}</div></div></div></div>`);
});

Router.register('admin-articles', async () => {
    if (!State.isAdmin) { Router.navigate('admin-login'); return; }
    const articles = await Artikel.getAll();
    const kats = await db.kategorien.toArray();
    const katMap = {};
    kats.forEach(k => katMap[k.kategorie_id] = k.name);
    
    // Artikel nach Kategorie gruppieren
    const byCategory = {};
    articles.forEach(a => {
        const katId = a.kategorie_id || 0;
        if (!byCategory[katId]) byCategory[katId] = [];
        byCategory[katId].push(a);
    });
    
    // Innerhalb jeder Kategorie nach Sortierung sortieren
    Object.keys(byCategory).forEach(katId => {
        byCategory[katId].sort((a, b) => (a.sortierung || 0) - (b.sortierung || 0));
    });
    
    const renderArticleRow = (a, pos) => {
        const img = (a.bild && a.bild.startsWith('data:')) 
            ? `<img src="${a.bild}" style="width:40px;height:40px;object-fit:cover;border-radius:6px;">`
            : `<span style="font-size:1.5rem;">${a.icon||'📦'}</span>`;
        return `<tr class="article-row" data-name="${a.name.toLowerCase()}" data-sku="${(a.sku||'').toLowerCase()}">
            <td style="width:40px;text-align:center;font-weight:700;color:var(--color-alpine-green);">${pos}</td>
            <td style="width:50px;text-align:center;">${img}</td>
            <td><strong>${a.name}</strong>${a.sku?` <small style="color:var(--color-stone-dark);">(${a.sku})</small>`:''}</td>
            <td style="text-align:right;font-weight:600;">${Utils.formatCurrency(a.preis)}</td>
            <td style="text-align:center;">${a.aktiv?'✅':'❌'}</td>
            <td style="text-align:right;white-space:nowrap;">
                <button class="btn btn-secondary" onclick="showEditArticleModal(${a.artikel_id})" style="padding:6px 12px;">✏️</button>
                <button class="btn btn-danger" onclick="handleDeleteArticle(${a.artikel_id})" style="padding:6px 12px;">🗑️</button>
            </td>
        </tr>`;
    };
    
    // Kategorien sortieren
    const sortedKats = Object.keys(byCategory).sort((a, b) => parseInt(a) - parseInt(b));
    
    let tableContent = '';
    sortedKats.forEach(katId => {
        const katName = katMap[katId] || 'Sonstiges';
        const artikelList = byCategory[katId];
        tableContent += `<tr class="category-header"><td colspan="6" style="background:var(--color-alpine-green);color:white;padding:12px;font-weight:700;font-size:1.1rem;">${katName} (${artikelList.length})</td></tr>`;
        artikelList.forEach((a, idx) => {
            tableContent += renderArticleRow(a, idx + 1);
        });
    });
    
    UI.render(`<div class="app-header"><div class="header-left"><button class="menu-btn" onclick="Router.navigate('admin-dashboard')">←</button><div class="header-title">📦 Artikelverwaltung</div></div><div class="header-right"><button class="btn btn-secondary" onclick="handleLogout()">Abmelden</button></div></div>
    <div class="main-content">
        <div class="card mb-3">
            <div class="card-header"><h2 class="card-title">📥 CSV Import</h2></div>
            <div class="card-body">
                <p style="margin-bottom:16px;color:var(--color-stone-dark);">CSV: <code>ID,Artikelname,Preis,Warengruppe</code><br><small>Bei gleicher ID: Update</small></p>
                <input type="file" id="artikel-import" accept=".csv" style="display:none" onchange="handleArtikelImport(event)">
                <button class="btn btn-primary" onclick="document.getElementById('artikel-import').click()">📄 CSV auswählen</button>
                <button class="btn btn-secondary" onclick="DataProtection.exportArticlesCSV()" style="margin-left:8px;">📤 Export</button>
            </div>
        </div>
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Artikel (${articles.length})</h2>
                <button class="btn btn-primary" onclick="showAddArticleModal()">+ Neu</button>
            </div>
            <div class="card-body">
                <div class="form-group"><input type="text" class="form-input" placeholder="🔍 Suchen..." oninput="filterArticleTable(this.value)"></div>
                <div style="overflow-x:auto;">
                    <table style="width:100%;border-collapse:collapse;" id="article-table">
                        <thead>
                            <tr style="background:var(--color-stone-light);text-align:left;">
                                <th style="padding:12px 8px;width:40px;">Pos.</th>
                                <th style="padding:12px 8px;width:50px;"></th>
                                <th style="padding:12px 8px;">Name</th>
                                <th style="padding:12px 8px;text-align:right;">Preis</th>
                                <th style="padding:12px 8px;text-align:center;">Aktiv</th>
                                <th style="padding:12px 8px;"></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableContent || '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--color-stone-dark);">Keine Artikel</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
    <div id="article-modal-container"></div>`);
});

// Filter für Artikel-Tabelle
window.filterArticleTable = (q) => {
    const ql = q.toLowerCase();
    document.querySelectorAll('.article-row').forEach(row => {
        const match = row.dataset.name.includes(ql) || row.dataset.sku.includes(ql);
        row.style.display = match ? '' : 'none';
    });
};

// Tabellen-Styling und PIN-Dots dynamisch hinzufügen
if (!document.getElementById('table-styles')) {
    const style = document.createElement('style');
    style.id = 'table-styles';
    style.textContent = `
        #article-table tbody tr { border-bottom: 1px solid var(--color-stone-medium); }
        #article-table tbody tr:hover { background: var(--color-stone-light); }
        #article-table td { padding: 12px 8px; vertical-align: middle; }
        #article-table .category-header:hover { background: var(--color-alpine-green) !important; }
        .pin-dot { width: 20px; height: 20px; border-radius: 50%; border: 3px solid var(--color-alpine-green); background: white; transition: all 0.2s; }
        .pin-dot.filled { background: var(--color-alpine-green); }
    `;
    document.head.appendChild(style);
}

Router.register('dashboard', async () => {
    if (!State.currentUser) { Router.navigate('login'); return; }
    // Direkt zur Buchen-Seite weiterleiten
    Router.navigate('buchen');
});

Router.register('buchen', async () => {
    if (!State.currentUser) { Router.navigate('login'); return; }
    const kats = await db.kategorien.toArray();
    const arts = await Artikel.getAll({ aktiv: true });
    const name = State.currentUser.firstName || State.currentUser.vorname;
    const filtered = State.selectedCategory ? arts.filter(a => a.kategorie_id === State.selectedCategory) : arts;
    const sessionBuchungen = await Buchungen.getSessionBuchungen();
    const sessionTotal = sessionBuchungen.reduce((s,b) => s + b.preis * b.menge, 0);
    
    const renderTileContent = (a) => {
        if (a.bild && a.bild.startsWith('data:')) {
            return `<img src="${a.bild}" style="width:64px;height:64px;object-fit:cover;border-radius:8px;">`;
        }
        return `<div class="artikel-icon">${a.icon||'📦'}</div>`;
    };
    
    UI.render(`
    <div class="app-header">
        <div class="header-left"><div class="header-title">👤 ${name}</div></div>
        <div class="header-right"><button class="btn btn-secondary" onclick="handleGastAbmelden()">Abmelden</button></div>
    </div>
    <div class="main-content" style="padding-bottom:20px;">
        <div class="form-group"><input type="text" class="form-input" placeholder="🔍 Suchen..." oninput="searchArtikel(this.value)"></div>
        <div class="category-tabs">
            <div class="category-tab ${!State.selectedCategory?'active':''}" onclick="filterCategory(null)">Alle</div>
            ${kats.map(k => `<div class="category-tab ${State.selectedCategory===k.kategorie_id?'active':''}" onclick="filterCategory(${k.kategorie_id})">${k.name}</div>`).join('')}
        </div>
        <div class="artikel-grid">
            ${filtered.map(a => `<div class="artikel-tile" style="--tile-color:${getCategoryColor(a.kategorie_id)}" onclick="bucheArtikelDirekt(${a.artikel_id})">${renderTileContent(a)}<div class="artikel-name">${a.name_kurz||a.name}</div><div class="artikel-price">${Utils.formatCurrency(a.preis)}</div></div>`).join('')}
        </div>
    </div>
    ${sessionBuchungen.length ? `
    <div class="session-popup" style="position:fixed;bottom:20px;right:20px;left:20px;max-width:400px;margin:0 auto;background:white;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.2);border:2px solid var(--color-alpine-green);z-index:1000;">
        <div style="padding:16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                <strong style="font-size:1.1rem;">🛒 Meine Buchungen</strong>
                <span style="font-size:1.4rem;font-weight:700;color:var(--color-alpine-green);">${Utils.formatCurrency(sessionTotal)}</span>
            </div>
            <div style="max-height:200px;overflow-y:auto;">
                ${sessionBuchungen.map(b => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:var(--color-stone-light);border-radius:8px;margin-bottom:6px;">
                    <div>
                        <span style="font-weight:600;">${b.artikel_name}</span>
                        <span style="color:var(--color-stone-dark);margin-left:8px;">× ${b.menge}</span>
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span style="font-weight:600;">${Utils.formatCurrency(b.preis * b.menge)}</span>
                        <button class="btn btn-danger" onclick="stornoBuchung('${b.buchung_id}')" style="padding:4px 10px;font-size:0.85rem;">✕</button>
                    </div>
                </div>
                `).join('')}
            </div>
            <div style="display:flex;gap:10px;margin-top:12px;">
                <button class="btn btn-primary" onclick="handleGastAbmelden()" style="flex:1;padding:14px;font-size:1rem;">✓ Fertig & Abmelden</button>
            </div>
        </div>
    </div>
    ` : ''}`);
});

// Direktes Buchen
window.bucheArtikelDirekt = async (id) => {
    try {
        const a = await Artikel.getById(id);
        if (!a) { Utils.showToast('Artikel nicht gefunden', 'error'); return; }
        await Buchungen.create(a, 1);
        Utils.showToast(`${a.name_kurz||a.name} gebucht!`, 'success');
        Router.navigate('buchen');
    } catch (e) {
        Utils.showToast(e.message || 'Fehler beim Buchen', 'error');
    }
};

// Storno durch Gast
window.stornoBuchung = async (buchung_id) => {
    if (confirm('Buchung stornieren?')) {
        try {
            await Buchungen.storno(buchung_id);
            Router.navigate('buchen');
        } catch (e) {
            Utils.showToast(e.message, 'error');
        }
    }
};

// Buchen und Abmelden
window.handleBuchenUndAbmelden = async () => {
    await Buchungen.fixSessionBuchungen();
    State.clearUser();
    Router.navigate('login');
    Utils.showToast('Buchungen gespeichert. Auf Wiedersehen!', 'success');
};

// Gast Abmelden (gleiche Funktion, immer Buchungen speichern)
window.handleGastAbmelden = async () => {
    await Buchungen.fixSessionBuchungen();
    State.clearUser();
    Router.navigate('login');
    Utils.showToast('Auf Wiedersehen!', 'success');
};

// Storno durch Gast
window.stornoBuchung = async (buchung_id) => {
    if (confirm('Buchung wirklich stornieren?')) {
        try {
            await Buchungen.storno(buchung_id);
            Router.navigate('buchen');
        } catch (e) {
            Utils.showToast(e.message, 'error');
        }
    }
};

Router.register('historie', async () => {
    // Direkt zur Buchen-Seite weiterleiten
    Router.navigate('buchen');
});

Router.register('profil', () => {
    // Direkt zur Buchen-Seite weiterleiten
    Router.navigate('buchen');
});

// Global handlers
window.handleRegisterClick = () => Router.navigate('register');
window.handleAdminClick = () => Router.navigate('admin-login');
window.handleBackToLogin = () => Router.navigate('login');
window.navigateToDashboard = () => Router.navigate('dashboard');
window.navigateToBuchen = () => Router.navigate('buchen');
window.navigateToHistorie = () => Router.navigate('historie');
window.navigateToProfil = () => Router.navigate('profil');
window.handleLogout = () => Auth.logout();
window.handleLetterSelect = l => { window.currentLetter = l; Router.navigate('name-select'); };
window.handleNameSelect = id => { window.selectedGastId = id; Router.navigate('pin-entry'); };
window.handlePinCancel = () => { window.selectedGastId = null; Router.navigate('login'); };
window.handleRegisterSubmit = async () => {
    const v = document.getElementById('register-vorname')?.value;
    const p = window.registerPin;
    if (!v?.trim()) { Utils.showToast('Vorname eingeben', 'warning'); return; }
    if (!p || p.length !== 4) { Utils.showToast('4-stelligen PIN eingeben', 'warning'); return; }
    try { await RegisteredGuests.register(v.trim(), p); setTimeout(() => Router.navigate('login'), 1500); } catch(e) {}
};
window.handleAdminLogin = async () => {
    const pw = document.getElementById('admin-password')?.value;
    if (!pw) { Utils.showToast('Passwort eingeben', 'warning'); return; }
    if (await Auth.adminLogin(pw)) Router.navigate('admin-dashboard');
};
window.handleExportBuchungen = async () => { await ExportService.exportBuchungenCSV(); Router.navigate('admin-dashboard'); };
window.handleArtikelImport = async e => { const f = e.target.files[0]; if(!f) return; try { await Artikel.importFromCSV(await f.text()); Router.navigate('admin-articles'); } catch(er) {} e.target.value = ''; };
window.handleDeleteGuest = async id => { if(confirm('Gast löschen?')) { await RegisteredGuests.delete(id); Router.navigate('admin-guests'); } };
window.handleDeleteArticle = async id => { if(confirm('Artikel löschen?')) { await Artikel.delete(id); Router.navigate('admin-articles'); } };
window.filterGuestList = q => { document.querySelectorAll('.guest-item').forEach(i => { i.style.display = i.dataset.name.includes(q.toLowerCase()) ? '' : 'none'; }); };
window.filterArticleList = q => { const ql = q.toLowerCase(); document.querySelectorAll('.article-item').forEach(i => { i.style.display = (i.dataset.name.includes(ql) || i.dataset.sku.includes(ql)) ? '' : 'none'; }); };
window.filterCategory = id => { State.selectedCategory = id; Router.navigate('buchen'); };
window.getCategoryColor = id => ({1:'#FF6B6B',2:'#FFD93D',3:'#95E1D3',4:'#AA4465',5:'#F38181',6:'#6C5B7B',7:'#F8B500',8:'#4A5859'})[id] || '#2C5F7C';
window.searchArtikel = Utils.debounce(async q => {
    const arts = await Artikel.getAll({ aktiv: true, search: q });
    const grid = document.querySelector('.artikel-grid');
    const renderTile = (a) => {
        const content = (a.bild && a.bild.startsWith('data:')) 
            ? `<img src="${a.bild}" style="width:64px;height:64px;object-fit:cover;border-radius:8px;">`
            : `<div class="artikel-icon">${a.icon||'📦'}</div>`;
        return `<div class="artikel-tile" style="--tile-color:${getCategoryColor(a.kategorie_id)}" onclick="bucheArtikelDirekt(${a.artikel_id})">${content}<div class="artikel-name">${a.name_kurz||a.name}</div><div class="artikel-price">${Utils.formatCurrency(a.preis)}</div></div>`;
    };
    if (grid) grid.innerHTML = arts.map(renderTile).join('') || '<p class="text-muted" style="grid-column:1/-1;text-align:center;">Keine Ergebnisse</p>';
}, 300);

window.showAddArticleModal = () => {
    const c = document.getElementById('article-modal-container');
    c.innerHTML = `<div class="modal-container active"><div class="modal-backdrop" onclick="closeArticleModal()"></div><div class="modal-content" style="max-width:500px;max-height:90vh;overflow-y:auto;"><h2 style="margin-bottom:24px;">Neuer Artikel</h2>
    <div class="form-group" style="text-align:center;">
        <div id="article-image-preview" style="width:120px;height:120px;margin:0 auto 12px;border-radius:12px;background:var(--color-stone-light);display:flex;align-items:center;justify-content:center;font-size:3rem;overflow:hidden;">📦</div>
        <input type="file" id="article-image" accept="image/*" style="display:none" onchange="handleImagePreview(event)">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('article-image').click()" style="padding:8px 16px;">📷 Foto wählen</button>
        <button type="button" class="btn btn-secondary" onclick="clearImagePreview()" style="padding:8px 16px;margin-left:8px;">✕</button>
    </div>
    <div class="form-group"><label class="form-label">Name *</label><input type="text" id="article-name" class="form-input" placeholder="z.B. Cola 0.5l"></div>
    <div class="form-group"><label class="form-label">Kurzname</label><input type="text" id="article-short" class="form-input" placeholder="z.B. Cola"></div>
    <div class="form-group"><label class="form-label">SKU</label><input type="text" id="article-sku" class="form-input" placeholder="z.B. COL-05"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <div class="form-group"><label class="form-label">Preis (€) *</label><input type="number" id="article-price" class="form-input" placeholder="0.00" step="0.01" min="0"></div>
        <div class="form-group"><label class="form-label">Position</label><input type="number" id="article-sort" class="form-input" placeholder="1" min="1" value="1"><small style="color:var(--color-stone-dark);">Reihenfolge in Kategorie</small></div>
    </div>
    <div class="form-group"><label class="form-label">Kategorie</label><select id="article-category" class="form-input"><option value="1">Alkoholfreie Getränke</option><option value="2">Biere</option><option value="3">Wein</option><option value="4">Spirituosen</option><option value="5">Heiße Getränke</option><option value="6">Sonstiges</option><option value="7">Snacks</option><option value="8">Diverses</option></select></div>
    <div class="form-checkbox"><input type="checkbox" id="article-active" checked><label for="article-active">Aktiv</label></div>
    <div style="display:flex;gap:16px;margin-top:24px;"><button class="btn btn-secondary" style="flex:1;" onclick="closeArticleModal()">Abbrechen</button><button class="btn btn-primary" style="flex:1;" onclick="saveNewArticle()">Speichern</button></div></div></div>`;
    window.currentArticleImage = null;
};
window.showEditArticleModal = async id => {
    const a = await Artikel.getById(id);
    if (!a) return;
    const c = document.getElementById('article-modal-container');
    const hasImage = a.bild && a.bild.startsWith('data:');
    const previewContent = hasImage ? `<img src="${a.bild}" style="width:100%;height:100%;object-fit:cover;">` : (a.icon || '📦');
    c.innerHTML = `<div class="modal-container active"><div class="modal-backdrop" onclick="closeArticleModal()"></div><div class="modal-content" style="max-width:500px;max-height:90vh;overflow-y:auto;"><h2 style="margin-bottom:24px;">Artikel bearbeiten</h2>
    <input type="hidden" id="article-id" value="${a.artikel_id}">
    <div class="form-group" style="text-align:center;">
        <div id="article-image-preview" style="width:120px;height:120px;margin:0 auto 12px;border-radius:12px;background:var(--color-stone-light);display:flex;align-items:center;justify-content:center;font-size:3rem;overflow:hidden;">${previewContent}</div>
        <input type="file" id="article-image" accept="image/*" style="display:none" onchange="handleImagePreview(event)">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('article-image').click()" style="padding:8px 16px;">📷 Foto wählen</button>
        <button type="button" class="btn btn-secondary" onclick="clearImagePreview()" style="padding:8px 16px;margin-left:8px;">✕</button>
    </div>
    <div class="form-group"><label class="form-label">Name *</label><input type="text" id="article-name" class="form-input" value="${a.name}"></div>
    <div class="form-group"><label class="form-label">Kurzname</label><input type="text" id="article-short" class="form-input" value="${a.name_kurz||''}"></div>
    <div class="form-group"><label class="form-label">SKU</label><input type="text" id="article-sku" class="form-input" value="${a.sku||''}"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <div class="form-group"><label class="form-label">Preis (€) *</label><input type="number" id="article-price" class="form-input" value="${a.preis}" step="0.01" min="0"></div>
        <div class="form-group"><label class="form-label">Position</label><input type="number" id="article-sort" class="form-input" value="${a.sortierung||1}" min="1"><small style="color:var(--color-stone-dark);">Reihenfolge in Kategorie</small></div>
    </div>
    <div class="form-group"><label class="form-label">Kategorie</label><select id="article-category" class="form-input">${[1,2,3,4,5,6,7,8].map(i => `<option value="${i}" ${a.kategorie_id===i?'selected':''}>${{1:'Alkoholfreie Getränke',2:'Biere',3:'Wein',4:'Spirituosen',5:'Heiße Getränke',6:'Sonstiges',7:'Snacks',8:'Diverses'}[i]}</option>`).join('')}</select></div>
    <div class="form-checkbox"><input type="checkbox" id="article-active" ${a.aktiv?'checked':''}><label for="article-active">Aktiv</label></div>
    <div style="display:flex;gap:16px;margin-top:24px;"><button class="btn btn-secondary" style="flex:1;" onclick="closeArticleModal()">Abbrechen</button><button class="btn btn-primary" style="flex:1;" onclick="saveEditArticle()">Speichern</button></div></div></div>`;
    window.currentArticleImage = a.bild || null;
};
window.closeArticleModal = () => { document.getElementById('article-modal-container').innerHTML = ''; window.currentArticleImage = null; };

// Bild-Handler
window.handleImagePreview = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
        Utils.showToast('Bild wird verarbeitet...', 'info');
        const base64 = await Utils.resizeImage(file, 150);
        window.currentArticleImage = base64;
        const preview = document.getElementById('article-image-preview');
        preview.innerHTML = `<img src="${base64}" style="width:100%;height:100%;object-fit:cover;">`;
        Utils.showToast('Bild geladen!', 'success');
    } catch (e) {
        Utils.showToast('Fehler beim Laden', 'error');
    }
};
window.clearImagePreview = () => {
    window.currentArticleImage = null;
    const katId = parseInt(document.getElementById('article-category')?.value) || 1;
    const iconMap = {1:'🥤',2:'🍺',3:'🍷',4:'🥃',5:'☕',6:'🍽️',7:'🍿',8:'📦'};
    document.getElementById('article-image-preview').innerHTML = iconMap[katId] || '📦';
    document.getElementById('article-image').value = '';
};

window.saveNewArticle = async () => {
    const name = document.getElementById('article-name')?.value;
    if (!name?.trim()) { Utils.showToast('Name erforderlich', 'warning'); return; }
    const katId = parseInt(document.getElementById('article-category')?.value) || 1;
    const katMap = {1:'Alkoholfreie Getränke',2:'Biere',3:'Wein',4:'Spirituosen',5:'Heiße Getränke',6:'Sonstiges',7:'Snacks',8:'Diverses'};
    const iconMap = {1:'🥤',2:'🍺',3:'🍷',4:'🥃',5:'☕',6:'🍽️',7:'🍿',8:'📦'};
    await Artikel.create({ 
        name: name.trim(), 
        name_kurz: document.getElementById('article-short')?.value?.trim() || name.trim().substring(0,15), 
        sku: document.getElementById('article-sku')?.value?.trim() || null, 
        preis: parseFloat(document.getElementById('article-price')?.value) || 0, 
        steuer_prozent: 10, 
        kategorie_id: katId, 
        kategorie_name: katMap[katId], 
        aktiv: document.getElementById('article-active')?.checked, 
        sortierung: parseInt(document.getElementById('article-sort')?.value) || 1, 
        icon: iconMap[katId],
        bild: window.currentArticleImage || null
    });
    closeArticleModal();
    Router.navigate('admin-articles');
};

window.saveEditArticle = async () => {
    const id = parseInt(document.getElementById('article-id')?.value);
    const name = document.getElementById('article-name')?.value;
    if (!name?.trim()) { Utils.showToast('Name erforderlich', 'warning'); return; }
    const katId = parseInt(document.getElementById('article-category')?.value) || 1;
    const newPos = parseInt(document.getElementById('article-sort')?.value) || 1;
    const katMap = {1:'Alkoholfreie Getränke',2:'Biere',3:'Wein',4:'Spirituosen',5:'Heiße Getränke',6:'Sonstiges',7:'Snacks',8:'Diverses'};
    const iconMap = {1:'🥤',2:'🍺',3:'🍷',4:'🥃',5:'☕',6:'🍽️',7:'🍿',8:'📦'};
    
    // Alten Artikel holen für Positions-Tausch
    const oldArticle = await Artikel.getById(id);
    const oldPos = oldArticle?.sortierung || 1;
    const oldKat = oldArticle?.kategorie_id;
    
    // Wenn Position oder Kategorie geändert wurde, Platztausch prüfen
    if (oldPos !== newPos || oldKat !== katId) {
        // Finde Artikel der aktuell auf der neuen Position ist (in der neuen Kategorie)
        const allArticles = await Artikel.getAll();
        const artikelAufNeuerPos = allArticles.find(a => 
            a.artikel_id !== id && 
            a.kategorie_id === katId && 
            a.sortierung === newPos
        );
        
        // Platztausch: Der andere Artikel bekommt die alte Position
        if (artikelAufNeuerPos) {
            await db.artikel.update(artikelAufNeuerPos.artikel_id, { sortierung: oldPos });
        }
    }
    
    await Artikel.update(id, { 
        name: name.trim(), 
        name_kurz: document.getElementById('article-short')?.value?.trim() || name.trim().substring(0,15), 
        sku: document.getElementById('article-sku')?.value?.trim() || null, 
        preis: parseFloat(document.getElementById('article-price')?.value) || 0, 
        kategorie_id: katId, 
        kategorie_name: katMap[katId], 
        aktiv: document.getElementById('article-active')?.checked, 
        sortierung: newPos,
        icon: iconMap[katId],
        bild: window.currentArticleImage || null
    });
    closeArticleModal();
    Router.navigate('admin-articles');
};

// Init
(async function initApp() {
    setTimeout(() => { document.getElementById('loading-screen').style.display = 'none'; document.getElementById('app').style.display = 'block'; }, 1500);
    await Artikel.seed();
    if (await db.kategorien.count() === 0) {
        await db.kategorien.bulkAdd([
            {kategorie_id:1,name:'Alkoholfreie Getränke',sortierung:10},{kategorie_id:2,name:'Biere',sortierung:20},{kategorie_id:3,name:'Wein',sortierung:30},
            {kategorie_id:4,name:'Spirituosen',sortierung:40},{kategorie_id:5,name:'Heiße Getränke',sortierung:50},{kategorie_id:6,name:'Sonstiges',sortierung:60},
            {kategorie_id:7,name:'Snacks',sortierung:70},{kategorie_id:8,name:'Diverses',sortierung:80}
        ]);
    }
    if (await Auth.autoLogin()) Router.navigate('dashboard');
    else Router.init();
})();
