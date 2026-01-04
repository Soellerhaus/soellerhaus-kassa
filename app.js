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
    currentUser: null, currentPage: 'login', warenkorb: [], selectedCategory: null,
    isAdmin: false, currentPin: '', inactivityTimer: null, inactivityTimeout: 120000,
    setUser(u) { this.currentUser = u; localStorage.setItem('current_user_id', u.id || u.gast_id); localStorage.setItem('current_user_type', u.id ? 'registered' : 'legacy'); this.resetInactivityTimer(); },
    clearUser() { this.currentUser = null; this.currentPin = ''; localStorage.removeItem('current_user_id'); localStorage.removeItem('current_user_type'); this.clearInactivityTimer(); },
    resetInactivityTimer() { this.clearInactivityTimer(); if (this.currentUser && !['login','register'].includes(this.currentPage)) { this.inactivityTimer = setTimeout(() => { Utils.showToast('Auto-Logout', 'info'); Auth.logout(); }, this.inactivityTimeout); } },
    clearInactivityTimer() { if (this.inactivityTimer) { clearTimeout(this.inactivityTimer); this.inactivityTimer = null; } },
    addToWarenkorb(a, m=1) { const e = this.warenkorb.find(i => i.artikel_id === a.artikel_id); if(e) e.menge += m; else this.warenkorb.push({...a, menge: m}); this.updateWarenkorbUI(); this.resetInactivityTimer(); },
    removeFromWarenkorb(id) { this.warenkorb = this.warenkorb.filter(i => i.artikel_id !== id); this.updateWarenkorbUI(); },
    clearWarenkorb() { this.warenkorb = []; this.updateWarenkorbUI(); },
    updateWarenkorbUI() { if (UI?.renderWarenkorb) UI.renderWarenkorb(); },
    getWarenkorbTotal() { return this.warenkorb.reduce((s, i) => s + (i.preis * i.menge), 0); }
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
    logout() { State.clearUser(); State.isAdmin = false; Router.navigate('login'); Utils.showToast('Abgemeldet', 'info'); },
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
            erstellt_am: new Date().toISOString(), exportiert: false, geraet_id: Utils.getDeviceId(), sync_status: 'pending'
        };
        await db.buchungen.add(b);
        await DataProtection.createBackup();
        return b;
    },
    async createFromWarenkorb() {
        if (!State.warenkorb.length) throw new Error('Warenkorb leer');
        const bs = [];
        for (const i of State.warenkorb) bs.push(await this.create(i, i.menge));
        State.clearWarenkorb();
        Utils.showToast(`${bs.length} Artikel gebucht!`, 'success');
        return bs;
    },
    async getByGast(id, limit=null) {
        let r = await db.buchungen.where('gast_id').equals(id).reverse().toArray();
        return limit ? r.slice(0, limit) : r;
    },
    async getAll(filter={}) {
        let r = await db.buchungen.toArray();
        if (filter.exportiert !== undefined) r = r.filter(b => b.exportiert === filter.exportiert);
        if (filter.datum) r = r.filter(b => b.datum === filter.datum);
        return r.reverse();
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
    async update(id, changes) { await db.artikel.update(id, changes); await DataProtection.createBackup(); Utils.showToast('Artikel aktualisiert', 'success'); },
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
    },
    renderWarenkorb() {
        const c = document.querySelector('.warenkorb');
        if (!c || !State.warenkorb.length) { if(c) c.remove(); return; }
        c.innerHTML = `<div class="warenkorb-header"><div class="warenkorb-title">🛒 Warenkorb (${State.warenkorb.length})</div><button class="btn-icon" onclick="State.clearWarenkorb()">✕</button></div><div class="warenkorb-items">${State.warenkorb.map(i => `<div class="warenkorb-item"><span>${i.name_kurz||i.name} × ${i.menge}</span><span>${Utils.formatCurrency(i.preis*i.menge)}</span></div>`).join('')}</div><div class="warenkorb-total"><span>Gesamt:</span><span>${Utils.formatCurrency(State.getWarenkorbTotal())}</span></div><button class="btn btn-primary btn-block" onclick="handleBuchen()">Jetzt buchen</button>`;
    }
};

