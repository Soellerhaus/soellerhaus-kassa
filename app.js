// ================================
// SEOLLERHAUS KASSA - MAIN APP v3.1
// FIXED: Direkt profiles/buchungen ohne Auth
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
                persistSession: false,
                autoRefreshToken: false,
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

// Version 5: Gruppen hinzufügen
db.version(5).stores({
    gaeste: 'gast_id, nachname, aktiv, zimmernummer, checked_out',
    buchungen: 'buchung_id, gast_id, datum, exportiert, sync_status, session_id, group_name, [gast_id+datum]',
    artikel: 'artikel_id, sku, kategorie_id, name, aktiv',
    kategorien: 'kategorie_id, name, sortierung',
    settings: 'key',
    exports: '++id, timestamp, anzahl_buchungen',
    registeredGuests: '++id, firstName, passwordHash, createdAt, lastLoginAt, group_name',
    fehlendeGetraenke: '++id, artikel_id, datum, erstellt_am, uebernommen',
    gruppen: '++id, name, aktiv'
});

// Version 6: Erweiterte Gästedaten (wie Access-Tabelle)
db.version(6).stores({
    gaeste: 'gast_id, nachname, aktiv, zimmernummer, checked_out',
    buchungen: 'buchung_id, gast_id, datum, exportiert, sync_status, session_id, group_name, [gast_id+datum]',
    artikel: 'artikel_id, sku, kategorie_id, name, aktiv',
    kategorien: 'kategorie_id, name, sortierung',
    settings: 'key',
    exports: '++id, timestamp, anzahl_buchungen',
    registeredGuests: '++id, visibleId, nachname, vorname, gruppennr, gruppenname, passwort, aktiv, ausnahmeumlage, createdAt, lastLoginAt, geloescht, geloeschtAm, group_name, firstName, passwordHash',
    fehlendeGetraenke: '++id, artikel_id, datum, erstellt_am, uebernommen',
    gruppen: '++id, name, aktiv'
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
            console.log('📄 Backup:', data.registeredGuests.length, 'Gäste,', data.artikel.length, 'Artikel');
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
    selectedGroup: null, // NEU: Ausgewählte Gruppe für aktuelle Session
    setUser(u) { 
        this.currentUser = u; 
        this.sessionId = Utils.uuid(); // Neue Session starten
        this.selectedGroup = u.group_name || null; // Gruppe aus User übernehmen
        localStorage.setItem('current_user_id', u.id || u.gast_id); 
        localStorage.setItem('current_user_type', u.id ? 'registered' : 'legacy'); 
        this.resetInactivityTimer(); 
    },
    clearUser() { 
        this.currentUser = null; 
        this.currentPin = ''; 
        this.sessionId = null;
        this.selectedGroup = null;
        localStorage.removeItem('current_user_id'); 
        localStorage.removeItem('current_user_type'); 
        this.clearInactivityTimer(); 
    },
    resetInactivityTimer() { this.clearInactivityTimer(); if (this.currentUser && !['login','register'].includes(this.currentPage)) { this.inactivityTimer = setTimeout(() => { Utils.showToast('Auto-Logout', 'info'); Auth.logout(); }, this.inactivityTimeout); } },
    clearInactivityTimer() { if (this.inactivityTimer) { clearTimeout(this.inactivityTimer); this.inactivityTimer = null; } }
};
window.State = State;

['click','touchstart','keydown','mousemove'].forEach(e => document.addEventListener(e, () => { if(State.currentUser) State.resetInactivityTimer(); }, {passive:true}));

// ============================================================
// REGISTEREDGUESTS - KORRIGIERT: Direkt in profiles schreiben!
// ============================================================
const RegisteredGuests = {
    // DIREKT in profiles Tabelle schreiben (OHNE Supabase Auth!)
    async register(firstName, password) {
        if (!firstName?.trim()) throw new Error('Name erforderlich');
        if (!password || password.length < 4) throw new Error('PIN muss mind. 4 Zeichen haben');
        
        // Name bereinigen und validieren
        const cleanName = firstName.trim().toUpperCase();
        
        // Nur Buchstaben, Leerzeichen und Bindestrich erlaubt
        if (!/^[A-ZÄÖÜ][A-ZÄÖÜ\s\-]*$/.test(cleanName)) {
            throw new Error('Name darf nur Buchstaben und Bindestriche enthalten!');
        }
        
        // Prüfen ob Name schon vergeben (lokal)
        const alleGaeste = await db.registeredGuests.toArray();
        const nameExists = alleGaeste.find(g => 
            ((g.nachname || g.firstName || '').toUpperCase() === cleanName) && !g.geloescht
        );
        if (nameExists) {
            throw new Error('Dieser Name ist bereits vergeben! Bitte wähle einen anderen.');
        }
        
        // Prüfen ob PIN schon vergeben (lokal)
        const pinExists = alleGaeste.find(g => 
            (g.passwort === password || g.passwordHash === password) && !g.geloescht
        );
        if (pinExists) {
            throw new Error('Diese PIN ist bereits vergeben! Bitte wähle eine andere.');
        }
        
        // UUID für den neuen Gast
        const guestId = Utils.uuid();
        const now = new Date().toISOString();
        
        // Profil-Daten für Supabase (passend zur profiles Tabelle)
        const profileData = {
            id: guestId,
            vorname: cleanName,
            first_name: cleanName,
            pin_hash: password,
            aktiv: true,
            geloescht: false,
            created_at: now,
            group_name: 'keiner Gruppe zugehörig'
        };
        
        // Lokale Daten
        const localGuest = { 
            id: guestId, 
            firstName: cleanName,
            nachname: cleanName,
            passwort: password,
            passwordHash: password,
            gruppenname: 'keiner Gruppe zugehörig',
            ausnahmeumlage: false,
            aktiv: true,
            createdAt: now,
            geloescht: false 
        };
        
        // ZUERST lokal speichern
        try { 
            await db.registeredGuests.add(localGuest); 
            console.log('✅ Lokal gespeichert:', cleanName);
        } catch(e) {
            console.error('❌ Lokales Speichern fehlgeschlagen:', e);
        }
        
        // DANN nach Supabase (wenn online)
        if (supabaseClient && isOnline) {
            try {
                console.log('📤 Sende Profil an Supabase:', profileData);
                const { data, error } = await supabaseClient
                    .from('profiles')
                    .insert(profileData)
                    .select();
                
                if (error) {
                    console.error('❌ Supabase profiles insert error:', error);
                    console.error('Error details:', JSON.stringify(error));
                    // Trotzdem weitermachen - lokal ist es gespeichert
                } else {
                    console.log('✅ Supabase profiles insert OK:', data);
                }
            } catch(e) {
                console.error('❌ Supabase Fehler:', e);
                // Trotzdem weitermachen - lokal ist es gespeichert
            }
        } else {
            console.log('⚠️ Offline - nur lokal gespeichert');
        }
        
        Utils.showToast('Registrierung erfolgreich!', 'success');
        State.setUser(localGuest);
        return localGuest;
    },
    
    // Login - funktioniert jetzt rein über profiles Tabelle
    async login(id, password) {
        // Zuerst lokal suchen
        let gast = await db.registeredGuests.get(id);
        
        // Wenn nicht lokal, von Supabase laden
        if (!gast && supabaseClient && isOnline) {
            try {
                const { data, error } = await supabaseClient
                    .from('profiles')
                    .select('*')
                    .eq('id', id)
                    .single();
                
                if (!error && data) {
                    gast = {
                        id: data.id,
                        firstName: data.vorname || data.first_name,
                        nachname: data.vorname || data.first_name,
                        passwort: data.pin_hash,
                        passwordHash: data.pin_hash,
                        gruppenname: data.group_name,
                        aktiv: data.aktiv,
                        geloescht: data.geloescht
                    };
                    // Lokal cachen
                    try { await db.registeredGuests.put(gast); } catch(e) {}
                }
            } catch(e) {
                console.error('Supabase login lookup error:', e);
            }
        }
        
        if (!gast) throw new Error('Gast nicht gefunden');
        if (gast.geloescht) throw new Error('Account deaktiviert');
        
        // Passwort-Check
        let passwortOk = false;
        if (gast.passwort === password) passwortOk = true;
        if (gast.passwordHash === password) passwortOk = true;
        
        if (!passwortOk) throw new Error('Falsches Passwort');
        
        // Last login updaten
        const now = new Date().toISOString();
        try { await db.registeredGuests.update(id, { lastLoginAt: now }); } catch(e) {}
        
        if (supabaseClient && isOnline) {
            try {
                await supabaseClient.from('profiles').update({ last_login_at: now }).eq('id', id);
            } catch(e) {}
        }
        
        const displayName = gast.nachname || gast.firstName;
        State.setUser({ ...gast, firstName: displayName });
        Utils.showToast(`Willkommen, ${displayName}!`, 'success');
        return gast;
    },
    
    async getByFirstLetter(letter) {
        // Erst lokale Daten prüfen (für schnelle Anzeige)
        const local = await db.registeredGuests.toArray();
        const localFiltered = local.filter(g => {
            if (g.geloescht) return false;
            const name = (g.nachname || g.firstName || '').toUpperCase();
            return name.startsWith(letter.toUpperCase());
        });
        
        // Wenn online, auch von Supabase laden
        if (supabaseClient && isOnline) {
            try {
                const { data, error } = await supabaseClient
                    .from('profiles')
                    .select('*')
                    .eq('geloescht', false)
                    .or(`vorname.ilike.${letter}%,first_name.ilike.${letter}%`)
                    .order('vorname');
                
                if (!error && data && data.length > 0) {
                    console.log('Profile von Supabase:', data.length);
                    // Cache aktualisieren
                    for (const p of data) {
                        try { 
                            await db.registeredGuests.put({ 
                                id: p.id, 
                                firstName: p.first_name || p.vorname, 
                                nachname: p.vorname || p.first_name,
                                passwort: p.pin_hash,
                                gruppenname: p.group_name,
                                geloescht: p.geloescht 
                            });
                        } catch(e) {}
                    }
                    
                    const cnt = {};
                    return data.map(g => {
                        const name = g.vorname || g.first_name;
                        cnt[name] = (cnt[name] || 0) + 1;
                        return { ...g, id: g.id, firstName: name, nachname: name, displayName: cnt[name] > 1 ? `${name} (${cnt[name]})` : name };
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
        return localFiltered.sort((a,b) => {
            const nameA = a.nachname || a.firstName || '';
            const nameB = b.nachname || b.firstName || '';
            return nameA.localeCompare(nameB);
        }).map(g => { 
            const name = g.nachname || g.firstName;
            cnt[name] = (cnt[name]||0)+1; 
            return {...g, firstName: name, displayName: cnt[name] > 1 ? `${name} (${cnt[name]})` : name}; 
        });
    },
    
    async getAll() { 
        if (supabaseClient && isOnline) {
            const { data } = await supabaseClient.from('profiles').select('*').eq('geloescht', false).order('vorname');
            return (data || []).map(g => ({ ...g, firstName: g.first_name || g.vorname }));
        }
        const all = await db.registeredGuests.toArray();
        return all.filter(g => !g.geloescht);
    },
    
    async getGeloeschte() {
        if (supabaseClient && isOnline) {
            const { data } = await supabaseClient.from('profiles').select('*').eq('geloescht', true);
            return (data || []).map(g => ({ ...g, firstName: g.first_name || g.vorname }));
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
        return RegisteredGuests.login(id, pin);
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
        State.clearUser(); 
        State.isAdmin = false; 
        Router.navigate('login'); 
        Utils.showToast('Abgemeldet', 'info'); 
    },
    async autoLogin() {
        return false; // Kein Auto-Login
    }
};

// ============================================================
// BUCHUNGEN - KORRIGIERT: exportiert=false sicherstellen!
// ============================================================
const Buchungen = {
    async create(artikel, menge=1) {
        if (!State.currentUser) throw new Error('Nicht angemeldet');
        const userId = State.currentUser.id || State.currentUser.gast_id;
        
        console.log('📝 Buchung erstellen für User:', userId);
        
        const b = {
            buchung_id: Utils.uuid(),
            user_id: userId,
            gast_id: String(userId),
            gast_vorname: State.currentUser.firstName || State.currentUser.first_name || State.currentUser.vorname || '',
            gast_nachname: State.currentUser.nachname || '',
            gastgruppe: State.currentUser.zimmernummer || '',
            group_name: State.selectedGroup || State.currentUser.group_name || '',
            artikel_id: artikel.artikel_id, 
            artikel_name: artikel.name, 
            preis: parseFloat(artikel.preis),
            steuer_prozent: artikel.steuer_prozent || 10, 
            menge: parseInt(menge),
            datum: Utils.formatDate(new Date()), 
            uhrzeit: Utils.formatTime(new Date()),
            erstellt_am: new Date().toISOString(), 
            exportiert: false,  // WICHTIG: Muss false sein für Import!
            aufgefuellt: false,
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
                console.log('📤 Sende Buchung an Supabase...');
                const { data, error } = await supabaseClient.from('buchungen').insert(b).select();
                if (error) {
                    console.error('❌ Supabase buchungen insert error:', error);
                    console.error('Error details:', JSON.stringify(error));
                    await db.buchungen.update(b.buchung_id, { sync_status: 'pending' });
                } else {
                    console.log('✅ Supabase buchungen insert OK:', data);
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
        const allBs = await db.buchungen.toArray();
        let b = allBs.find(x => x.buchung_id === buchung_id);
        
        if (!b && supabaseClient && isOnline) {
            const { data } = await supabaseClient.from('buchungen').select('*').eq('buchung_id', buchung_id).single();
            b = data;
        }
        
        if (!b) throw new Error('Buchung nicht gefunden');
        if (!State.isAdmin && b.fix) throw new Error('Buchung bereits abgeschlossen');
        
        const update = { storniert: true, storniert_am: new Date().toISOString() };
        
        try { await db.buchungen.update(buchung_id, update); } catch(e) {}
        
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
            if (supabaseClient && isOnline && userId) {
                await supabaseClient.rpc('fix_session_buchungen', {
                    p_session_id: State.sessionId,
                    p_user_id: userId
                });
            }
            
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
                for (const b of data) {
                    try { await db.buchungen.put({ ...b, gast_id: b.user_id }); } catch(e) {}
                }
                return data.map(b => ({ ...b, gast_id: b.user_id }));
            }
        }
        
        let r = await db.buchungen.where('gast_id').equals(id).reverse().toArray();
        r = r.filter(b => !b.storniert);
        return limit ? r.slice(0, limit) : r;
    },
    
    async getSessionBuchungen() {
        if (!State.sessionId) return [];
        
        try {
            const allBs = await db.buchungen.toArray();
            const r = allBs.filter(b => b.session_id === State.sessionId && !b.storniert);
            return r.reverse();
        } catch (e) {
            console.error('getSessionBuchungen error:', e);
            return [];
        }
    },
    
    async getAll(filter={}) {
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
                    for (const b of data) {
                        try { await db.buchungen.put({ ...b, gast_id: b.user_id }); } catch(e) {}
                    }
                    return data.map(b => ({ ...b, gast_id: b.user_id }));
                }
            } catch(e) {
                console.error('Buchungen.getAll error:', e);
            }
        }
        
        console.log('Buchungen von lokaler DB laden...');
        let r = await db.buchungen.toArray();
        if (filter.exportiert !== undefined) r = r.filter(b => b.exportiert === filter.exportiert);
        if (filter.datum) r = r.filter(b => b.datum === filter.datum);
        if (filter.includeStorniert !== true) r = r.filter(b => !b.storniert);
        console.log('Lokale Buchungen:', r.length);
        return r.reverse();
    },
    
    async getAuffuellliste() {
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
        
        for (const item of items) {
            await db.fehlendeGetraenke.add(item);
        }
        
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
        
        try { await db.fehlendeGetraenke.update(id, updateData); } catch(e) {}
        if (supabaseClient && isOnline) {
            await supabaseClient.from('fehlende_getraenke').update(updateData).eq('id', id);
        }
        
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

// ============ GRUPPEN-VERWALTUNG ============
const Gruppen = {
    async isAbfrageAktiv() {
        const setting = await db.settings.get('gruppenAbfrageAktiv');
        return setting?.value === true;
    },
    
    async setAbfrageAktiv(aktiv) {
        await db.settings.put({ key: 'gruppenAbfrageAktiv', value: aktiv });
        if (supabaseClient && isOnline) {
            await supabaseClient.from('settings').upsert({ 
                key: 'gruppenAbfrageAktiv', 
                value: aktiv 
            });
        }
    },
    
    async getAll() {
        if (supabaseClient && isOnline) {
            try {
                const { data } = await supabaseClient
                    .from('gruppen')
                    .select('*')
                    .eq('aktiv', true)
                    .order('id');
                if (data && data.length > 0) {
                    for (const g of data) {
                        try { await db.gruppen.put(g); } catch(e) {}
                    }
                    return data;
                }
            } catch(e) {
                console.error('Gruppen laden Fehler:', e);
            }
        }
        return await db.gruppen.where('aktiv').equals(1).toArray();
    },
    
    async add(name) {
        const alle = await this.getAll();
        if (alle.length >= 3) {
            throw new Error('Maximal 3 Gruppen erlaubt');
        }
        if (!name || name.trim() === '') {
            throw new Error('Gruppenname erforderlich');
        }
        
        const gruppe = {
            name: name.trim(),
            aktiv: true,
            erstellt_am: new Date().toISOString()
        };
        
        const id = await db.gruppen.add(gruppe);
        gruppe.id = id;
        
        if (supabaseClient && isOnline) {
            try {
                await supabaseClient.from('gruppen').insert(gruppe);
            } catch(e) {
                console.error('Gruppe sync error:', e);
            }
        }
        
        return gruppe;
    },
    
    async update(id, name) {
        if (!name || name.trim() === '') {
            throw new Error('Gruppenname erforderlich');
        }
        
        await db.gruppen.update(id, { name: name.trim() });
        
        if (supabaseClient && isOnline) {
            await supabaseClient.from('gruppen').update({ name: name.trim() }).eq('id', id);
        }
    },
    
    async delete(id) {
        await db.gruppen.update(id, { aktiv: false });
        
        if (supabaseClient && isOnline) {
            await supabaseClient.from('gruppen').update({ aktiv: false }).eq('id', id);
        }
    },
    
    async validateSettings() {
        const aktiv = await this.isAbfrageAktiv();
        if (aktiv) {
            const gruppen = await this.getAll();
            if (gruppen.length === 0) {
                return { valid: false, error: 'Gruppenabfrage ist aktiv, aber keine Gruppen hinterlegt!' };
            }
        }
        return { valid: true };
    }
};

// Umlage auf alle Gäste
const Umlage = {
    async bucheAufAlle(artikel_id, beschreibung = 'Umlage') {
        const artikel = await Artikel.getById(artikel_id);
        if (!artikel) throw new Error('Artikel nicht gefunden');
        
        const registrierte = await RegisteredGuests.getAll();
        const legacy = (await db.gaeste.toArray()).filter(g => g.aktiv && !g.checked_out);
        const alleGaeste = [...registrierte, ...legacy];
        
        if (alleGaeste.length === 0) throw new Error('Keine aktiven Gäste');
        
        const preisProGast = Math.ceil((artikel.preis / alleGaeste.length) * 100) / 100;
        
        const heute = Utils.formatDate(new Date());
        const uhrzeit = Utils.formatTime(new Date());
        
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
const ARTIKEL_CACHE_TTL = 60000;

const Artikel = {
    async loadFromSupabase() {
        if (!supabaseClient || !isOnline) return false;
        try {
            const { data, error } = await supabaseClient
                .from('artikel')
                .select('*')
                .order('sortierung');
            
            if (!error && data && data.length > 0) {
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
        let r = await db.artikel.toArray();
        
        if (r.length === 0 && supabaseClient && isOnline) {
            await this.loadFromSupabase();
            r = await db.artikel.toArray();
        }
        
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
        artikelCache = null;
        
        if (supabaseClient && isOnline) {
            await supabaseClient.from('artikel').insert(data);
        }
        
        await DataProtection.createBackup();
        Utils.showToast('Artikel erstellt', 'success');
        return data;
    },
    
    async update(id, changes) { 
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
        artikelCache = null;
        
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
        text = text.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n').replace(/\r/g,'\n').trim();
        const lines = text.split('\n').filter(l => l.trim());
        
        if (lines.length < 2) throw new Error('CSV ungültig');
        
        const firstLine = lines[0];
        const h = Utils.parseCSVLine(firstLine, ',').map(x => x.toLowerCase().trim().replace(/^"|"$/g,''));
        
        console.log('CSV Headers:', h);
        
        const idx = { 
            id: h.findIndex(x => x==='id'), 
            name: h.findIndex(x => x==='artikelname'), 
            kurz: h.findIndex(x => x==='artikelkurz'), 
            preis: h.findIndex(x => x==='preis'), 
            kat: h.findIndex(x => x==='warengruppe'),
            sort: h.findIndex(x => x==='artikelreihenfolge'),
            steuer: h.findIndex(x => x==='steuer')
        };
        
        if (idx.id < 0 || idx.name < 0 || idx.preis < 0) {
            throw new Error('CSV fehlt: ID, Artikelname oder Preis Spalte');
        }
        
        const katMap = {0:'Sonstiges',1:'Alkoholfreie Getränke',2:'Biere',3:'Weine',4:'Schnäpse & Spirituosen',5:'Heiße Getränke',6:'Süßes & Salziges',7:'Sonstiges',8:'Sonstiges'};
        const iconMap = {0:'📦',1:'🥤',2:'🍺',3:'🍷',4:'🥃',5:'☕',6:'🍬',7:'📦',8:'📦'};
        
        let imp=0, upd=0, skip=0;
        
        for (let i=1; i<lines.length; i++) {
            if (!lines[i].trim()) continue;
            
            const v = Utils.parseCSVLine(lines[i], ',');
            
            const id = parseInt(v[idx.id]?.replace(/"/g,''));
            if (!id || isNaN(id)) { skip++; continue; }
            
            let name = v[idx.name]?.replace(/^"|"$/g,'').trim();
            if (!name) { skip++; continue; }
            
            let preis = 0;
            if (idx.preis >= 0 && v[idx.preis]) {
                let preisStr = v[idx.preis].replace(/"/g, '').replace(/€/g, '').replace(/\s/g, '').trim();
                preis = parseFloat(preisStr.replace(',', '.')) || 0;
            }
            
            if (preis <= 0) { skip++; continue; }
            
            const warengruppeMigration = {1:1, 2:2, 3:3, 4:4, 5:5, 6:6, 7:6, 8:7};
            let csvWG = 7;
            if (idx.kat >= 0 && v[idx.kat] !== undefined) {
                csvWG = parseInt(v[idx.kat]?.replace(/"/g,'')) || 7;
            }
            let katId = warengruppeMigration[csvWG] || 7;
            
            let sort = 0;
            if (idx.sort >= 0 && v[idx.sort]) {
                sort = parseInt(v[idx.sort]?.replace(/"/g,'')) || 0;
            }
            
            let steuer = 10;
            if (idx.steuer >= 0 && v[idx.steuer]) {
                steuer = parseInt(v[idx.steuer]?.replace(/"/g,'')) || 10;
            }
            
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
                    skip++;
                }
            }
        }
        
        artikelCache = null;
        
        if (supabaseClient && isOnline) {
            try {
                const allArtikel = await db.artikel.toArray();
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
    
    async exportAlleBuchungenExcel() {
        let bs = [];
        if (supabaseClient && isOnline) {
            const { data } = await supabaseClient
                .from('buchungen')
                .select('*')
                .eq('storniert', false)
                .order('erstellt_am', { ascending: false });
            if (data) bs = data;
        }
        
        if (bs.length === 0) {
            bs = await db.buchungen.toArray();
            bs = bs.filter(b => !b.storniert);
        }
        
        if (!bs.length) { 
            Utils.showToast('Keine Buchungen gefunden', 'warning'); 
            return; 
        }
        
        await this._exportToAccessFormat(bs, 'Buchenungsdetail_ALLE');
    },
    
    async exportBuchungenExcel() {
        const bs = await Buchungen.getAll({ exportiert: false });
        if (!bs.length) { Utils.showToast('Keine neuen Buchungen', 'warning'); return; }
        
        await this._exportToAccessFormat(bs, 'Buchenungsdetail');
        await Buchungen.markAsExported(bs.map(b => b.buchung_id));
    },
    
    async _exportToAccessFormat(bs, filenamePrefix) {
        const artikelCache = {};
        const allArt = await db.artikel.toArray();
        allArt.forEach(a => { artikelCache[a.artikel_id] = a; });
        
        let lastId = parseInt(localStorage.getItem('lastExportId') || '20037');
        
        const formatDatumForAccess = (datum) => {
            if (!datum) return '';
            if (datum.match(/^\d{4}-\d{2}-\d{2}/)) return datum.substring(0, 10);
            const parts = datum.split('.');
            if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
            return datum;
        };
        
        const rows = bs.map(b => {
            lastId++;
            const artikel = artikelCache[b.artikel_id];
            
            let gastIdNum = 0;
            if (b.gast_id) {
                const numMatch = String(b.gast_id).match(/\d+/);
                gastIdNum = numMatch ? parseInt(numMatch[0]) : Math.abs(String(b.gast_id).split('').reduce((a,c) => a + c.charCodeAt(0), 0));
            }
            
            return {
                'ID': lastId,
                'Artikelnr': parseInt(b.artikel_id) || 0,
                'Artikel': b.artikel_name || '',
                'Preis': parseFloat(b.preis) || 0,
                'Datum': formatDatumForAccess(b.datum),
                'Uhrzeit': b.uhrzeit || '',
                'Gastid': gastIdNum,
                'Gastname': b.gast_vorname || '',
                'Gastvorname': '',
                'Gastgruppe': b.group_name || b.gastgruppe || 'keiner Gruppe zugehörig',
                'Gastgruppennr': 0,
                'bezahlt': false,
                'Steuer': parseInt(b.steuer_prozent) || 10,
                'Anzahl': parseInt(b.menge) || 1,
                'Rechdatum': '',
                'Rechnummer': 0,
                'ZNummer': 0,
                'Warengruppe': parseInt(artikel?.kategorie_id) || 1,
                'Bar': false,
                'Unbar': false,
                'Artikelreihenfolge': parseInt(artikel?.sortierung) || 0,
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
        
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows);
        
        ws['!cols'] = [
            {wch: 8}, {wch: 10}, {wch: 25}, {wch: 8}, {wch: 12}, {wch: 10},
            {wch: 8}, {wch: 15}, {wch: 15}, {wch: 25}, {wch: 12}, {wch: 8},
            {wch: 8}, {wch: 8}, {wch: 12}, {wch: 10}, {wch: 8}, {wch: 10},
            {wch: 6}, {wch: 6}, {wch: 15}, {wch: 12}, {wch: 15}, {wch: 8},
            {wch: 8}, {wch: 8}, {wch: 12}, {wch: 12}, {wch: 12}, {wch: 12}
        ];
        
        XLSX.utils.book_append_sheet(wb, ws, 'Buchenungsdetail');
        
        const heute = new Date();
        const datumStr = `${heute.getDate().toString().padStart(2,'0')}-${(heute.getMonth()+1).toString().padStart(2,'0')}-${heute.getFullYear()}`;
        XLSX.writeFile(wb, `${filenamePrefix}_${datumStr}.xlsx`);
        
        localStorage.setItem('lastExportId', lastId.toString());
        Utils.showToast(`${bs.length} Buchungen exportiert (letzte ID: ${lastId})`, 'success');
    },
    
    setLastExportId(id) {
        localStorage.setItem('lastExportId', id.toString());
    },
    
    getLastExportId() {
        return parseInt(localStorage.getItem('lastExportId') || '20037');
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
            <button class="btn btn-primary btn-block" onclick="handleRegisterSubmit()" style="margin-top:24px;">✔ Registrieren</button>
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
            <button class="btn btn-primary btn-block" onclick="handlePinLogin()" style="margin-top:16px;">✔ Anmelden</button>
        </div>
        <button class="btn btn-secondary btn-block mt-3" onclick="handlePinCancel()">← Zurück</button>
    </div></div>`);
});

window.handleLoginPinInput = (d) => {
    if (window.loginPin.length < 4) {
        window.loginPin += d;
        updateLoginPinDisplay();
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
        await navigateAfterLogin();
    } catch (e) {
        Utils.showToast(e.message, 'error');
        window.loginPin = '';
        updateLoginPinDisplay();
    }
};

window.navigateAfterLogin = async () => {
    const gruppenAktiv = await Gruppen.isAbfrageAktiv();
    
    if (gruppenAktiv && !State.selectedGroup) {
        Router.navigate('gruppe-waehlen');
    } else {
        Router.navigate('buchen');
    }
};

Router.register('gruppe-waehlen', async () => {
    if (!State.currentUser) { Router.navigate('login'); return; }
    
    const gruppen = await Gruppen.getAll();
    const name = State.currentUser.firstName || State.currentUser.vorname;
    
    UI.render(`<div class="app-header"><div class="header-left"><div class="header-title">🏫 Gruppe wählen</div></div><div class="header-right"><button class="btn btn-secondary" onclick="Auth.logout()">Abbrechen</button></div></div>
    <div class="main-content">
        <div class="card mb-3" style="background:var(--color-alpine-green);color:white;">
            <div style="padding:20px;text-align:center;">
                <div style="font-size:1.2rem;">Hallo <strong>${name}</strong>!</div>
                <div style="margin-top:8px;opacity:0.9;">Bitte wähle deine Gruppe:</div>
            </div>
        </div>
        
        <div style="display:flex;flex-direction:column;gap:16px;">
            ${gruppen.map(g => `
                <button class="btn btn-primary" onclick="selectGruppe(${g.id}, '${g.name}')" style="padding:24px;font-size:1.3rem;">
                    🏫 ${g.name}
                </button>
            `).join('')}
        </div>
        
        <p style="text-align:center;margin-top:24px;color:#888;font-size:0.9rem;">
            Die Gruppe wird für alle deine Buchungen gespeichert.
        </p>
    </div>`);
});

window.selectGruppe = async (gruppeId, gruppeName) => {
    State.selectedGroup = gruppeName;
    
    if (State.currentUser) {
        State.currentUser.group_name = gruppeName;
        
        if (State.currentUser.id) {
            try {
                await db.registeredGuests.update(State.currentUser.id, { group_name: gruppeName });
                if (supabaseClient && isOnline) {
                    await supabaseClient.from('profiles').update({ group_name: gruppeName }).eq('id', State.currentUser.id);
                }
            } catch(e) {
                console.error('Gruppe speichern Fehler:', e);
            }
        }
    }
    
    Utils.showToast(`Gruppe: ${gruppeName}`, 'success');
    Router.navigate('buchen');
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
        
        <button class="btn btn-primary btn-block" onclick="Router.navigate('admin-auffuellliste')" style="padding:20px;font-size:1.2rem;margin-bottom:12px;">
            🍺 Auffüllliste drucken<br>
            <small style="opacity:0.9;">(${auffuellAnzahl} Getränke zum Auffüllen)</small>
        </button>
        
        ${nichtExp.length ? `
        <button class="btn btn-block" onclick="handleExportExcel()" style="padding:20px;font-size:1.2rem;margin-bottom:12px;background:linear-gradient(135deg, #217346, #1e6b3d);color:white;border:none;">
            📊 EXCEL für Registrierkasse<br>
            <small style="opacity:0.9;">(${nichtExp.length} Buchungen exportieren)</small>
        </button>
        ` : ''}
        
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
            <button class="btn btn-primary" onclick="Router.navigate('admin-gruppen')" style="padding:24px;">🏫 Gruppenverwaltung</button>
        </div>
        
        <div class="card">
            <div class="card-header"><h2 class="card-title">📄 Daten-Management</h2></div>
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
                </div>
            </div>
        </div>
    </div>`);
});

// Kurze Version der restlichen Routes (gekürzt wegen Länge)
Router.register('dashboard', async () => { Router.navigate('buchen'); });

Router.register('buchen', async () => {
    if (!State.currentUser) { Router.navigate('login'); return; }
    
    const gruppenAktiv = await Gruppen.isAbfrageAktiv();
    if (gruppenAktiv && !State.selectedGroup) {
        Router.navigate('gruppe-waehlen');
        return;
    }
    
    const kats = await db.kategorien.toArray();
    const arts = await Artikel.getAll({ aktiv: true });
    const name = State.currentUser.firstName || State.currentUser.vorname;
    const gastId = State.currentUser.id || State.currentUser.gast_id;
    
    if (State.selectedCategory === null) State.selectedCategory = 1;
    
    const filtered = State.selectedCategory === 'alle' ? arts : arts.filter(a => a.kategorie_id === State.selectedCategory);
    const sessionBuchungen = await Buchungen.getSessionBuchungen();
    const sessionTotal = sessionBuchungen.reduce((s,b) => s + b.preis * b.menge, 0);
    
    const catColor = (id) => ({1:'#FF6B6B',2:'#FFD93D',3:'#95E1D3',4:'#AA4465',5:'#F38181',6:'#6C5B7B',7:'#4A5859'})[id] || '#2C5F7C';
    
    const renderTileContent = (a) => {
        if (a.bild && a.bild.startsWith('data:')) {
            return `<img src="${a.bild}" style="width:64px;height:64px;object-fit:cover;border-radius:8px;">`;
        }
        return `<div class="artikel-icon">${a.icon||'📦'}</div>`;
    };
    
    UI.render(`
    <div class="app-header">
        <div class="header-left">
            <div class="header-title">👤 ${name}</div>
            ${State.selectedGroup ? `<div style="font-size:0.8rem;opacity:0.8;">🏫 ${State.selectedGroup}</div>` : ''}
        </div>
        <div class="header-right"><button class="btn btn-secondary" onclick="handleGastAbmelden()">Abmelden</button></div>
    </div>
    <div class="main-content" style="padding-bottom:${sessionBuchungen.length ? '180px' : '20px'};">
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
                <button class="btn btn-primary" onclick="handleGastAbmelden()" style="flex:1;padding:14px;font-size:1rem;">✔ Fertig & Abmelden</button>
            </div>
        </div>
    </div>
    ` : ''}`);
});

// Global handlers
window.handleRegisterClick = () => Router.navigate('register');
window.handleAdminClick = () => Router.navigate('admin-login');
window.handleBackToLogin = () => Router.navigate('login');
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
        setTimeout(async () => await navigateAfterLogin(), 500); 
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
window.handleExportExcel = async () => { await ExportService.exportBuchungenExcel(); Router.navigate('admin-dashboard'); };

window.filterCategory = id => { State.selectedCategory = id; Router.navigate('buchen'); };

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

window.handleGastAbmelden = async () => {
    await Buchungen.fixSessionBuchungen();
    State.clearUser();
    Router.navigate('login');
    Utils.showToast('Auf Wiedersehen!', 'success');
};

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

// Admin Routes (gekürzt - nur die wichtigsten)
Router.register('admin-guests', async () => {
    if (!State.isAdmin) { Router.navigate('admin-login'); return; }
    let guests = await db.registeredGuests.toArray();
    guests = guests.filter(g => !g.geloescht);
    
    UI.render(`<div class="app-header"><div class="header-left"><button class="menu-btn" onclick="Router.navigate('admin-dashboard')">←</button><div class="header-title">👥 Gästeverwaltung</div></div><div class="header-right"><button class="btn btn-secondary" onclick="handleLogout()">Abmelden</button></div></div>
    <div class="main-content">
        <div class="card">
            <div class="card-header"><h2>Aktive Gäste (${guests.length})</h2></div>
            <div style="overflow-x:auto;">
                <table style="width:100%;border-collapse:collapse;">
                    <thead><tr style="background:#fffde7;"><th style="padding:10px;text-align:left;">Name</th><th style="padding:10px;">PIN</th><th style="padding:10px;">Aktion</th></tr></thead>
                    <tbody>
                        ${guests.map(g => `<tr style="border-bottom:1px solid #ddd;"><td style="padding:10px;font-weight:600;">${g.nachname||g.firstName}</td><td style="padding:10px;text-align:center;font-family:monospace;font-size:1.2rem;">${g.passwort||g.passwordHash||'-'}</td><td style="padding:10px;text-align:center;"><button class="btn btn-danger" onclick="handleDeleteGast('${g.id}')" style="padding:6px 10px;">🗑️</button></td></tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    </div>`);
});

window.handleDeleteGast = async (id) => {
    if (!confirm('Gast wirklich löschen?')) return;
    await RegisteredGuests.softDelete(id);
    Router.navigate('admin-guests');
};

Router.register('admin-articles', async () => {
    if (!State.isAdmin) { Router.navigate('admin-login'); return; }
    const articles = await Artikel.getAll();
    
    UI.render(`<div class="app-header"><div class="header-left"><button class="menu-btn" onclick="Router.navigate('admin-dashboard')">←</button><div class="header-title">📦 Artikelverwaltung</div></div><div class="header-right"><button class="btn btn-secondary" onclick="handleLogout()">Abmelden</button></div></div>
    <div class="main-content">
        <div class="card mb-3">
            <div class="card-header"><h2>CSV Import</h2></div>
            <div class="card-body">
                <input type="file" id="artikel-import" accept=".csv" style="display:none" onchange="handleArtikelImport(event)">
                <button class="btn btn-primary" onclick="document.getElementById('artikel-import').click()">📄 CSV auswählen</button>
            </div>
        </div>
        <div class="card">
            <div class="card-header"><h2>Artikel (${articles.length})</h2></div>
            <div style="max-height:400px;overflow-y:auto;">
                ${articles.map(a => `<div style="display:flex;justify-content:space-between;padding:10px;border-bottom:1px solid #eee;"><div><strong>${a.name}</strong> - ${Utils.formatCurrency(a.preis)}</div></div>`).join('')}
            </div>
        </div>
    </div>`);
});

window.handleArtikelImport = async e => { 
    const f = e.target.files[0]; 
    if(!f) return; 
    try { 
        await Artikel.importFromCSV(await f.text()); 
        Router.navigate('admin-articles'); 
    } catch(er) {
        Utils.showToast('Import Fehler: ' + er.message, 'error');
    } 
    e.target.value = ''; 
};

Router.register('admin-gruppen', async () => {
    if (!State.isAdmin) { Router.navigate('admin-login'); return; }
    const gruppen = await Gruppen.getAll();
    
    UI.render(`<div class="app-header"><div class="header-left"><button class="menu-btn" onclick="Router.navigate('admin-dashboard')">←</button><div class="header-title">🏫 Gruppen</div></div></div>
    <div class="main-content">
        <div class="card">
            <div class="card-header"><h2>Gruppen (${gruppen.length}/3)</h2></div>
            <div class="card-body">
                ${gruppen.map(g => `<div style="padding:12px;background:#f5f5f5;border-radius:8px;margin-bottom:8px;">${g.name}</div>`).join('')}
                ${gruppen.length < 3 ? `<button class="btn btn-primary" onclick="addGruppe()">+ Neue Gruppe</button>` : ''}
            </div>
        </div>
    </div>`);
});

window.addGruppe = async () => {
    const name = prompt('Gruppenname:');
    if (name?.trim()) {
        await Gruppen.add(name.trim());
        Router.navigate('admin-gruppen');
    }
};

Router.register('admin-auffuellliste', async () => {
    if (!State.isAdmin) { Router.navigate('admin-login'); return; }
    const liste = await Buchungen.getAuffuellliste();
    const total = liste.reduce((s, i) => s + i.menge, 0);
    
    UI.render(`<div class="app-header"><div class="header-left"><button class="menu-btn" onclick="Router.navigate('admin-dashboard')">←</button><div class="header-title">🍺 Auffüllliste</div></div></div>
    <div class="main-content">
        <div class="card" style="background:var(--color-alpine-green);color:white;margin-bottom:20px;">
            <div style="padding:20px;text-align:center;"><div style="font-size:2rem;font-weight:700;">${total} Getränke</div></div>
        </div>
        ${liste.map(i => `<div style="display:flex;justify-content:space-between;padding:12px;background:#f5f5f5;border-radius:8px;margin-bottom:8px;"><span>${i.name}</span><strong>${i.menge}×</strong></div>`).join('')}
    </div>`);
});

Router.register('admin-alle-buchungen', async () => {
    if (!State.isAdmin) { Router.navigate('admin-login'); return; }
    const bs = await Buchungen.getAll({ includeStorniert: true });
    
    UI.render(`<div class="app-header"><div class="header-left"><button class="menu-btn" onclick="Router.navigate('admin-dashboard')">←</button><div class="header-title">📋 Alle Buchungen</div></div></div>
    <div class="main-content">
        <div class="card" style="background:var(--color-alpine-green);color:white;margin-bottom:20px;">
            <div style="padding:16px;text-align:center;"><div style="font-size:1.5rem;font-weight:700;">${bs.length} Buchungen</div></div>
        </div>
        <div style="max-height:500px;overflow-y:auto;">
            ${bs.slice(0,50).map(b => `<div style="display:flex;justify-content:space-between;padding:10px;border-bottom:1px solid #eee;${b.storniert?'opacity:0.5;text-decoration:line-through;':''}"><div><strong>${b.gast_vorname}</strong>: ${b.artikel_name}</div><div>${Utils.formatCurrency(b.preis)}</div></div>`).join('')}
        </div>
    </div>`);
});

Router.register('admin-fehlende', async () => {
    if (!State.isAdmin) { Router.navigate('admin-login'); return; }
    UI.render(`<div class="app-header"><div class="header-left"><button class="menu-btn" onclick="Router.navigate('admin-dashboard')">←</button><div class="header-title">⚠️ Fehlende</div></div></div><div class="main-content"><p>Fehlende Getränke Verwaltung</p></div>`);
});

Router.register('admin-umlage', async () => {
    if (!State.isAdmin) { Router.navigate('admin-login'); return; }
    UI.render(`<div class="app-header"><div class="header-left"><button class="menu-btn" onclick="Router.navigate('admin-dashboard')">←</button><div class="header-title">💰 Umlage</div></div></div><div class="main-content"><p>Umlage Verwaltung</p></div>`);
});

// PIN-Dots Style
if (!document.getElementById('table-styles')) {
    const style = document.createElement('style');
    style.id = 'table-styles';
    style.textContent = `.pin-dot { width: 20px; height: 20px; border-radius: 50%; border: 3px solid var(--color-alpine-green); background: white; transition: all 0.2s; } .pin-dot.filled { background: var(--color-alpine-green); }`;
    document.head.appendChild(style);
}

// Init
(async function initApp() {
    console.log('🚀 Seollerhaus Kassa v3.1 (FIXED) startet...');
    
    const supabaseReady = initSupabase();
    if (supabaseReady) {
        console.log('✅ Supabase bereit');
        await Artikel.loadFromSupabase();
        syncPendingData();
    }
    
    setTimeout(() => { 
        document.getElementById('loading-screen').style.display = 'none'; 
        document.getElementById('app').style.display = 'block'; 
    }, 1500);
    
    await Artikel.seed();
    
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
    
    State.currentUser = null;
    Router.init();
    
    if (!isOnline) {
        Utils.showToast('Offline-Modus aktiv', 'info');
    }
})();
