// ================================
// SEOLLERHAUS KASSA - MAIN APP v3.0
// Supabase Multi-Device Version
// ================================

// ================================
// SUPABASE KONFIGURATION
// ================================
const SUPABASE_URL = 'https://lslpyelpzakqrmrjznsc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzbHB5ZWxwemFrcXJtcmp6bnNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1ODQ3MjIsImV4cCI6MjA4MzE2MDcyMn0.ITXPK3CAXGO9p-hJqjOKqdQOh-TbH-WDMaYamxDgeqc';

// Supabase Client (wird beim Laden der Seite initialisiert)
let supabaseClient = null;
let isOnline = navigator.onLine;

// Online/Offline Status
window.addEventListener('online', () => { isOnline = true; syncPendingData(); });
window.addEventListener('offline', () => { isOnline = false; });

// Supabase initialisieren
function initSupabase() {
    if (typeof supabase !== 'undefined' && supabase.createClient) {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: false
            }
        });
        console.log('✅ Supabase Client initialisiert');
        return true;
    }
    console.warn('⚠️ Supabase nicht verfügbar - Offline-Modus');
    return false;
}

// Pending Data sync (falls offline Buchungen gemacht wurden)
async function syncPendingData() {
    if (!supabaseClient || !isOnline) return;
    try {
        const pending = await db.buchungen.where('sync_status').equals('pending').toArray();
        for (const b of pending) {
            try {
                const { error } = await supabaseClient.from('buchungen').upsert(b, { onConflict: 'buchung_id' });
                if (!error) {
                    await db.buchungen.update(b.buchung_id, { sync_status: 'synced' });
                }
            } catch (e) { console.error('Sync error:', e); }
        }
        if (pending.length > 0) console.log(`✅ ${pending.length} Buchungen synchronisiert`);
    } catch (e) { console.error('syncPendingData error:', e); }
}

// ================================
// DEXIE (Lokaler Cache)
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

db.version(3).stores({
    gaeste: 'gast_id, nachname, aktiv, zimmernummer, checked_out',
    buchungen: 'buchung_id, gast_id, datum, exportiert, sync_status, session_id, [gast_id+datum]',
    artikel: 'artikel_id, sku, kategorie_id, name, aktiv',
    kategorien: 'kategorie_id, name, sortierung',
    settings: 'key',
    exports: '++id, timestamp, anzahl_buchungen',
    registeredGuests: '++id, firstName, passwordHash, createdAt, lastLoginAt'
});

db.version(4).stores({
    gaeste: 'gast_id, nachname, aktiv, zimmernummer, checked_out',
    buchungen: 'buchung_id, gast_id, datum, exportiert, sync_status, session_id, [gast_id+datum]',
    artikel: 'artikel_id, sku, kategorie_id, name, aktiv',
    kategorien: 'kategorie_id, name, sortierung',
    settings: 'key',
    exports: '++id, timestamp, anzahl_buchungen',
    registeredGuests: '++id, firstName, passwordHash, createdAt, lastLoginAt',
    fehlendeGetraenke: '++id, artikel_id, datum, erstellt_am, uebernommen'
});