// Routes
Router.register('login', () => {
    State.currentPin = ''; window.selectedGastId = null; window.currentLetter = null;
    UI.render(`<div class="main-content"><div style="text-align:center;margin-top:40px;"><div class="mountain-logo" style="margin:0 auto 24px;"><svg viewBox="0 0 100 60" class="mountain-svg" style="width:120px;height:72px;color:var(--color-mountain-blue);"><path d="M0,60 L20,30 L35,45 L50,15 L65,40 L80,25 L100,60 Z" fill="currentColor"/></svg></div><h1 style="font-family:var(--font-display);font-size:var(--text-3xl);margin-bottom:8px;">Seollerhaus Kassa</h1><p style="color:var(--color-stone-dark);margin-bottom:40px;">Self-Service Buchung</p><div style="max-width:600px;margin:0 auto;">${UI.renderAlphabet('handleLetterSelect')}<div style="margin-top:32px;padding-top:24px;border-top:1px solid var(--color-stone-medium);"><p style="color:var(--color-stone-dark);margin-bottom:16px;">Noch kein Account?</p><button class="btn btn-primary btn-block" style="max-width:400px;margin:0 auto;" onclick="handleRegisterClick()">Neu registrieren</button></div><div style="margin-top:24px;"><button class="btn btn-secondary" onclick="handleAdminClick()">Admin-Login</button></div></div></div></div>`);
});

Router.register('register', () => {
    UI.render(`<div class="main-content"><div style="max-width:500px;margin:40px auto;"><h1 class="page-title" style="text-align:center;">Neu registrieren</h1><div class="card"><div class="form-group"><label class="form-label">Vorname *</label><input type="text" id="register-vorname" class="form-input" placeholder="z.B. Maria" autofocus style="font-size:1.2rem;padding:16px;"></div><div class="form-group"><label class="form-label">Passwort *</label><input type="password" id="register-password" class="form-input" placeholder="z.B. 1234" inputmode="numeric" style="font-size:1.2rem;padding:16px;"><small style="color:var(--color-stone-dark);">Merken Sie sich Ihr Passwort!</small></div><button class="btn btn-primary btn-block" onclick="handleRegisterSubmit()" style="margin-top:24px;">✓ Registrieren</button></div><button class="btn btn-secondary btn-block mt-3" onclick="handleBackToLogin()">← Zurück</button></div></div>`);
});

Router.register('name-select', async () => {
    if (!window.currentLetter) { Router.navigate('login'); return; }
    const gaeste = await Auth.getGaesteByLetter(window.currentLetter);
    UI.render(`<div class="main-content"><div style="max-width:600px;margin:40px auto;"><h1 class="page-title" style="text-align:center;">Buchstabe: ${window.currentLetter}</h1>${UI.renderNameList(gaeste, 'handleNameSelect')}</div></div>`);
});

Router.register('pin-entry', () => {
    if (!window.selectedGastId) { Router.navigate('login'); return; }
    UI.render(`<div class="main-content"><div style="max-width:500px;margin:60px auto;"><div class="card"><div class="form-group"><label class="form-label" style="text-align:center;display:block;font-size:1.2rem;">Passwort eingeben</label><input type="password" id="login-password" class="form-input" placeholder="Ihr Passwort" autofocus inputmode="numeric" onkeydown="if(event.key==='Enter')handlePasswordLogin()" style="font-size:1.5rem;padding:20px;text-align:center;letter-spacing:8px;"></div><button class="btn btn-primary btn-block" onclick="handlePasswordLogin()" style="margin-top:16px;">✓ Anmelden</button></div><button class="btn btn-secondary btn-block mt-3" onclick="handlePinCancel()">← Zurück</button></div></div>`);
    setTimeout(() => document.getElementById('login-password')?.focus(), 100);
});

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
    UI.render(`<div class="app-header"><div class="header-left"><div class="header-title">🔧 Admin Dashboard</div></div><div class="header-right"><button class="btn btn-secondary" onclick="handleLogout()">Abmelden</button></div></div><div class="main-content"><div class="stats-grid"><div class="stat-card"><div class="stat-value">${guests.length}</div><div class="stat-label">Gäste</div></div><div class="stat-card"><div class="stat-value">${artCount}</div><div class="stat-label">Artikel</div></div><div class="stat-card"><div class="stat-value">${heuteB.length}</div><div class="stat-label">Buchungen heute</div></div><div class="stat-card"><div class="stat-value">${Utils.formatCurrency(heuteB.reduce((s,b) => s+b.preis*b.menge, 0))}</div><div class="stat-label">Umsatz heute</div></div></div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:24px;"><button class="btn btn-primary" onclick="Router.navigate('admin-guests')" style="padding:24px;">👥 Gästeverwaltung</button><button class="btn btn-primary" onclick="Router.navigate('admin-articles')" style="padding:24px;">📦 Artikelverwaltung</button></div><div class="card"><div class="card-header"><h2 class="card-title">🔄 Daten-Management</h2></div><div class="card-body"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;"><div style="padding:16px;background:var(--color-stone-light);border-radius:var(--radius-md);"><h3 style="font-weight:600;margin-bottom:8px;">💾 Backup</h3><button class="btn btn-secondary" onclick="DataProtection.manualExport()">JSON herunterladen</button></div><div style="padding:16px;background:var(--color-stone-light);border-radius:var(--radius-md);"><h3 style="font-weight:600;margin-bottom:8px;">📤 Buchungen (${nichtExp.length})</h3><button class="btn btn-secondary" onclick="handleExportBuchungen()">CSV exportieren</button></div><div style="padding:16px;background:var(--color-stone-light);border-radius:var(--radius-md);"><h3 style="font-weight:600;margin-bottom:8px;">👥 Gäste Export</h3><button class="btn btn-secondary" onclick="DataProtection.exportGuestsCSV()">CSV</button></div><div style="padding:16px;background:var(--color-stone-light);border-radius:var(--radius-md);"><h3 style="font-weight:600;margin-bottom:8px;">📦 Artikel Export</h3><button class="btn btn-secondary" onclick="DataProtection.exportArticlesCSV()">CSV</button></div></div></div></div></div>`);
});

Router.register('admin-guests', async () => {
    if (!State.isAdmin) { Router.navigate('admin-login'); return; }
    const guests = await RegisteredGuests.getAll();
    UI.render(`<div class="app-header"><div class="header-left"><button class="menu-btn" onclick="Router.navigate('admin-dashboard')">←</button><div class="header-title">👥 Gästeverwaltung</div></div><div class="header-right"><button class="btn btn-secondary" onclick="handleLogout()">Abmelden</button></div></div><div class="main-content"><div class="card"><div class="card-header"><h2 class="card-title">Registrierte Gäste (${guests.length})</h2><button class="btn btn-secondary" onclick="DataProtection.exportGuestsCSV()">📥 Export</button></div><div class="card-body"><div class="form-group"><input type="text" class="form-input" placeholder="🔍 Suchen..." oninput="filterGuestList(this.value)"></div><div id="guest-list">${guests.length ? guests.map(g => `<div class="list-item guest-item" data-name="${g.firstName.toLowerCase()}"><div style="flex:1;"><strong>${g.firstName}</strong><br><small class="text-muted">ID: ${g.id} | ${new Date(g.createdAt).toLocaleDateString('de-AT')}</small></div><button class="btn btn-danger" onclick="handleDeleteGuest(${g.id})" style="padding:8px 16px;">🗑️</button></div>`).join('') : '<p class="text-muted text-center">Keine Gäste</p>'}</div></div></div></div>`);
});