const DataProtection = {
    async createBackup() {
        try {
            const data = {
                gaeste: await db.gaeste.toArray(),
                buchungen: await db.buchungen.toArray(),
                registeredGuests: await db.registeredGuests.toArray(),
                artikel: await db.artikel.toArray(),
                fehlendeGetraenke: await db.fehlendeGetraenke.toArray(),
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
                if (backup.fehlendeGetraenke) {
                    for (const f of backup.fehlendeGetraenke) { try { await db.fehlendeGetraenke.add(f); } catch(e) {} }
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
    formatDate: d => { const dt = d instanceof Date ? d : new Date(d); return dt.toLocaleDateString('de-AT', {day:'2-digit', month:'2-digit', year:'numeric'}); },
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
    isAdmin: false, currentPin: '', inactivityTimer: null, inactivityTimeout: 20000,
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
    // Supabase Auth + Profile
    async register(firstName, password) {
        if (!firstName?.trim()) throw new Error('Vorname erforderlich');
        if (!password || password.length < 4) throw new Error('PIN muss mind. 4 Zeichen haben');
        
        // Generiere pseudo-Email für Supabase Auth
        const uniqueId = Utils.uuid().substring(0, 8);
        const email = `${firstName.toLowerCase().replace(/[^a-z]/g, '')}.${uniqueId}@kassa.local`;
        
        // Supabase erfordert min. 6 Zeichen - PIN mit Prefix erweitern
        const supabasePassword = 'PIN_' + password + '_KASSA';
        
        if (supabaseClient && isOnline) {
            // Supabase SignUp
            const { data: authData, error: authError } = await supabaseClient.auth.signUp({
                email: email,
                password: supabasePassword,
                options: { data: { first_name: firstName.trim() } }
            });
            
            if (authError) {
                console.error('Supabase SignUp Error:', authError);
                throw new Error('Registrierung fehlgeschlagen: ' + authError.message);
            }
            
            // Warte kurz auf Trigger (Profile wird automatisch erstellt)
            await new Promise(r => setTimeout(r, 500));
            
            // Profile laden
            const { data: profile } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', authData.user.id)
                .single();
            
            // Lokalen Cache aktualisieren
            const localGuest = { 
                id: authData.user.id, 
                firstName: firstName.trim(), 
                email: email,
                createdAt: new Date().toISOString(),
                geloescht: false 
            };
            try { await db.registeredGuests.add(localGuest); } catch(e) {}
            
            Utils.showToast('Registrierung erfolgreich!', 'success');
            State.setUser({ ...authData.user, ...profile, firstName: firstName.trim() });
            return localGuest;
        } else {
            // Offline-Modus: Nur lokal speichern
            const salt = Utils.generateSalt();
            const guest = { firstName: firstName.trim(), passwordHash: await Utils.hashPassword(password, salt), salt, createdAt: new Date().toISOString(), geloescht: false, pendingSync: true };
            guest.id = await db.registeredGuests.add(guest);
            Utils.showToast('Offline-Registrierung', 'info');
            return guest;
        }
    },
    
    async login(id, password) {
        // Supabase Passwort-Format: PIN mit Prefix erweitern
        const supabasePassword = 'PIN_' + password + '_KASSA';
        
        if (supabaseClient && isOnline) {
            // Supabase Login - Profile laden um Email zu bekommen
            const { data: profile } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', id)
                .single();
            
            if (!profile) throw new Error('Gast nicht gefunden');
            if (profile.geloescht) throw new Error('Account deaktiviert');
            
            // Login mit Email und erweitertem Passwort
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: profile.email,
                password: supabasePassword
            });
            
            if (error) {
                console.error('Login Error:', error);
                throw new Error('Falsches Passwort');
            }
            
            // Last login updaten
            await supabaseClient.from('profiles').update({ last_login_at: new Date().toISOString() }).eq('id', id);
            
            const user = { ...data.user, ...profile, firstName: profile.first_name };
            State.setUser(user);
            Utils.showToast(`Willkommen, ${profile.first_name}!`, 'success');
            return user;
        } else {
            // Offline: Lokaler Login
            const g = await db.registeredGuests.get(id);
            if (!g) throw new Error('Gast nicht gefunden');
            if (g.geloescht) throw new Error('Account deaktiviert');
            if (await Utils.hashPassword(password, g.salt) !== g.passwordHash) throw new Error('Falsches Passwort');
            await db.registeredGuests.update(id, { lastLoginAt: new Date().toISOString() });
            State.setUser(g);
            Utils.showToast(`Willkommen, ${g.firstName}! (Offline)`, 'success');
            return g;
        }
    },
    
    async getByFirstLetter(letter) {
        // Erst lokale Daten prüfen (für schnelle Anzeige)
        const local = await db.registeredGuests.toArray();
        const localFiltered = local.filter(g => !g.geloescht && g.firstName?.toUpperCase().startsWith(letter.toUpperCase()));
        
        // Wenn online, auch von Supabase laden
        if (supabaseClient && isOnline) {
            try {
                const { data, error } = await supabaseClient
                    .from('profiles')
                    .select('*')
                    .eq('geloescht', false)
                    .ilike('first_name', `${letter}%`)
                    .order('first_name');
                
                if (!error && data && data.length > 0) {
                    console.log('Profile von Supabase:', data.length);
                    // Cache aktualisieren
                    for (const p of data) {
                        try { 
                            await db.registeredGuests.put({ id: p.id, firstName: p.first_name, email: p.email, geloescht: p.geloescht });
                        } catch(e) {}
                    }
                    
                    const cnt = {};
                    return data.map(g => {
                        const name = g.first_name;
                        cnt[name] = (cnt[name] || 0) + 1;
                        return { ...g, id: g.id, firstName: name, displayName: cnt[name] > 1 ? `${name} (${cnt[name]})` : name };
                    });
                } else {
                    console.log('Supabase Profile Error/Empty, nutze lokal:', error?.message || 'keine Daten');
                }
            } catch(e) {
                console.error('Supabase getByFirstLetter error:', e);
            }
        }
        
        // Fallback: Lokale Daten
        const cnt = {};
        return localFiltered.sort((a,b) => a.firstName.localeCompare(b.firstName)).map(g => { 
            cnt[g.firstName] = (cnt[g.firstName]||0)+1; 
            return {...g, displayName: cnt[g.firstName] > 1 ? `${g.firstName} (${cnt[g.firstName]})` : g.firstName}; 
        });
    },
    
    async getAll() { 
        if (supabaseClient && isOnline) {
            const { data } = await supabaseClient.from('profiles').select('*').eq('geloescht', false).order('first_name');
            return (data || []).map(g => ({ ...g, firstName: g.first_name }));
        }
        const all = await db.registeredGuests.toArray();
        return all.filter(g => !g.geloescht);
    },
    
    async getGeloeschte() {
        if (supabaseClient && isOnline) {
            const { data } = await supabaseClient.from('profiles').select('*').eq('geloescht', true);
            return (data || []).map(g => ({ ...g, firstName: g.first_name }));
        }
        const all = await db.registeredGuests.toArray();
        return all.filter(g => g.geloescht);
    },
    
    async softDelete(id) { 
        if (supabaseClient && isOnline) {
            await supabaseClient.from('profiles').update({ geloescht: true, geloescht_am: new Date().toISOString() }).eq('id', id);
        }
        try { await db.registeredGuests.update(id, { geloescht: true, geloeschtAm: new Date().toISOString() }); } catch(e) {}
        Utils.showToast('Gast in Papierkorb verschoben', 'success'); 
    },
    
    async restore(id) {
        if (supabaseClient && isOnline) {
            await supabaseClient.from('profiles').update({ geloescht: false, geloescht_am: null }).eq('id', id);
        }
        try { await db.registeredGuests.update(id, { geloescht: false, geloeschtAm: null }); } catch(e) {}
        Utils.showToast('Gast wiederhergestellt', 'success');
    },
    
    async deletePermanent(id) { 
        if (supabaseClient && isOnline) {
            await supabaseClient.from('profiles').delete().eq('id', id);
        }
        try { await db.registeredGuests.delete(id); } catch(e) {}
        Utils.showToast('Gast endgültig gelöscht', 'success'); 
    }
};

const Auth = {
    async login(id, pin) {
        // ID kann UUID (Supabase) oder String (Legacy) sein
        if (typeof id === 'string' && id.includes('-')) {
            // UUID - Supabase User
            return RegisteredGuests.login(id, pin);
        }
        if (typeof id === 'number') {
            // Legacy ID aus lokaler DB - muss zu Supabase migrieren
            // Versuche zuerst lokalen Login
            const local = await db.registeredGuests.get(id);
            if (local?.email && supabaseClient && isOnline) {
                // Hat Email -> kann Supabase Login nutzen
                return RegisteredGuests.login(local.id, pin);
            }
            return RegisteredGuests.login(id, pin);
        }
        // Legacy Gast
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
        // Standard Admin-Passwort Hash für 'admin123'
        const defaultHash = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';
        let stored = defaultHash;
        
        if (supabaseClient && isOnline) {
            try {
                const { data, error } = await supabaseClient.from('settings').select('value').eq('key', 'admin_password').single();
                if (!error && data?.value) {
                    stored = data.value;
                }
            } catch(e) {
                console.log('Settings nicht lesbar, nutze Default');
            }
        } else {
            try {
                const s = await db.settings.get('admin_password');
                if (s?.value) stored = s.value;
            } catch(e) {}
        }
        
        const inputHash = await Utils.hashPassword(pw);
        console.log('Admin Login - Input Hash:', inputHash);
        console.log('Admin Login - Stored Hash:', stored);
        
        if (inputHash === stored) { 
            State.isAdmin = true; 
            Utils.showToast('Admin-Login OK', 'success'); 
            return true; 
        }
        
        Utils.showToast('Falsches Passwort', 'error'); 
        return false;
    },
    async logout() { 
        // Buchungen der Session als fix markieren
        try {
            await Buchungen.fixSessionBuchungen();
        } catch (e) {
            console.error('fixSessionBuchungen error:', e);
        }
        // Supabase Logout
        if (supabaseClient) {
            try { await supabaseClient.auth.signOut(); } catch(e) {}
        }
        State.clearUser(); 
        State.isAdmin = false; 
        Router.navigate('login'); 
        Utils.showToast('Abgemeldet', 'info'); 
    },
    async autoLogin() {
        // Zuerst Supabase Session prüfen
        if (supabaseClient && isOnline) {
            try {
                const { data: { session } } = await supabaseClient.auth.getSession();
                if (session?.user) {
                    const { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', session.user.id).single();
                    if (profile && !profile.geloescht) {
                        State.setUser({ ...session.user, ...profile, firstName: profile.first_name });
                        return true;
                    }
                }
            } catch(e) { console.error('autoLogin supabase error:', e); }
        }
        // Fallback: Lokale Session
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
        const userId = State.currentUser.id || State.currentUser.gast_id;
        
        console.log('📝 Buchung erstellen für User:', userId);
        console.log('📝 CurrentUser:', State.currentUser);
        
        const b = {
            buchung_id: Utils.uuid(),
            user_id: userId, // Für Supabase
            gast_id: String(userId), // Legacy Kompatibilität - als String
            gast_vorname: State.currentUser.firstName || State.currentUser.first_name || State.currentUser.vorname || '',
            gast_nachname: State.currentUser.nachname || '',
            gastgruppe: State.currentUser.zimmernummer || '',
            artikel_id: artikel.artikel_id, 
            artikel_name: artikel.name, 
            preis: parseFloat(artikel.preis),
            steuer_prozent: artikel.steuer_prozent || 10, 
            menge: parseInt(menge),
            datum: Utils.formatDate(new Date()), 
            uhrzeit: Utils.formatTime(new Date()),
            erstellt_am: new Date().toISOString(), 
            exportiert: false,
            aufgefuellt: false, // NEU: Für Auffüllliste (unabhängig von Export!)
            geraet_id: Utils.getDeviceId(), 
            session_id: State.sessionId,
            storniert: false,
            fix: false,
            aus_fehlend: false,
            ist_umlage: false
        };
        
        console.log('📝 Buchung Objekt:', b);
        
        // Immer lokal speichern (Cache)
        await db.buchungen.add({...b, sync_status: isOnline ? 'synced' : 'pending'});
        
        // Online: Auch nach Supabase
        if (supabaseClient && isOnline) {
            try {
                console.log('📤 Sende an Supabase...');
                const { data, error } = await supabaseClient.from('buchungen').insert(b).select();
                if (error) {
                    console.error('❌ Supabase insert error:', error);
                    await db.buchungen.update(b.buchung_id, { sync_status: 'pending' });
                } else {
                    console.log('✅ Supabase insert OK:', data);
                    await db.buchungen.update(b.buchung_id, { sync_status: 'synced' });
                }
            } catch(e) {
                console.error('❌ Buchung sync error:', e);
                await db.buchungen.update(b.buchung_id, { sync_status: 'pending' });
            }
        } else {
            console.log('⚠️ Offline oder kein Supabase Client');
        }
        
        await DataProtection.createBackup();
        return b;
    },
    
    async storno(buchung_id) {
        // Lokal laden
        const allBs = await db.buchungen.toArray();
        let b = allBs.find(x => x.buchung_id === buchung_id);
        
        // Falls nicht lokal, von Supabase laden
        if (!b && supabaseClient && isOnline) {
            const { data } = await supabaseClient.from('buchungen').select('*').eq('buchung_id', buchung_id).single();
            b = data;
        }
        
        if (!b) throw new Error('Buchung nicht gefunden');
        if (!State.isAdmin && b.fix) throw new Error('Buchung bereits abgeschlossen');
        
        const update = { storniert: true, storniert_am: new Date().toISOString() };
        
        // Lokal updaten
        try { await db.buchungen.update(buchung_id, update); } catch(e) {}
        
        // Supabase updaten
        if (supabaseClient && isOnline) {
            await supabaseClient.from('buchungen').update(update).eq('buchung_id', buchung_id);
        }
        
        await DataProtection.createBackup();
        Utils.showToast('Buchung storniert', 'success');
    },
    
    async fixSessionBuchungen() {
        if (!State.sessionId) return;
        const userId = State.currentUser?.id || State.currentUser?.gast_id;
        
        try {
            // Supabase: RPC Funktion nutzen
            if (supabaseClient && isOnline && userId) {
                await supabaseClient.rpc('fix_session_buchungen', {
                    p_session_id: State.sessionId,
                    p_user_id: userId
                });
            }
            
            // Lokal auch updaten
            const allBs = await db.buchungen.toArray();
            const bs = allBs.filter(b => b.session_id === State.sessionId);
            for (const b of bs) {
                if (!b.storniert) await db.buchungen.update(b.buchung_id, { fix: true });
            }
            
            await DataProtection.createBackup();
        } catch (e) {
            console.error('fixSessionBuchungen error:', e);
        }
    },
    
    async getByGast(id, limit=null) {
        // Supabase bevorzugen wenn online
        if (supabaseClient && isOnline) {
            let query = supabaseClient
                .from('buchungen')
                .select('*')
                .eq('user_id', id)
                .eq('storniert', false)
                .order('erstellt_am', { ascending: false });
            
            if (limit) query = query.limit(limit);
            const { data } = await query;
            
            if (data) {
                // Cache updaten
                for (const b of data) {
                    try { await db.buchungen.put({ ...b, gast_id: b.user_id }); } catch(e) {}
                }
                return data.map(b => ({ ...b, gast_id: b.user_id }));
            }
        }
        
        // Fallback: Lokal
        let r = await db.buchungen.where('gast_id').equals(id).reverse().toArray();
        r = r.filter(b => !b.storniert);
        return limit ? r.slice(0, limit) : r;
    },
    
    async getSessionBuchungen() {
        if (!State.sessionId) return [];
        
        try {
            // Session-Buchungen immer lokal (sind gerade erst erstellt)
            const allBs = await db.buchungen.toArray();
            const r = allBs.filter(b => b.session_id === State.sessionId && !b.storniert);
            return r.reverse();
        } catch (e) {
            console.error('getSessionBuchungen error:', e);
            return [];
        }
    },
    
    async getAll(filter={}) {
        // Wenn online, immer von Supabase laden
        if (supabaseClient && isOnline) {
            try {
                let query = supabaseClient.from('buchungen').select('*');
                
                if (filter.exportiert !== undefined) {
                    query = query.eq('exportiert', filter.exportiert);
                }
                if (filter.datum) {
                    query = query.eq('datum', filter.datum);
                }
                if (filter.includeStorniert !== true) {
                    query = query.eq('storniert', false);
                }
                
                query = query.order('erstellt_am', { ascending: false });
                
                const { data, error } = await query;
                if (error) {
                    console.error('Buchungen.getAll Supabase error:', error);
                } else if (data) {
                    console.log('Buchungen von Supabase geladen:', data.length);
                    // Cache aktualisieren
                    for (const b of data) {
                        try { await db.buchungen.put({ ...b, gast_id: b.user_id }); } catch(e) {}
                    }
                    return data.map(b => ({ ...b, gast_id: b.user_id }));
                }
            } catch(e) {
                console.error('Buchungen.getAll error:', e);
            }
        }
        
        // Fallback: Lokal
        console.log('Buchungen von lokaler DB laden...');
        let r = await db.buchungen.toArray();
        if (filter.exportiert !== undefined) r = r.filter(b => b.exportiert === filter.exportiert);
        if (filter.datum) r = r.filter(b => b.datum === filter.datum);
        if (filter.includeStorniert !== true) r = r.filter(b => !b.storniert);
        console.log('Lokale Buchungen:', r.length);
        return r.reverse();
    },
    
    async getAuffuellliste() {
        // Auffüllliste: Nur Buchungen die NICHT aufgefüllt sind (unabhängig von Export!)
        let bs = [];
        
        if (supabaseClient && isOnline) {
            try {
                const { data } = await supabaseClient
                    .from('buchungen')
                    .select('*')
                    .eq('storniert', false)
                    .or('aufgefuellt.is.null,aufgefuellt.eq.false')
                    .order('erstellt_am', { ascending: false });
                if (data) bs = data;
            } catch(e) {
                console.error('getAuffuellliste error:', e);
            }
        }
        
        // Fallback: Lokal
        if (bs.length === 0) {
            const all = await db.buchungen.toArray();
            bs = all.filter(b => !b.storniert && !b.aufgefuellt);
        }
        
        const byArtikel = {};
        for (const b of bs) {
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
        
        const liste = Object.values(byArtikel);
        liste.sort((a, b) => {
            if (a.kategorie_id !== b.kategorie_id) return a.kategorie_id - b.kategorie_id;
            return b.menge - a.menge;
        });
        
        return liste;
    },
    
    // Nur Auffüllliste zurücksetzen (NICHT Export!)
    async markAsAufgefuellt() {
        let bs = [];
        
        if (supabaseClient && isOnline) {
            const { data } = await supabaseClient
                .from('buchungen')
                .select('buchung_id')
                .eq('storniert', false)
                .or('aufgefuellt.is.null,aufgefuellt.eq.false');
            if (data) bs = data;
        } else {
            const all = await db.buchungen.toArray();
            bs = all.filter(b => !b.storniert && !b.aufgefuellt);
        }
        
        const ids = bs.map(b => b.buchung_id);
        const update = { aufgefuellt: true, aufgefuellt_am: new Date().toISOString() };
        
        for (const id of ids) {
            try { await db.buchungen.update(id, update); } catch(e) {}
        }
        
        if (supabaseClient && isOnline) {
            for (const id of ids) {
                await supabaseClient.from('buchungen').update(update).eq('buchung_id', id);
            }
        }
        
        await DataProtection.createBackup();
        console.log(`${ids.length} Buchungen als aufgefüllt markiert`);
    },
    
    // Legacy - nicht mehr benutzen
    async resetAuffuellliste() {
        await this.markAsAufgefuellt();
    },
    
    async markAsExported(ids) { 
        for (const id of ids) {
            const update = { exportiert: true, exportiert_am: new Date().toISOString() };
            await db.buchungen.update(id, update);
            if (supabaseClient && isOnline) {
                await supabaseClient.from('buchungen').update(update).eq('buchung_id', id);
            }
        }
    }
};

// Fehlende Getränke Management
const FehlendeGetraenke = {
    async add(artikel_id, menge = 1) {
        const artikel = await Artikel.getById(artikel_id);
        if (!artikel) throw new Error('Artikel nicht gefunden');
        
        const gestern = new Date();
        gestern.setDate(gestern.getDate() - 1);
        const datumVortag = Utils.formatDate(gestern);
        
        const items = [];
        for (let i = 0; i < menge; i++) {
            items.push({
                artikel_id: artikel.artikel_id,
                artikel_name: artikel.name,
                artikel_preis: artikel.preis,
                kategorie_id: artikel.kategorie_id,
                icon: artikel.icon || '📦',
                datum: datumVortag,
                erstellt_am: new Date().toISOString(),
                uebernommen: false
            });
        }
        
        // Lokal speichern
        for (const item of items) {
            await db.fehlendeGetraenke.add(item);
        }
        
        // Supabase
        if (supabaseClient && isOnline) {
            try {
                const { error } = await supabaseClient.from('fehlende_getraenke').insert(items);
                if (error) console.error('Fehlende Getränke Supabase error:', error);
            } catch(e) {
                console.error('Fehlende Getränke sync error:', e);
            }
        }
        
        await DataProtection.createBackup();
        Utils.showToast(`${menge}× ${artikel.name} als fehlend markiert`, 'success');
    },
    
    async getOffene() {
        if (supabaseClient && isOnline) {
            const { data } = await supabaseClient
                .from('fehlende_getraenke')
                .select('*')
                .eq('uebernommen', false)
                .order('id', { ascending: false });
            
            if (data) {
                // Cache aktualisieren
                for (const f of data) {
                    try { await db.fehlendeGetraenke.put(f); } catch(e) {}
                }
                return data;
            }
        }
        const alle = await db.fehlendeGetraenke.toArray();
        return alle.filter(f => !f.uebernommen).sort((a, b) => b.id - a.id);
    },
    
    async uebernehmen(id, gastId, gastName) {
        let fehlend;
        
        if (supabaseClient && isOnline) {
            const { data } = await supabaseClient
                .from('fehlende_getraenke')
                .select('*')
                .eq('id', id)
                .single();
            fehlend = data;
        } else {
            fehlend = await db.fehlendeGetraenke.get(id);
        }
        
        if (!fehlend || fehlend.uebernommen) throw new Error('Nicht verfügbar');
        
        const updateData = {
            uebernommen: true,
            uebernommen_von: gastId,
            uebernommen_von_name: gastName,
            uebernommen_am: new Date().toISOString()
        };
        
        // Lokal und Supabase updaten
        try { await db.fehlendeGetraenke.update(id, updateData); } catch(e) {}
        if (supabaseClient && isOnline) {
            await supabaseClient.from('fehlende_getraenke').update(updateData).eq('id', id);
        }
        
        // Buchung erstellen
        const artikel = await Artikel.getById(fehlend.artikel_id);
        const b = {
            buchung_id: Utils.uuid(),
            user_id: gastId,
            gast_id: gastId,
            gast_vorname: gastName,
            gast_nachname: '',
            gastgruppe: '',
            artikel_id: fehlend.artikel_id,
            artikel_name: fehlend.artikel_name,
            preis: fehlend.artikel_preis,
            steuer_prozent: artikel?.steuer_prozent || 10,
            menge: 1,
            datum: fehlend.datum,
            uhrzeit: Utils.formatTime(new Date()),
            erstellt_am: new Date().toISOString(),
            exportiert: false,
            geraet_id: Utils.getDeviceId(),
            sync_status: isOnline ? 'synced' : 'pending',
            session_id: State.sessionId,
            storniert: false,
            fix: true,
            aus_fehlend: true
        };
        
        await db.buchungen.add(b);
        if (supabaseClient && isOnline) {
            await supabaseClient.from('buchungen').insert(b);
        }
        
        await DataProtection.createBackup();
        Utils.showToast(`${fehlend.artikel_name} übernommen!`, 'success');
        return b;
    },
    
    async loeschen(id) {
        try { await db.fehlendeGetraenke.delete(id); } catch(e) {}
        if (supabaseClient && isOnline) {
            await supabaseClient.from('fehlende_getraenke').delete().eq('id', id);
        }
        await DataProtection.createBackup();
        Utils.showToast('Gelöscht', 'success');
    }
};

// Umlage auf alle Gäste
const Umlage = {
    async bucheAufAlle(artikel_id, beschreibung = 'Umlage') {
        const artikel = await Artikel.getById(artikel_id);
        if (!artikel) throw new Error('Artikel nicht gefunden');
        
        // Alle aktiven Gäste holen
        const registrierte = await RegisteredGuests.getAll();
        const legacy = (await db.gaeste.toArray()).filter(g => g.aktiv && !g.checked_out);
        const alleGaeste = [...registrierte, ...legacy];
        
        if (alleGaeste.length === 0) throw new Error('Keine aktiven Gäste');
        
        // Preis pro Gast berechnen (aufgerundet auf 2 Dezimalen)
        const preisProGast = Math.ceil((artikel.preis / alleGaeste.length) * 100) / 100;
        
        const heute = Utils.formatDate(new Date());
        const uhrzeit = Utils.formatTime(new Date());
        
        // Für jeden Gast eine Buchung erstellen
        for (const gast of alleGaeste) {
            const gastId = gast.id || gast.gast_id;
            const gastName = gast.firstName || gast.vorname;
            
            const b = {
                buchung_id: Utils.uuid(),
                gast_id: gastId,
                gast_vorname: gastName,
                gast_nachname: gast.nachname || '',
                gastgruppe: gast.zimmernummer || '',
                artikel_id: artikel.artikel_id,
                artikel_name: `${artikel.name} (Umlage)`,
                preis: preisProGast,
                steuer_prozent: artikel.steuer_prozent || 10,
                menge: 1,
                datum: heute,
                uhrzeit: uhrzeit,
                erstellt_am: new Date().toISOString(),
                exportiert: false,
                geraet_id: Utils.getDeviceId(),
                sync_status: 'pending',
                session_id: null,
                storniert: false,
                fix: true,
                ist_umlage: true,
                umlage_beschreibung: beschreibung
            };
            await db.buchungen.add(b);
        }
        
        await DataProtection.createBackup();
        Utils.showToast(`Umlage: ${Utils.formatCurrency(preisProGast)} auf ${alleGaeste.length} Gäste verteilt`, 'success');
        return { preisProGast, anzahlGaeste: alleGaeste.length };
    }
};

// Artikel Cache
let artikelCache = null;
let artikelCacheTime = 0;
const ARTIKEL_CACHE_TTL = 60000; // 1 Minute

const Artikel = {
    async loadFromSupabase() {
        if (!supabaseClient || !isOnline) return false;
        try {
            const { data, error } = await supabaseClient
                .from('artikel')
                .select('*')
                .order('sortierung');
            
            if (!error && data && data.length > 0) {
                // Nur updaten wenn Supabase Daten hat
                await db.artikel.clear();
                await db.artikel.bulkAdd(data);
                artikelCache = data;
                artikelCacheTime = Date.now();
                console.log('✅ Artikel von Supabase geladen:', data.length);
                return true;
            } else {
                console.log('Supabase hat keine Artikel, nutze lokale Daten');
            }
        } catch(e) { console.error('loadFromSupabase error:', e); }
        return false;
    },
    
    async getAll(f={}) {
        // Erst lokale Daten prüfen
        let r = await db.artikel.toArray();
        
        // Wenn lokal leer und online, von Supabase laden
        if (r.length === 0 && supabaseClient && isOnline) {
            await this.loadFromSupabase();
            r = await db.artikel.toArray();
        }
        
        // Cache aktualisieren
        if (r.length > 0) {
            artikelCache = r;
            artikelCacheTime = Date.now();
        }
        
        if (f.aktiv !== undefined) r = r.filter(a => a.aktiv === f.aktiv);
        if (f.kategorie_id) r = r.filter(a => a.kategorie_id === f.kategorie_id);
        if (f.search) { const q = f.search.toLowerCase(); r = r.filter(a => a.name.toLowerCase().includes(q) || a.sku?.toLowerCase().includes(q)); }
        return r.sort((a,b) => (a.sortierung||0) - (b.sortierung||0));
    },
    
    async getById(id) { 
        if (artikelCache) {
            return artikelCache.find(a => a.artikel_id === id);
        }
        return db.artikel.get(id); 
    },
    
    async getBySku(sku) { return db.artikel.where('sku').equals(sku).first(); },
    
    async create(data) {
        if (!data.artikel_id) { 
            const m = await db.artikel.orderBy('artikel_id').last(); 
            data.artikel_id = (m?.artikel_id||0)+1; 
        }
        
        await db.artikel.add(data);
        artikelCache = null; // Cache invalidieren
        
        if (supabaseClient && isOnline) {
            await supabaseClient.from('artikel').insert(data);
        }
        
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
                
                const allArtikel = await db.artikel.where('kategorie_id').equals(katId).toArray();
                const conflicting = allArtikel.find(a => a.artikel_id !== id && a.sortierung === newPos);
                
                if (conflicting) {
                    await db.artikel.update(conflicting.artikel_id, { sortierung: oldPos });
                    if (supabaseClient && isOnline) {
                        await supabaseClient.from('artikel').update({ sortierung: oldPos }).eq('artikel_id', conflicting.artikel_id);
                    }
                }
            }
        }
        
        await db.artikel.update(id, changes);
        artikelCache = null; // Cache invalidieren
        
        if (supabaseClient && isOnline) {
            await supabaseClient.from('artikel').update(changes).eq('artikel_id', id);
        }
        
        await DataProtection.createBackup(); 
        Utils.showToast('Artikel aktualisiert', 'success'); 
    },
    
    async delete(id) { 
        await db.artikel.delete(id);
        artikelCache = null;
        
        if (supabaseClient && isOnline) {
            await supabaseClient.from('artikel').delete().eq('artikel_id', id);
        }
        
        await DataProtection.createBackup(); 
        Utils.showToast('Artikel gelöscht', 'success'); 
    },
    
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
        
        // Category mapping based on Warengruppe values (1-7)
        // 1=Alkoholfrei, 2=Biere, 3=Weine, 4=Schnäpse, 5=Heiße, 6=Süßes, 7=Sonstiges
        const katMap = {
            0: 'Sonstiges',
            1: 'Alkoholfreie Getränke',
            2: 'Biere',
            3: 'Weine',
            4: 'Schnäpse & Spirituosen',
            5: 'Heiße Getränke',
            6: 'Süßes & Salziges',
            7: 'Sonstiges',
            8: 'Sonstiges'
        };
        const iconMap = {0:'📦',1:'🥤',2:'🍺',3:'🍷',4:'🥃',5:'☕',6:'🍬',7:'📦',8:'📦'};
        
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
            
            // Get category from Warengruppe and map to new category structure
            // CSV Warengruppe: 1=Alkoholfrei, 2=Biere, 3=Wein, 4=Spirituosen, 5=Heiß, 6+=Sonstiges
            // App Kategorien: 1=Alkoholfrei, 2=Biere, 3=Weine, 4=Schnäpse, 5=Heiß, 6=Süßes, 7=Sonstiges
            const warengruppeMigration = {1:1, 2:2, 3:3, 4:4, 5:5, 6:6, 7:6, 8:7};
            let csvWG = 7; // Default: Sonstiges
            if (idx.kat >= 0 && v[idx.kat] !== undefined) {
                csvWG = parseInt(v[idx.kat]?.replace(/"/g,'')) || 7;
            }
            let katId = warengruppeMigration[csvWG] || 7;
            
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
                icon: iconMap[katId] || '📦' 
            };
            
            console.log(`Row ${i}: ID=${id}, Name="${name}", Preis=${preis}, Kat=${katId}`);
            
            // Check if article exists by ID
            const existing = await db.artikel.get(id);
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
        
        // Cache invalidieren
        artikelCache = null;
        
        // Nach Supabase hochladen (als Admin)
        if (supabaseClient && isOnline) {
            try {
                const allArtikel = await db.artikel.toArray();
                console.log('Uploading', allArtikel.length, 'articles to Supabase...');
                
                // Batch upsert
                const { error } = await supabaseClient
                    .from('artikel')
                    .upsert(allArtikel, { onConflict: 'artikel_id' });
                
                if (error) {
                    console.error('Supabase upsert error:', error);
                } else {
                    console.log('✅ Artikel nach Supabase synchronisiert');
                }
            } catch(e) {
                console.error('Supabase sync error:', e);
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
    },
    
    // Excel-Export im Buchenungsdetail-Format für Registrierkasse
    async exportBuchungenExcel() {
        const bs = await Buchungen.getAll({ exportiert: false });
        if (!bs.length) { Utils.showToast('Keine neuen Buchungen', 'warning'); return; }
        
        // Artikel-Cache für Kategorie-IDs aufbauen
        const artikelCache = {};
        const allArt = await db.artikel.toArray();
        allArt.forEach(a => { artikelCache[a.artikel_id] = a; });
        
        // Letzte ID aus den Buchungen für fortlaufende Nummerierung
        let lastId = parseInt(localStorage.getItem('lastExportId') || '0');
        
        // Daten im Format wie die Access-Tabelle vorbereiten
        const rows = bs.map(b => {
            lastId++;
            const artikel = artikelCache[b.artikel_id];
            
            return {
                'ID': lastId,
                'Artikelnr': b.artikel_id || 0,
                'Artikel': b.artikel_name || '',
                'Preis': b.preis || 0,
                'Datum': b.datum || '',
                'Uhrzeit': b.uhrzeit || '',
                'Gastid': b.gast_id || 0,
                'Gastname': b.gast_vorname || '',
                'Gastvorname': '',
                'Gastgruppe': b.gastgruppe || 'keiner Gruppe zugehörig',
                'Gastgruppennr': 0,
                'bezahlt': false,
                'Steuer': b.steuer_prozent || 10,
                'Anzahl': b.menge || 1,
                'Rechdatum': '',
                'Rechnummer': 0,
                'ZNummer': 0,
                'Warengruppe': artikel?.kategorie_id || 1,
                'Bar': false,
                'Unbar': false,
                'Artikelreihenfolge': artikel?.sortierung || 0,
                'Artikelgruppe2': 0,
                'Artikelreihenfolge2': 0,
                'Steuer1': 0,
                'Anfang2': 0,
                'Bestand2': 0,
                'Basisbestand2': 0,
                'Auffuellmenge2': 0,
                'Fehlbestand2': 0,
                'Warengruppe1': 0
            };
        });
        
        // SheetJS Workbook erstellen
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows);
        
        // Spaltenbreiten setzen
        ws['!cols'] = [
            {wch: 8}, {wch: 10}, {wch: 25}, {wch: 8}, {wch: 12}, {wch: 10},
            {wch: 8}, {wch: 15}, {wch: 15}, {wch: 25}, {wch: 12}, {wch: 8},
            {wch: 8}, {wch: 8}, {wch: 12}, {wch: 10}, {wch: 8}, {wch: 10},
            {wch: 6}, {wch: 6}, {wch: 15}, {wch: 12}, {wch: 15}, {wch: 8},
            {wch: 8}, {wch: 8}, {wch: 12}, {wch: 12}, {wch: 12}, {wch: 12}
        ];
        
        XLSX.utils.book_append_sheet(wb, ws, 'Buchenungsdetail');
        
        // Datei herunterladen
        const heute = new Date();
        const datumStr = `${heute.getDate().toString().padStart(2,'0')}-${(heute.getMonth()+1).toString().padStart(2,'0')}-${heute.getFullYear()}`;
        XLSX.writeFile(wb, `Buchenungsdetail_${datumStr}.xlsx`);
        
        // ID speichern für nächsten Export
        localStorage.setItem('lastExportId', lastId.toString());
        
        // Als exportiert markieren
        await Buchungen.markAsExported(bs.map(b => b.buchung_id));
        Utils.showToast(`${bs.length} Buchungen als Excel exportiert`, 'success');
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
        return `<div class="name-list-container"><div class="name-list-title">Wählen Sie Ihren Namen:</div><div class="name-list">${gaeste.map(g => `<button class="name-list-item" onclick="${onSelect}('${g.id || g.gast_id}')"><span class="name-text">${g.displayName}</span><span class="name-arrow">→</span></button>`).join('')}</div><button class="btn btn-secondary btn-block mt-3" onclick="handleBackToLogin()">Zurück</button></div>`;
    }
};

// Routes
Router.register('login', async () => {
    State.currentPin = ''; window.selectedGastId = null; window.currentLetter = null;
    
    // Fehlende Getränke laden und zusammenfassen
    const fehlendeOffen = await FehlendeGetraenke.getOffene();
    const zusammenfassung = {};
    fehlendeOffen.forEach(f => {
        if (!zusammenfassung[f.artikel_name]) {
            zusammenfassung[f.artikel_name] = { name: f.artikel_name, icon: f.icon || '🍺', menge: 0, preis: f.artikel_preis };
        }
        zusammenfassung[f.artikel_name].menge++;
    });
    const fehlendeList = Object.values(zusammenfassung);
    const gesamtPreis = fehlendeOffen.reduce((s, f) => s + f.artikel_preis, 0);
    
    const fehlendeHtml = fehlendeList.length ? `
    <div style="background:linear-gradient(135deg, #f39c12, #e74c3c);border-radius:16px;padding:16px;margin-bottom:24px;color:white;max-width:600px;margin:0 auto 24px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
            <span style="font-size:1.3rem;">⚠️</span>
            <div style="font-weight:700;">Fehlende Getränke</div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
            ${fehlendeList.map(f => `<span style="background:rgba(255,255,255,0.2);padding:4px 10px;border-radius:20px;font-size:0.9rem;">${f.menge}× ${f.name}</span>`).join('')}
        </div>
        <div style="font-size:0.85rem;opacity:0.9;">Gesamt: ${Utils.formatCurrency(gesamtPreis)} • Bitte nach Login übernehmen</div>
    </div>
    ` : '';
    
    UI.render(`<div class="main-content"><div style="text-align:center;margin-top:40px;"><div class="mountain-logo" style="margin:0 auto 24px;"><svg viewBox="0 0 100 60" class="mountain-svg" style="width:120px;height:72px;color:var(--color-mountain-blue);"><path d="M0,60 L20,30 L35,45 L50,15 L65,40 L80,25 L100,60 Z" fill="currentColor"/></svg></div><h1 style="font-family:var(--font-display);font-size:var(--text-3xl);margin-bottom:8px;">Seollerhaus Kassa</h1><p style="color:var(--color-stone-dark);margin-bottom:24px;">Self-Service Buchung</p>${fehlendeHtml}<div style="max-width:600px;margin:0 auto;">${UI.renderAlphabet('handleLetterSelect')}<div style="margin-top:32px;padding-top:24px;border-top:1px solid var(--color-stone-medium);"><p style="color:var(--color-stone-dark);margin-bottom:16px;">Noch kein Account?</p><button class="btn btn-primary btn-block" style="max-width:400px;margin:0 auto;" onclick="handleRegisterClick()">Neu registrieren</button></div><div style="margin-top:24px;"><button class="btn btn-secondary" onclick="handleAdminClick()">Admin-Login</button></div></div></div></div>`);
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
    const auffuellListe = await Buchungen.getAuffuellliste();
    const auffuellAnzahl = auffuellListe.reduce((s, i) => s + i.menge, 0);
    const fehlendeOffen = await FehlendeGetraenke.getOffene();
    
    UI.render(`<div class="app-header"><div class="header-left"><div class="header-title">🔧 Admin Dashboard</div></div><div class="header-right"><button class="btn btn-secondary" onclick="handleLogout()">Abmelden</button></div></div>
    <div class="main-content">
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-value">${guests.length}</div><div class="stat-label">Gäste</div></div>
            <div class="stat-card"><div class="stat-value">${artCount}</div><div class="stat-label">Artikel</div></div>
            <div class="stat-card"><div class="stat-value">${heuteB.length}</div><div class="stat-label">Buchungen heute</div></div>
            <div class="stat-card"><div class="stat-value">${Utils.formatCurrency(heuteB.reduce((s,b) => s+b.preis*b.menge, 0))}</div><div class="stat-label">Umsatz heute</div></div>
        </div>
        
        <!-- AUFFÜLLLISTE -->
        <button class="btn btn-primary btn-block" onclick="Router.navigate('admin-auffuellliste')" style="padding:20px;font-size:1.2rem;margin-bottom:12px;">
            🍺 Auffüllliste drucken<br>
            <small style="opacity:0.9;">(${auffuellAnzahl} Getränke zum Auffüllen)</small>
        </button>
        
        <!-- EXCEL EXPORT FÜR REGISTRIERKASSE -->
        ${nichtExp.length ? `
        <button class="btn btn-block" onclick="handleExportExcel()" style="padding:20px;font-size:1.2rem;margin-bottom:12px;background:linear-gradient(135deg, #217346, #1e6b3d);color:white;border:none;">
            📊 EXCEL für Registrierkasse<br>
            <small style="opacity:0.9;">(${nichtExp.length} Buchungen exportieren)</small>
        </button>
        ` : ''}
        
        <!-- ALLE BUCHUNGEN ANSEHEN -->
        <button class="btn btn-block" onclick="Router.navigate('admin-alle-buchungen')" style="padding:20px;font-size:1.2rem;margin-bottom:24px;background:#6c5ce7;color:white;border:none;">
            📋 Alle Buchungen ansehen<br>
            <small style="opacity:0.9;">(${bs.length} gesamt • bearbeiten/löschen)</small>
        </button>
        
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px;">
            <button class="btn btn-warning" onclick="Router.navigate('admin-fehlende')" style="padding:16px;background:#f39c12;color:white;">
                ⚠️ Fehlende Getränke<br><small>(${fehlendeOffen.length} offen)</small>
            </button>
            <button class="btn btn-danger" onclick="Router.navigate('admin-umlage')" style="padding:16px;">
                💰 Umlage buchen<br><small>(auf alle Gäste)</small>
            </button>
        </div>
        
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
                    <div style="padding:16px;background:var(--color-stone-light);border-radius:var(--radius-md);">
                        <h3 style="font-weight:600;margin-bottom:8px;">🔧 Kategorien</h3>
                        <button class="btn btn-secondary" onclick="repairCategories()">Reparieren</button>
                    </div>
                </div>
            </div>
        </div>
    </div>`);
});

// Kategorien reparieren
window.repairCategories = async () => {
    // Kategorien-Tabelle komplett neu aufbauen - 7 Kategorien
    await db.kategorien.clear();
    await db.kategorien.bulkAdd([
        {kategorie_id:1, name:'Alkoholfreie Getränke', sortierung:10},
        {kategorie_id:2, name:'Biere', sortierung:20},
        {kategorie_id:3, name:'Weine', sortierung:30},
        {kategorie_id:4, name:'Schnäpse & Spirituosen', sortierung:40},
        {kategorie_id:5, name:'Heiße Getränke', sortierung:50},
        {kategorie_id:6, name:'Süßes & Salziges', sortierung:60},
        {kategorie_id:7, name:'Sonstiges', sortierung:70}
    ]);
    
    // Alte Kategorie-IDs auf neue mappen:
    // ALTE Struktur: 1=Alkoholfrei, 2=Biere, 3=Wein, 4=Spirituosen, 5=Heiße, 6=Sonstiges, 7=Snacks, 8=Diverses
    // NEUE Struktur: 1=Alkoholfrei, 2=Biere, 3=Weine, 4=Schnäpse, 5=Heiße, 6=Süßes, 7=Sonstiges
    const migrationMap = {
        1: 1,  // Alkoholfrei bleibt
        2: 2,  // Biere bleibt
        3: 3,  // Wein -> Weine
        4: 4,  // Spirituosen -> Schnäpse & Spirituosen
        5: 5,  // Heiße Getränke bleibt
        6: 6,  // Sonstiges -> Süßes & Salziges
        7: 6,  // Snacks -> Süßes & Salziges
        8: 7   // Diverses -> Sonstiges
    };
    
    const iconMap = {1:'🥤',2:'🍺',3:'🍷',4:'🥃',5:'☕',6:'🍬',7:'📦'};
    const katMap = {
        1:'Alkoholfreie Getränke',
        2:'Biere',
        3:'Weine',
        4:'Schnäpse & Spirituosen',
        5:'Heiße Getränke',
        6:'Süßes & Salziges',
        7:'Sonstiges'
    };
    
    const arts = await db.artikel.toArray();
    let fixed = 0;
    for (const a of arts) {
        const alteKat = a.kategorie_id;
        const neueKat = migrationMap[alteKat] || 7;
        
        await db.artikel.update(a.artikel_id, { 
            kategorie_id: neueKat, 
            kategorie_name: katMap[neueKat],
            icon: a.bild ? a.icon : (iconMap[neueKat] || '📦')
        });
        
        if (alteKat !== neueKat) fixed++;
    }
    
    await DataProtection.createBackup();
    Utils.showToast(`Kategorien repariert! ${fixed} Artikel migriert.`, 'success');
    Router.navigate('admin-articles');
};

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
        
        <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:24px;">
            <button class="btn btn-primary" onclick="printAuffuellliste()" style="padding:16px;font-size:1.1rem;">
                🖨️ Für Thermodrucker drucken
            </button>
            <button class="btn btn-warning" onclick="resetAuffuellliste()" style="padding:16px;font-size:1.1rem;background:#f39c12;">
                🔄 Zurücksetzen (fragt nach Export)
            </button>
            <button class="btn btn-secondary" onclick="resetAuffuelllisteOhneExport()" style="padding:12px;">
                Nur Auffüllliste zurücksetzen (ohne Export)
            </button>
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
                                    <td style="padding:12px;text-align:center;color:#888;">__:__</td>
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

// Auffüllliste drucken - für Thermodrucker optimiert
window.printAuffuellliste = async () => {
    const liste = await Buchungen.getAuffuellliste();
    
    // Nach Kategorie gruppieren
    const byKat = {};
    liste.forEach(item => {
        if (!byKat[item.kategorie_name]) byKat[item.kategorie_name] = [];
        byKat[item.kategorie_name].push(item);
    });
    
    const total = liste.reduce((s, i) => s + i.menge, 0);
    const datum = new Date().toLocaleDateString('de-AT');
    const zeit = new Date().toLocaleTimeString('de-AT', {hour:'2-digit', minute:'2-digit'});
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Auffüllliste - ${datum}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    font-family: 'Courier New', monospace; 
                    font-size: 12px;
                    width: 80mm;
                    padding: 5mm;
                }
                .header { text-align: center; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
                .header h1 { font-size: 16px; margin-bottom: 5px; }
                .kategorie { font-weight: bold; background: #000; color: #fff; padding: 3px 5px; margin: 10px 0 5px 0; }
                .item { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dotted #ccc; }
                .item-name { flex: 1; }
                .item-check { width: 50px; text-align: center; font-family: monospace; }
                .item-menge { width: 30px; text-align: right; font-weight: bold; }
                .footer { margin-top: 15px; text-align: center; border-top: 1px dashed #000; padding-top: 10px; font-size: 10px; }
                .total { font-size: 14px; font-weight: bold; text-align: center; margin: 10px 0; }
                @media print { 
                    body { width: 100%; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>AUFFÜLLLISTE</h1>
                <div>${datum} ${zeit}</div>
            </div>
            
            ${Object.keys(byKat).sort().map(kat => `
                <div class="kategorie">${kat}</div>
                ${byKat[kat].map(item => `
                    <div class="item">
                        <span class="item-name">${item.name}</span>
                        <span class="item-check">__:__</span>
                        <span class="item-menge">${item.menge}×</span>
                    </div>
                `).join('')}
            `).join('')}
            
            <div class="total">GESAMT: ${total} Getränke</div>
            
            <div class="footer">
                Seollerhaus Kassa<br>
                ✓ = aufgefüllt
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
};

// Auffüllliste zurücksetzen - GETRENNT vom Export!
window.resetAuffuellliste = async () => {
    const result = confirm(
        '⚠️ ACHTUNG: Auffüllliste zurücksetzen?\n\n' +
        'Dies markiert alle Buchungen als "aufgefüllt".\n\n' +
        'Möchtest du vorher die Buchungen für die Registrierkasse exportieren?\n\n' +
        'OK = Ja, erst exportieren\n' +
        'Abbrechen = Nein, abbrechen'
    );
    
    if (result) {
        // Benutzer will erst exportieren
        await ExportService.exportBuchungenExcel();
        
        // Dann fragen ob Reset
        if (confirm('Export abgeschlossen.\n\nJetzt die Auffüllliste zurücksetzen?')) {
            await Buchungen.markAsAufgefuellt();
            Utils.showToast('Auffüllliste zurückgesetzt', 'success');
            Router.navigate('admin-auffuellliste');
        }
    }
};

// Nur Auffüllliste zurücksetzen (ohne Export-Frage)
window.resetAuffuelllisteOhneExport = async () => {
    if (confirm('Auffüllliste zurücksetzen OHNE Export?\n\nDie Buchungen bleiben für den späteren Export erhalten.')) {
        await Buchungen.markAsAufgefuellt();
        Utils.showToast('Auffüllliste zurückgesetzt', 'success');
        Router.navigate('admin-auffuellliste');
    }
};

// ============ ALLE BUCHUNGEN ROUTE (Admin) ============
Router.register('admin-alle-buchungen', async () => {
    if (!State.isAdmin) { Router.navigate('admin-login'); return; }
    
    // Alle Buchungen laden (inkl. stornierte zur Anzeige)
    const bs = await Buchungen.getAll({ includeStorniert: true });
    
    // Nach Datum gruppieren
    const byDatum = {};
    bs.forEach(b => {
        if (!byDatum[b.datum]) byDatum[b.datum] = [];
        byDatum[b.datum].push(b);
    });
    
    // Sortiert nach Datum (neueste zuerst)
    const sortedDates = Object.keys(byDatum).sort().reverse();
    
    UI.render(`<div class="app-header"><div class="header-left"><button class="menu-btn" onclick="Router.navigate('admin-dashboard')">←</button><div class="header-title">📋 Alle Buchungen</div></div><div class="header-right"><button class="btn btn-secondary" onclick="handleLogout()">Abmelden</button></div></div>
    <div class="main-content">
        <div class="card mb-3" style="background:var(--color-alpine-green);color:white;">
            <div style="padding:16px;text-align:center;">
                <div style="font-size:1.5rem;font-weight:700;">${bs.length} Buchungen</div>
                <div>Nach Datum sortiert (neueste zuerst)</div>
            </div>
        </div>
        
        <!-- GRUPPE ABGEREIST BUTTON -->
        <div class="card mb-3" style="background:#e74c3c;color:white;">
            <div style="padding:16px;">
                <div style="font-weight:700;margin-bottom:8px;">🏠 Gruppe abgereist?</div>
                <p style="font-size:0.9rem;margin-bottom:12px;opacity:0.9;">
                    Alle Buchungen exportieren und als erledigt markieren.<br>
                    Danach werden nur noch neue Buchungen angezeigt.
                </p>
                <button class="btn" onclick="handleGruppeAbgereist()" style="background:white;color:#e74c3c;font-weight:700;padding:12px 24px;">
                    ✈️ Gruppe abreisen & Alle Buchungen abschließen
                </button>
            </div>
        </div>
        
        ${sortedDates.length ? sortedDates.map(datum => {
            const buchungen = byDatum[datum].sort((a,b) => new Date(b.erstellt_am) - new Date(a.erstellt_am));
            const tagesUmsatz = buchungen.filter(b => !b.storniert).reduce((s,b) => s + b.preis * b.menge, 0);
            return `
            <div class="card mb-3">
                <div class="card-header" style="background:var(--color-stone-light);display:flex;justify-content:space-between;align-items:center;">
                    <h3 style="font-weight:700;margin:0;">📅 ${datum}</h3>
                    <span style="font-weight:600;color:var(--color-alpine-green);">${buchungen.length} Buchungen • ${Utils.formatCurrency(tagesUmsatz)}</span>
                </div>
                <div class="card-body" style="padding:0;max-height:400px;overflow-y:auto;">
                    <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
                        <thead style="background:var(--color-stone-light);position:sticky;top:0;">
                            <tr>
                                <th style="padding:10px;text-align:left;">Zeit</th>
                                <th style="padding:10px;text-align:left;">Gast</th>
                                <th style="padding:10px;text-align:left;">Artikel</th>
                                <th style="padding:10px;text-align:right;">Menge</th>
                                <th style="padding:10px;text-align:right;">Preis</th>
                                <th style="padding:10px;text-align:center;">Aktion</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${buchungen.map(b => `
                                <tr style="border-bottom:1px solid var(--color-stone-medium);${b.storniert ? 'opacity:0.5;text-decoration:line-through;' : ''}">
                                    <td style="padding:10px;">${b.uhrzeit || '-'}</td>
                                    <td style="padding:10px;font-weight:500;">${b.gast_vorname || 'Unbekannt'}</td>
                                    <td style="padding:10px;">${b.artikel_name}</td>
                                    <td style="padding:10px;text-align:right;">${b.menge}×</td>
                                    <td style="padding:10px;text-align:right;font-weight:600;">${Utils.formatCurrency(b.preis * b.menge)}</td>
                                    <td style="padding:10px;text-align:center;">
                                        ${b.storniert 
                                            ? '<span style="color:#e74c3c;font-size:0.8rem;">Storniert</span>'
                                            : `<button class="btn btn-danger" style="padding:4px 12px;font-size:0.8rem;" onclick="handleAdminDeleteBuchung('${b.buchung_id}')">🗑️</button>`
                                        }
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `}).join('') : '<p class="text-muted text-center" style="padding:40px;">Keine Buchungen vorhanden</p>'}
    </div>`);
});

// Gruppe abgereist - Alle Buchungen exportieren und abschließen
window.handleGruppeAbgereist = async () => {
    if (!confirm('⚠️ ACHTUNG: Gruppe abreisen?\n\nDies wird:\n1. Alle Buchungen für die Registrierkasse exportieren\n2. Alle Buchungen als exportiert markieren\n3. Auffüllliste zurücksetzen\n\nFortfahren?')) return;
    
    try {
        // 1. Excel Export
        await ExportService.exportBuchungenExcel();
        
        // 2. Alle als exportiert markieren
        const bs = await Buchungen.getAll({ exportiert: false });
        for (const b of bs) {
            const update = { exportiert: true, exportiert_am: new Date().toISOString() };
            try { await db.buchungen.update(b.buchung_id, update); } catch(e) {}
            if (supabaseClient && isOnline) {
                await supabaseClient.from('buchungen').update(update).eq('buchung_id', b.buchung_id);
            }
        }
        
        // 3. Auffüllliste auch zurücksetzen
        await Buchungen.markAsAufgefuellt();
        
        Utils.showToast('✅ Gruppe abgereist - Alle Buchungen exportiert und abgeschlossen', 'success');
        Router.navigate('admin-dashboard');
    } catch (e) {
        Utils.showToast('Fehler: ' + e.message, 'error');
    }
};

// Admin Buchung löschen (stornieren)
window.handleAdminDeleteBuchung = async (buchungId) => {
    if (!confirm('Diese Buchung wirklich stornieren?')) return;
    try {
        await Buchungen.storno(buchungId);
        Utils.showToast('Buchung storniert', 'success');
        Router.navigate('admin-alle-buchungen');
    } catch (e) {
        Utils.showToast('Fehler: ' + e.message, 'error');
    }
};

// ============ FEHLENDE GETRÄNKE ROUTE ============
Router.register('admin-fehlende', async () => {
    if (!State.isAdmin) { Router.navigate('admin-login'); return; }
    const fehlendeOffen = await FehlendeGetraenke.getOffene();
    const kats = await db.kategorien.toArray();
    const arts = await Artikel.getAll({ aktiv: true });
    
    // Nach Kategorie gruppieren
    const byKat = {};
    kats.forEach(k => { byKat[k.kategorie_id] = { name: k.name, artikel: [] }; });
    arts.forEach(a => {
        if (byKat[a.kategorie_id]) byKat[a.kategorie_id].artikel.push(a);
    });
    
    UI.render(`<div class="app-header"><div class="header-left"><button class="menu-btn" onclick="Router.navigate('admin-dashboard')">←</button><div class="header-title">⚠️ Fehlende Getränke</div></div><div class="header-right"><button class="btn btn-secondary" onclick="handleLogout()">Abmelden</button></div></div>
    <div class="main-content">
        <div class="card mb-3" style="background:#f39c12;color:white;">
            <div style="padding:16px;text-align:center;">
                <div style="font-size:1.5rem;font-weight:700;">${fehlendeOffen.length} offene Getränke</div>
                <div>warten auf Übernahme durch Gäste</div>
            </div>
        </div>
        
        ${fehlendeOffen.length ? `
        <div class="card mb-3">
            <div class="card-header"><h3>Offene fehlende Getränke</h3></div>
            <div class="card-body">
                ${fehlendeOffen.map(f => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:var(--color-stone-light);border-radius:8px;margin-bottom:6px;">
                    <div>
                        <strong>${f.artikel_name}</strong>
                        <small style="color:var(--color-stone-dark);margin-left:8px;">${f.datum}</small>
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span style="font-weight:600;">${Utils.formatCurrency(f.artikel_preis)}</span>
                        <button class="btn btn-danger" onclick="deleteFehlendes(${f.id})" style="padding:4px 10px;">🗑️</button>
                    </div>
                </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
        
        <div class="card">
            <div class="card-header"><h3>Neues fehlendes Getränk hinzufügen</h3></div>
            <div class="card-body">
                <div class="form-group">
                    <label class="form-label">Anzahl</label>
                    <input type="number" id="fehlende-menge" class="form-input" value="1" min="1" max="99" style="width:100px;">
                </div>
                <p style="margin:16px 0;color:var(--color-stone-dark);">Artikel auswählen:</p>
                ${Object.keys(byKat).map(katId => {
                    const kat = byKat[katId];
                    if (!kat.artikel.length) return '';
                    return `
                    <div style="margin-bottom:16px;">
                        <div style="background:var(--color-alpine-green);color:white;padding:8px 12px;font-weight:600;border-radius:8px 8px 0 0;">${kat.name}</div>
                        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;padding:12px;background:var(--color-stone-light);border-radius:0 0 8px 8px;">
                            ${kat.artikel.map(a => `
                            <button class="btn btn-secondary" onclick="addFehlendesGetraenk(${a.artikel_id})" style="padding:12px 8px;text-align:center;">
                                <div style="font-size:1.5rem;">${a.icon||'📦'}</div>
                                <div style="font-size:0.85rem;font-weight:500;">${a.name_kurz||a.name}</div>
                                <div style="font-size:0.8rem;color:var(--color-stone-dark);">${Utils.formatCurrency(a.preis)}</div>
                            </button>
                            `).join('')}
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>
        </div>
    </div>`);
});

window.addFehlendesGetraenk = async (artikelId) => {
    const menge = parseInt(document.getElementById('fehlende-menge')?.value) || 1;
    await FehlendeGetraenke.add(artikelId, menge);
    Router.navigate('admin-fehlende');
};

window.deleteFehlendes = async (id) => {
    if (confirm('Eintrag löschen?')) {
        await FehlendeGetraenke.loeschen(id);
        Router.navigate('admin-fehlende');
    }
};

// ============ UMLAGE ROUTE ============
Router.register('admin-umlage', async () => {
    if (!State.isAdmin) { Router.navigate('admin-login'); return; }
    const guests = await RegisteredGuests.getAll();
    const legacyGuests = (await db.gaeste.toArray()).filter(g => g.aktiv && !g.checked_out);
    const totalGuests = guests.length + legacyGuests.length;
    
    // Fehlende Getränke laden
    const fehlendeOffen = await FehlendeGetraenke.getOffene();
    const gesamtPreis = fehlendeOffen.reduce((s, f) => s + f.artikel_preis, 0);
    const preisProGast = totalGuests > 0 ? Math.ceil((gesamtPreis / totalGuests) * 100) / 100 : gesamtPreis;
    
    UI.render(`<div class="app-header"><div class="header-left"><button class="menu-btn" onclick="Router.navigate('admin-dashboard')">←</button><div class="header-title">💰 Umlage buchen</div></div><div class="header-right"><button class="btn btn-secondary" onclick="handleLogout()">Abmelden</button></div></div>
    <div class="main-content">
        <div class="card mb-3" style="background:var(--color-danger);color:white;">
            <div style="padding:20px;text-align:center;">
                <div style="font-size:2rem;font-weight:700;">${totalGuests} aktive Gäste</div>
                <div style="opacity:0.9;">Kosten werden gleichmäßig verteilt</div>
            </div>
        </div>
        
        ${fehlendeOffen.length ? `
        <div class="card mb-3">
            <div class="card-header" style="background:#f39c12;color:white;">
                <h3 style="margin:0;">⚠️ Fehlende Getränke (${fehlendeOffen.length})</h3>
            </div>
            <div class="card-body">
                ${fehlendeOffen.map(f => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:var(--color-stone-light);border-radius:8px;margin-bottom:6px;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <span style="font-size:1.5rem;">${f.icon || '🍺'}</span>
                        <div>
                            <div style="font-weight:600;">${f.artikel_name}</div>
                            <div style="font-size:0.85rem;color:var(--color-stone-dark);">${f.datum}</div>
                        </div>
                    </div>
                    <div style="font-weight:700;">${Utils.formatCurrency(f.artikel_preis)}</div>
                </div>
                `).join('')}
                
                <div style="margin-top:16px;padding:16px;background:var(--color-stone-light);border-radius:8px;">
                    <div style="display:flex;justify-content:space-between;font-size:1.2rem;font-weight:700;">
                        <span>Gesamtsumme:</span>
                        <span>${Utils.formatCurrency(gesamtPreis)}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;margin-top:8px;color:var(--color-danger);font-weight:600;">
                        <span>Pro Gast (${totalGuests}):</span>
                        <span>${Utils.formatCurrency(preisProGast)}</span>
                    </div>
                </div>
                
                <button class="btn btn-danger btn-block" onclick="bucheUmlageFuerAlle()" style="margin-top:20px;padding:20px;font-size:1.3rem;font-weight:700;">
                    💰 UMLAGE BUCHEN
                </button>
                <p style="text-align:center;margin-top:8px;color:var(--color-stone-dark);font-size:0.9rem;">
                    ${Utils.formatCurrency(preisProGast)} × ${totalGuests} Gäste = ${Utils.formatCurrency(preisProGast * totalGuests)}
                </p>
            </div>
        </div>
        ` : `
        <div class="card">
            <div class="card-body" style="text-align:center;padding:40px;">
                <div style="font-size:3rem;margin-bottom:16px;">✅</div>
                <h3>Keine fehlenden Getränke</h3>
                <p style="color:var(--color-stone-dark);">Es gibt nichts umzulegen.</p>
            </div>
        </div>
        `}
    </div>`);
});

window.bucheUmlageFuerAlle = async () => {
    const guests = await RegisteredGuests.getAll();
    const legacyGuests = (await db.gaeste.toArray()).filter(g => g.aktiv && !g.checked_out);
    const alleGaeste = [...guests, ...legacyGuests];
    const totalGuests = alleGaeste.length;
    
    if (totalGuests === 0) {
        Utils.showToast('Keine aktiven Gäste', 'error');
        return;
    }
    
    const fehlendeOffen = await FehlendeGetraenke.getOffene();
    if (fehlendeOffen.length === 0) {
        Utils.showToast('Keine fehlenden Getränke', 'error');
        return;
    }
    
    const gesamtPreis = fehlendeOffen.reduce((s, f) => s + f.artikel_preis, 0);
    const preisProGast = Math.ceil((gesamtPreis / totalGuests) * 100) / 100;
    
    if (!confirm(`UMLAGE durchführen?\n\n${fehlendeOffen.length} fehlende Getränke\nGesamtwert: ${Utils.formatCurrency(gesamtPreis)}\n\n${Utils.formatCurrency(preisProGast)} × ${totalGuests} Gäste`)) {
        return;
    }
    
    const heute = Utils.formatDate(new Date());
    const uhrzeit = Utils.formatTime(new Date());
    
    // Für jeden Gast eine Buchung erstellen
    for (const gast of alleGaeste) {
        const gastId = gast.id || gast.gast_id;
        const gastName = gast.firstName || gast.vorname;
        
        const b = {
            buchung_id: Utils.uuid(),
            gast_id: gastId,
            gast_vorname: gastName,
            gast_nachname: gast.nachname || '',
            gastgruppe: gast.zimmernummer || '',
            artikel_id: 0,
            artikel_name: `Umlage (${fehlendeOffen.length} Getränke)`,
            preis: preisProGast,
            steuer_prozent: 10,
            menge: 1,
            datum: heute,
            uhrzeit: uhrzeit,
            erstellt_am: new Date().toISOString(),
            exportiert: false,
            geraet_id: Utils.getDeviceId(),
            sync_status: 'pending',
            session_id: null,
            storniert: false,
            fix: true,
            ist_umlage: true
        };
        await db.buchungen.add(b);
    }
    
    // Alle fehlenden Getränke als umgelegt markieren
    for (const f of fehlendeOffen) {
        await db.fehlendeGetraenke.update(f.id, { 
            uebernommen: true, 
            uebernommen_am: new Date().toISOString(),
            umgelegt: true
        });
    }
    
    await DataProtection.createBackup();
    Utils.showToast(`Umlage: ${Utils.formatCurrency(preisProGast)} auf ${totalGuests} Gäste verteilt`, 'success');
    Router.navigate('admin-dashboard');
};

Router.register('admin-guests', async () => {
    if (!State.isAdmin) { Router.navigate('admin-login'); return; }
    const alleInDb = await db.registeredGuests.toArray();
    const guests = alleInDb.filter(g => !g.geloescht);
    const geloeschte = alleInDb.filter(g => g.geloescht);
    
    UI.render(`<div class="app-header"><div class="header-left"><button class="menu-btn" onclick="Router.navigate('admin-dashboard')">←</button><div class="header-title">👥 Gästeverwaltung</div></div><div class="header-right"><button class="btn btn-secondary" onclick="handleLogout()">Abmelden</button></div></div>
    <div class="main-content">
        <div class="card mb-3">
            <div class="card-header">
                <h2 class="card-title">Aktive Gäste (${guests.length})</h2>
                <button class="btn btn-secondary" onclick="DataProtection.exportGuestsCSV()">📥 Export</button>
            </div>
            <div class="card-body">
                <div class="form-group"><input type="text" class="form-input" placeholder="🔍 Suchen..." oninput="filterGuestList(this.value)"></div>
                <div id="guest-list">
                    ${guests.length ? guests.map(g => `
                    <div class="list-item guest-item" data-name="${g.firstName.toLowerCase()}">
                        <div style="flex:1;">
                            <strong>${g.firstName}</strong><br>
                            <small class="text-muted">ID: ${g.id} | ${new Date(g.createdAt).toLocaleDateString('de-AT')}</small>
                        </div>
                        <button class="btn btn-danger" onclick="handleSoftDeleteGuest(${g.id})" style="padding:8px 16px;">🗑️</button>
                    </div>
                    `).join('') : '<p class="text-muted text-center">Keine Gäste</p>'}
                </div>
            </div>
        </div>
        
        ${geloeschte.length ? `
        <div class="card mb-3" style="border:2px dashed var(--color-stone-medium);">
            <div class="card-header" style="background:var(--color-stone-light);">
                <h2 class="card-title">🗑️ Papierkorb (${geloeschte.length})</h2>
            </div>
            <div class="card-body">
                ${geloeschte.map(g => `
                <div class="list-item" style="background:var(--color-stone-light);">
                    <div style="flex:1;">
                        <strong style="text-decoration:line-through;color:var(--color-stone-dark);">${g.firstName}</strong><br>
                        <small class="text-muted">Gelöscht: ${g.geloeschtAm ? new Date(g.geloeschtAm).toLocaleDateString('de-AT') : '?'}</small>
                    </div>
                    <div style="display:flex;gap:8px;">
                        <button class="btn btn-secondary" onclick="handleRestoreGuest(${g.id})" style="padding:8px 12px;">↩️</button>
                        <button class="btn btn-danger" onclick="handlePermanentDeleteGuest(${g.id})" style="padding:8px 12px;">❌</button>
                    </div>
                </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
        
        <div class="card" style="background:#f8f9fa;">
            <div class="card-header"><h3>🔧 Datenbank (${alleInDb.length} Einträge)</h3></div>
            <div class="card-body">
                <p style="color:var(--color-stone-dark);margin-bottom:12px;">Alle Gäste in der Datenbank:</p>
                ${alleInDb.map(g => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:white;border-radius:8px;margin-bottom:4px;border:1px solid ${g.geloescht ? '#e74c3c' : '#27ae60'};">
                    <div>
                        <strong>${g.firstName}</strong>
                        <small style="margin-left:8px;color:${g.geloescht ? '#e74c3c' : '#27ae60'};">${g.geloescht ? '(gelöscht)' : '(aktiv)'}</small>
                    </div>
                    <button class="btn btn-danger" onclick="handleForceDeleteGuest(${g.id})" style="padding:4px 10px;font-size:0.85rem;">❌ Entfernen</button>
                </div>
                `).join('')}
            </div>
        </div>
    </div>`);
});

window.handleForceDeleteGuest = async (id) => {
    if (confirm('Gast SOFORT und ENDGÜLTIG aus der Datenbank entfernen?')) {
        await db.registeredGuests.delete(id);
        await DataProtection.createBackup();
        Utils.showToast('Gast entfernt', 'success');
        Router.navigate('admin-guests');
    }
};

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
    const gastId = State.currentUser.id || State.currentUser.gast_id;
    
    // Standard: Alkoholfrei (ID 1) beim ersten Mal
    if (State.selectedCategory === null) State.selectedCategory = 1;
    
    const filtered = State.selectedCategory === 'alle' ? arts : arts.filter(a => a.kategorie_id === State.selectedCategory);
    const sessionBuchungen = await Buchungen.getSessionBuchungen();
    const sessionTotal = sessionBuchungen.reduce((s,b) => s + b.preis * b.menge, 0);
    
    // ALLE Buchungen des Gastes laden (von Supabase wenn online)
    let meineBuchungen = [];
    if (supabaseClient && isOnline) {
        const { data } = await supabaseClient
            .from('buchungen')
            .select('*')
            .eq('user_id', gastId)
            .eq('storniert', false)
            .eq('exportiert', false)
            .order('erstellt_am', { ascending: false });
        if (data) {
            meineBuchungen = data.map(b => ({ ...b, gast_id: b.user_id }));
        }
    }
    // Fallback: Lokale Daten
    if (meineBuchungen.length === 0) {
        const alleBuchungen = await db.buchungen.toArray();
        meineBuchungen = alleBuchungen.filter(b => 
            (b.gast_id === gastId || b.user_id === gastId) && !b.storniert && !b.exportiert
        ).sort((a,b) => new Date(b.erstellt_am) - new Date(a.erstellt_am));
    }
    const gesamtSumme = meineBuchungen.reduce((s,b) => s + b.preis * b.menge, 0);
    
    // Nach Datum gruppieren
    const nachDatum = {};
    meineBuchungen.forEach(b => {
        if (!nachDatum[b.datum]) nachDatum[b.datum] = [];
        nachDatum[b.datum].push(b);
    });
    
    // Fehlende Getränke laden
    const fehlendeOffen = await FehlendeGetraenke.getOffene();
    
    const renderTileContent = (a) => {
        if (a.bild && a.bild.startsWith('data:')) {
            return `<img src="${a.bild}" style="width:64px;height:64px;object-fit:cover;border-radius:8px;">`;
        }
        return `<div class="artikel-icon">${a.icon||'📦'}</div>`;
    };
    
    const catColor = (id) => ({1:'#FF6B6B',2:'#FFD93D',3:'#95E1D3',4:'#AA4465',5:'#F38181',6:'#6C5B7B',7:'#4A5859'})[id] || '#2C5F7C';
    
    UI.render(`
    <div class="app-header">
        <div class="header-left"><div class="header-title">👤 ${name}</div></div>
        <div class="header-right"><button class="btn btn-secondary" onclick="handleGastAbmelden()">Abmelden</button></div>
    </div>
    <div class="main-content" style="padding-bottom:${sessionBuchungen.length ? '180px' : '20px'};">
        
        ${meineBuchungen.length ? `
        <div class="buchungen-uebersicht" style="background:var(--color-alpine-green);border-radius:16px;margin-bottom:20px;overflow:hidden;">
            <div onclick="toggleBuchungsDetails()" style="padding:16px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;">
                <div style="color:white;">
                    <div style="font-weight:700;font-size:1.1rem;">📋 Meine Buchungen</div>
                    <div style="font-size:0.9rem;opacity:0.9;">${meineBuchungen.length} Artikel • Gesamtsumme</div>
                </div>
                <div style="text-align:right;color:white;">
                    <div style="font-size:1.5rem;font-weight:700;">${Utils.formatCurrency(gesamtSumme)}</div>
                    <div id="buchungen-arrow" style="font-size:1.2rem;">▼</div>
                </div>
            </div>
            <div id="buchungen-details" style="display:none;background:white;padding:16px;max-height:300px;overflow-y:auto;">
                ${Object.keys(nachDatum).map(datum => `
                <div style="margin-bottom:16px;">
                    <div style="font-weight:700;color:var(--color-alpine-green);margin-bottom:8px;padding-bottom:4px;border-bottom:2px solid var(--color-stone-light);">
                        📅 ${datum}
                    </div>
                    ${nachDatum[datum].map(b => `
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:var(--color-stone-light);border-radius:8px;margin-bottom:4px;">
                        <div>
                            <div style="font-weight:600;">${b.artikel_name}</div>
                            <div style="font-size:0.8rem;color:var(--color-stone-dark);">🕐 ${b.uhrzeit?.substring(0,5) || ''} • ${b.menge}×</div>
                        </div>
                        <div style="font-weight:700;color:var(--color-alpine-green);">${Utils.formatCurrency(b.preis * b.menge)}</div>
                    </div>
                    `).join('')}
                </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
        
        ${fehlendeOffen.length ? `
        <div class="fehlende-box" style="background:linear-gradient(135deg, #f39c12, #e74c3c);border-radius:16px;padding:16px;margin-bottom:20px;color:white;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
                <span style="font-size:1.5rem;">⚠️</span>
                <div>
                    <div style="font-weight:700;font-size:1.1rem;">Fehlende Getränke vom Vortag</div>
                    <div style="font-size:0.9rem;opacity:0.9;">Bitte übernehmen, falls Sie diese vergessen haben zu buchen</div>
                </div>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:8px;">
                ${fehlendeOffen.map(f => `
                <button onclick="uebernehmeFehlend(${f.id})" style="background:white;color:#333;border:none;border-radius:12px;padding:10px 14px;cursor:pointer;display:flex;align-items:center;gap:8px;box-shadow:0 2px 8px rgba(0,0,0,0.15);">
                    <span style="font-size:1.2rem;">${f.icon || '🍺'}</span>
                    <div style="text-align:left;">
                        <div style="font-weight:600;font-size:0.9rem;">${f.artikel_name}</div>
                        <div style="font-size:0.75rem;color:#666;">${f.datum} • ${Utils.formatCurrency(f.artikel_preis)}</div>
                    </div>
                </button>
                `).join('')}
            </div>
        </div>
        ` : ''}
        
        <div class="form-group"><input type="text" class="form-input" placeholder="🔍 Suchen..." oninput="searchArtikel(this.value)"></div>
        <div class="category-tabs">
            ${kats.sort((a,b) => (a.sortierung||0) - (b.sortierung||0)).map(k => `<div class="category-tab ${State.selectedCategory===k.kategorie_id?'active':''}" onclick="filterCategory(${k.kategorie_id})">${k.name}</div>`).join('')}
            <div class="category-tab ${State.selectedCategory==='alle'?'active':''}" onclick="filterCategory('alle')">Alle</div>
        </div>
        <div class="artikel-grid">
            ${filtered.map(a => `<div class="artikel-tile" style="--tile-color:${catColor(a.kategorie_id)}" onclick="bucheArtikelDirekt(${a.artikel_id})">${renderTileContent(a)}<div class="artikel-name">${a.name_kurz||a.name}</div><div class="artikel-price">${Utils.formatCurrency(a.preis)}</div></div>`).join('')}
        </div>
    </div>
    ${sessionBuchungen.length ? `
    <div class="session-popup" style="position:fixed;bottom:20px;right:20px;left:20px;max-width:400px;margin:0 auto;background:white;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.2);border:2px solid var(--color-alpine-green);z-index:1000;">
        <div style="padding:16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                <strong style="font-size:1.1rem;">🛒 Gerade gebucht</strong>
                <span style="font-size:1.4rem;font-weight:700;color:var(--color-alpine-green);">${Utils.formatCurrency(sessionTotal)}</span>
            </div>
            <div style="max-height:150px;overflow-y:auto;">
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

// Buchungsdetails aufklappen/zuklappen
window.toggleBuchungsDetails = () => {
    const details = document.getElementById('buchungen-details');
    const arrow = document.getElementById('buchungen-arrow');
    if (details.style.display === 'none') {
        details.style.display = 'block';
        arrow.textContent = '▲';
    } else {
        details.style.display = 'none';
        arrow.textContent = '▼';
    }
};

// Fehlende Getränke übernehmen
window.uebernehmeFehlend = async (id) => {
    const gastId = State.currentUser?.id || State.currentUser?.gast_id;
    const gastName = State.currentUser?.firstName || State.currentUser?.vorname;
    if (!gastId) return;
    
    try {
        await FehlendeGetraenke.uebernehmen(id, gastId, gastName);
        Router.navigate('buchen'); // Seite neu laden - Artikel verschwindet
    } catch (e) {
        Utils.showToast(e.message || 'Fehler', 'error');
    }
};

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
window.handleLogout = async () => { await Auth.logout(); };
window.handleLetterSelect = l => { window.currentLetter = l; Router.navigate('name-select'); };
window.handleNameSelect = id => { window.selectedGastId = id; Router.navigate('pin-entry'); };
window.handlePinCancel = () => { window.selectedGastId = null; Router.navigate('login'); };
window.handleRegisterSubmit = async () => {
    const v = document.getElementById('register-vorname')?.value;
    const p = window.registerPin;
    if (!v?.trim()) { Utils.showToast('Vorname eingeben', 'warning'); return; }
    if (!p || p.length !== 4) { Utils.showToast('4-stelligen PIN eingeben', 'warning'); return; }
    try { 
        console.log('Registrierung startet...', v.trim(), p.length);
        await RegisteredGuests.register(v.trim(), p); 
        // Direkt zum Dashboard (Artikelmenü) navigieren
        setTimeout(() => Router.navigate('dashboard'), 500); 
    } catch(e) {
        console.error('Registrierung Fehler:', e);
        Utils.showToast('Fehler: ' + e.message, 'error');
    }
};
window.handleAdminLogin = async () => {
    const pw = document.getElementById('admin-password')?.value;
    if (!pw) { Utils.showToast('Passwort eingeben', 'warning'); return; }
    if (await Auth.adminLogin(pw)) Router.navigate('admin-dashboard');
};
window.handleExportBuchungen = async () => { await ExportService.exportBuchungenCSV(); Router.navigate('admin-dashboard'); };
window.handleExportExcel = async () => { 
    await ExportService.exportBuchungenExcel(); 
    Router.navigate('admin-dashboard'); 
};
window.handleArtikelImport = async e => { const f = e.target.files[0]; if(!f) return; try { await Artikel.importFromCSV(await f.text()); Router.navigate('admin-articles'); } catch(er) {} e.target.value = ''; };
window.handleSoftDeleteGuest = async id => { 
    if(confirm('Gast in den Papierkorb verschieben?')) { 
        await RegisteredGuests.softDelete(id); 
        Router.navigate('admin-guests'); 
    } 
};
window.handleRestoreGuest = async id => {
    await RegisteredGuests.restore(id);
    Router.navigate('admin-guests');
};
window.handlePermanentDeleteGuest = async id => { 
    if(confirm('Gast ENDGÜLTIG löschen?\n\nDiese Aktion kann nicht rückgängig gemacht werden!')) { 
        await RegisteredGuests.deletePermanent(id); 
        Router.navigate('admin-guests'); 
    } 
};
window.handleDeleteArticle = async id => { if(confirm('Artikel löschen?')) { await Artikel.delete(id); Router.navigate('admin-articles'); } };
window.filterGuestList = q => { document.querySelectorAll('.guest-item').forEach(i => { i.style.display = i.dataset.name.includes(q.toLowerCase()) ? '' : 'none'; }); };
window.filterArticleList = q => { const ql = q.toLowerCase(); document.querySelectorAll('.article-item').forEach(i => { i.style.display = (i.dataset.name.includes(ql) || i.dataset.sku.includes(ql)) ? '' : 'none'; }); };
window.filterCategory = id => { State.selectedCategory = id; Router.navigate('buchen'); };
window.getCategoryColor = id => ({1:'#FF6B6B',2:'#FFD93D',3:'#95E1D3',4:'#AA4465',5:'#F38181',6:'#6C5B7B',7:'#4A5859'})[id] || '#2C5F7C';
window.searchArtikel = Utils.debounce(async q => {
    const arts = await Artikel.getAll({ aktiv: true, search: q });
    const grid = document.querySelector('.artikel-grid');
    const catColor = (id) => ({1:'#FF6B6B',2:'#FFD93D',3:'#95E1D3',4:'#AA4465',5:'#F38181',6:'#6C5B7B',7:'#4A5859'})[id] || '#2C5F7C';
    const renderTile = (a) => {
        const content = (a.bild && a.bild.startsWith('data:')) 
            ? `<img src="${a.bild}" style="width:64px;height:64px;object-fit:cover;border-radius:8px;">`
            : `<div class="artikel-icon">${a.icon||'📦'}</div>`;
        return `<div class="artikel-tile" style="--tile-color:${catColor(a.kategorie_id)}" onclick="bucheArtikelDirekt(${a.artikel_id})">${content}<div class="artikel-name">${a.name_kurz||a.name}</div><div class="artikel-price">${Utils.formatCurrency(a.preis)}</div></div>`;
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
    <div class="form-group"><label class="form-label">Kategorie</label><select id="article-category" class="form-input"><option value="1">Alkoholfreie Getränke</option><option value="2">Biere</option><option value="3">Weine</option><option value="4">Schnäpse & Spirituosen</option><option value="5">Heiße Getränke</option><option value="6">Süßes & Salziges</option><option value="7">Sonstiges</option></select></div>
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
    <div class="form-group"><label class="form-label">Kategorie</label><select id="article-category" class="form-input">${[1,2,3,4,5,6,7].map(i => `<option value="${i}" ${a.kategorie_id===i?'selected':''}>${{1:'Alkoholfreie Getränke',2:'Biere',3:'Weine',4:'Schnäpse & Spirituosen',5:'Heiße Getränke',6:'Süßes & Salziges',7:'Sonstiges'}[i]}</option>`).join('')}</select></div>
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
    const iconMap = {1:'🥤',2:'🍺',3:'🍷',4:'🥃',5:'☕',6:'🍬',7:'📦'};
    document.getElementById('article-image-preview').innerHTML = iconMap[katId] || '📦';
    document.getElementById('article-image').value = '';
};

window.saveNewArticle = async () => {
    const name = document.getElementById('article-name')?.value;
    if (!name?.trim()) { Utils.showToast('Name erforderlich', 'warning'); return; }
    const katId = parseInt(document.getElementById('article-category')?.value) || 1;
    const katMap = {1:'Alkoholfreie Getränke',2:'Biere',3:'Weine',4:'Schnäpse & Spirituosen',5:'Heiße Getränke',6:'Süßes & Salziges',7:'Sonstiges'};
    const iconMap = {1:'🥤',2:'🍺',3:'🍷',4:'🥃',5:'☕',6:'🍬',7:'📦'};
    await Artikel.create({ 
        name: name.trim(), 
        name_kurz: document.getElementById('article-short')?.value?.trim() || name.trim().substring(0,15), 
        sku: document.getElementById('article-sku')?.value?.trim() || null, 
        preis: parseFloat(document.getElementById('article-price')?.value) || 0, 
        steuer_prozent: 10, 
        kategorie_id: katId, 
        kategorie_name: katMap[katId] || 'Sonstiges', 
        aktiv: document.getElementById('article-active')?.checked, 
        sortierung: parseInt(document.getElementById('article-sort')?.value) || 1, 
        icon: iconMap[katId] || '📦',
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
    const katMap = {1:'Alkoholfreie Getränke',2:'Biere',3:'Weine',4:'Schnäpse & Spirituosen',5:'Heiße Getränke',6:'Süßes & Salziges',7:'Sonstiges'};
    const iconMap = {1:'🥤',2:'🍺',3:'🍷',4:'🥃',5:'☕',6:'🍬',7:'📦'};
    
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
    console.log('🚀 Seollerhaus Kassa v3.0 (Supabase) startet...');
    
    // Supabase initialisieren
    const supabaseReady = initSupabase();
    if (supabaseReady) {
        console.log('✅ Supabase bereit - Multi-Device Modus');
        // Artikel von Supabase laden
        await Artikel.loadFromSupabase();
        // Pending Buchungen synchronisieren
        syncPendingData();
    } else {
        console.log('⚠️ Offline-Modus - Lokale Daten');
    }
    
    // Loading Screen ausblenden
    setTimeout(() => { 
        document.getElementById('loading-screen').style.display = 'none'; 
        document.getElementById('app').style.display = 'block'; 
    }, 1500);
    
    // Seed Artikel falls nötig
    await Artikel.seed();
    
    // Kategorien initialisieren (lokal)
    if (await db.kategorien.count() === 0) {
        await db.kategorien.bulkAdd([
            {kategorie_id:1, name:'Alkoholfreie Getränke', sortierung:10},
            {kategorie_id:2, name:'Biere', sortierung:20},
            {kategorie_id:3, name:'Weine', sortierung:30},
            {kategorie_id:4, name:'Schnäpse & Spirituosen', sortierung:40},
            {kategorie_id:5, name:'Heiße Getränke', sortierung:50},
            {kategorie_id:6, name:'Süßes & Salziges', sortierung:60},
            {kategorie_id:7, name:'Sonstiges', sortierung:70}
        ]);
    }
    
    // KEIN Auto-Login - immer zur Startseite
    // Supabase Session ausloggen damit frisch gestartet wird
    if (supabaseClient) {
        await supabaseClient.auth.signOut();
    }
    State.currentUser = null;
    Router.init();
    
    // Online-Status anzeigen
    if (!isOnline) {
        Utils.showToast('Offline-Modus aktiv', 'info');
    }
})();