Router.register('admin-articles', async () => {
    if (!State.isAdmin) { Router.navigate('admin-login'); return; }
    const articles = await Artikel.getAll();
    UI.render(`<div class="app-header"><div class="header-left"><button class="menu-btn" onclick="Router.navigate('admin-dashboard')">←</button><div class="header-title">📦 Artikelverwaltung</div></div><div class="header-right"><button class="btn btn-secondary" onclick="handleLogout()">Abmelden</button></div></div><div class="main-content"><div class="card mb-3"><div class="card-header"><h2 class="card-title">📥 CSV Import</h2></div><div class="card-body"><p style="margin-bottom:16px;color:var(--color-stone-dark);">CSV: <code>ID;SKU;Name;Kurzname;Preis;Kategorie;Sortierung;Aktiv</code><br><small>Bei gleicher SKU: Upsert</small></p><input type="file" id="artikel-import" accept=".csv" style="display:none" onchange="handleArtikelImport(event)"><button class="btn btn-primary" onclick="document.getElementById('artikel-import').click()">📄 CSV auswählen</button><button class="btn btn-secondary" onclick="DataProtection.exportArticlesCSV()" style="margin-left:8px;">📤 Export</button></div></div><div class="card"><div class="card-header"><h2 class="card-title">Artikel (${articles.length})</h2><button class="btn btn-primary" onclick="showAddArticleModal()">+ Neu</button></div><div class="card-body"><div class="form-group"><input type="text" class="form-input" placeholder="🔍 Suchen..." oninput="filterArticleList(this.value)"></div><div id="article-list" style="max-height:60vh;overflow-y:auto;">${articles.length ? articles.map(a => `<div class="list-item article-item" data-name="${a.name.toLowerCase()}" data-sku="${(a.sku||'').toLowerCase()}"><div style="flex:1;"><div style="display:flex;align-items:center;gap:8px;"><span style="font-size:1.5rem;">${a.icon||'📦'}</span><div><strong>${a.name}</strong>${a.sku?`<small style="color:var(--color-stone-dark);"> (${a.sku})</small>`:''}</div></div><small class="text-muted">${a.kategorie_name||'?'} | ${Utils.formatCurrency(a.preis)} | ${a.aktiv?'✅':'❌'}</small></div><div style="display:flex;gap:8px;"><button class="btn btn-secondary" onclick="showEditArticleModal(${a.artikel_id})" style="padding:8px 16px;">✏️</button><button class="btn btn-danger" onclick="handleDeleteArticle(${a.artikel_id})" style="padding:8px 16px;">🗑️</button></div></div>`).join('') : '<p class="text-muted text-center">Keine Artikel</p>'}</div></div></div></div><div id="article-modal-container"></div>`);
});

Router.register('dashboard', async () => {
    if (!State.currentUser) { Router.navigate('login'); return; }
    const uid = State.currentUser.id || State.currentUser.gast_id;
    const bs = await Buchungen.getByGast(uid, 5);
    const allBs = await Buchungen.getByGast(uid);
    const heute = Utils.formatDate(new Date());
    const heuteB = allBs.filter(b => b.datum === heute);
    const name = State.currentUser.firstName || State.currentUser.vorname;
    UI.render(`<div class="app-header"><div class="header-left"><button class="menu-btn" onclick="showMenu()">☰</button><div class="header-title">Seollerhaus</div></div><div class="header-right"><div class="user-badge">👤 ${name}</div></div></div><div class="main-content"><h1 style="font-family:var(--font-display);font-size:var(--text-2xl);margin-bottom:24px;">Guten Tag, ${name}!</h1><div class="stats-grid"><div class="stat-card"><div class="stat-value">${heuteB.length}</div><div class="stat-label">Artikel heute</div><div style="margin-top:8px;font-size:var(--text-lg);font-weight:600;">${Utils.formatCurrency(heuteB.reduce((s,b)=>s+b.preis*b.menge,0))}</div></div><div class="stat-card"><div class="stat-value">${allBs.length}</div><div class="stat-label">Gesamt</div><div style="margin-top:8px;font-size:var(--text-lg);font-weight:600;">${Utils.formatCurrency(allBs.reduce((s,b)=>s+b.preis*b.menge,0))}</div></div></div><div class="card mt-3"><div class="card-header"><h2 class="card-title">📝 Letzte Buchungen</h2><button class="btn btn-secondary" onclick="navigateToHistorie()">Alle</button></div><div class="card-body">${bs.length ? bs.map(b => `<div class="list-item"><div style="display:flex;justify-content:space-between;align-items:center;"><div><div style="font-weight:500;">${b.artikel_name} × ${b.menge}</div><small class="text-muted">${b.datum}, ${b.uhrzeit.substring(0,5)}</small></div><div style="font-weight:700;color:var(--color-mountain-blue);">${Utils.formatCurrency(b.preis*b.menge)}</div></div></div>`).join('') : '<p class="text-muted text-center">Keine Buchungen</p>'}</div></div></div><div class="bottom-nav"><div class="nav-item active" onclick="navigateToDashboard()"><div class="nav-icon">🏠</div><div>Start</div></div><div class="nav-item" onclick="navigateToBuchen()"><div class="nav-icon">🍺</div><div>Buchen</div></div><div class="nav-item" onclick="navigateToHistorie()"><div class="nav-icon">📋</div><div>Liste</div></div><div class="nav-item" onclick="navigateToProfil()"><div class="nav-icon">👤</div><div>Profil</div></div></div>`);
});

Router.register('buchen', async () => {
    if (!State.currentUser) { Router.navigate('login'); return; }
    const kats = await db.kategorien.toArray();
    const arts = await Artikel.getAll({ aktiv: true });
    const name = State.currentUser.firstName || State.currentUser.vorname;
    const filtered = State.selectedCategory ? arts.filter(a => a.kategorie_id === State.selectedCategory) : arts;
    UI.render(`<div class="app-header"><div class="header-left"><button class="menu-btn" onclick="navigateToDashboard()">←</button><div class="header-title">Artikel buchen</div></div><div class="header-right"><div class="user-badge">👤 ${name}</div></div></div><div class="main-content"><div class="form-group"><input type="text" class="form-input" placeholder="🔍 Suchen..." oninput="searchArtikel(this.value)"></div><div class="category-tabs"><div class="category-tab ${!State.selectedCategory?'active':''}" onclick="filterCategory(null)">Alle</div>${kats.map(k => `<div class="category-tab ${State.selectedCategory===k.kategorie_id?'active':''}" onclick="filterCategory(${k.kategorie_id})">${k.name}</div>`).join('')}</div><div class="artikel-grid">${filtered.map(a => `<div class="artikel-tile" style="--tile-color:${getCategoryColor(a.kategorie_id)}" onpointerdown="handleArtikelPointerDown(event,${a.artikel_id})" onpointerup="handleArtikelPointerUp(event)" onpointercancel="handleArtikelPointerUp(event)" onpointerleave="handleArtikelPointerUp(event)"><div class="artikel-icon">${a.icon}</div><div class="artikel-name">${a.name_kurz||a.name}</div><div class="artikel-price">${Utils.formatCurrency(a.preis)}</div></div>`).join('')}</div></div>${State.warenkorb.length?'<div class="warenkorb"></div>':''}<div class="bottom-nav"><div class="nav-item" onclick="navigateToDashboard()"><div class="nav-icon">🏠</div><div>Start</div></div><div class="nav-item active" onclick="navigateToBuchen()"><div class="nav-icon">🍺</div><div>Buchen</div></div><div class="nav-item" onclick="navigateToHistorie()"><div class="nav-icon">📋</div><div>Liste</div></div><div class="nav-item" onclick="navigateToProfil()"><div class="nav-icon">👤</div><div>Profil</div></div></div>`);
    UI.renderWarenkorb();
});

Router.register('historie', async () => {
    if (!State.currentUser) { Router.navigate('login'); return; }
    const uid = State.currentUser.id || State.currentUser.gast_id;
    const bs = await Buchungen.getByGast(uid);
    const total = bs.reduce((s,b) => s+b.preis*b.menge, 0);
    const name = State.currentUser.firstName || State.currentUser.vorname;
    const byDate = {};
    bs.forEach(b => { if(!byDate[b.datum]) byDate[b.datum]=[]; byDate[b.datum].push(b); });
    UI.render(`<div class="app-header"><div class="header-left"><button class="menu-btn" onclick="navigateToDashboard()">←</button><div class="header-title">Meine Buchungen</div></div><div class="header-right"><div class="user-badge">👤 ${name}</div></div></div><div class="main-content"><div class="card mb-3"><div style="text-align:center;padding:16px;"><div style="font-family:var(--font-display);font-size:var(--text-3xl);font-weight:700;color:var(--color-mountain-blue);">${Utils.formatCurrency(total)}</div><small class="text-muted">${bs.length} Artikel</small></div></div>${Object.keys(byDate).sort().reverse().map(d => {const items = byDate[d]; return `<div style="margin-bottom:32px;"><h3 style="font-size:var(--text-lg);font-weight:600;margin-bottom:12px;color:var(--color-mountain-blue);">${new Date(d).toLocaleDateString('de-AT',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</h3>${items.map(b => `<div class="list-item"><div style="display:flex;justify-content:space-between;align-items:center;"><div><div style="font-weight:500;">${b.artikel_name} × ${b.menge}</div><small class="text-muted">${b.uhrzeit.substring(0,5)}</small></div><div style="font-weight:700;">${Utils.formatCurrency(b.preis*b.menge)}</div></div></div>`).join('')}<div style="text-align:right;margin-top:8px;font-weight:600;color:var(--color-stone-dark);">Summe: ${Utils.formatCurrency(items.reduce((s,b)=>s+b.preis*b.menge,0))}</div></div>`;}).join('')||'<p class="text-muted text-center">Keine Buchungen</p>'}</div><div class="bottom-nav"><div class="nav-item" onclick="navigateToDashboard()"><div class="nav-icon">🏠</div><div>Start</div></div><div class="nav-item" onclick="navigateToBuchen()"><div class="nav-icon">🍺</div><div>Buchen</div></div><div class="nav-item active" onclick="navigateToHistorie()"><div class="nav-icon">📋</div><div>Liste</div></div><div class="nav-item" onclick="navigateToProfil()"><div class="nav-icon">👤</div><div>Profil</div></div></div>`);
});

Router.register('profil', () => {
    if (!State.currentUser) { Router.navigate('login'); return; }
    const name = State.currentUser.firstName || State.currentUser.vorname;
    const created = State.currentUser.createdAt || State.currentUser.erstellt_am;
    UI.render(`<div class="app-header"><div class="header-left"><button class="menu-btn" onclick="navigateToDashboard()">←</button><div class="header-title">Mein Profil</div></div><div class="header-right"><div class="user-badge">👤 ${name}</div></div></div><div class="main-content"><div class="card"><div style="text-align:center;padding:32px;"><div style="font-size:4rem;margin-bottom:16px;">👤</div><h2 style="font-family:var(--font-display);font-size:var(--text-2xl);margin-bottom:8px;">${name}</h2>${created?`<p class="text-muted">Seit ${new Date(created).toLocaleDateString('de-AT')}</p>`:''}</div></div><button class="btn btn-danger btn-block mt-3" onclick="handleLogout()">🚪 Abmelden</button></div><div class="bottom-nav"><div class="nav-item" onclick="navigateToDashboard()"><div class="nav-icon">🏠</div><div>Start</div></div><div class="nav-item" onclick="navigateToBuchen()"><div class="nav-icon">🍺</div><div>Buchen</div></div><div class="nav-item" onclick="navigateToHistorie()"><div class="nav-icon">📋</div><div>Liste</div></div><div class="nav-item active" onclick="navigateToProfil()"><div class="nav-icon">👤</div><div>Profil</div></div></div>`);
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
window.handlePasswordLogin = async () => {
    const pw = document.getElementById('login-password')?.value;
    if (!pw) { Utils.showToast('Passwort eingeben', 'warning'); return; }
    try { await Auth.login(window.selectedGastId, pw); window.selectedGastId = null; Router.navigate('dashboard'); }
    catch (e) { document.getElementById('login-password').value = ''; document.getElementById('login-password').focus(); }
};
window.handleRegisterSubmit = async () => {
    const v = document.getElementById('register-vorname')?.value;
    const p = document.getElementById('register-password')?.value;
    if (!v?.trim()) { Utils.showToast('Vorname eingeben', 'warning'); return; }
    if (!p) { Utils.showToast('Passwort eingeben', 'warning'); return; }
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
    if (grid) grid.innerHTML = arts.map(a => `<div class="artikel-tile" style="--tile-color:${getCategoryColor(a.kategorie_id)}" onpointerdown="handleArtikelPointerDown(event,${a.artikel_id})" onpointerup="handleArtikelPointerUp(event)"><div class="artikel-icon">${a.icon}</div><div class="artikel-name">${a.name_kurz||a.name}</div><div class="artikel-price">${Utils.formatCurrency(a.preis)}</div></div>`).join('') || '<p class="text-muted" style="grid-column:1/-1;text-align:center;">Keine Ergebnisse</p>';
}, 300);
window.showMenu = () => Utils.showToast('Menü in Entwicklung', 'info');

let longPressTimer = null, longPressTriggered = false, currentArtikelId = null;
window.handleArtikelPointerDown = (e, id) => { e.preventDefault(); longPressTriggered = false; currentArtikelId = id; longPressTimer = setTimeout(async () => { longPressTriggered = true; const a = await Artikel.getById(id); if(a) showQuantityModal(a); }, 700); };
window.handleArtikelPointerUp = () => { if(longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; } if(!longPressTriggered && currentArtikelId) addArtikel(currentArtikelId); longPressTriggered = false; currentArtikelId = null; };
window.addArtikel = async id => { const a = await Artikel.getById(id); State.addToWarenkorb(a, 1); Utils.showToast(`${a.name_kurz||a.name} hinzugefügt`, 'success'); };
window.handleBuchen = async () => { try { await Buchungen.createFromWarenkorb(); Router.navigate('dashboard'); } catch(e) {} };

let currentQuantity = '1';
function showQuantityModal(a) {
    currentQuantity = '1';
    const m = document.createElement('div');
    m.id = 'quantity-modal';
    m.className = 'modal-container active';
    m.innerHTML = `<div class="modal-backdrop" onclick="closeQuantityModal()"></div><div class="modal-content" style="max-width:400px;"><h2 style="margin-bottom:1rem;">${a.name}</h2><p style="margin-bottom:1.5rem;color:var(--color-stone-dark);">Preis: ${Utils.formatCurrency(a.preis)}</p><div class="quantity-display"><div class="quantity-value" id="quantity-value">1</div><div class="quantity-label">Anzahl</div></div><div class="pin-buttons" style="margin-bottom:1rem;">${[1,2,3,4,5,6,7,8,9].map(n => `<button class="pin-btn" onclick="handleQuantityInput('${n}')">${n}</button>`).join('')}<button class="pin-btn pin-btn-delete" onclick="handleQuantityDelete()">⌫</button><button class="pin-btn" onclick="handleQuantityInput('0')">0</button><button class="pin-btn" style="visibility:hidden;"></button></div><div style="display:flex;gap:1rem;"><button class="btn btn-secondary" style="flex:1;" onclick="closeQuantityModal()">Abbrechen</button><button class="btn btn-primary" style="flex:1;" onclick="handleQuantityComplete(${a.artikel_id})">Hinzufügen</button></div></div>`;
    document.body.appendChild(m);
}
window.closeQuantityModal = () => { document.getElementById('quantity-modal')?.remove(); currentQuantity = '1'; };
window.handleQuantityInput = d => { if(currentQuantity==='1'&&d!=='0') currentQuantity=d; else if(currentQuantity.length<3) currentQuantity+=d; document.getElementById('quantity-value').textContent = currentQuantity; };
window.handleQuantityDelete = () => { currentQuantity = currentQuantity.length > 1 ? currentQuantity.slice(0,-1) : '1'; document.getElementById('quantity-value').textContent = currentQuantity; };
window.handleQuantityComplete = async id => { const m = parseInt(currentQuantity); if(m<1) { Utils.showToast('Min. 1', 'warning'); return; } const a = await Artikel.getById(id); if(a) { State.addToWarenkorb(a, m); Utils.showToast(`${m}× ${a.name_kurz||a.name} hinzugefügt`, 'success'); } closeQuantityModal(); };

window.showAddArticleModal = () => {
    const c = document.getElementById('article-modal-container');
    c.innerHTML = `<div class="modal-container active"><div class="modal-backdrop" onclick="closeArticleModal()"></div><div class="modal-content" style="max-width:500px;"><h2 style="margin-bottom:24px;">Neuer Artikel</h2><div class="form-group"><label class="form-label">Name *</label><input type="text" id="article-name" class="form-input" placeholder="z.B. Cola 0.5l"></div><div class="form-group"><label class="form-label">Kurzname</label><input type="text" id="article-short" class="form-input" placeholder="z.B. Cola"></div><div class="form-group"><label class="form-label">SKU</label><input type="text" id="article-sku" class="form-input" placeholder="z.B. COL-05"></div><div class="form-group"><label class="form-label">Preis (€) *</label><input type="number" id="article-price" class="form-input" placeholder="0.00" step="0.01" min="0"></div><div class="form-group"><label class="form-label">Kategorie</label><select id="article-category" class="form-input"><option value="1">Alkoholfreie Getränke</option><option value="2">Biere</option><option value="3">Wein</option><option value="4">Spirituosen</option><option value="5">Heiße Getränke</option><option value="6">Sonstiges</option><option value="7">Snacks</option><option value="8">Diverses</option></select></div><div class="form-checkbox"><input type="checkbox" id="article-active" checked><label for="article-active">Aktiv</label></div><div style="display:flex;gap:16px;margin-top:24px;"><button class="btn btn-secondary" style="flex:1;" onclick="closeArticleModal()">Abbrechen</button><button class="btn btn-primary" style="flex:1;" onclick="saveNewArticle()">Speichern</button></div></div></div>`;
};
window.showEditArticleModal = async id => {
    const a = await Artikel.getById(id);
    if (!a) return;
    const c = document.getElementById('article-modal-container');
    c.innerHTML = `<div class="modal-container active"><div class="modal-backdrop" onclick="closeArticleModal()"></div><div class="modal-content" style="max-width:500px;"><h2 style="margin-bottom:24px;">Artikel bearbeiten</h2><input type="hidden" id="article-id" value="${a.artikel_id}"><div class="form-group"><label class="form-label">Name *</label><input type="text" id="article-name" class="form-input" value="${a.name}"></div><div class="form-group"><label class="form-label">Kurzname</label><input type="text" id="article-short" class="form-input" value="${a.name_kurz||''}"></div><div class="form-group"><label class="form-label">SKU</label><input type="text" id="article-sku" class="form-input" value="${a.sku||''}"></div><div class="form-group"><label class="form-label">Preis (€) *</label><input type="number" id="article-price" class="form-input" value="${a.preis}" step="0.01" min="0"></div><div class="form-group"><label class="form-label">Kategorie</label><select id="article-category" class="form-input">${[1,2,3,4,5,6,7,8].map(i => `<option value="${i}" ${a.kategorie_id===i?'selected':''}>${{1:'Alkoholfreie Getränke',2:'Biere',3:'Wein',4:'Spirituosen',5:'Heiße Getränke',6:'Sonstiges',7:'Snacks',8:'Diverses'}[i]}</option>`).join('')}</select></div><div class="form-checkbox"><input type="checkbox" id="article-active" ${a.aktiv?'checked':''}><label for="article-active">Aktiv</label></div><div style="display:flex;gap:16px;margin-top:24px;"><button class="btn btn-secondary" style="flex:1;" onclick="closeArticleModal()">Abbrechen</button><button class="btn btn-primary" style="flex:1;" onclick="saveEditArticle()">Speichern</button></div></div></div>`;
};
window.closeArticleModal = () => { document.getElementById('article-modal-container').innerHTML = ''; };
window.saveNewArticle = async () => {
    const name = document.getElementById('article-name')?.value;
    if (!name?.trim()) { Utils.showToast('Name erforderlich', 'warning'); return; }
    const katId = parseInt(document.getElementById('article-category')?.value) || 1;
    const katMap = {1:'Alkoholfreie Getränke',2:'Biere',3:'Wein',4:'Spirituosen',5:'Heiße Getränke',6:'Sonstiges',7:'Snacks',8:'Diverses'};
    const iconMap = {1:'🥤',2:'🍺',3:'🍷',4:'🥃',5:'☕',6:'🍽️',7:'🍿',8:'📦'};
    await Artikel.create({ name: name.trim(), name_kurz: document.getElementById('article-short')?.value?.trim() || name.trim().substring(0,15), sku: document.getElementById('article-sku')?.value?.trim() || null, preis: parseFloat(document.getElementById('article-price')?.value) || 0, steuer_prozent: 10, kategorie_id: katId, kategorie_name: katMap[katId], aktiv: document.getElementById('article-active')?.checked, sortierung: 0, icon: iconMap[katId] });
    closeArticleModal();
    Router.navigate('admin-articles');
};
window.saveEditArticle = async () => {
    const id = parseInt(document.getElementById('article-id')?.value);
    const name = document.getElementById('article-name')?.value;
    if (!name?.trim()) { Utils.showToast('Name erforderlich', 'warning'); return; }
    const katId = parseInt(document.getElementById('article-category')?.value) || 1;
    const katMap = {1:'Alkoholfreie Getränke',2:'Biere',3:'Wein',4:'Spirituosen',5:'Heiße Getränke',6:'Sonstiges',7:'Snacks',8:'Diverses'};
    const iconMap = {1:'🥤',2:'🍺',3:'🍷',4:'🥃',5:'☕',6:'🍽️',7:'🍿',8:'📦'};
    await Artikel.update(id, { name: name.trim(), name_kurz: document.getElementById('article-short')?.value?.trim() || name.trim().substring(0,15), sku: document.getElementById('article-sku')?.value?.trim() || null, preis: parseFloat(document.getElementById('article-price')?.value) || 0, kategorie_id: katId, kategorie_name: katMap[katId], aktiv: document.getElementById('article-active')?.checked, icon: iconMap[katId] });
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
