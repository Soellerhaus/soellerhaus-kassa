// ================================
// SEOLLERHAUS KASSA - MAIN APP v3.4
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
    console.warn('⚠Supabase nicht verfügbar - Offline-Modus');
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
    gäste: 'gast_id, nachname, aktiv, zimmernummer, checked_out',
    buchungen: 'buchung_id, gast_id, datum, exportiert, sync_status, [gast_id+datum]',
    artikel: 'artikel_id, kategorie_id, name, aktiv',
    kategorien: 'kategorie_id, name, sortierung',
    settings: 'key',
    exports: '++id, timestamp, anzahl_buchungen'
});

db.version(2).stores({
    gäste: 'gast_id, nachname, aktiv, zimmernummer, checked_out',
    buchungen: 'buchung_id, gast_id, datum, exportiert, sync_status, [gast_id+datum]',
    artikel: 'artikel_id, sku, kategorie_id, name, aktiv',
    kategorien: 'kategorie_id, name, sortierung',
    settings: 'key',
    exports: '++id, timestamp, anzahl_buchungen',
    registeredGuests: '++id, firstName, passwordHash, createdAt, lastLoginAt'
});

db.version(3).stores({
    gäste: 'gast_id, nachname, aktiv, zimmernummer, checked_out',
    buchungen: 'buchung_id, gast_id, datum, exportiert, sync_status, session_id, [gast_id+datum]',
    artikel: 'artikel_id, sku, kategorie_id, name, aktiv',
    kategorien: 'kategorie_id, name, sortierung',
    settings: 'key',
    exports: '++id, timestamp, anzahl_buchungen',
    registeredGuests: '++id, firstName, passwordHash, createdAt, lastLoginAt'
});

db.version(4).stores({
    gäste: 'gast_id, nachname, aktiv, zimmernummer, checked_out',
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
    gäste: 'gast_id, nachname, aktiv, zimmernummer, checked_out',
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
    gäste: 'gast_id, nachname, aktiv, zimmernummer, checked_out',
    buchungen: 'buchung_id, gast_id, datum, exportiert, sync_status, session_id, group_name, [gast_id+datum]',
    artikel: 'artikel_id, sku, kategorie_id, name, aktiv',
    kategorien: 'kategorie_id, name, sortierung',
    settings: 'key',
    exports: '++id, timestamp, anzahl_buchungen',
    registeredGuests: '++id, visibleId, nachname, vorname, gruppennr, gruppenname, passwort, aktiv, ausnahmeumlage, createdAt, lastLoginAt, gelöscht, gelöschtAm, group_name, firstName, passwordHash',
    fehlendeGetraenke: '++id, artikel_id, datum, erstellt_am, uebernommen',
    gruppen: '++id, name, aktiv'
});

// Version 7: Gäste-Nachrichten hinzufügen
db.version(7).stores({
    gäste: 'gast_id, nachname, aktiv, zimmernummer, checked_out',
    buchungen: 'buchung_id, gast_id, datum, exportiert, sync_status, session_id, group_name, [gast_id+datum]',
    artikel: 'artikel_id, sku, kategorie_id, name, aktiv',
    kategorien: 'kategorie_id, name, sortierung',
    settings: 'key',
    exports: '++id, timestamp, anzahl_buchungen',
    registeredGuests: '++id, visibleId, nachname, vorname, gruppennr, gruppenname, passwort, aktiv, ausnahmeumlage, createdAt, lastLoginAt, gelöscht, gelöschtAm, group_name, firstName, passwordHash',
    fehlendeGetraenke: '++id, artikel_id, datum, erstellt_am, uebernommen',
    gruppen: '++id, name, aktiv',
    gastNachrichten: '++id, gast_id, nachricht, erstellt_am, gueltig_bis, gelesen, erledigt'
});

// Version 8: Dual-Pricing (HP / Selbstversorger)
db.version(8).stores({
    gäste: 'gast_id, nachname, aktiv, zimmernummer, checked_out',
    buchungen: 'buchung_id, gast_id, datum, exportiert, sync_status, session_id, group_name, [gast_id+datum]',
    artikel: 'artikel_id, sku, kategorie_id, name, aktiv',
    kategorien: 'kategorie_id, name, sortierung',
    settings: 'key',
    exports: '++id, timestamp, anzahl_buchungen',
    registeredGuests: '++id, visibleId, nachname, vorname, gruppennr, gruppenname, passwort, aktiv, ausnahmeumlage, createdAt, lastLoginAt, gelöscht, gelöschtAm, group_name, firstName, passwordHash',
    fehlendeGetraenke: '++id, artikel_id, datum, erstellt_am, uebernommen',
    gruppen: '++id, name, aktiv',
    gastNachrichten: '++id, gast_id, nachricht, erstellt_am, gueltig_bis, gelesen, erledigt'
});

// Version 9: Schema-Fix
db.version(9).stores({
    gäste: 'gast_id, nachname, aktiv, zimmernummer, checked_out',
    buchungen: 'buchung_id, gast_id, datum, exportiert, sync_status, session_id, group_name, [gast_id+datum]',
    artikel: 'artikel_id, sku, kategorie_id, name, aktiv',
    kategorien: 'kategorie_id, name, sortierung',
    settings: 'key',
    exports: '++id, timestamp, anzahl_buchungen',
    registeredGuests: '++id, visibleId, nachname, vorname, gruppennr, gruppenname, passwort, aktiv, ausnahmeumlage, createdAt, lastLoginAt, gelöscht, gelöschtAm, group_name, firstName, passwordHash',
    fehlendeGetraenke: '++id, artikel_id, datum, erstellt_am, uebernommen',
    gruppen: '++id, name, aktiv',
    gastNachrichten: '++id, gast_id, nachricht, erstellt_am, gueltig_bis, gelesen, erledigt'
});

// Version 10 - Force rebuild
db.version(10).stores({
    gäste: 'gast_id, nachname, aktiv, zimmernummer, checked_out',
    buchungen: 'buchung_id, gast_id, datum, exportiert, sync_status, session_id, group_name, [gast_id+datum]',
    artikel: 'artikel_id, sku, kategorie_id, name, aktiv',
    kategorien: 'kategorie_id, name, sortierung',
    settings: 'key',
    exports: '++id, timestamp, anzahl_buchungen',
    registeredGuests: '++id, visibleId, nachname, vorname, gruppennr, gruppenname, passwort, aktiv, ausnahmeumlage, createdAt, lastLoginAt, gelöscht, gelöschtAm, group_name, firstName, passwordHash',
    fehlendeGetraenke: '++id, artikel_id, datum, erstellt_am, uebernommen',
    gruppen: '++id, name, aktiv',
    gastNachrichten: '++id, gast_id, nachricht, erstellt_am, gueltig_bis, gelesen, erledigt'
});

const DataProtection = {
    async createBackup() {
        try {
            const data = {
                gäste: await db.gäste.toArray(),
                buchungen: await db.buchungen.toArray(),
                registeredGuests: await db.registeredGuests.toArray(),
                artikel: await db.artikel.toArray(),
                fehlendeGetraenke: await db.fehlendeGetraenke.toArray(),
                timestamp: Date.now(),
                version: '2.0'
            };
            localStorage.setItem('kassa_backup', JSON.stringify(data));
            console.log(' Backup:', data.registeredGuests.length, 'Gäste,', data.artikel.length, 'Artikel');
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
    
    // Letztes Backup-Datum abrufen
    getLastBackupDate() {
        const timestamp = localStorage.getItem('last_full_backup');
        return timestamp ? new Date(parseInt(timestamp)) : null;
    },
    
    // Backup-Datum setzen
    setLastBackupDate() {
        localStorage.setItem('last_full_backup', Date.now().toString());
    },
    
    // Prüfen ob Backup nötig (>24h)
    isBackupNeeded() {
        const lastBackup = this.getLastBackupDate();
        if (!lastBackup) return true;
        const hoursSinceBackup = (Date.now() - lastBackup.getTime()) / (1000 * 60 * 60);
        return hoursSinceBackup >= 24;
    },
    
    // Formatiertes Datum des letzten Backups
    getLastBackupText() {
        const lastBackup = this.getLastBackupDate();
        if (!lastBackup) return 'Noch nie';
        
        const now = new Date();
        const diff = now - lastBackup;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);
        
        if (days > 0) {
            return `Vor ${days} Tag${days > 1 ? 'en' : ''} (${lastBackup.toLocaleDateString('de-AT')}, ${lastBackup.toLocaleTimeString('de-AT', {hour:'2-digit', minute:'2-digit'})})`;
        } else if (hours > 0) {
            return `Vor ${hours} Stunde${hours > 1 ? 'n' : ''} (${lastBackup.toLocaleTimeString('de-AT', {hour:'2-digit', minute:'2-digit'})})`;
        } else {
            return `Gerade eben`;
        }
    },
    
    // Vollständiges Backup mit Supabase-Daten
    async createFullBackup() {
        try {
            // Lokale Daten
            let data = {
                gäste: await db.gäste.toArray(),
                buchungen: await db.buchungen.toArray(),
                registeredGuests: await db.registeredGuests.toArray(),
                artikel: await db.artikel.toArray(),
                kategorien: await db.kategorien.toArray(),
                fehlendeGetraenke: await db.fehlendeGetraenke.toArray(),
                gruppen: await db.gruppen.toArray(),
                settings: await db.settings.toArray(),
                exportDatum: new Date().toISOString(),
                version: '3.0',
                quelle: 'lokal'
            };
            
            // Wenn online, Supabase-Daten hinzufügen
            if (supabaseClient && isOnline) {
                try {
                    const [profiles, buchungen, artikel, fehlende] = await Promise.all([
                        supabaseClient.from('profiles').select('*'),
                        supabaseClient.from('buchungen').select('*'),
                        supabaseClient.from('artikel').select('*'),
                        supabaseClient.from('fehlende_getraenke').select('*')
                    ]);
                    
                    data.supabase = {
                        profiles: profiles.data || [],
                        buchungen: buchungen.data || [],
                        artikel: artikel.data || [],
                        fehlende_getraenke: fehlende.data || []
                    };
                    data.quelle = 'lokal+supabase';
                    console.log('✅ Supabase-Daten im Backup:', {
                        profiles: data.supabase.profiles.length,
                        buchungen: data.supabase.buchungen.length,
                        artikel: data.supabase.artikel.length
                    });
                } catch(e) {
                    console.warn('Supabase-Daten konnten nicht geladen werden:', e);
                }
            }
            
            // Statistiken hinzufügen
            data.statistik = {
                anzahlGäste: data.registeredGuests.filter(g => !g.gelöscht).length,
                anzahlArtikel: data.artikel.filter(a => a.aktiv).length,
                anzahlBuchungen: data.buchungen.filter(b => !b.storniert).length,
                gesamtUmsatz: data.buchungen.filter(b => !b.storniert).reduce((s,b) => s + (b.preis * b.menge), 0)
            };
            
            // JSON erstellen und herunterladen
            const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            
            const heute = new Date();
            const datumStr = `${heute.getFullYear()}-${(heute.getMonth()+1).toString().padStart(2,'0')}-${heute.getDate().toString().padStart(2,'0')}`;
            a.download = `Söllerhaus_Backup_${datumStr}.json`;
            a.click();
            
            // Backup-Datum speichern
            this.setLastBackupDate();
            
            Utils.showToast(`✅ Vollständiges Backup erstellt!\n${data.statistik.anzahlGäste} Gäste, ${data.statistik.anzahlArtikel} Artikel, ${data.statistik.anzahlBuchungen} Buchungen`, 'success');
            return true;
        } catch (e) {
            console.error('Backup Fehler:', e);
            Utils.showToast('Backup fehlgeschlagen: ' + e.message, 'error');
            return false;
        }
    },
    
    // Backup-Erinnerung Modal anzeigen
    showBackupReminder() {
        const lastBackupText = this.getLastBackupText();
        
        const modal = document.createElement('div');
        modal.id = 'backup-reminder-modal';
        modal.innerHTML = `
            <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;">
                <div style="background:white;border-radius:16px;padding:24px;max-width:450px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
                    <div style="text-align:center;margin-bottom:20px;">
                        <div style="font-size:4rem;margin-bottom:12px;"></div>
                        <h2 style="color:#2C5F7C;margin-bottom:8px;">Backup empfohlen</h2>
                        <p style="color:#666;font-size:0.95rem;">Ihr letztes Backup ist aelter als 24 Stunden.</p>
                    </div>
                    
                    <div style="background:#f8f9fa;border-radius:12px;padding:16px;margin-bottom:20px;">
                        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                            <span style="color:#666;">Letztes Backup:</span>
                            <span style="font-weight:600;">${lastBackupText}</span>
                        </div>
                        <div style="font-size:0.85rem;color:#888;margin-top:12px;">
                             Das Backup enthaelt alle Gäste, Artikel, Buchungen und Einstellungen 
                            ${isOnline ? '(inkl. Cloud-Daten von Supabase)' : '(nur lokale Daten - offline)'}.
                        </div>
                    </div>
                    
                    <div style="display:flex;flex-direction:column;gap:12px;">
                        <button onclick="DataProtection.createFullBackup();document.getElementById('backup-reminder-modal').remove();" 
                                style="width:100%;padding:16px;background:#27ae60;color:white;border:none;border-radius:10px;font-size:1.1rem;font-weight:600;cursor:pointer;">
                             Jetzt Backup erstellen
                        </button>
                        <button onclick="document.getElementById('backup-reminder-modal').remove();" 
                                style="width:100%;padding:12px;background:#f0f0f0;color:#666;border:none;border-radius:10px;font-size:1rem;cursor:pointer;">
                            Später erinnern
                        </button>
                        <button onclick="DataProtection.setLastBackupDate();document.getElementById('backup-reminder-modal').remove();Utils.showToast('Erinnerung für 24h deaktiviert', 'info');" 
                                style="width:100%;padding:10px;background:transparent;color:#999;border:none;font-size:0.9rem;cursor:pointer;">
                            Heute nicht mehr erinnern
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    // ============ RESTORE FUNKTIONEN ============
    
    // Backup-Datei auswählen und Restore-Dialog anzeigen
    async selectRestoreFile() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                const text = await file.text();
                const data = JSON.parse(text);
                
                // Backup validieren
                if (!this.validateBackup(data)) {
                    Utils.showToast('Ungueltige Backup-Datei!', 'error');
                    return;
                }
                
                // Restore-Dialog anzeigen
                this.showRestoreDialog(data, file.name);
                
            } catch (e) {
                console.error('Backup lesen Fehler:', e);
                Utils.showToast('Fehler beim Lesen der Datei: ' + e.message, 'error');
            }
        };
        
        input.click();
    },
    
    // Backup-Datei validieren
    validateBackup(data) {
        // Mindestens eine dieser Tabellen muss vorhanden sein
        const requiredTables = ['registeredGuests', 'artikel', 'buchungen', 'gäste'];
        const hasTable = requiredTables.some(t => data[t] && Array.isArray(data[t]));
        
        if (!hasTable) {
            console.error('Keine gueltigen Tabellen gefunden');
            return false;
        }
        
        return true;
    },
    
    // Restore-Dialog anzeigen
    showRestoreDialog(data, filename) {
        // Statistiken berechnen
        const stats = {
            gäste: (data.registeredGuests || []).filter(g => !g.gelöscht).length,
            artikel: (data.artikel || []).filter(a => a.aktiv !== false).length,
            buchungen: (data.buchungen || []).filter(b => !b.storniert).length,
            kategorien: (data.kategorien || []).length,
            gruppen: (data.gruppen || []).length,
            fehlendeGetraenke: (data.fehlendeGetraenke || []).length
        };
        
        const backupDatum = data.exportDatum ? new Date(data.exportDatum).toLocaleString('de-AT') : 'Unbekannt';
        const version = data.version || '1.0';
        const quelle = data.quelle || 'lokal';
        
        const modal = document.createElement('div');
        modal.id = 'restore-modal';
        modal.innerHTML = `
            <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;">
                <div style="background:white;border-radius:16px;max-width:550px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.4);">
                    
                    <!-- Header -->
                    <div style="background:linear-gradient(135deg, #e74c3c, #c0392b);color:white;padding:24px;border-radius:16px 16px 0 0;">
                        <div style="display:flex;align-items:center;gap:16px;">
                            <div style="font-size:3rem;"></div>
                            <div>
                                <h2 style="margin:0 0 4px 0;">Backup wiederherstellen</h2>
                                <div style="font-size:0.9rem;opacity:0.9;">${filename}</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Backup Info -->
                    <div style="padding:20px;border-bottom:1px solid #eee;">
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:0.9rem;">
                            <div><span style="color:#888;">Erstellt:</span> <strong>${backupDatum}</strong></div>
                            <div><span style="color:#888;">Version:</span> <strong>${version}</strong></div>
                            <div><span style="color:#888;">Quelle:</span> <strong>${quelle}</strong></div>
                        </div>
                    </div>
                    
                    <!-- Inhalt -->
                    <div style="padding:20px;">
                        <h3 style="margin:0 0 16px 0;color:#2C5F7C;"> Inhalt des Backups</h3>
                        <div style="display:grid;grid-template-columns:repeat(2, 1fr);gap:12px;">
                            <label style="display:flex;align-items:center;gap:10px;padding:12px;background:#f8f9fa;border-radius:8px;cursor:pointer;">
                                <input type="checkbox" id="restore-gäste" checked ${stats.gäste === 0 ? 'disabled' : ''}>
                                <span> Gäste <strong>(${stats.gäste})</strong></span>
                            </label>
                            <label style="display:flex;align-items:center;gap:10px;padding:12px;background:#f8f9fa;border-radius:8px;cursor:pointer;">
                                <input type="checkbox" id="restore-artikel" checked ${stats.artikel === 0 ? 'disabled' : ''}>
                                <span> Artikel <strong>(${stats.artikel})</strong></span>
                            </label>
                            <label style="display:flex;align-items:center;gap:10px;padding:12px;background:#f8f9fa;border-radius:8px;cursor:pointer;">
                                <input type="checkbox" id="restore-buchungen" checked ${stats.buchungen === 0 ? 'disabled' : ''}>
                                <span> Buchungen <strong>(${stats.buchungen})</strong></span>
                            </label>
                            <label style="display:flex;align-items:center;gap:10px;padding:12px;background:#f8f9fa;border-radius:8px;cursor:pointer;">
                                <input type="checkbox" id="restore-kategorien" checked ${stats.kategorien === 0 ? 'disabled' : ''}>
                                <span> Kategorien <strong>(${stats.kategorien})</strong></span>
                            </label>
                            <label style="display:flex;align-items:center;gap:10px;padding:12px;background:#f8f9fa;border-radius:8px;cursor:pointer;">
                                <input type="checkbox" id="restore-gruppen" ${stats.gruppen === 0 ? 'disabled' : ''}>
                                <span> Gruppen <strong>(${stats.gruppen})</strong></span>
                            </label>
                            <label style="display:flex;align-items:center;gap:10px;padding:12px;background:#f8f9fa;border-radius:8px;cursor:pointer;">
                                <input type="checkbox" id="restore-fehlende" ${stats.fehlendeGetraenke === 0 ? 'disabled' : ''}>
                                <span>⚠️ Fehlende <strong>(${stats.fehlendeGetraenke})</strong></span>
                            </label>
                        </div>
                    </div>
                    
                    <!-- Modus -->
                    <div style="padding:0 20px 20px;">
                        <h3 style="margin:0 0 12px 0;color:#2C5F7C;">⚙️ Wiederherstellungs-Modus</h3>
                        <div style="display:flex;flex-direction:column;gap:8px;">
                            <label style="display:flex;align-items:flex-start;gap:10px;padding:12px;background:#fff3cd;border:2px solid #ffc107;border-radius:8px;cursor:pointer;">
                                <input type="radio" name="restore-mode" value="merge" checked style="margin-top:3px;">
                                <div>
                                    <strong> Zusammenfuehren (empfohlen)</strong>
                                    <div style="font-size:0.85rem;color:#666;">Bestehende Daten bleiben erhalten, nur fehlende werden ergaenzt</div>
                                </div>
                            </label>
                            <label style="display:flex;align-items:flex-start;gap:10px;padding:12px;background:#f8d7da;border:2px solid #dc3545;border-radius:8px;cursor:pointer;">
                                <input type="radio" name="restore-mode" value="replace" style="margin-top:3px;">
                                <div>
                                    <strong> Ersetzen (Vorsicht!)</strong>
                                    <div style="font-size:0.85rem;color:#666;">ALLE bestehenden Daten werden gelöscht und durch Backup ersetzt</div>
                                </div>
                            </label>
                        </div>
                    </div>
                    
                    <!-- Warnung -->
                    <div style="padding:0 20px 20px;">
                        <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:12px;display:flex;align-items:flex-start;gap:10px;">
                            <span style="font-size:1.5rem;">⚠</span>
                            <div style="font-size:0.85rem;color:#856404;">
                                <strong>Wichtig:</strong> Erstellen Sie vor der Wiederherstellung ein aktuelles Backup der bestehenden Daten!
                            </div>
                        </div>
                    </div>
                    
                    <!-- Buttons -->
                    <div style="padding:20px;background:#f8f9fa;border-radius:0 0 16px 16px;display:flex;gap:12px;">
                        <button onclick="document.getElementById('restore-modal').remove();" 
                                style="flex:1;padding:14px;background:#6c757d;color:white;border:none;border-radius:8px;font-size:1rem;cursor:pointer;">
                            Abbrechen
                        </button>
                        <button onclick="DataProtection.executeRestore()" 
                                style="flex:1;padding:14px;background:#e74c3c;color:white;border:none;border-radius:8px;font-size:1rem;font-weight:600;cursor:pointer;">
                             Wiederherstellen
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Backup-Daten im Window speichern für executeRestore
        window._pendingRestoreData = data;
        
        document.body.appendChild(modal);
    },
    
    // Restore ausführen
    async executeRestore() {
        const data = window._pendingRestoreData;
        if (!data) {
            Utils.showToast('Keine Backup-Daten gefunden', 'error');
            return;
        }
        
        // Optionen sammeln
        const options = {
            gäste: document.getElementById('restore-gäste')?.checked,
            artikel: document.getElementById('restore-artikel')?.checked,
            buchungen: document.getElementById('restore-buchungen')?.checked,
            kategorien: document.getElementById('restore-kategorien')?.checked,
            gruppen: document.getElementById('restore-gruppen')?.checked,
            fehlende: document.getElementById('restore-fehlende')?.checked,
            mode: document.querySelector('input[name="restore-mode"]:checked')?.value || 'merge'
        };
        
        // Letzte Bestätigung
        const modeText = options.mode === 'replace' 
            ? 'ALLE bestehenden Daten werden GELOeSCHT!' 
            : 'Daten werden zusammengefuehrt.';
        
        if (!confirm(`Wiederherstellung wirklich durchführen?\n\n${modeText}\n\nDieser Vorgang kann nicht rueckgängig gemacht werden!`)) {
            return;
        }
        
        // Modal schlieÃŸen
        document.getElementById('restore-modal')?.remove();
        
        // Fortschrittsanzeige
        Utils.showToast('⏳ Wiederherstellung laeuft...', 'info');
        
        try {
            let restored = { gäste: 0, artikel: 0, buchungen: 0, kategorien: 0, gruppen: 0, fehlende: 0 };
            
            // Bei "replace" erst alles löschen
            if (options.mode === 'replace') {
                if (options.gäste) await db.registeredGuests.clear();
                if (options.artikel) await db.artikel.clear();
                if (options.buchungen) await db.buchungen.clear();
                if (options.kategorien) await db.kategorien.clear();
                if (options.gruppen) await db.gruppen.clear();
                if (options.fehlende) await db.fehlendeGetraenke.clear();
            }
            
            // Gäste wiederherstellen
            if (options.gäste && data.registeredGuests) {
                for (const g of data.registeredGuests) {
                    try {
                        if (options.mode === 'merge') {
                            // Prüfen ob schon existiert
                            const existing = await db.registeredGuests.get(g.id);
                            if (!existing) {
                                await db.registeredGuests.add(g);
                                restored.gäste++;
                            }
                        } else {
                            await db.registeredGuests.add(g);
                            restored.gäste++;
                        }
                    } catch(e) { /* Duplikat ignorieren */ }
                }
            }
            
            // Artikel wiederherstellen
            if (options.artikel && data.artikel) {
                for (const a of data.artikel) {
                    try {
                        if (options.mode === 'merge') {
                            const existing = await db.artikel.get(a.artikel_id);
                            if (!existing) {
                                await db.artikel.add(a);
                                restored.artikel++;
                            }
                        } else {
                            await db.artikel.add(a);
                            restored.artikel++;
                        }
                    } catch(e) { /* Duplikat ignorieren */ }
                }
            }
            
            // Buchungen wiederherstellen
            if (options.buchungen && data.buchungen) {
                for (const b of data.buchungen) {
                    try {
                        if (options.mode === 'merge') {
                            const existing = await db.buchungen.get(b.buchung_id);
                            if (!existing) {
                                await db.buchungen.add(b);
                                restored.buchungen++;
                            }
                        } else {
                            await db.buchungen.add(b);
                            restored.buchungen++;
                        }
                    } catch(e) { /* Duplikat ignorieren */ }
                }
            }
            
            // Kategorien wiederherstellen
            if (options.kategorien && data.kategorien) {
                for (const k of data.kategorien) {
                    try {
                        if (options.mode === 'merge') {
                            const existing = await db.kategorien.get(k.kategorie_id);
                            if (!existing) {
                                await db.kategorien.add(k);
                                restored.kategorien++;
                            }
                        } else {
                            await db.kategorien.add(k);
                            restored.kategorien++;
                        }
                    } catch(e) { /* Duplikat ignorieren */ }
                }
            }
            
            // Gruppen wiederherstellen
            if (options.gruppen && data.gruppen) {
                for (const g of data.gruppen) {
                    try {
                        if (options.mode === 'merge') {
                            const existing = await db.gruppen.get(g.id);
                            if (!existing) {
                                await db.gruppen.add(g);
                                restored.gruppen++;
                            }
                        } else {
                            await db.gruppen.add(g);
                            restored.gruppen++;
                        }
                    } catch(e) { /* Duplikat ignorieren */ }
                }
            }
            
            // Fehlende Getränke wiederherstellen
            if (options.fehlende && data.fehlendeGetraenke) {
                for (const f of data.fehlendeGetraenke) {
                    try {
                        if (options.mode === 'merge') {
                            const existing = await db.fehlendeGetraenke.get(f.id);
                            if (!existing) {
                                await db.fehlendeGetraenke.add(f);
                                restored.fehlende++;
                            }
                        } else {
                            await db.fehlendeGetraenke.add(f);
                            restored.fehlende++;
                        }
                    } catch(e) { /* Duplikat ignorieren */ }
                }
            }
            
            // Cache invalidieren
            artikelCache = null;
            
            // Aufraeumen
            delete window._pendingRestoreData;
            
            // Erfolgsmeldung
            const summary = [];
            if (restored.gäste > 0) summary.push(`${restored.gäste} Gäste`);
            if (restored.artikel > 0) summary.push(`${restored.artikel} Artikel`);
            if (restored.buchungen > 0) summary.push(`${restored.buchungen} Buchungen`);
            if (restored.kategorien > 0) summary.push(`${restored.kategorien} Kategorien`);
            if (restored.gruppen > 0) summary.push(`${restored.gruppen} Gruppen`);
            if (restored.fehlende > 0) summary.push(`${restored.fehlende} Fehlende`);
            
            Utils.showToast(`✅ Wiederherstellung erfolgreich!\n${summary.join(', ') || 'Keine neuen Daten'}`, 'success');
            
            // Seite neu laden um Änderungen anzuzeigen
            setTimeout(() => {
                if (confirm('Seite neu laden um alle Änderungen anzuzeigen?')) {
                    location.reload();
                }
            }, 1000);
            
        } catch (e) {
            console.error('Restore Fehler:', e);
            Utils.showToast('Fehler bei Wiederherstellung: ' + e.message, 'error');
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
        a.download = `gäste_${Date.now()}.csv`;
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

// ============ GAST-NACHRICHTEN SYSTEM ============
const GastNachricht = {
    ABLAUF_STUNDEN: 18, // Nachricht laeuft nach 18 Stunden ab
    
    // Aktive Nachricht holen (prüft auch Ablauf)
    async getAktive() {
        // Erst von Supabase laden wenn online
        if (supabaseClient && isOnline) {
            try {
                const { data } = await supabaseClient
                    .from('settings')
                    .select('value')
                    .eq('key', 'gast_nachricht')
                    .single();
                
                if (data?.value) {
                    const nachricht = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
                    
                    // Prüfen ob abgelaufen
                    if (nachricht.aktiv && nachricht.erstellt_am) {
                        const erstelltAm = new Date(nachricht.erstellt_am);
                        const jetzt = new Date();
                        const stundenVergangen = (jetzt - erstelltAm) / (1000 * 60 * 60);
                        
                        if (stundenVergangen >= this.ABLAUF_STUNDEN) {
                            // Automatisch deaktivieren
                            await this.deaktivieren();
                            return null;
                        }
                        
                        return nachricht;
                    }
                }
            } catch(e) {
                console.log('Keine Nachricht in Supabase');
            }
        }
        
        // Fallback: Lokal
        try {
            const setting = await db.settings.get('gast_nachricht');
            if (setting?.value) {
                const nachricht = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;
                
                if (nachricht.aktiv && nachricht.erstellt_am) {
                    const erstelltAm = new Date(nachricht.erstellt_am);
                    const jetzt = new Date();
                    const stundenVergangen = (jetzt - erstelltAm) / (1000 * 60 * 60);
                    
                    if (stundenVergangen >= this.ABLAUF_STUNDEN) {
                        await this.deaktivieren();
                        return null;
                    }
                    
                    return nachricht;
                }
            }
        } catch(e) {}
        
        return null;
    },
    
    // Neue Nachricht erstellen
    async erstellen(text, typ = 'info') {
        if (!text || text.trim() === '') {
            throw new Error('Nachricht darf nicht leer sein');
        }
        
        const nachricht = {
            text: text.trim(),
            typ: typ, // 'info', 'warnung', 'dringend'
            aktiv: true,
            erstellt_am: new Date().toISOString(),
            erstellt_von: 'Admin'
        };
        
        // Lokal speichern
        await db.settings.put({ key: 'gast_nachricht', value: JSON.stringify(nachricht) });
        
        // Supabase
        if (supabaseClient && isOnline) {
            try {
                await supabaseClient.from('settings').upsert({ 
                    key: 'gast_nachricht', 
                    value: nachricht 
                });
            } catch(e) {
                console.error('Nachricht Supabase sync error:', e);
            }
        }
        
        Utils.showToast(' Nachricht aktiviert!', 'success');
        return nachricht;
    },
    
    // Nachricht deaktivieren
    async deaktivieren() {
        const nachricht = {
            aktiv: false,
            deaktiviert_am: new Date().toISOString()
        };
        
        await db.settings.put({ key: 'gast_nachricht', value: JSON.stringify(nachricht) });
        
        if (supabaseClient && isOnline) {
            try {
                await supabaseClient.from('settings').upsert({ 
                    key: 'gast_nachricht', 
                    value: nachricht 
                });
            } catch(e) {}
        }
        
        Utils.showToast('Nachricht deaktiviert', 'info');
    },
    
    // Verbleibende Zeit berechnen
    getVerbleibendeZeit(nachricht) {
        if (!nachricht?.erstellt_am) return null;
        
        const erstelltAm = new Date(nachricht.erstellt_am);
        const ablaufZeit = new Date(erstelltAm.getTime() + (this.ABLAUF_STUNDEN * 60 * 60 * 1000));
        const jetzt = new Date();
        const verbleibend = ablaufZeit - jetzt;
        
        if (verbleibend <= 0) return 'Abgelaufen';
        
        const stunden = Math.floor(verbleibend / (1000 * 60 * 60));
        const minuten = Math.floor((verbleibend % (1000 * 60 * 60)) / (1000 * 60));
        
        if (stunden > 0) {
            return `${stunden}h ${minuten}min`;
        }
        return `${minuten} Minuten`;
    },
    
    // HTML für die Anzeige auf Login-Seite
    renderHtml(nachricht) {
        if (!nachricht || !nachricht.aktiv) return '';
        
        const verbleibend = this.getVerbleibendeZeit(nachricht);
        
        // Farben je nach Typ
        const farben = {
            info: 'linear-gradient(135deg, #3498db, #2980b9)',
            warnung: 'linear-gradient(135deg, #f39c12, #e67e22)',
            dringend: 'linear-gradient(135deg, #e74c3c, #c0392b)'
        };
        
        const icons = {
            info: '',
            warnung: '⚠',
            dringend: ''
        };
        
        const hintergrund = farben[nachricht.typ] || farben.info;
        const icon = icons[nachricht.typ] || icons.info;
        
        // Extra-intensive Animation für dringend
        const isDringend = nachricht.typ === 'dringend';
        const animationClass = isDringend ? 'dringend-animation' : 'normal-animation';
        
        return `
        <div id="gast-nachricht-box" class="${animationClass}" style="
            background: ${hintergrund};
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 24px;
            color: white;
            max-width: 600px;
            margin: 0 auto 24px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.2);
            position: relative;
            ${isDringend ? 'border: 4px solid transparent;' : ''}
        ">
            <style>
                @keyframes nachrichtPulse {
                    0%, 100% { transform: scale(1); box-shadow: 0 8px 32px rgba(0,0,0,0.2); }
                    50% { transform: scale(1.02); box-shadow: 0 12px 40px rgba(0,0,0,0.3); }
                }
                @keyframes textBlink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.7; }
                }
                @keyframes borderFlash {
                    0%, 100% { border-color: #fff; box-shadow: 0 0 20px rgba(255,255,255,0.5), 0 8px 32px rgba(0,0,0,0.3); }
                    50% { border-color: #ffff00; box-shadow: 0 0 40px rgba(255,255,0,0.8), 0 12px 40px rgba(0,0,0,0.4); }
                }
                @keyframes iconShake {
                    0%, 100% { transform: rotate(0deg); }
                    25% { transform: rotate(-15deg); }
                    75% { transform: rotate(15deg); }
                }
                @keyframes urgentPulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }
                
                #gast-nachricht-box.normal-animation {
                    animation: nachrichtPulse 2s ease-in-out infinite;
                }
                #gast-nachricht-box.dringend-animation {
                    animation: borderFlash 0.8s ease-in-out infinite, urgentPulse 1.5s ease-in-out infinite;
                }
                #gast-nachricht-box .nachricht-text {
                    animation: textBlink 1.5s ease-in-out infinite;
                }
                #gast-nachricht-box.dringend-animation .nachricht-icon {
                    animation: iconShake 0.5s ease-in-out infinite;
                    display: inline-block;
                }
                #gast-nachricht-box.dringend-animation .nachricht-titel {
                    font-size: 1.3rem !important;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
            </style>
            
            <div style="display: flex; align-items: flex-start; gap: 12px;">
                <div class="nachricht-icon" style="font-size: ${isDringend ? '2.5rem' : '2rem'}; line-height: 1;">${icon}</div>
                <div style="flex: 1;">
                    <div class="nachricht-titel" style="font-weight: 700; font-size: 1.1rem; margin-bottom: 6px;">
                        ${isDringend ? ' WICHTIGE NACHRICHT! ' : 'Nachricht vom Team'}
                    </div>
                    <div class="nachricht-text" style="font-size: ${isDringend ? '1.3rem' : '1.15rem'}; line-height: 1.4; font-weight: ${isDringend ? '600' : '400'};">
                        ${nachricht.text}
                    </div>
                </div>
            </div>
        </div>
        `;
    },
    
    // Nachricht für diesen Gast schlieÃŸen (nur visuell, nicht für alle)
    schlieÃŸen() {
        const box = document.getElementById('gast-nachricht-box');
        if (box) {
            box.style.animation = 'none';
            box.style.transition = 'all 0.3s ease';
            box.style.transform = 'scale(0.9)';
            box.style.opacity = '0';
            setTimeout(() => box.remove(), 300);
        }
        // Merken dass dieser Gast die Nachricht geschlossen hat (für diese Session)
        sessionStorage.setItem('nachricht_geschlossen', 'true');
    },
    
    // Prüfen ob Nachricht für diese Session geschlossen wurde
    istGeschlossen() {
        return sessionStorage.getItem('nachricht_geschlossen') === 'true';
    }
};
window.GastNachricht = GastNachricht;

db.open().then(async () => {
    await DataProtection.requestPersistentStorage();
    await DataProtection.restoreIfNeeded();
    await DataProtection.createBackup();
    console.log(' DB bereit');
}).catch(e => console.error('DB Fehler:', e));

// ===========================================
// TAGESMENUe - Menü auf der Startseite anzeigen
// ===========================================
const TagesMenu = {
    // Prüfen ob eine Uhrzeit aktuell ueberschritten ist
    istZeitVorbei(uhrzeitStr) {
        if (!uhrzeitStr) return false;
        const [stunden, minuten] = uhrzeitStr.split(':').map(Number);
        const jetzt = new Date();
        const jetztMinuten = jetzt.getHours() * 60 + jetzt.getMinutes();
        const zielMinuten = stunden * 60 + minuten;
        return jetztMinuten >= zielMinuten;
    },
    
    // Aktive Menüs holen (Mittag und/oder Abend, je nach Uhrzeit)
    async getAktiv() {
        let menuData = null;
        
        // Erst von Supabase wenn online
        if (supabaseClient && isOnline) {
            try {
                const { data } = await supabaseClient
                    .from('settings')
                    .select('value')
                    .eq('key', 'tages_menu_v2')
                    .single();
                
                if (data?.value) {
                    menuData = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
                    // Lokal cachen
                    await db.settings.put({ key: 'tages_menu_v2', value: JSON.stringify(menuData) });
                }
            } catch(e) {
                console.log('Kein Menü v2 in Supabase');
            }
        }
        
        // Fallback: Lokal
        if (!menuData) {
            try {
                const setting = await db.settings.get('tages_menu_v2');
                if (setting?.value) {
                    menuData = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;
                }
            } catch(e) {}
        }
        
        if (!menuData) return null;
        
        // Prüfen welche Menüs gerade sichtbar sind
        const result = { mittag: null, abend: null };
        
        // Mittagsmenü: aktiv und noch nicht ausgeblendet?
        if (menuData.mittag?.aktiv && menuData.mittag?.text) {
            if (!this.istZeitVorbei(menuData.mittag.ausblenden_um)) {
                result.mittag = menuData.mittag;
            }
        }
        
        // Abendmenü: aktiv und noch nicht ausgeblendet?
        if (menuData.abend?.aktiv && menuData.abend?.text) {
            if (!this.istZeitVorbei(menuData.abend.ausblenden_um)) {
                result.abend = menuData.abend;
            }
        }
        
        // Wenn keins aktiv, null zurückgeben
        if (!result.mittag && !result.abend) return null;
        
        return result;
    },
    
    // Alle Menü-Daten laden (für Admin)
    async getAlleMenus() {
        let menuData = null;
        
        if (supabaseClient && isOnline) {
            try {
                const { data } = await supabaseClient
                    .from('settings')
                    .select('value')
                    .eq('key', 'tages_menu_v2')
                    .single();
                
                if (data?.value) {
                    menuData = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
                }
            } catch(e) {}
        }
        
        if (!menuData) {
            try {
                const setting = await db.settings.get('tages_menu_v2');
                if (setting?.value) {
                    menuData = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;
                }
            } catch(e) {}
        }
        
        return menuData || {
            mittag: { aktiv: false, text: '', uhrzeit: '12:00', ausblenden_um: '14:30' },
            abend: { aktiv: false, text: '', uhrzeit: '18:00', ausblenden_um: '19:30' }
        };
    },
    
    // Menüs speichern
    async speichern(menuData) {
        // Lokal speichern
        await db.settings.put({ key: 'tages_menu_v2', value: JSON.stringify(menuData) });
        
        // Supabase
        if (supabaseClient && isOnline) {
            try {
                await supabaseClient.from('settings').upsert({ 
                    key: 'tages_menu_v2', 
                    value: menuData 
                });
            } catch(e) {
                console.error('Menü Supabase sync error:', e);
            }
        }
        
        Utils.showToast(' Menü gespeichert!', 'success');
        return menuData;
    },
    
    // Text formatieren (Sterne als Trenner, etc.)
    formatText(text) {
        if (!text) return '';
        
        // Sterne als schöne Trenner
        let formatted = text
            .replace(/\*{4,}/g, '<div style="text-align:center;margin:16px 0;letter-spacing:8px;opacity:0.5;">* * * *</div>')
            .replace(/\*{3}/g, '<div style="text-align:center;margin:16px 0;letter-spacing:8px;opacity:0.5;">* * *</div>')
            .replace(/\*{2}/g, '<div style="text-align:center;margin:12px 0;letter-spacing:8px;opacity:0.5;">* *</div>')
            // Zeilenumbrueche
            .replace(/\n/g, '<br>');
        
        return formatted;
    },
    
    // Buttons für Startseite (Mittag und/oder Abend)
    renderButtons(menus) {
        let html = '';
        
        if (menus.mittag) {
            html += `<button onclick="TagesMenu.showModal('mittag')" style="
                background: linear-gradient(135deg, #f39c12, #e67e22);
                color: white;
                border: none;
                border-radius: 12px;
                padding: 14px 24px;
                font-size: 1.1rem;
                font-weight: 600;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                box-shadow: 0 4px 12px rgba(243, 156, 18, 0.3);
                width: 100%;
                max-width: 300px;
                margin: 0 auto 12px;
            ">
                <span style="font-size:1.4rem;"></span>
                Mittagsmenü (${menus.mittag.uhrzeit} Uhr)
            </button>`;
        }
        
        if (menus.abend) {
            html += `<button onclick="TagesMenu.showModal('abend')" style="
                background: linear-gradient(135deg, #8B4513, #D2691E);
                color: white;
                border: none;
                border-radius: 12px;
                padding: 14px 24px;
                font-size: 1.1rem;
                font-weight: 600;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                box-shadow: 0 4px 12px rgba(139, 69, 19, 0.3);
                width: 100%;
                max-width: 300px;
                margin: 0 auto;
            ">
                <span style="font-size:1.4rem;"></span>
                Abendmenü (${menus.abend.uhrzeit} Uhr)
            </button>`;
        }
        
        return html;
    },
    
    // Modal anzeigen
    async showModal(typ = 'mittag') {
        const menus = await this.getAktiv();
        if (!menus) return;
        
        const menu = menus[typ];
        if (!menu) return;
        
        const formattedText = this.formatText(menu.text);
        const titel = typ === 'mittag' ? 'Mittagsmenü' : 'Abendmenü';
        const icon = typ === 'mittag' ? '' : '';
        const farbe = typ === 'mittag' ? '#e67e22' : '#8B4513';
        
        // Modal HTML
        const modalHtml = `
        <div id="menu-modal-overlay" onclick="TagesMenu.closeModal()" style="
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.6);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            animation: fadeIn 0.2s ease;
        ">
            <div onclick="event.stopPropagation()" style="
                background: linear-gradient(180deg, #FFF8F0 0%, #FFFFFF 100%);
                border-radius: 20px;
                max-width: 500px;
                width: 100%;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                position: relative;
            ">
                <button onclick="TagesMenu.closeModal()" style="
                    position: absolute;
                    top: 12px; right: 12px;
                    background: rgba(0,0,0,0.1);
                    border: none;
                    border-radius: 50%;
                    width: 36px; height: 36px;
                    font-size: 1.2rem;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">x</button>
                
                <div style="padding: 30px;">
                    <div style="text-align:center;margin-bottom:24px;">
                        <span style="font-size:3rem;">${icon}</span>
                        <h2 style="margin:12px 0 0;font-family:var(--font-display);color:${farbe};font-size:1.8rem;">${titel}</h2>
                        <p style="margin:8px 0 0;color:#666;font-size:1rem;">Servierzeit: ${menu.uhrzeit} Uhr</p>
                    </div>
                    
                    <div style="
                        font-size: 1.1rem;
                        line-height: 1.8;
                        color: #333;
                        text-align: center;
                    ">
                        ${formattedText}
                    </div>
                    
                    <div style="text-align:center;margin-top:24px;padding-top:16px;border-top:2px dashed ${farbe};opacity:0.6;font-size:0.9rem;">
                        Guten Appetit! 
                    </div>
                </div>
            </div>
        </div>
        <style>
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
        </style>`;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },
    
    // Modal schlieÃŸen
    closeModal() {
        const modal = document.getElementById('menu-modal-overlay');
        if (modal) modal.remove();
    }
};

// Global verfügbar machen
window.TagesMenu = TagesMenu;

// ================================
// KAeSE-BESTELLUNGEN
// ================================
const CheeseOrders = {
    // Preis pro 100g in Cent
    PRICE_PER_100G_CENTS: 250,
    // Vakuum-Aufpreis in Cent
    VACUUM_FEE_CENTS: 100,
    // Min/Max/Step in Gramm
    MIN_GRAMS: 100,
    MAX_GRAMS: 1000,
    STEP_GRAMS: 50,
    
    // Preis berechnen
    calculatePrice(grams, packagingType) {
        const basePrice = Math.round((grams / 100) * this.PRICE_PER_100G_CENTS);
        const packagingFee = packagingType === 'VACUUM' ? this.VACUUM_FEE_CENTS : 0;
        return {
            basePriceCents: basePrice,
            packagingFeeCents: packagingFee,
            totalPriceCents: basePrice + packagingFee
        };
    },
    
    // Cent in Euro formatieren
    formatPrice(cents) {
        return (cents / 100).toFixed(2).replace('.', ',') + ' EUR';
    },
    
    // Bestellung erstellen (für Gäste)
    async createOrder(guestName, grams, packagingType) {
        if (!supabaseClient) throw new Error('Keine Verbindung zur Datenbank');
        
        const prices = this.calculatePrice(grams, packagingType);
        
        const { data, error } = await supabaseClient
            .from('cheese_orders')
            .insert({
                guest_name: guestName.trim(),
                grams: grams,
                packaging_type: packagingType,
                base_price_cents: prices.basePriceCents,
                packaging_fee_cents: prices.packagingFeeCents,
                total_price_cents: prices.totalPriceCents,
                status: 'OPEN'
            })
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },
    
    // Offene Bestellungen laden (für Admin)
    async getOpenOrders() {
        if (!supabaseClient) return [];
        
        const { data, error } = await supabaseClient
            .from('cheese_orders')
            .select('*')
            .eq('status', 'OPEN')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Fehler beim Laden der Käse-Bestellungen:', error);
            return [];
        }
        return data || [];
    },
    
    // Bestellung als erledigt markieren (für Admin)
    async markAsDone(orderId) {
        if (!supabaseClient) throw new Error('Keine Verbindung zur Datenbank');
        
        const { error } = await supabaseClient
            .from('cheese_orders')
            .update({ status: 'DONE' })
            .eq('id', orderId);
        
        if (error) throw error;
        return true;
    },
    
    // Modal anzeigen
    showModal() {
        const modalHtml = `
        <div id="cheese-modal-overlay" onclick="if(event.target===this)CheeseOrders.closeModal()" style="
            position:fixed;top:0;left:0;right:0;bottom:0;
            background:rgba(0,0,0,0.7);
            display:flex;align-items:center;justify-content:center;
            z-index:9999;padding:16px;
        ">
            <div style="
                background:white;
                border-radius:16px;
                max-width:450px;
                width:100%;
                max-height:90vh;
                overflow-y:auto;
                box-shadow:0 20px 60px rgba(0,0,0,0.3);
            ">
                <!-- Header -->
                <div style="
                    background:linear-gradient(135deg, #f4d03f, #f39c12);
                    padding:20px;
                    border-radius:16px 16px 0 0;
                    color:#5d4e37;
                ">
                    <div style="display:flex;align-items:center;justify-content:space-between;">
                        <div style="display:flex;align-items:center;gap:12px;">
                            <span style="font-size:2.5rem;"></span>
                            <div>
                                <h2 style="margin:0;font-size:1.4rem;font-weight:700;">Käse zur Abreise</h2>
                                <p style="margin:4px 0 0;font-size:0.9rem;opacity:0.8;">Bergkäse vom Söllerhaus</p>
                            </div>
                        </div>
                        <button onclick="CheeseOrders.closeModal()" style="
                            background:rgba(255,255,255,0.3);
                            border:none;
                            width:36px;height:36px;
                            border-radius:50%;
                            font-size:1.2rem;
                            cursor:pointer;
                            display:flex;align-items:center;justify-content:center;
                        ">x</button>
                    </div>
                </div>
                
                <!-- Body -->
                <div style="padding:20px;">
                    <!-- Name -->
                    <div style="margin-bottom:20px;">
                        <label style="display:block;font-weight:600;margin-bottom:8px;color:#333;">
                            Ihr Name *
                        </label>
                        <input type="text" id="cheese-guest-name" placeholder="z.B. Maria" style="
                            width:100%;
                            padding:14px;
                            border:2px solid #e0e0e0;
                            border-radius:10px;
                            font-size:1rem;
                            box-sizing:border-box;
                        " onfocus="this.style.borderColor='#f39c12'" onblur="this.style.borderColor='#e0e0e0'">
                    </div>
                    
                    <!-- Menge -->
                    <div style="margin-bottom:20px;">
                        <label style="display:block;font-weight:600;margin-bottom:8px;color:#333;">
                            Menge wählen
                        </label>
                        <div style="display:flex;align-items:center;justify-content:center;gap:16px;background:#f8f9fa;padding:16px;border-radius:12px;">
                            <button onclick="CheeseOrders.adjustGrams(-50)" style="
                                width:50px;height:50px;
                                border-radius:50%;
                                border:2px solid #f39c12;
                                background:white;
                                font-size:1.5rem;
                                font-weight:bold;
                                color:#f39c12;
                                cursor:pointer;
                            "></button>
                            <div style="text-align:center;min-width:100px;">
                                <div id="cheese-grams-display" style="font-size:2rem;font-weight:700;color:#333;">100</div>
                                <div style="font-size:0.9rem;color:#666;">Gramm</div>
                            </div>
                            <button onclick="CheeseOrders.adjustGrams(50)" style="
                                width:50px;height:50px;
                                border-radius:50%;
                                border:2px solid #f39c12;
                                background:white;
                                font-size:1.5rem;
                                font-weight:bold;
                                color:#f39c12;
                                cursor:pointer;
                            ">+</button>
                        </div>
                        <div style="text-align:center;margin-top:8px;font-size:0.85rem;color:#888;">
                            Min: 100g * Max: 1kg * Schritte: 50g<br>
                            <span style="color:#e67e22;">⚠— Grammzahl ist ca.-Angabe (Richtwert)</span>
                        </div>
                    </div>
                    
                    <!-- Verpackung -->
                    <div style="margin-bottom:20px;">
                        <label style="display:block;font-weight:600;margin-bottom:8px;color:#333;">
                            Verpackung wählen
                        </label>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                            <label id="cheese-pkg-film" onclick="CheeseOrders.selectPackaging('FILM')" style="
                                padding:16px;
                                border:3px solid #f39c12;
                                border-radius:12px;
                                background:#fffbeb;
                                cursor:pointer;
                                text-align:center;
                                transition:all 0.2s;
                            ">
                                <div style="font-size:1.5rem;margin-bottom:4px;"></div>
                                <div style="font-weight:600;color:#333;">Klarsichtfolie</div>
                                <div style="color:#27ae60;font-weight:700;">Gratis</div>
                            </label>
                            <label id="cheese-pkg-vacuum" onclick="CheeseOrders.selectPackaging('VACUUM')" style="
                                padding:16px;
                                border:3px solid #e0e0e0;
                                border-radius:12px;
                                background:white;
                                cursor:pointer;
                                text-align:center;
                                transition:all 0.2s;
                            ">
                                <div style="font-size:1.5rem;margin-bottom:4px;"></div>
                                <div style="font-weight:600;color:#333;">Vakuumiert</div>
                                <div style="color:#e67e22;font-weight:700;">+1,00 EUR</div>
                            </label>
                        </div>
                    </div>
                    
                    <!-- Preis -->
                    <div style="
                        background:linear-gradient(135deg, #2c3e50, #34495e);
                        padding:20px;
                        border-radius:12px;
                        color:white;
                        margin-bottom:20px;
                    ">
                        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                            <span>Käse (ca. <span id="cheese-price-grams">100</span>g x 2,50 EUR/100g)</span>
                            <span id="cheese-price-base">2,50 EUR</span>
                        </div>
                        <div id="cheese-price-vacuum-row" style="display:none;justify-content:space-between;margin-bottom:8px;">
                            <span>Vakuumverpackung</span>
                            <span>+1,00 EUR</span>
                        </div>
                        <div style="border-top:1px solid rgba(255,255,255,0.3);padding-top:12px;margin-top:8px;">
                            <div style="display:flex;justify-content:space-between;font-size:1.3rem;font-weight:700;">
                                <span>ca. Gesamtpreis</span>
                                <span id="cheese-price-total">2,50 EUR</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Hinweise -->
                    <div style="
                        background:#fff3cd;
                        border:1px solid #ffc107;
                        border-radius:10px;
                        padding:14px;
                        margin-bottom:20px;
                        font-size:0.85rem;
                    ">
                        <div style="font-weight:600;color:#856404;margin-bottom:8px;">⚠️ Wichtige Hinweise:</div>
                        <ul style="margin:0;padding-left:20px;color:#856404;line-height:1.6;">
                            <li>Grammzahl ist <strong>ca.-Angabe</strong> (Käse wird frisch geschnitten)</li>
                            <li>Abholung <strong>nur am Abreisetag</strong> beim Check-out</li>
                            <li>Bezahlung <strong>nur bar (Cash)</strong></li>
                            <li>Dies ist nur eine <strong>Vorbestellung</strong></li>
                        </ul>
                    </div>
                    
                    <!-- Button -->
                    <button onclick="CheeseOrders.submitOrder()" style="
                        width:100%;
                        padding:18px;
                        background:linear-gradient(135deg, #27ae60, #2ecc71);
                        color:white;
                        border:none;
                        border-radius:12px;
                        font-size:1.1rem;
                        font-weight:700;
                        cursor:pointer;
                        transition:transform 0.2s, box-shadow 0.2s;
                    " onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 20px rgba(39,174,96,0.4)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
                         Käse vorbestellen
                    </button>
                </div>
            </div>
        </div>`;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Initiale Werte setzen
        this.currentGrams = this.MIN_GRAMS;
        this.currentPackaging = 'FILM';
        this.updatePriceDisplay();
    },
    
    // Modal schlieÃŸen
    closeModal() {
        const modal = document.getElementById('cheese-modal-overlay');
        if (modal) modal.remove();
    },
    
    // Gramm anpassen
    adjustGrams(delta) {
        const newGrams = (this.currentGrams || this.MIN_GRAMS) + delta;
        if (newGrams >= this.MIN_GRAMS && newGrams <= this.MAX_GRAMS) {
            this.currentGrams = newGrams;
            document.getElementById('cheese-grams-display').textContent = newGrams;
            this.updatePriceDisplay();
        }
    },
    
    // Verpackung wählen
    selectPackaging(type) {
        this.currentPackaging = type;
        
        const filmEl = document.getElementById('cheese-pkg-film');
        const vacuumEl = document.getElementById('cheese-pkg-vacuum');
        const vacuumRow = document.getElementById('cheese-price-vacuum-row');
        
        if (type === 'FILM') {
            filmEl.style.borderColor = '#f39c12';
            filmEl.style.background = '#fffbeb';
            vacuumEl.style.borderColor = '#e0e0e0';
            vacuumEl.style.background = 'white';
            vacuumRow.style.display = 'none';
        } else {
            filmEl.style.borderColor = '#e0e0e0';
            filmEl.style.background = 'white';
            vacuumEl.style.borderColor = '#f39c12';
            vacuumEl.style.background = '#fffbeb';
            vacuumRow.style.display = 'flex';
        }
        
        this.updatePriceDisplay();
    },
    
    // Preis-Anzeige aktualisieren
    updatePriceDisplay() {
        const grams = this.currentGrams || this.MIN_GRAMS;
        const packaging = this.currentPackaging || 'FILM';
        const prices = this.calculatePrice(grams, packaging);
        
        document.getElementById('cheese-price-grams').textContent = grams;
        document.getElementById('cheese-price-base').textContent = this.formatPrice(prices.basePriceCents);
        document.getElementById('cheese-price-total').textContent = this.formatPrice(prices.totalPriceCents);
    },
    
    // Bestellung absenden
    async submitOrder() {
        const nameInput = document.getElementById('cheese-guest-name');
        const name = nameInput?.value?.trim();
        
        // Validierung
        if (!name) {
            nameInput.style.borderColor = '#e74c3c';
            nameInput.focus();
            Utils.showToast('Bitte Namen eingeben!', 'error');
            return;
        }
        
        try {
            await this.createOrder(name, this.currentGrams, this.currentPackaging);
            this.closeModal();
            
            // Erfolgsbestätigung
            Utils.showToast(' Käse-Bestellung erfolgreich!', 'success');
            
            // Bestätigungs-Popup
            setTimeout(() => {
                const confirmHtml = `
                <div id="cheese-confirm-overlay" onclick="this.remove()" style="
                    position:fixed;top:0;left:0;right:0;bottom:0;
                    background:rgba(0,0,0,0.7);
                    display:flex;align-items:center;justify-content:center;
                    z-index:9999;padding:16px;
                ">
                    <div style="
                        background:white;
                        border-radius:16px;
                        padding:32px;
                        text-align:center;
                        max-width:350px;
                        box-shadow:0 20px 60px rgba(0,0,0,0.3);
                    ">
                        <div style="font-size:4rem;margin-bottom:16px;">✅</div>
                        <h2 style="color:#27ae60;margin:0 0 12px;">Bestellung erfolgreich!</h2>
                        <p style="color:#666;margin:0 0 20px;line-height:1.5;">
                            Ihr Käse wird für Sie vorbereitet.<br>
                            <strong>Abholung beim Check-out.</strong>
                        </p>
                        <button onclick="this.parentElement.parentElement.remove()" style="
                            padding:14px 32px;
                            background:#27ae60;
                            color:white;
                            border:none;
                            border-radius:10px;
                            font-size:1rem;
                            font-weight:600;
                            cursor:pointer;
                        ">OK, verstanden</button>
                    </div>
                </div>`;
                document.body.insertAdjacentHTML('beforeend', confirmHtml);
            }, 300);
            
        } catch (error) {
            console.error('Käse-Bestellung Fehler:', error);
            Utils.showToast('Fehler bei der Bestellung: ' + error.message, 'error');
        }
    },
    
    // Interne State-Variablen
    currentGrams: 100,
    currentPackaging: 'FILM'
};

// Global verfügbar machen
window.CheeseOrders = CheeseOrders;

const Utils = {
    uuid: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random()*16|0; return (c=='x'?r:(r&0x3|0x8)).toString(16); }),
    getDeviceId() { let d = localStorage.getItem('device_id'); if(!d) { d = this.uuid(); localStorage.setItem('device_id', d); } return d; },
    formatDate: d => { const dt = d instanceof Date ? d : new Date(d); return dt.toLocaleDateString('de-AT', {day:'2-digit', month:'2-digit', year:'numeric'}); },
    formatTime: d => (d instanceof Date ? d : new Date(d)).toTimeString().split(' ')[0],
    formatCurrency: a => new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR' }).format(a),
    
    // Buchungsdatum basierend auf 7:00-7:00 Periode
    // Buchungen zwischen 00:00 und 06:59 gehören noch zum Vortag
    getBuchungsDatum() {
        const jetzt = new Date();
        const stunde = jetzt.getHours();
        
        // Vor 7 Uhr morgens? → Datum vom Vortag verwenden
        if (stunde < 7) {
            const gestern = new Date(jetzt);
            gestern.setDate(gestern.getDate() - 1);
            return this.formatDate(gestern);
        }
        
        // Ab 7 Uhr → heutiges Datum
        return this.formatDate(jetzt);
    },
    
    // Aktuelles "Buchungs-Heute" (für Dashboard etc.)
    getBuchungsHeute() {
        return this.getBuchungsDatum();
    },
    
    // Vortag relativ zum aktuellen Buchungsdatum (für fehlende Getränke)
    getVortagBuchungsDatum() {
        const jetzt = new Date();
        const stunde = jetzt.getHours();
        
        // Basis-Datum berechnen
        let basisDatum = new Date(jetzt);
        if (stunde < 7) {
            // Vor 7 Uhr: Basis ist gestern
            basisDatum.setDate(basisDatum.getDate() - 1);
        }
        
        // Davon nochmal einen Tag abziehen für "Vortag"
        basisDatum.setDate(basisDatum.getDate() - 1);
        return this.formatDate(basisDatum);
    },
    
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

// ================================
// UeBERSETZUNGSSYSTEM (i18n)
// ================================
const i18n = {
    // Aktuelle Sprache (wird aus localStorage geladen)
    currentLang: localStorage.getItem('kassa_lang') || 'de',
    
    // Uebersetzungen
    translations: {
        de: {
            // Login-Seite
            'app_title': 'Söllerhaus Kassa',
            'app_subtitle': 'Self-Service Buchung',
            'select_first_letter': 'Wählen Sie den ersten Buchstaben:',
            'no_account': 'Noch kein Account?',
            'register_new': 'Neu registrieren',
            'admin_login': 'Admin-Login',
            'missing_drinks': 'Fehlende Getränke',
            'total': 'Gesamt',
            'please_take_after_login': 'Bitte nach Login uebernehmen',
            'message_from_team': 'Nachricht vom Team',
            'important_message': 'WICHTIGE NACHRICHT!',
            'hours_visible': 'Noch {h}h sichtbar',
            'click_to_close': 'Klicke x zum SchlieÃŸen',
            'read_close': 'Gelesen & SchlieÃŸen',
            
            // Name-Auswahl
            'letter': 'Buchstabe',
            'select_your_name': 'Wählen Sie Ihren Namen:',
            'back': 'Zurück',
            'no_entries': 'Keine Einträge',
            
            // PIN-Eingabe
            'enter_pin': 'PIN eingeben',
            'login': 'Anmelden',
            'pin_4digit_required': 'Bitte 4-stelligen PIN eingeben',
            
            // Registrierung
            'register': 'Neu registrieren',
            'first_name': 'Vorname',
            'first_name_placeholder': 'z.B. Maria',
            'pin_code': '4-stelliger PIN-Code',
            'register_btn': 'Registrieren',
            
            // Buchungsseite
            'search': 'Suchen...',
            'my_bookings': 'Meine Buchungen',
            'items': 'Artikel',
            'total_sum': 'Gesamtsumme',
            'just_booked': 'Gerade gebucht',
            'done_logout': 'Fertig & Abmelden',
            'logout': 'Abmelden',
            'booked': 'gebucht!',
            'cancel_booking': 'Buchung stornieren?',
            'cancel': 'Abbrechen',
            'book': 'Buchen',
            'quantity': 'Menge',
            'total': 'Gesamt',
            'per_piece': 'Stück',
            'article_not_found': 'Artikel nicht gefunden',
            'booking_error': 'Fehler beim Buchen',
            
            // Gruppen
            'select_group': 'Gruppe wählen',
            'hello': 'Hallo',
            'please_select_group': 'Bitte waehle deine Gruppe:',
            'group_saved': 'Die Gruppe wird für alle deine Buchungen gespeichert.',
            'group': 'Gruppe',
            
            // Fehlende Getränke
            'missing_drinks_yesterday': 'Fehlende Getränke vom Vortag',
            'please_take_if_forgot': 'Bitte uebernehmen, falls Sie diese vergessen haben zu buchen',
            
            // Kategorien
            'cat_all': 'Alle',
            'cat_alkoholfrei': 'Alkoholfreie Getränke',
            'cat_biere': 'Biere',
            'cat_weine': 'Weine',
            'cat_schnäpse': 'Schnäpse & Spirituosen',
            'cat_heiÃŸ': 'HeiÃŸe Getränke',
            'cat_suess': 'Suesses & Salziges',
            'cat_sonstiges': 'Sonstiges',
            
            // Allgemein
            'goodbye': 'Auf Wiedersehen!',
            'welcome': 'Willkommen',
            'offline_mode': 'Offline-Modus',
            'error': 'Fehler',
            'success': 'Erfolg',
            'language': 'Sprache',
            'message_read': 'Nachricht als gelesen markiert'
        },
        en: {
            // Login page
            'app_title': 'Söllerhaus Kassa',
            'app_subtitle': 'Self-Service Booking',
            'select_first_letter': 'Select the first letter:',
            'no_account': 'No account yet?',
            'register_new': 'Register now',
            'admin_login': 'Admin Login',
            'missing_drinks': 'Missing Drinks',
            'total': 'Total',
            'please_take_after_login': 'Please take after login',
            'message_from_team': 'Message from the team',
            'important_message': 'IMPORTANT MESSAGE!',
            'hours_visible': 'Visible for {h}h',
            'click_to_close': 'Click x to close',
            'read_close': 'Read & Close',
            
            // Name selection
            'letter': 'Letter',
            'select_your_name': 'Select your name:',
            'back': 'Back',
            'no_entries': 'No entries',
            
            // PIN entry
            'enter_pin': 'Enter PIN',
            'login': 'Login',
            'pin_4digit_required': 'Please enter a 4-digit PIN',
            
            // Registration
            'register': 'Register',
            'first_name': 'First Name',
            'first_name_placeholder': 'e.g. Maria',
            'pin_code': '4-digit PIN code',
            'register_btn': 'Register',
            
            // Booking page
            'search': 'Search...',
            'my_bookings': 'My Bookings',
            'items': 'items',
            'total_sum': 'Total',
            'just_booked': 'Just booked',
            'done_logout': 'Done & Logout',
            'logout': 'Logout',
            'booked': 'booked!',
            'cancel_booking': 'Cancel booking?',
            'cancel': 'Cancel',
            'book': 'Book',
            'quantity': 'Quantity',
            'total': 'Total',
            'per_piece': 'piece',
            'article_not_found': 'Article not found',
            'booking_error': 'Error while booking',
            
            // Groups
            'select_group': 'Select Group',
            'hello': 'Hello',
            'please_select_group': 'Please select your group:',
            'group_saved': 'The group will be saved for all your bookings.',
            'group': 'Group',
            
            // Missing drinks
            'missing_drinks_yesterday': 'Missing drinks from yesterday',
            'please_take_if_forgot': 'Please take if you forgot to book them',
            
            // Categories
            'cat_all': 'All',
            'cat_alkoholfrei': 'Soft Drinks',
            'cat_biere': 'Beers',
            'cat_weine': 'Wines',
            'cat_schnäpse': 'Spirits',
            'cat_heiÃŸ': 'Hot Drinks',
            'cat_suess': 'Sweets & Snacks',
            'cat_sonstiges': 'Other',
            
            // General
            'goodbye': 'Goodbye!',
            'welcome': 'Welcome',
            'offline_mode': 'Offline mode',
            'error': 'Error',
            'success': 'Success',
            'language': 'Language',
            'message_read': 'Message marked as read'
        }
    },
    
    // Sprache setzen
    setLang(lang) {
        if (this.translations[lang]) {
            this.currentLang = lang;
            localStorage.setItem('kassa_lang', lang);
            return true;
        }
        return false;
    },
    
    // Uebersetzung holen
    t(key, params = {}) {
        const lang = this.currentLang;
        let text = this.translations[lang]?.[key] || this.translations['de']?.[key] || key;
        
        // Parameter ersetzen (z.B. {h} durch Stundenzahl)
        for (const [k, v] of Object.entries(params)) {
            text = text.replace(`{${k}}`, v);
        }
        
        return text;
    },
    
    // Sprache umschalten
    toggle() {
        const newLang = this.currentLang === 'de' ? 'en' : 'de';
        this.setLang(newLang);
        return newLang;
    },
    
    // Button HTML rendern - oben mitte mit Flaggen (nur Sprache)
    renderLangButton() {
        const flag = this.currentLang === 'de' ? '' : '';
        const label = this.currentLang === 'de' ? 'English' : 'Deutsch';
        return `
        <div style="position:fixed;top:12px;left:0;right:0;display:flex;justify-content:center;align-items:center;gap:12px;z-index:1000;">
            <button onclick="toggleLanguage()" style="
                background:white;
                color:#333;
                border:1px solid #ddd;
                border-radius:20px;
                padding:6px 14px;
                font-size:0.85rem;
                font-weight:500;
                cursor:pointer;
                box-shadow:0 2px 6px rgba(0,0,0,0.1);
                display:flex;
                align-items:center;
                gap:6px;
            ">
                ${flag} ${label}
            </button>
        </div>`;
    },
    
    // Button HTML für Startseite mit Sprache UND WhatsApp
    renderLangButtonWithWhatsApp() {
        const flag = this.currentLang === 'de' ? '' : '';
        const label = this.currentLang === 'de' ? 'English' : 'Deutsch';
        return `
        <div style="position:fixed;top:12px;left:0;right:0;display:flex;justify-content:center;align-items:center;gap:10px;z-index:1000;">
            <button onclick="CheeseOrders.showModal()" style="
                background:linear-gradient(135deg, #f4d03f, #f39c12);
                color:#5d4e37;
                border:none;
                border-radius:20px;
                padding:6px 12px;
                font-size:0.8rem;
                font-weight:600;
                cursor:pointer;
                box-shadow:0 2px 6px rgba(243,156,18,0.3);
                display:flex;
                align-items:center;
                gap:5px;
            ">
                 Käsebestellung
            </button>
            <button onclick="toggleLanguage()" style="
                background:white;
                color:#333;
                border:1px solid #ddd;
                border-radius:20px;
                padding:6px 14px;
                font-size:0.85rem;
                font-weight:500;
                cursor:pointer;
                box-shadow:0 2px 6px rgba(0,0,0,0.1);
                display:flex;
                align-items:center;
                gap:6px;
            ">
                ${flag} ${label}
            </button>
            <button onclick="openWhatsAppSupport()" style="
                background:linear-gradient(135deg, #25D366, #128C7E);
                color:white;
                border:none;
                border-radius:20px;
                padding:6px 12px;
                font-size:0.8rem;
                font-weight:500;
                cursor:pointer;
                box-shadow:0 2px 6px rgba(37, 211, 102, 0.3);
                display:flex;
                align-items:center;
                gap:5px;
            ">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Fehler melden
            </button>
        </div>`;
    }
};
window.i18n = i18n;

// Sprache umschalten und Seite neu laden
window.toggleLanguage = () => {
    const newLang = i18n.toggle();
    Utils.showToast(newLang === 'en' ? ' English' : ' Deutsch', 'info');
    // Aktuelle Seite neu laden
    Router.handleRoute();
};

const State = {
    currentUser: null, currentPage: 'login', selectedCategory: null,
    isAdmin: false, currentPin: '', inactivityTimer: null, inactivityTimeout: 20000,
    sessionId: null,
    selectedGroup: null, // Ausgewählte Gruppe für aktuelle Session
    currentPreisModus: 'sv', // 'sv' = Selbstversorger, 'hp' = Halbpension
    async loadPreisModus() {
        this.currentPreisModus = await PreisModus.getModus();
        console.log(' Preismodus geladen:', this.currentPreisModus === 'hp' ? 'Halbpension' : 'Selbstversorger');
    },
    setUser(u) { 
        this.currentUser = u; 
        this.sessionId = Utils.uuid(); // Neue Session starten
        this.selectedGroup = u.group_name || null; // Gruppe aus User uebernehmen
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

const RegisteredGuests = {
    // Supabase Auth + Profile
    async register(firstName, password) {
        if (!firstName?.trim()) throw new Error('Name erforderlich');
        if (!password || password.length < 4) throw new Error('PIN muss mind. 4 Zeichen haben');
        
        // Name bereinigen und validieren
        const cleanName = firstName.trim().toUpperCase();
        
        // Nur Buchstaben, Leerzeichen und Bindestrich erlaubt
        if (!/^[A-ZÄÖÜa-zäöü][A-ZÄÖÜa-zäöü\s\-]*$/i.test(cleanName)) {
            throw new Error('Name darf nur Buchstaben und Bindestriche enthalten!');
        }
        
        // Prüfen ob Name schon vergeben - NUR bei AKTIVEN Gästen!
        if (supabaseClient && isOnline) {
            // Alle aktiven Profile laden und client-seitig prüfen (sicherer als ilike)
            const { data: allProfiles } = await supabaseClient
                .from('profiles')
                .select('vorname, first_name, display_name')
                .eq('geloescht', false)
                .eq('aktiv', true);
            
            if (allProfiles && allProfiles.length > 0) {
                const nameExists = allProfiles.find(p => {
                    const existingName = (p.display_name || p.vorname || p.first_name || '').toUpperCase().trim();
                    return existingName === cleanName;
                });
                
                if (nameExists) {
                    throw new Error('Dieser Name ist bereits vergeben! Bitte wähle einen anderen.');
                }
            }
        } else {
            const alleGäste = await db.registeredGuests.toArray();
            const nameExists = alleGäste.find(g => 
                ((g.nachname || g.firstName || '').toUpperCase().trim() === cleanName) && 
                !g.gelöscht && 
                g.aktiv !== false
            );
            if (nameExists) {
                throw new Error('Dieser Name ist bereits vergeben! Bitte wähle einen anderen.');
            }
        }
        
        // PIN-Duplikate sind erlaubt - keine Prüfung nötig
        
        // Generiere pseudo-Email für Supabase Auth
        const uniqueId = Utils.uuid().substring(0, 8);
        const email = `${cleanName.toLowerCase().replace(/[^a-z]/g, '')}.${uniqueId}@kassa.local`;
        
        // Supabase erfordert min. 6 Zeichen - PIN mit Prefix erweitern
        const supabasePassword = 'PIN_' + password + '_KASSA';
        
        if (supabaseClient && isOnline) {
            // Supabase SignUp
            const { data: authData, error: authError } = await supabaseClient.auth.signUp({
                email: email,
                password: supabasePassword,
                options: { data: { first_name: cleanName } }
            });
            
            if (authError) {
                console.error('Supabase SignUp Error:', authError);
                throw new Error('Registrierung fehlgeschlagen: ' + authError.message);
            }
            
            const userId = authData.user.id;
            console.log('✅ Auth SignUp OK, User ID:', userId);
            
            // Warte auf Trigger (Profile wird automatisch erstellt)
            await new Promise(r => setTimeout(r, 1000));
            
            // Profile mit PIN updaten - mehrere Versuche
            let pinSaved = false;
            for (let i = 0; i < 3; i++) {
                try {
                    // Erst prüfen ob Profile existiert
                    const { data: existingProfile } = await supabaseClient
                        .from('profiles')
                        .select('id')
                        .eq('id', userId)
                        .single();
                    
                    if (existingProfile) {
                        // Update
                        const { error: updateError } = await supabaseClient
                            .from('profiles')
                            .update({ 
                                pin_hash: password,
                                vorname: cleanName,
                                group_name: 'keiner Gruppe zugehörig',
                                aktiv: true,
                                geloescht: false
                            })
                            .eq('id', userId);
                        
                        if (!updateError) {
                            console.log('✅ PIN in Profile gespeichert (Update)');
                            pinSaved = true;
                            break;
                        }
                    } else {
                        // Insert falls Profile noch nicht existiert
                        const { error: insertError } = await supabaseClient
                            .from('profiles')
                            .insert({ 
                                id: userId,
                                email: email,
                                pin_hash: password,
                                vorname: cleanName,
                                first_name: cleanName,
                                group_name: 'keiner Gruppe zugehörig',
                                aktiv: true,
                                geloescht: false,
                                created_at: new Date().toISOString()
                            });
                        
                        if (!insertError) {
                            console.log('✅ PIN in Profile gespeichert (Insert)');
                            pinSaved = true;
                            break;
                        }
                    }
                } catch(e) {
                    console.log(`Versuch ${i+1} fehlgeschlagen:`, e);
                }
                await new Promise(r => setTimeout(r, 500));
            }
            
            if (!pinSaved) {
                console.error(' PIN konnte nicht in Supabase gespeichert werden!');
            }
            
            // Profile laden zur Bestätigung
            const { data: profile } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();
            
            console.log('Profile nach Speichern:', profile?.vorname, 'PIN:', profile?.pin_hash ? 'JA' : 'NEIN');
            
            // Lokalen Cache aktualisieren - MIT PIN als Klartext!
            const localGuest = { 
                id: userId, 
                firstName: cleanName,
                nachname: cleanName,
                email: email,
                passwort: password,  // PIN als Klartext!
                passwordHash: password,
                gruppenname: 'keiner Gruppe zugehörig',
                ausnahmeumlage: false,
                aktiv: true,
                createdAt: new Date().toISOString(),
                geloescht: false 
            };
            try { await db.registeredGuests.add(localGuest); } catch(e) {}
            
            // WICHTIG: Nach Registrierung explizit einloggen für aktive Session!
            // (sonst funktionieren Buchungen nicht wegen RLS)
            try {
                console.log(' Expliziter Login nach Registrierung...');
                const { data: loginData, error: loginError } = await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: supabasePassword
                });
                if (loginError) {
                    console.warn('Login nach Registrierung fehlgeschlagen:', loginError);
                } else {
                    console.log('✅ Session nach Registrierung aktiv');
                }
            } catch(e) {
                console.warn('Login-Versuch fehlgeschlagen:', e);
            }
            
            Utils.showToast('Registrierung erfolgreich!', 'success');
            
            // WICHTIG: User-Objekt mit korrekter ID erstellen
            const userObj = {
                id: userId,  // UUID aus Supabase Auth - EXPLIZIT setzen!
                firstName: cleanName,
                nachname: cleanName,
                email: email,
                group_name: 'keiner Gruppe zugehörig',
                gruppenname: 'keiner Gruppe zugehörig'
            };
            console.log(' setUser mit ID:', userObj.id);
            State.setUser(userObj);
            return localGuest;
        } else {
            // Offline-Modus: Lokal speichern MIT PIN als Klartext!
            const guest = { 
                id: Utils.uuid(),
                firstName: cleanName, 
                nachname: cleanName,
                passwort: password,  // PIN als Klartext!
                passwordHash: password,
                gruppenname: 'keiner Gruppe zugehörig',
                ausnahmeumlage: false,
                aktiv: true,
                createdAt: new Date().toISOString(), 
                geloescht: false, 
                pendingSync: true 
            };
            await db.registeredGuests.add(guest);
            Utils.showToast('Registrierung erfolgreich!', 'success');
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
            if (profile.geloescht || profile.gelöscht) throw new Error('Account deaktiviert');
            if (profile.aktiv === false) throw new Error('Du hast bereits ausgecheckt. Bitte wende dich an die Rezeption.');
            
            // WICHTIG: Prüfen ob Email vorhanden ist (für Auth Session)
            if (!profile.email) {
                // Gast wurde ohne Auth User angelegt - KEIN Login erlaubt!
                console.error('❌ Gast hat keine Email - kein Supabase Auth Account');
                throw new Error('Login fehlgeschlagen. Bitte später nochmal versuchen.');
            }
            
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
            
            // WICHTIG: User-Objekt mit EXPLIZITER ID erstellen
            // (verhindert dass profile.id undefined ist und die richtige ID ueberschreibt)
            const user = { 
                ...data.user, 
                ...profile, 
                id: id,  // ID EXPLIZIT setzen - die uebergebene ID ist korrekt!
                firstName: profile.first_name || profile.vorname || profile.display_name
            };
            console.log(' Login setUser mit ID:', user.id);
            State.setUser(user);
            Utils.showToast(`Willkommen, ${user.firstName}!`, 'success');
            return user;
        } else {
            // Offline: Kein Login möglich - brauchen Supabase für Buchungen
            throw new Error('Keine Internetverbindung. Bitte später nochmal versuchen.');
        }
    },
    
    async getByFirstLetter(letter) {
        // IMMER zuerst von Supabase laden wenn online
        if (supabaseClient && isOnline) {
            try {
                console.log(' Lade Gäste für Buchstabe', letter, 'von Supabase...');
                
                // Alle Profile laden (wir filtern client-seitig)
                const { data, error } = await supabaseClient
                    .from('profiles')
                    .select('*')
                    .order('display_name');
                
                if (error) {
                    console.error(' Supabase Fehler:', error);
                } else if (data) {
                    // Client-seitig filtern: Buchstabe + nicht gelöscht + aktiv
                    const filtered = data.filter(p => {
                        const name = (p.display_name || p.first_name || '').toUpperCase();
                        const startsWithLetter = name.startsWith(letter.toUpperCase());
                        const isNotDeleted = p.geloescht !== true && p.gelöscht !== true;  // Beide Schreibweisen prüfen
                        const isActive = p.aktiv !== false;  // Nur aktive Gäste
                        return startsWithLetter && isNotDeleted && isActive;
                    });
                    
                    // DEDUPLIZIERUNG: Nur einzigartige Namen behalten (ersten Eintrag pro Name)
                    const seenNames = new Set();
                    const deduplicated = filtered.filter(p => {
                        const name = (p.display_name || p.first_name || '').toUpperCase().trim();
                        if (seenNames.has(name)) {
                            return false; // Duplikat überspringen
                        }
                        seenNames.add(name);
                        return true;
                    });
                    
                    console.log('✅ Gefunden für', letter + ':', deduplicated.length, '(nach Deduplizierung)');
                    
                    if (deduplicated.length > 0) {
                        return deduplicated.map(g => {
                            const name = g.display_name || g.first_name;
                            return { 
                                ...g, 
                                id: g.id, 
                                firstName: name, 
                                nachname: name, 
                                displayName: name 
                            };
                        });
                    }
                    return [];
                }
            } catch(e) {
                console.error(' Supabase error:', e);
            }
        }
        
        // Fallback: Fehler wenn offline
        console.error('❌ Keine Verbindung zu Supabase');
        return [];
    },
    
    async getAll() { 
        if (supabaseClient && isOnline) {
            const { data } = await supabaseClient.from('profiles').select('*').eq('geloescht', false).eq('aktiv', true).order('first_name');
            return (data || []).map(g => ({ ...g, firstName: g.first_name }));
        }
        const all = await db.registeredGuests.toArray();
        return all.filter(g => !g.gelöscht && g.aktiv !== false);
    },
    
    async getGelöschte() {
        if (supabaseClient && isOnline) {
            const { data } = await supabaseClient.from('profiles').select('*').eq('geloescht', true);
            return (data || []).map(g => ({ ...g, firstName: g.first_name }));
        }
        const all = await db.registeredGuests.toArray();
        return all.filter(g => g.gelöscht);
    },
    
    async softDelete(id) { 
        if (supabaseClient && isOnline) {
            await supabaseClient.from('profiles').update({ geloescht: true, geloescht_am: new Date().toISOString() }).eq('id', id);
        }
        try { await db.registeredGuests.update(id, { gelöscht: true, gelöschtAm: new Date().toISOString() }); } catch(e) {}
        Utils.showToast('Gast in Papierkorb verschoben', 'success'); 
    },
    
    async restore(id) {
        if (supabaseClient && isOnline) {
            await supabaseClient.from('profiles').update({ geloescht: false, geloescht_am: null }).eq('id', id);
        }
        try { await db.registeredGuests.update(id, { geloescht: false, gelöschtAm: null }); } catch(e) {}
        Utils.showToast('Gast wiederhergestellt', 'success');
    },
    
    async deletePermanent(id) { 
        if (supabaseClient && isOnline) {
            await supabaseClient.from('profiles').delete().eq('id', id);
        }
        try { await db.registeredGuests.delete(id); } catch(e) {}
        Utils.showToast('Gast endgueltig gelöscht', 'success'); 
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
        const g = await db.gäste.get(id);
        if (!g) throw new Error('Nicht gefunden');
        if (g.checked_out) throw new Error('Ausgecheckt');
        if (await Utils.hashPassword(pin, g.vorname) !== g.passwort_hash) throw new Error('Falsche PIN');
        State.setUser(g);
        Utils.showToast(`Willkommen, ${g.vorname}!`, 'success');
        return g;
    },
    async getGästeByLetter(letter) {
        const reg = await RegisteredGuests.getByFirstLetter(letter);
        const legacy = (await db.gäste.toArray()).filter(g => g.vorname?.toUpperCase().startsWith(letter.toUpperCase()) && g.aktiv && !g.checked_out).map(g => ({...g, firstName: g.vorname, displayName: g.vorname, isLegacy: true}));
        return [...reg, ...legacy].sort((a,b) => (a.firstName||a.vorname).localeCompare(b.firstName||b.vorname));
    },
    async adminLogin(pw) {
        // Standard Admin-Passwort Hash für 'admin123'
        const defaultHash = '6c720cb9fbe0bf0b4889db0cbca428857f838046fdb7b56a709397d4b7e2609f';
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
                    if (profile && !profile.geloescht && !profile.gelöscht) {
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
            const g = type === 'registered' ? await db.registeredGuests.get(parseInt(id)) : await db.gäste.get(id);
            if (g && !g.checked_out) { State.setUser(g); return true; }
        }
        return false;
    }
};

const Buchungen = {
    // EINZELBUCHUNGEN: Bei Menge 5 werden 5 separate Buchungen erstellt (für Access/Registrierkasse)
    async create(artikel, menge=1) {
        if (!State.currentUser) throw new Error('Nicht angemeldet');
        
        // User ID sicher ermitteln
        let userId = State.currentUser.id || State.currentUser.gast_id;
        if (!userId) userId = localStorage.getItem('current_user_id');
        if (!userId) throw new Error('Benutzer-ID nicht gefunden - bitte neu anmelden');
        
        console.log(' Buchung erstellen für User:', userId, 'Menge:', menge);
        
        // Preis basierend auf aktivem Preismodus
        const preis = PreisModus.getPreis(artikel, State.currentPreisModus);
        
        // Basis-Daten für alle Buchungen
        const basisDaten = {
            user_id: String(userId),
            gast_id: String(userId),
            gast_vorname: State.currentUser.firstName || State.currentUser.first_name || State.currentUser.vorname || '',
            gast_nachname: State.currentUser.nachname || '',
            gastgruppe: State.currentUser.zimmernummer || '',
            group_name: State.selectedGroup || State.currentUser.group_name || '',
            artikel_id: artikel.artikel_id, 
            artikel_name: artikel.name, 
            preis: parseFloat(preis),
            preis_modus: State.currentPreisModus,
            steuer_prozent: artikel.steuer_prozent || 10, 
            datum: Utils.getBuchungsDatum(),
            uhrzeit: Utils.formatTime(new Date()),
            exportiert: false,
            aufgefuellt: false,
            gerät_id: Utils.getDeviceId(), 
            session_id: State.sessionId,
            storniert: false,
            fix: false,
            aus_fehlend: false,
            ist_umlage: false
        };
        
        // WICHTIG: Nur Supabase - kein lokaler Fallback!
        if (!supabaseClient || !isOnline) {
            throw new Error('Keine Internetverbindung. Bitte später nochmal versuchen.');
        }
        
        // Session prüfen - ABER Admin darf immer buchen!
        if (!State.isAdmin) {
            const { data: sessionData } = await supabaseClient.auth.getSession();
            if (!sessionData?.session) {
                throw new Error('Verbindungsfehler. Bitte abmelden, neu anmelden und nochmal versuchen.');
            }
        }
        
        // LOOP: Für jede Einheit eine separate Buchung erstellen
        const erstellteBuchungen = [];
        for (let i = 0; i < parseInt(menge); i++) {
            const b = {
                ...basisDaten,
                buchung_id: Utils.uuid(),
                menge: 1, // IMMER 1 pro Buchung!
                erstellt_am: new Date().toISOString()
            };
            
            // NUR Supabase - kein lokaler Fallback!
            const { error } = await supabaseClient.from('buchungen').insert(b);
            if (error) {
                console.error('❌ Supabase insert error:', error.message);
                throw new Error('Buchung fehlgeschlagen. Bitte nochmal versuchen.');
            }
            
            console.log('✅ Buchung nach Supabase:', b.buchung_id);
            erstellteBuchungen.push(b);
        }
        
        console.log('✅', menge, 'Einzelbuchung(en) erstellt für:', artikel.name);
        return erstellteBuchungen[0];
    },

    async storno(buchung_id) {
        // NUR über Supabase
        if (!supabaseClient || !isOnline) {
            throw new Error('Keine Internetverbindung. Bitte später nochmal versuchen.');
        }
        
        // Buchung von Supabase laden
        const { data: b, error } = await supabaseClient
            .from('buchungen')
            .select('*')
            .eq('buchung_id', buchung_id)
            .single();
        
        if (error || !b) throw new Error('Buchung nicht gefunden');
        if (!State.isAdmin && b.fix) throw new Error('Buchung bereits abgeschlossen');
        
        const update = { storniert: true, storniert_am: new Date().toISOString() };
        
        // NUR Supabase updaten
        const { error: updateError } = await supabaseClient
            .from('buchungen')
            .update(update)
            .eq('buchung_id', buchung_id);
        
        if (updateError) {
            throw new Error('Stornierung fehlgeschlagen. Bitte nochmal versuchen.');
        }
        
        Utils.showToast('Buchung storniert', 'success');
    },
    
    async fixSessionBuchungen() {
        if (!State.sessionId) return;
        if (!supabaseClient || !isOnline) return;
        
        const userId = State.currentUser?.id || State.currentUser?.gast_id;
        
        try {
            // NUR Supabase
            if (userId) {
                await supabaseClient.rpc('fix_session_buchungen', {
                    p_session_id: State.sessionId,
                    p_user_id: userId
                });
            }
            
            await DataProtection.createBackup();
        } catch (e) {
            console.error('fixSessionBuchungen error:', e);
        }
    },
    
    async getByGast(id, limit=null) {
        // NUR Supabase!
        if (!supabaseClient || !isOnline) {
            console.error('❌ Keine Verbindung zu Supabase');
            return [];
        }
        
        let query = supabaseClient
            .from('buchungen')
            .select('*')
            .eq('user_id', id)
            .eq('storniert', false)
            .order('erstellt_am', { ascending: false });
        
        if (limit) query = query.limit(limit);
        const { data, error } = await query;
        
        if (error) {
            console.error('❌ getByGast error:', error);
            return [];
        }
        
        return (data || []).map(b => ({ ...b, gast_id: b.user_id }));
    },
    
    async getSessionBuchungen() {
        if (!State.sessionId) return [];
        if (!supabaseClient || !isOnline) return [];
        
        try {
            // Session-Buchungen von Supabase
            const { data, error } = await supabaseClient
                .from('buchungen')
                .select('*')
                .eq('session_id', State.sessionId)
                .eq('storniert', false)
                .order('erstellt_am', { ascending: false });
            
            if (error) {
                console.error('❌ getSessionBuchungen error:', error);
                return [];
            }
            
            return data || [];
        } catch (e) {
            console.error('❌ getSessionBuchungen error:', e);
            return [];
        }
    },
    
    async getAll(filter={}) {
        // NUR Supabase - kein lokaler Fallback!
        if (!supabaseClient || !isOnline) {
            console.error('❌ Keine Verbindung zu Supabase');
            return [];
        }
        
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
                console.error('❌ Buchungen.getAll Supabase error:', error);
                return [];
            }
            
            console.log('✅ Buchungen von Supabase geladen:', data.length);
            return data.map(b => ({ ...b, gast_id: b.user_id }));
        } catch(e) {
            console.error('❌ Buchungen.getAll error:', e);
            return [];
        }
    },
    
    async getAuffuellliste() {
        // NUR Supabase!
        if (!supabaseClient || !isOnline) {
            console.error('❌ Keine Verbindung zu Supabase');
            return [];
        }
        
        try {
            const { data, error } = await supabaseClient
                .from('buchungen')
                .select('*')
                .eq('storniert', false)
                .or('aufgefuellt.is.null,aufgefuellt.eq.false')
                .order('erstellt_am', { ascending: false });
            
            if (error) {
                console.error('❌ getAuffuellliste error:', error);
                return [];
            }
            
            // Umlagen ausfiltern
            const bs = (data || []).filter(b => !b.ist_umlage);
            
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
        } catch(e) {
            console.error('❌ getAuffuellliste error:', e);
            return [];
        }
    },
    
    // Nur Auffüllliste zurücksetzen (NICHT Export!)
    async markAsAufgefuellt() {
        // NUR Supabase!
        if (!supabaseClient || !isOnline) {
            throw new Error('Keine Internetverbindung. Bitte später nochmal versuchen.');
        }
        
        const { data, error } = await supabaseClient
            .from('buchungen')
            .select('buchung_id')
            .eq('storniert', false)
            .or('aufgefuellt.is.null,aufgefuellt.eq.false');
        
        if (error) {
            console.error('❌ markAsAufgefuellt error:', error);
            throw new Error('Fehler beim Laden der Buchungen.');
        }
        
        const ids = (data || []).map(b => b.buchung_id);
        const update = { aufgefuellt: true, aufgefuellt_am: new Date().toISOString() };
        
        // NUR Supabase updaten
        for (const id of ids) {
            await supabaseClient.from('buchungen').update(update).eq('buchung_id', id);
        }
        
        console.log(`✅ ${ids.length} Buchungen als aufgefuellt markiert`);
    },
    
    // Legacy - nicht mehr benutzen
    async resetAuffuellliste() {
        await this.markAsAufgefuellt();
    },
    
    async markAsExported(ids) { 
        // NUR Supabase!
        if (!supabaseClient || !isOnline) {
            throw new Error('Keine Internetverbindung. Bitte später nochmal versuchen.');
        }
        
        const update = { exportiert: true, exportiert_am: new Date().toISOString() };
        for (const id of ids) {
            await supabaseClient.from('buchungen').update(update).eq('buchung_id', id);
        }
    }
};

// ===========================================
// SYNC MANAGER - Garantierte Buchungs-Synchronisation
// ===========================================
const SyncManager = {
    syncInterval: null,
    isSyncing: false,
    
    // Status: 'green' = online, 'red' = offline (kein 'yellow' mehr - alles geht direkt zu Supabase)
    async getStatus() {
        if (!isOnline) return { status: 'red', pending: 0, message: 'Offline' };
        return { status: 'green', pending: 0, message: 'Verbunden' };
    },
    
    // Nicht mehr benötigt - aber für Kompatibilität behalten
    async getPendingCount() {
        return 0; // Keine pending Buchungen mehr - alles geht direkt zu Supabase
    },
    
    // Nicht mehr benötigt - aber für Kompatibilität behalten
    async syncPending() {
        return { synced: 0, failed: 0 };
    },
    
    // Ampel-HTML generieren
    getAmpelHtml() {
        return `<div id="sync-ampel" onclick="SyncManager.showDetails()" style="cursor:pointer;display:flex;align-items:center;gap:6px;padding:4px 10px;border-radius:20px;background:rgba(255,255,255,0.9);font-size:0.8rem;"></div>`;
    },
    
    // Ampel aktualisieren
    async updateUI() {
        const ampelEl = document.getElementById('sync-ampel');
        if (!ampelEl) return;
        
        const { status, message } = await this.getStatus();
        
        const colors = {
            green: '#27ae60',
            red: '#e74c3c'
        };
        
        const icons = {
            green: '🟢',
            red: '🔴'
        };
        
        ampelEl.innerHTML = `${icons[status]} <span style="color:${colors[status]};font-weight:600;">${message}</span>`;
        ampelEl.title = status === 'green' ? 'Mit Supabase verbunden' : 'Offline - Keine Buchungen möglich';
    },
    
    // Details Modal anzeigen
    async showDetails() {
        const { status } = await this.getStatus();
        
        let message = '';
        if (status === 'green') {
            message = '✅ Mit Supabase verbunden - Alle Buchungen werden direkt synchronisiert!';
        } else {
            message = '🔴 Du bist offline.\n\nBitte stelle eine Internetverbindung her um zu buchen.';
        }
        
        Utils.showToast(message, status === 'green' ? 'success' : 'error');
    },
    
    // Hintergrund-Sync (nur noch UI Update)
    startBackgroundSync() {
        if (this.syncInterval) return;
        
        console.log('🔄 SyncManager: Status-Check gestartet');
        this.updateUI();
        
        // Alle 30 Sekunden Status prüfen
        this.syncInterval = setInterval(() => {
            this.updateUI();
        }, 30000);
    },
    
    // Stoppen
    stopBackgroundSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }
};

// Global verfügbar machen
window.SyncManager = SyncManager;

// Fehlende Getränke Management
const FehlendeGetränke = {
    async add(artikel_id, menge = 1) {
        const artikel = await Artikel.getById(artikel_id);
        if (!artikel) throw new Error('Artikel nicht gefunden');
        
        // Vortag relativ zum aktuellen Buchungstag (7:00-7:00 Periode)
        const datumVortag = Utils.getVortagBuchungsDatum();
        
        const items = [];
        for (let i = 0; i < menge; i++) {
            items.push({
                artikel_id: artikel.artikel_id,
                artikel_name: artikel.name,
                artikel_preis: artikel.preis,
                kategorie_id: artikel.kategorie_id,
                icon: artikel.icon || '',
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
        Utils.showToast(`${menge}x ${artikel.name} als fehlend markiert`, 'success');
    },
    
    async getOffene() {
        // NUR Supabase!
        if (!supabaseClient || !isOnline) {
            console.error('❌ Keine Verbindung zu Supabase');
            return [];
        }
        
        try {
            const { data, error } = await supabaseClient
                .from('fehlende_getraenke')
                .select('*')
                .eq('uebernommen', false)
                .order('id', { ascending: false });
            
            if (error) {
                console.error('❌ getOffene error:', error);
                return [];
            }
            
            return data || [];
        } catch(e) {
            console.error('❌ getOffene error:', e);
            return [];
        }
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
            gerät_id: Utils.getDeviceId(),
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
        Utils.showToast(`${fehlend.artikel_name} uebernommen!`, 'success');
        return b;
    },
    
    async löschen(id) {
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
    // Einstellung: Gruppenabfrage aktiv?
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
    
    // Alle Gruppen laden
    async getAll() {
        if (supabaseClient && isOnline) {
            try {
                const { data } = await supabaseClient
                    .from('gruppen')
                    .select('*')
                    .eq('aktiv', true)
                    .order('id');
                if (data && data.length > 0) {
                    // Lokal cachen
                    for (const g of data) {
                        try { await db.gruppen.put(g); } catch(e) {}
                    }
                    return data;
                }
            } catch(e) {
                console.error('Gruppen laden Fehler:', e);
            }
        }
        // Fallback: Lokal
        return await db.gruppen.where('aktiv').equals(1).toArray();
    },
    
    // Gruppe hinzufügen (max 3)
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
        
        // ZUERST Supabase (wenn online) - bekommt eigene ID
        if (supabaseClient && isOnline) {
            try {
                const { data, error } = await supabaseClient
                    .from('gruppen')
                    .insert({ 
                        name: gruppe.name, 
                        aktiv: true, 
                        erstellt_am: gruppe.erstellt_am 
                    })
                    .select()
                    .single();
                
                if (error) {
                    console.error('Gruppe Supabase insert error:', error);
                    throw new Error('Gruppe konnte nicht gespeichert werden: ' + error.message);
                }
                
                if (data) {
                    console.log('✅ Gruppe in Supabase gespeichert:', data);
                    // Lokal mit Supabase-ID speichern
                    gruppe.id = data.id;
                    try { await db.gruppen.put(gruppe); } catch(e) {}
                    return data;
                }
            } catch(e) {
                console.error('Gruppe sync error:', e);
                throw e;
            }
        }
        
        // Fallback: Nur lokal speichern (offline)
        const id = await db.gruppen.add(gruppe);
        gruppe.id = id;
        return gruppe;
    },
    
    // Gruppe bearbeiten
    async update(id, name) {
        if (!name || name.trim() === '') {
            throw new Error('Gruppenname erforderlich');
        }
        
        await db.gruppen.update(id, { name: name.trim() });
        
        if (supabaseClient && isOnline) {
            await supabaseClient.from('gruppen').update({ name: name.trim() }).eq('id', id);
        }
    },
    
    // Gruppe löschen (soft delete)
    async delete(id) {
        await db.gruppen.update(id, { aktiv: false });
        
        if (supabaseClient && isOnline) {
            await supabaseClient.from('gruppen').update({ aktiv: false }).eq('id', id);
        }
    },
    
    // Prüfen ob mindestens eine Gruppe existiert (wenn Abfrage aktiv)
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

// ============ GAeSTE-NACHRICHTEN ============
const GastNachrichten = {
    // Nachricht an Gast senden (18 Stunden gueltig)
    async senden(gast_id, gastName, nachricht, stunden = 18) {
        if (!nachricht?.trim()) throw new Error('Nachricht erforderlich');
        
        const jetzt = new Date();
        const gueltigBis = new Date(jetzt.getTime() + (stunden * 60 * 60 * 1000));
        
        const msg = {
            gast_id: String(gast_id),
            gast_name: gastName,
            nachricht: nachricht.trim(),
            erstellt_am: jetzt.toISOString(),
            gueltig_bis: gueltigBis.toISOString(),
            gelesen: false,
            erledigt: false
        };
        
        const id = await db.gastNachrichten.add(msg);
        msg.id = id;
        
        // Supabase sync
        if (supabaseClient && isOnline) {
            try {
                await supabaseClient.from('gast_nachrichten').insert(msg);
            } catch(e) {
                console.error('Nachricht sync error:', e);
            }
        }
        
        console.log(' Nachricht gesendet an', gastName, '- gueltig bis', gueltigBis.toLocaleString('de-AT'));
        return msg;
    },
    
    // Aktive Nachrichten für einen Gast holen
    async getAktiveForGast(gast_id) {
        const jetzt = new Date().toISOString();
        const alle = await db.gastNachrichten.toArray();
        
        return alle.filter(n => 
            String(n.gast_id) === String(gast_id) && 
            !n.erledigt && 
            n.gueltig_bis > jetzt
        ).sort((a, b) => new Date(b.erstellt_am) - new Date(a.erstellt_am));
    },
    
    // Alle aktiven Nachrichten (für Login-Seite)
    async getAlleAktiven() {
        const jetzt = new Date().toISOString();
        const alle = await db.gastNachrichten.toArray();
        
        return alle.filter(n => 
            !n.erledigt && 
            n.gueltig_bis > jetzt
        ).sort((a, b) => new Date(b.erstellt_am) - new Date(a.erstellt_am));
    },
    
    // Alle Nachrichten (für Admin)
    async getAll() {
        return await db.gastNachrichten.orderBy('id').reverse().toArray();
    },
    
    // Nachricht als gelesen markieren (Gast drueckt weg)
    async markiereGelesen(id) {
        await db.gastNachrichten.update(id, { 
            gelesen: true, 
            gelesen_am: new Date().toISOString() 
        });
        
        if (supabaseClient && isOnline) {
            try {
                await supabaseClient.from('gast_nachrichten').update({ 
                    gelesen: true, 
                    gelesen_am: new Date().toISOString() 
                }).eq('id', id);
            } catch(e) {}
        }
    },
    
    // Nachricht als erledigt markieren (Admin)
    async markiereErledigt(id) {
        await db.gastNachrichten.update(id, { 
            erledigt: true, 
            erledigt_am: new Date().toISOString() 
        });
        
        if (supabaseClient && isOnline) {
            try {
                await supabaseClient.from('gast_nachrichten').update({ 
                    erledigt: true, 
                    erledigt_am: new Date().toISOString() 
                }).eq('id', id);
            } catch(e) {}
        }
        
        Utils.showToast('Nachricht als erledigt markiert', 'success');
    },
    
    // Nachricht löschen
    async löschen(id) {
        await db.gastNachrichten.delete(id);
        
        if (supabaseClient && isOnline) {
            try {
                await supabaseClient.from('gast_nachrichten').delete().eq('id', id);
            } catch(e) {}
        }
        
        Utils.showToast('Nachricht gelöscht', 'success');
    },
    
    // Abgelaufene Nachrichten aufraeumen
    async cleanupAbgelaufene() {
        const jetzt = new Date().toISOString();
        const alle = await db.gastNachrichten.toArray();
        const abgelaufen = alle.filter(n => n.gueltig_bis < jetzt);
        
        for (const n of abgelaufen) {
            await db.gastNachrichten.delete(n.id);
        }
        
        if (abgelaufen.length > 0) {
            console.log(' ' + abgelaufen.length + ' abgelaufene Nachrichten gelöscht');
        }
    }
};

// ============ PREISMODUS-VERWALTUNG (HP / Selbstversorger) ============
const PreisModus = {
    SELBSTVERSORGER: 'sv',
    HP: 'hp',
    
    // Aktuellen Modus laden - ZUERST von Supabase!
    async getModus() {
        // Supabase hat Priorität (zentrale Einstellung)
        if (supabaseClient && isOnline) {
            try {
                const { data, error } = await supabaseClient
                    .from('settings')
                    .select('value')
                    .eq('key', 'preismodus')
                    .single();
                
                if (!error && data?.value) {
                    // Lokal synchronisieren
                    await db.settings.put({ key: 'preismodus', value: data.value });
                    console.log(' Preismodus von Supabase geladen:', data.value);
                    return data.value;
                }
            } catch(e) {
                console.log('Preismodus Supabase Fehler, nutze lokal:', e);
            }
        }
        
        // Fallback: Lokal
        const setting = await db.settings.get('preismodus');
        return setting?.value || this.SELBSTVERSORGER; // Default: Selbstversorger
    },
    
    // Modus setzen
    async setModus(modus) {
        // Zuerst lokal speichern
        await db.settings.put({ key: 'preismodus', value: modus });
        
        // Dann Supabase (zentral)
        if (supabaseClient && isOnline) {
            try {
                // Erst prüfen ob existiert, dann update oder insert
                const { data: existing } = await supabaseClient
                    .from('settings')
                    .select('key')
                    .eq('key', 'preismodus')
                    .single();
                
                if (existing) {
                    // Update
                    await supabaseClient
                        .from('settings')
                        .update({ value: modus })
                        .eq('key', 'preismodus');
                } else {
                    // Insert
                    await supabaseClient
                        .from('settings')
                        .insert({ key: 'preismodus', value: modus });
                }
                console.log(' Preismodus in Supabase gespeichert:', modus);
            } catch(e) {
                console.error('Preismodus Supabase Speichern Fehler:', e);
            }
        }
        console.log(' Preismodus geändert auf:', modus === this.HP ? 'Halbpension' : 'Selbstversorger');
    },
    
    // Modus-Namen für Anzeige
    getModusName(modus) {
        return modus === this.HP ? 'Halbpension (HP)' : 'Selbstversorger';
    },
    
    // Preis für Artikel basierend auf Modus
    getPreis(artikel, modus = null) {
        const m = modus || State.currentPreisModus || this.SELBSTVERSORGER;
        if (m === this.HP) {
            return artikel.preis_hp ?? artikel.preis ?? 0;
        }
        return artikel.preis ?? 0;
    },
    
    // Beide Preise für Anzeige
    getBeidePreise(artikel) {
        return {
            sv: artikel.preis ?? 0,
            hp: artikel.preis_hp ?? artikel.preis ?? 0
        };
    }
};

// Umlage auf alle Gäste
const Umlage = {
    async bucheAufAlle(artikel_id, beschreibung = 'Umlage') {
        // NUR Supabase!
        if (!supabaseClient || !isOnline) {
            throw new Error('Keine Internetverbindung. Bitte später nochmal versuchen.');
        }
        
        const artikel = await Artikel.getById(artikel_id);
        if (!artikel) throw new Error('Artikel nicht gefunden');
        
        // Alle aktiven Gäste von Supabase holen
        const { data: profiles, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('aktiv', true)
            .eq('geloescht', false);
        
        if (error) throw new Error('Fehler beim Laden der Gäste');
        
        // WICHTIG: Gäste mit Ausnahme Umlage filtern!
        const alleGäste = (profiles || []).filter(g => g.ausnahmeumlage !== true);
        const ausgenommen = (profiles || []).length - alleGäste.length;
        
        if (alleGäste.length === 0) throw new Error('Keine aktiven Gäste für Umlage');
        
        // Preis pro Gast berechnen (aufgerundet auf 2 Dezimalen)
        const preisProGast = Math.ceil((artikel.preis / alleGäste.length) * 100) / 100;
        
        const heute = Utils.getBuchungsDatum();
        const uhrzeit = Utils.formatTime(new Date());
        
        let erfolg = 0;
        let fehler = 0;
        
        // Für jeden Gast eine Buchung erstellen - DIREKT nach Supabase
        for (const gast of alleGäste) {
            const gastId = gast.id;
            const gastName = gast.vorname || gast.display_name || gast.first_name;
            
            const b = {
                buchung_id: Utils.uuid(),
                user_id: gastId,
                gast_vorname: gastName,
                artikel_id: 324,
                artikel_name: 'Umlage',
                preis: preisProGast,
                menge: 1,
                datum: heute,
                uhrzeit: uhrzeit,
                erstellt_am: new Date().toISOString(),
                storniert: false,
                exportiert: false,
                group_name: gast.group_name || 'keiner Gruppe zugehoerig'
            };
            
            // Direkt nach Supabase
            const { data, error: insertError } = await supabaseClient.from('buchungen').insert(b).select();
            if (insertError) {
                console.error('❌ Umlage Buchung Fehler:', gastName, insertError.message, insertError.details);
                fehler++;
            } else {
                console.log('✅ Umlage gebucht für:', gastName, data);
                erfolg++;
            }
        }
        
        if (ausgenommen > 0) {
            Utils.showToast(`Umlage: ${Utils.formatCurrency(preisProGast)} auf ${erfolg} Gäste verteilt (${ausgenommen} ausgenommen)`, 'success');
        } else {
            Utils.showToast(`Umlage: ${Utils.formatCurrency(preisProGast)} auf ${erfolg} Gäste verteilt`, 'success');
        }
        
        return { preisProGast, anzahlGäste: erfolg, ausgenommen, fehler };
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
    
    // Prüft ob ein Artikel zeitlich abgelaufen ist
    istAbgelaufen(artikel) {
        if (!artikel.aktiv_bis) return false;
        return new Date(artikel.aktiv_bis) < new Date();
    },
    
    // Automatisch abgelaufene Artikel deaktivieren
    async cleanupAbgelaufene() {
        const alle = await db.artikel.toArray();
        let deaktiviert = 0;
        
        for (const a of alle) {
            if (a.aktiv && a.aktiv_bis && new Date(a.aktiv_bis) < new Date()) {
                await db.artikel.update(a.artikel_id, { aktiv: false });
                if (supabaseClient && isOnline) {
                    try {
                        await supabaseClient.from('artikel').update({ aktiv: false }).eq('artikel_id', a.artikel_id);
                    } catch(e) {}
                }
                deaktiviert++;
                console.log(`⏰ Artikel "${a.name}" automatisch deaktiviert (abgelaufen)`);
            }
        }
        
        if (deaktiviert > 0) {
            artikelCache = null; // Cache invalidieren
        }
        
        return deaktiviert;
    },
    
    async getAll(f={}) {
        // Erst abgelaufene Artikel cleanup
        await this.cleanupAbgelaufene();
        
        // Von Supabase laden wenn online UND (Cache null ODER aelter als 30 Sekunden)
        const cacheAge = artikelCacheTime ? (Date.now() - artikelCacheTime) : Infinity;
        if (supabaseClient && isOnline && (!artikelCache || cacheAge > 30000)) {
            await this.loadFromSupabase();
        }
        
        // Dann lokale Daten holen
        let r = await db.artikel.toArray();
        
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
        
        // ZUERST in Supabase erstellen (wichtig!)
        if (supabaseClient && isOnline) {
            const { error } = await supabaseClient.from('artikel').insert(data);
            if (error) {
                console.error('Supabase Insert Fehler:', error);
                throw new Error('Supabase Fehler: ' + error.message);
            }
            console.log('✅ Artikel ' + data.artikel_id + ' in Supabase erstellt');
        }
        
        // Dann lokal erstellen
        await db.artikel.add(data);
        artikelCache = null; // Cache invalidieren
        
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
                    // ZUERST Supabase
                    if (supabaseClient && isOnline) {
                        await supabaseClient.from('artikel').update({ sortierung: oldPos }).eq('artikel_id', conflicting.artikel_id);
                    }
                    await db.artikel.update(conflicting.artikel_id, { sortierung: oldPos });
                }
            }
        }
        
        // ZUERST Supabase updaten (wichtig!)
        if (supabaseClient && isOnline) {
            const { error } = await supabaseClient.from('artikel').update(changes).eq('artikel_id', id);
            if (error) {
                console.error('Supabase Update Fehler:', error);
                throw new Error('Supabase Fehler: ' + error.message);
            }
            console.log('✅ Artikel ' + id + ' in Supabase aktualisiert');
        }
        
        // Dann lokal updaten
        await db.artikel.update(id, changes);
        artikelCache = null; // Cache invalidieren
        
        await DataProtection.createBackup(); 
        Utils.showToast('Artikel aktualisiert', 'success'); 
    },
    
    async delete(id) { 
        // ZUERST Supabase löschen (wichtig!)
        if (supabaseClient && isOnline) {
            const { error } = await supabaseClient.from('artikel').delete().eq('artikel_id', id);
            if (error) {
                console.error('Supabase Delete Fehler:', error);
                throw new Error('Supabase Fehler: ' + error.message);
            }
            console.log('✅ Artikel ' + id + ' in Supabase gelöscht');
        }
        
        // Dann lokal löschen
        await db.artikel.delete(id);
        artikelCache = null;
        
        await DataProtection.createBackup(); 
        Utils.showToast('Artikel gelöscht', 'success'); 
    },
    
    async importFromCSV(text) {
        // Clean up text - handle Windows line endings and BOM
        text = text.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n').replace(/\r/g,'\n').trim();
        const lines = text.split('\n').filter(l => l.trim());
        
        if (lines.length < 2) throw new Error('CSV ungueltig');
        
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
        // 1=Alkoholfrei, 2=Biere, 3=Weine, 4=Schnäpse, 5=HeiÃŸe, 6=Suesses, 7=Sonstiges
        const katMap = {
            0: 'Sonstiges',
            1: 'Alkoholfreie Getränke',
            2: 'Biere',
            3: 'Weine',
            4: 'Schnäpse & Spirituosen',
            5: 'HeiÃŸe Getränke',
            6: 'Suesses & Salziges',
            7: 'Sonstiges',
            8: 'Sonstiges'
        };
        const iconMap = {0:'',1:'',2:'',3:'',4:'',5:'[Kaffee]',6:'',7:'',8:''};
        
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
            
            // Parse price - handle German format "3,90EUR" or "3,90 EUR"
            let preis = 0;
            if (idx.preis >= 0 && v[idx.preis]) {
                let preisStr = v[idx.preis]
                    .replace(/"/g, '')      // Remove quotes
                    .replace(/EUR/g, '')      // Remove Euro sign
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
            // CSV Warengruppe: 1=Alkoholfrei, 2=Biere, 3=Wein, 4=Spirituosen, 5=HeiÃŸ, 6+=Sonstiges
            // App Kategorien: 1=Alkoholfrei, 2=Biere, 3=Weine, 4=Schnäpse, 5=HeiÃŸ, 6=Suesses, 7=Sonstiges
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
                icon: iconMap[katId] || '' 
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
        const msg = `✅ ${imp} neu, ${upd} aktualisiert, ${skip} uebersprungen`;
        console.log(msg);
        Utils.showToast(msg, 'success');
        return {imp, upd, skip};
    },
    async seed() {
        if (await db.artikel.count() === 0) {
            await db.artikel.bulkAdd([
                {artikel_id:101,sku:'ALM-05',name:'Almdudler 0.5l',name_kurz:'Almdudler',preis:3.5,steuer_prozent:10,kategorie_id:1,kategorie_name:'Alkoholfreie Getränke',aktiv:true,sortierung:10,icon:''},
                {artikel_id:102,sku:'COL-033',name:'Coca Cola 0.33l',name_kurz:'Cola',preis:3,steuer_prozent:10,kategorie_id:1,kategorie_name:'Alkoholfreie Getränke',aktiv:true,sortierung:20,icon:''},
                {artikel_id:201,sku:'ZIP-05',name:'Zipfer Maerzen 0.5l',name_kurz:'Zipfer',preis:4.2,steuer_prozent:10,kategorie_id:2,kategorie_name:'Biere',aktiv:true,sortierung:10,icon:''},
                {artikel_id:301,sku:'GV-025',name:'Gruener Veltliner 0.25l',name_kurz:'Gruener V.',preis:4.8,steuer_prozent:10,kategorie_id:3,kategorie_name:'Wein',aktiv:true,sortierung:10,icon:''},
                {artikel_id:501,sku:'OBS-02',name:'Obstler 2cl',name_kurz:'Obstler',preis:3.5,steuer_prozent:10,kategorie_id:4,kategorie_name:'Spirituosen',aktiv:true,sortierung:10,icon:''},
                {artikel_id:601,sku:'KAF-GR',name:'Kaffee gross',name_kurz:'Kaffee',preis:3.5,steuer_prozent:10,kategorie_id:5,kategorie_name:'HeiÃŸe Getränke',aktiv:true,sortierung:10,icon:'[Kaffee]'}
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
    
    // NOTFALL: Alle Buchungen exportieren (auch bereits exportierte)
    async exportAlleBuchungenExcel() {
        // ALLE Buchungen laden - auch exportierte!
        let bs = [];
        if (supabaseClient && isOnline) {
            const { data } = await supabaseClient
                .from('buchungen')
                .select('*')
                .eq('storniert', false)
                .order('erstellt_am', { ascending: false });
            if (data) bs = data;
        }
        
        // Fallback lokal
        if (bs.length === 0) {
            bs = await db.buchungen.toArray();
            bs = bs.filter(b => !b.storniert);
        }
        
        if (!bs.length) { 
            Utils.showToast('Keine Buchungen gefunden', 'warning'); 
            return; 
        }
        
        console.log(' Exportiere ALLE Buchungen:', bs.length);
        await this._exportToAccessFormat(bs, 'Buchenungsdetail_ALLE');
    },
    
    // Excel-Export im Buchenungsdetail-Format für Registrierkasse
    async exportBuchungenExcel() {
        const bs = await Buchungen.getAll({ exportiert: false });
        if (!bs.length) { Utils.showToast('Keine neuen Buchungen', 'warning'); return; }
        
        await this._exportToAccessFormat(bs, 'Buchenungsdetail');
        
        // Als exportiert markieren
        await Buchungen.markAsExported(bs.map(b => b.buchung_id));
    },
    
    // Gemeinsame Export-Funktion für Access-Format
    async _exportToAccessFormat(bs, filenamePrefix) {
        // Artikel-Cache für Kategorie-IDs aufbauen
        const artikelCache = {};
        const allArt = await db.artikel.toArray();
        allArt.forEach(a => { artikelCache[a.artikel_id] = a; });
        
        // Letzte ID aus Access (Standard: 20037 basierend auf deiner Tabelle)
        let lastId = parseInt(localStorage.getItem('lastExportId') || '20037');
        
        // Datum formatieren: DD.MM.YYYY -> YYYY-MM-DD für Access
        const formatDatumForAccess = (datum) => {
            if (!datum) return '';
            // Wenn schon im ISO-Format (YYYY-MM-DD)
            if (datum.match(/^\d{4}-\d{2}-\d{2}/)) {
                return datum.substring(0, 10);
            }
            // Wenn im deutschen Format (DD.MM.YYYY)
            const parts = datum.split('.');
            if (parts.length === 3) {
                return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
            }
            return datum;
        };
        
        // Daten im EXAKT gleichen Format wie Access-Tabelle
        const rows = bs.map(b => {
            lastId++;
            const artikel = artikelCache[b.artikel_id];
            
            // Gastid als Nummer (nicht UUID)
            let gastIdNum = 0;
            if (b.gast_id) {
                // Versuche Nummer zu extrahieren oder Hash zu erstellen
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
                'Auffüllmenge2': 0,
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
        XLSX.writeFile(wb, `${filenamePrefix}_${datumStr}.xlsx`);
        
        // ID speichern für nächsten Export
        localStorage.setItem('lastExportId', lastId.toString());
        Utils.showToast(`${bs.length} Buchungen exportiert (letzte ID: ${lastId})`, 'success');
    },
    
    // Letzte ID manuell setzen
    setLastExportId(id) {
        localStorage.setItem('lastExportId', id.toString());
        console.log('Letzte Export-ID gesetzt auf:', id);
    },
    
    // Letzte ID abrufen
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
    append(html) { document.getElementById('app').innerHTML += html; },
    renderAlphabet(onClick) {
        return `<div class="alphabet-container"><div class="alphabet-title">Wählen Sie den ersten Buchstaben:</div><div class="alphabet-grid">${'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(l => `<button class="alphabet-btn" onclick="${onClick}('${l}')">${l}</button>`).join('')}</div></div>`;
    },
    renderNameList(gäste, onSelect) {
        if (!gäste?.length) return `<div class="name-list-empty"><p>Keine Einträge</p><button class="btn btn-secondary btn-block" onclick="handleBackToLogin()">← Zurück</button></div>`;
        return `<div class="name-list-container"><div class="name-list-title">Wählen Sie Ihren Namen:</div><div class="name-list">${gäste.map(g => `<button class="name-list-item" onclick="${onSelect}('${g.id || g.gast_id}')"><span class="name-text">${g.displayName}</span><span class="name-arrow">→</span></button>`).join('')}</div><button class="btn btn-secondary btn-block mt-3" onclick="handleBackToLogin()">← Zurück</button></div>`;
    }
};

// Routes
// Auto-Refresh Timer für Startseite (neue Nachrichten laden)
let loginRefreshTimer = null;

Router.register('login', async () => {
    State.currentPin = ''; window.selectedGastId = null; window.currentLetter = null;
    
    // Vorherigen Timer stoppen
    if (loginRefreshTimer) {
        clearInterval(loginRefreshTimer);
        loginRefreshTimer = null;
    }
    
    // Auto-Refresh alle 2 Minuten starten (nur auf Login-Seite)
    loginRefreshTimer = setInterval(async () => {
        // Nur refreshen wenn noch auf Login-Seite
        if (window.location.hash === '#login' || window.location.hash === '' || !window.location.hash) {
            console.log(' Auto-Refresh: Lade neue Nachrichten...');
            Router.navigate('login');
        } else {
            // Nicht mehr auf Login-Seite -> Timer stoppen
            clearInterval(loginRefreshTimer);
            loginRefreshTimer = null;
        }
    }, 120000); // 120000ms = 2 Minuten
    const t = (key, params) => i18n.t(key, params);
    
    // Abgelaufene Nachrichten aufraeumen
    await GastNachrichten.cleanupAbgelaufene();
    
    // Gast-Nachricht laden (wenn nicht geschlossen) - globale Nachricht
    let nachrichtHtml = '';
    if (!GastNachricht.istGeschlossen()) {
        const nachricht = await GastNachricht.getAktive();
        nachrichtHtml = GastNachricht.renderHtml(nachricht);
    }
    
    // Tagesmenü laden
    const tagesMenu = await TagesMenu.getAktiv();
    const tagesMenuHtml = tagesMenu ? `<div style="max-width:600px;margin:0 auto 24px;">${TagesMenu.renderButtons(tagesMenu)}</div>` : '';
    
    // Gast-spezifische Nachrichten laden (GastNachrichten - mehrere pro Gast möglich)
    // Gast kann Nachricht NICHT löschen - nur Admin kann das
    const gastNachrichten = await GastNachrichten.getAlleAktiven();
    const gastNachrichtenHtml = gastNachrichten.length ? `
    <div style="max-width:600px;margin:0 auto 24px;">
        ${gastNachrichten.map(n => {
            const verbleibend = Math.ceil((new Date(n.gueltig_bis) - new Date()) / (1000 * 60 * 60));
            const istDringend = verbleibend <= 3;
            return `
            <div id="gast-nachricht-${n.id}" style="
                background: linear-gradient(135deg, ${istDringend ? '#e74c3c, #c0392b' : '#3498db, #2980b9'});
                border-radius: 16px;
                padding: 16px;
                margin-bottom: 12px;
                color: white;
                box-shadow: 0 4px 16px rgba(0,0,0,0.2);
                ${istDringend ? 'animation: nachrichtPulse 2s ease-in-out infinite;' : ''}
            ">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
                    <span style="font-size:1.5rem;"></span>
                    <span style="font-weight:700;font-size:1.1rem;background:rgba(255,255,255,0.2);padding:4px 12px;border-radius:20px;">
                        ${n.gast_name}
                    </span>
                </div>
                <div style="font-size:1.15rem;font-weight:500;line-height:1.4;">
                    ${n.nachricht}
                </div>
            </div>`;
        }).join('')}
    </div>
    ` : '';
    
    // Fehlende Getränke laden und zusammenfassen
    const fehlendeOffen = await FehlendeGetränke.getOffene();
    const zusammenfassung = {};
    fehlendeOffen.forEach(f => {
        if (!zusammenfassung[f.artikel_name]) {
            zusammenfassung[f.artikel_name] = { name: f.artikel_name, icon: f.icon || '', menge: 0, preis: f.artikel_preis };
        }
        zusammenfassung[f.artikel_name].menge++;
    });
    const fehlendeList = Object.values(zusammenfassung);
    const gesamtPreis = fehlendeOffen.reduce((s, f) => s + f.artikel_preis, 0);
    
    const fehlendeHtml = fehlendeList.length ? `
    <div style="background:linear-gradient(135deg, #f39c12, #e74c3c);border-radius:16px;padding:16px;margin-bottom:24px;color:white;max-width:600px;margin:0 auto 24px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
            <span style="font-size:1.3rem;">⚠</span>
            <div style="font-weight:700;">${t('missing_drinks')}</div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
            ${fehlendeList.map(f => `<span style="background:rgba(255,255,255,0.2);padding:4px 10px;border-radius:20px;font-size:0.9rem;">${f.menge}x ${f.name}</span>`).join('')}
        </div>
        <div style="font-size:0.85rem;opacity:0.9;">${t('total')}: ${Utils.formatCurrency(gesamtPreis)} * ${t('please_take_after_login')}</div>
    </div>
    ` : '';
    
    // Sprachauswahl Button mit WhatsApp (nur auf Startseite)
    const langBtn = i18n.renderLangButtonWithWhatsApp();
    
    UI.render(`${langBtn}<div class="main-content"><div style="text-align:center;margin-top:40px;"><div style="margin:0 auto 24px;"><img src="data:image/webp;base64,UklGRhASAABXRUJQVlA4WAoAAAAwAAAAKwEAMwAASUNDUMgBAAAAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADZBTFBI0wEAAAEPMP8REUJys22R5HyIA3MjhD8N75XKhOAARgPtNS3K69EhDFYngPf/gPi8UFBdcgAR/Z8AACirwxH17A9Rz3KMbwf5dZDz/0RXf4hr2MupAR7h8hQk2hgAApXMlKkiSCQKXfrH9AjlSkG2aCHTVaKQRikTtldcj7RK2sZlwk287pnGMBAy6ZUn+q2PpK2k4Vz0UEA9ssNt8tlWYeSZEzKRXbLNaeQ6YJFFp2yyzV4nRq5DZaMOGaSAibxxI52y27KHRVr2erQFNIu8oL3d5cmTTv7HHcABTfaQGQ/UsEPZkNtOEqDSjFGy6NZNLwBKN9dmIg0K/RTpI0nEDdAic8ky5Xq+9ppHZLiA9lQAcgc7UwJQmZcpdJJT00kECj8PWWQGRA9FcqUHGiSeZ4RzzQL7ZdL21AJtrpmp4oC6g53K+9ReId3UOuZ6No+9DeCYbpjeUyR3tYvvqEkdRXL30ObKgM8OTxTZVbTnjEzkQoae9DB0xxPXDVYyS142ok8bjTRk6IWxiijJY1EU20hMpTAiUdSqbQxoXBIpI8oTP9ErTyGLkuafShmLVK68+8eQXklUCpR+v0ZXGJDpUegi6cmlMmTBMlJpEhegAomYdBgsAWgOAFZQOCBGDgAA8EUAnQEqLAE0AD5RJI5Fo6IhEooGHDgFBLIBkgEDJAB2139O3fkB+QHyvVX+9fhD+i+0TyJ5E8uXkL++/mX/WPoT6Ifzf/sfcD/wX9a6Q/mA/Tf/o/6r3Of7h/ov7t7qP2J/zv6gfIB/Rf5h6yP/A9k/+u/732L/5V/Z//P64v68/CL+2n7h+0H/89Y78W/1j8XPBr/DflF2FGqXmX9LehH1KRl8muAF698A/aZ5z5gXrv9c76zUg73+wB/L/6L6L/4/wTPrP+59gL+Lf1T/nf4j15f+n/I+cr8u/xv/k9wT+R/0z/pf3n2qvWt+4vsL/qh/3GI6wAjRj9bMz7HBIzvWJRfblmeKxHz0t2F/QbdlgbQjS+e6KaJGvTwNut9lMjrfGREAQ55sZ4GsQ0R5P78FUEoELeXfFK4ICs/57Irep4bLZHxZ2eC55Puspd8wFwf0dzGnxfL2O3YXhSb26aaSoZcrwZ1fnVcoghDJi/BuhkBWHrIhKHlU/dUrZpqo/wDLl1HrQy3ZAGsaOtCuTvdm/dpHtrxFwMO7qjA3Y1E7ExaxGeYUrY+g5PZN3NI8JrmZqGRg2s5RPrtik7+rJ/FD0CO1MXgzGW0OxiuO+DafE52X/ACUhlqx9LbKqNoRE3UmRheu8NpUz5bh/PQwdq+yNEudSjeCjk8P9FIkWwWJU7AKwULj7Qer7iaAGNME88BEjomKT0tHFK12Btr0DcxEem6Rcw7l8PLAiudqrZrw6JaPeTPVGAD++oDstng5indz+W6cz7srqPIq/nHE58jAsViyXg2TOmuYIp5WhRzL8/xOOcDb9j/jhvRWkPdafKk4EW1hFFJ18nJpYr+Pnzw+1SnD2y5vFYWojn5pNjnl6+eBU6GBjK55GdXW8S11wyWCfA8ckes78+7+AubbKrZnLcAvMu6KHyUTSDD/hqqOut2P/1lHzNBWVh600xdznmVUHZ5B//2Gec+qqka3uap7R7LvMTM4TF3Ozbk7Fqbtpa7gh8jhe5MW3kNQMH8TOF07vHC+9t0CSR6wolbbzRGehUhlL1lL+oYmb9f/bc4CH8yJq66BoEsnUl7kPDwbcdBiqjsFLyToQbMQopgju5Gfn81+BwID7eN3nsHX/opP/9GI//+ilIVCm9pY3C5FwqiMESZQrWYkpmGpvr/+tO14evMmfrvb//7BIp76TESDJU7amA7Rfv7lFGsUi+bBguDC6LHXPCSGsbjE9wmikSbVq9SDIk9J8lRsXKQDiyItL48X4/6VUJ8uprEZrs+Cbpb9dQ4dDiWIGcI9hOcCSTXQ3logKfD6QErT3RRWrfOSZhj7CdcubtBtevqqNd7765p8df3KONDf2jtEM/Z+vsZyD88h6w7nxCqEfF+GP/iZzsq5+JDYspyzq2nL/W59iEjZUphyL1WuFG+XBEB0/cX1HMdklyZW2fPQOZ8ml97qkSgL8dBJx9//ukmFXUr+NqG8cbf5D8AUOx5sVYolpEbHzoPMVlu3bisTVfvjiwSzaz/R4H2C8y3BREeL4nrYUYECfMMULNhnhl9pXZcK8uhyFPBZBhfCsFwOSNukbjqBBaQKZYTTM26qFs2uGLNg1umIHHnyF9PvEgSKc0rmoA6iseC2LwSnkZEJkAJmJtc3yl/y+4ClyYwckDFrMwm84p9vXP8MD7xEuzAS10i7CgdKYNWxpVDTl0Xm5iWjAdWmbfm36FygNDe3stWfwHjHEZIIOqyglhR8QsQ+66TTIiXa1O1002ezTjklzQuCvLBgK+mmV3/4eGDARqpgjj9RaamqLH2RuOCyzp4T3fzW+7sL057wTXo3bnWA5LcaMKjSvaOJqtCOpJ9HXDkxjVHekYjYNO6Lb8hkNs9qnHR+tvcq8U+5aopZzrgfj46I7907wgSP1LBr7jytYQMecmXzRnfVR6RgVuxpIt6o1ciPP5ZG7zfjLxq3IotmNJmTkktsJC0+vJRRySHfiB28d1HVi2iWBARGheYu/fPhMPeie0ABWGPWN676JJkbaGZdDj5GD9DykoH2f+IwTZ+6hQAGF1n70s9EzffN32c9p75x746ECTl8P5X+udHzBNRyXCVLhKO0gqI0b6Z1OMRJH5puyeVWpK643OuQ1gnH4DzjhWOstzVjlG/208mC5NDxn46cIWsFhkyRXwle++Qdn7/AbrHRsZxBEiACzzV1WcWscoSz5y3fnXsqwAW9lPJ/w9F9XHIj67bV0+RDBm+t3Oa4BUNt99buEbkgnYeJNNZS7bET8GH3+/47gzmNdQiNZ8JaOOhPFz8OuyhQp0PLHldpM0CuGzNBVl/E4mlGUD04sgKI+LBRr44/1bah/Xcb5VRaBGur7v/ybxPlQ/mj//hOVdjvIEyD48ghebMOgv066iBYFEnatkHHN8n03EeYjrtjnuUfng1RhgTBgbueXq0kgOwN+0w1V7WxOBCBLogyuTK+e/JjMzbeaGFfh6oXlNaHTRpYec5+fSiuAzS8hai9MsjIYsr7bB//9KNH1NmTjJhjWoyAoEPgJ8k9/ovASQniQCpJWoppv4KAsusREuJu2jVEWTk4n2gcR3m0+qG0tlvVVZXZSFpnkGfJwcaKiambNVuvAAVqtMZEYo7HGSmq6tcy/+HOZFa0gxn/4c5mfyHI/IXQ1E+XayEwd7Q+1gj5S1RVlUikOP2ID+lLqVQJceWFyNZ8qDLyDM3ddq2RdlsgOpgfi7fgPjpwZxmB5J9S9yb1HbkwZyYy/HCN4tmzVkzx70Mp/DWOyP6aB61D8cVM8qJLJf5/VjtAavWpY89JHuZYl92bDZRIfoASfoi1ErNlcbxS5SvhxwPZloxv95vmwMo0/WsQ7fIQMMjY89eL8gDc1xsOof4caL/D2vk/w1Lc95z73oRRNSOysBFXN/ZMufPCrcG1C00OnZeXeOYJM/8+H/yjVTVsLdEN/Al4+jgBNbARDOpRcV48ZO9YR24iFWy31Bzv347vddYYS8IG9Jl/p6Y3p/7aFm1uN4rSUEo3I9oKHXBop6RZ3Vv8q/5zPVm+WjfgEgwWm3egMbEjyOYbgllp8K0oz9ok6BuKp3S++PHtQdr05LLafgKwHsfVw0rGsVbd2ehmnPLI5gPjLwCD2vuNNdG521ZWWVhA4zVyUH8F9O7boRH8aNkhg1WWhD0YL2CG1M0HCNzcEyFHWuqN1bs8xEzF1v7dOs1ged4fJK35MeHZtslQ7GkQznqYkfx7x1uizSz1tIj4QafoHODT4yOvR9fdAelJHBCZ/PH0JAq9yJh6vt8uFHaRm+WLqv1ny8N++dwCNAhLOkWd7Ua3yfsXph3G+NGUWKdNH/8RXxEzDEIcvIEZPL445umG7MvGj/Y6g+cItrx2bz5bwT1uqmyliNqqVtid6xKSNWF6YiUDuOce6G4p1GcqfmBoZ1OKHYG/0lJE7CX9xURSZe3ChNel95pe4zspxLomgdKvMBDFwekhhozzDnYnqtsL5uiAmV2/by2ea3DO3vUaTAUo4kKIlf7E7K9IM0yw0n3V/lSL0AJCWurkFN5c/xkzYdq2jtMnsthdm14zIiVEZIweR4kLalqu8822dBPa6ftuTO5HtlIKg85zHfzwLLxFFcuCnKRvfir28pXW7K5K39FoTHrOo+DdNLEKlyFjV1jx9Sq3ebiGlrcV4NfpQo5UiGvNdijO7UJXQqWv3kmGBfsfKjcd0S+7XLIqepJfkSvkaw/0wmcDVv/X4CPnVZsC+HEqh79makb60hRQWJzTz6Tg8DfwZM+PoAsvepYCM07CzSBX5K/XneAm4kwRl/6nK+ArHucWsVYkTU/yJc+mUXi/Qaz2ZtSmccKNOGHGYlys7Bh8bGjB46trITKHa4x1LCOdwJMYZMpiBHKt5uP050s6BfN+0pUTojlcgqsM74NgbDjm1qcA6y5qYBQmatWHOH5KSmFq7QYpBKdVCz5dCkDP/4R7UWqtn0ktW6WMqxcYiE+ygJ1xDuy1Lw1icK5rdfe1gTgcaUhrljbiGQZRHmzXUpXk0NXshia0ol22NO58wwgbhGNlhWjv3iLl65Ukwsja5mAmyMrGuExxGufldj5Ra5OljojsOD1WCoWD50zUpyLc1nMV+R3XarIeE3Nf/alr+Te4yASxOFwEXzJT7FEd/naLlNCNi92gaMzmxUi8OfvJ7awia/oiNiNhoRTvstmiXRd+m++LjlGL+IZT2GvBJK9w65yXRCuYEzg6WbAuYaMtUXFKgcXjwCXHj8pHN/vDo5M8hWGsE2e7dQbm7/vu9gFm7EgBWTrEzZ6dimjpU/ox4655UQfeEoW1lx0VavGidviFQHxlnWWTK0nztPD1SjL6gg7b72IuORuEhAitdEnTqa4A73XofeBaIqcgVBTmFXuSxd8XvazwzJROeLldKzOx9wrej3/PmoXtwGEPzTPhjD1K7Gv1+uTh6jDY1Vp/Wm2C5VNfOVC8HUz/q4oiu/DRmBGrOayOpiR5PoQx3//0xi0Iv/8ufzO3Irr8WfSswJkWO0WEC5NMQXIux/QOsvEfwlP9vnd4TWIaOzznp3MuawHUvH+j3/pbsej+YPH2qrAmKcHrqohB8J7x9YXhgJMDvp36dPaGk8+9h4+W6f0eAwEeDgj22kBDPsROlYt1ldsQfQtLIjwMzV3D03C7DUMJjvcEc01tGsgxm3fI9w8cmoOhkvLpUe9m/i3TjKIKFxr7mjwDNfNzJWgKHJ0ZNI8aDU5VeG7SQuJWRWuwqHBsefmJFhYsi9Mp656ptz/8oXcNl1rfb/ubSrDm82KB9KMOJt3EZkAq0nkhpeAdRhP7sffaLBLirFi4rbc1srB7PClXgSq/tRwRrZu3uQy/f/n4qZAAe6b9Ajiz/G7DwAAA" alt="Söllerhaus" style="height:52px;width:auto;"></div><h1 style="font-family:var(--font-display);font-size:var(--text-3xl);margin-bottom:8px;">${t('app_title')}</h1><p style="color:var(--color-stone-dark);margin-bottom:24px;">${t('app_subtitle')}</p>${nachrichtHtml}${tagesMenuHtml}${gastNachrichtenHtml}${fehlendeHtml}<div style="max-width:600px;margin:0 auto;"><div class="alphabet-container"><div class="alphabet-title">${t('select_first_letter')}</div><div class="alphabet-grid">${'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(l => `<button class="alphabet-btn" onclick="handleLetterSelect('${l}')">${l}</button>`).join('')}</div></div><div style="margin-top:32px;padding-top:24px;border-top:1px solid var(--color-stone-medium);"><p style="color:var(--color-stone-dark);margin-bottom:16px;">${t('no_account')}</p><button class="btn btn-primary btn-block" style="max-width:400px;margin:0 auto;" onclick="handleRegisterClick()">${t('register_new')}</button></div><div style="margin-top:24px;display:flex;justify-content:center;align-items:center;gap:12px;"><a href="#" onclick="handleAdminClick();return false;" style="color:#999;font-size:0.75rem;text-decoration:none;">⚙️</a><span style="color:#bbb;font-size:0.65rem;">v3.4 © 2026 • Entwickelt von: Claudio</span></div></div></div></div>`);
});

Router.register('register', () => {
    window.registerPin = '';
    const t = (key, params) => i18n.t(key, params);
    const langBtn = i18n.renderLangButton();
    const placeholder = i18n.currentLang === 'en' ? 'e.g. Maria' : 'z.B. Maria';
    UI.render(`<div class="main-content"><div style="max-width:500px;margin:40px auto;">
        <h1 class="page-title" style="text-align:center;">${t('register')}</h1>
        <div class="card">
            <div class="form-group">
                <label class="form-label">${t('first_name')} *</label>
                <div style="display:flex;gap:8px;">
                    <input type="text" id="register-vorname" class="form-input" placeholder="${placeholder}" autofocus style="font-size:1.2rem;padding:16px;flex:1;text-transform:uppercase;">
                    <button type="button" class="btn btn-secondary" onclick="showKeyboard('register-vorname')" style="padding:16px 20px;font-size:1.5rem;" title="Virtuelle Tastatur">⌨️</button>
                </div>
            </div>
            <button class="btn btn-primary btn-block" onclick="handleRegisterSubmit()" style="margin-bottom:24px;">Registrieren</button>
            <div class="form-group">
                <label class="form-label" style="text-align:center;display:block;">${t('pin_code')} *</label>
                <div class="pin-display" id="register-pin-display" style="display:flex;justify-content:center;gap:12px;margin:16px 0;">
                    <div class="pin-dot"></div><div class="pin-dot"></div><div class="pin-dot"></div><div class="pin-dot"></div>
                </div>
                <div class="pin-buttons">
                    ${[1,2,3,4,5,6,7,8,9].map(n => `<button type="button" class="pin-btn" onclick="handleRegisterPinInput('${n}')">${n}</button>`).join('')}
                    <button type="button" class="pin-btn" style="visibility:hidden;"></button>
                    <button type="button" class="pin-btn" onclick="handleRegisterPinInput('0')">0</button>
                    <button type="button" class="pin-btn pin-btn-delete" onclick="handleRegisterPinDelete()"></button>
                </div>
            </div>
            <button class="btn btn-primary btn-block" onclick="handleRegisterSubmit()" style="margin-top:24px;">Registrieren</button>
        </div>
        <button class="btn btn-secondary btn-block mt-3" onclick="handleBackToLogin()">← ${t('back')}</button>
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
    const t = (key, params) => i18n.t(key, params);
    const langBtn = i18n.renderLangButton();
    const gäste = await Auth.getGästeByLetter(window.currentLetter);
    
    const nameListHtml = !gäste?.length 
        ? `<div class="name-list-empty"><p>${t('no_entries')}</p><button class="btn btn-secondary btn-block" onclick="handleBackToLogin()">← ${t('back')}</button></div>`
        : `<div class="name-list-container"><div class="name-list-title">${t('select_your_name')}</div><div class="name-list">${gäste.map(g => `<button class="name-list-item" onclick="handleNameSelect('${g.id || g.gast_id}')"><span class="name-text">${g.displayName}</span><span class="name-arrow">→</span></button>`).join('')}</div><button class="btn btn-secondary btn-block mt-3" onclick="handleBackToLogin()">← ${t('back')}</button></div>`;
    
    UI.render(`<div class="main-content"><div style="max-width:600px;margin:40px auto;"><h1 class="page-title" style="text-align:center;">${t('letter')}: ${window.currentLetter}</h1>${nameListHtml}</div></div>`);
});

Router.register('pin-entry', () => {
    if (!window.selectedGastId) { Router.navigate('login'); return; }
    window.loginPin = '';
    const t = (key, params) => i18n.t(key, params);
    const langBtn = i18n.renderLangButton();
    UI.render(`<div class="main-content"><div style="max-width:500px;margin:60px auto;">
        <div class="card">
            <label class="form-label" style="text-align:center;display:block;font-size:1.2rem;margin-bottom:16px;">${t('enter_pin')}</label>
            <div class="pin-display" id="login-pin-display" style="display:flex;justify-content:center;gap:12px;margin:16px 0;">
                <div class="pin-dot"></div><div class="pin-dot"></div><div class="pin-dot"></div><div class="pin-dot"></div>
            </div>
            <div class="pin-buttons">
                ${[1,2,3,4,5,6,7,8,9].map(n => `<button type="button" class="pin-btn" onclick="handleLoginPinInput('${n}')">${n}</button>`).join('')}
                <button type="button" class="pin-btn" style="visibility:hidden;"></button>
                <button type="button" class="pin-btn" onclick="handleLoginPinInput('0')">0</button>
                <button type="button" class="pin-btn pin-btn-delete" onclick="handleLoginPinDelete()"></button>
            </div>
            <button class="btn btn-primary btn-block" onclick="handlePinLogin()" style="margin-top:16px;"> ${t('login')}</button>
        </div>
        <button class="btn btn-secondary btn-block mt-3" onclick="handlePinCancel()">← ${t('back')}</button>
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
        Utils.showToast(i18n.t('pin_4digit_required'), 'warning');
        return;
    }
    try {
        await Auth.login(window.selectedGastId, window.loginPin);
        await navigateAfterLogin(); // Prüft ob Gruppe gewählt werden muss
    } catch (e) {
        Utils.showToast(e.message, 'error');
        window.loginPin = '';
        updateLoginPinDisplay();
    }
};

// Navigation nach Login - prüft ob Gruppenauswahl nötig
window.navigateAfterLogin = async () => {
    const gruppenAktiv = await Gruppen.isAbfrageAktiv();
    
    if (gruppenAktiv && !State.selectedGroup) {
        // Gruppenauswahl erforderlich
        Router.navigate('gruppe-wählen');
    } else {
        // Direkt zum Buchen
        Router.navigate('buchen');
    }
};

// Route: Gruppe wählen
Router.register('gruppe-wählen', async () => {
    if (!State.currentUser) { Router.navigate('login'); return; }
    const t = (key, params) => i18n.t(key, params);
    const langBtn = i18n.renderLangButton();
    
    const gruppen = await Gruppen.getAll();
    const name = State.currentUser.firstName || State.currentUser.vorname;
    
    UI.render(`<div class="app-header"><div class="header-left"><div class="header-title"> ${t('select_group')}</div></div><div class="header-right"><button class="btn btn-secondary" onclick="Auth.logout()">${t('cancel')}</button></div></div>
    <div class="main-content">
        <div class="card mb-3" style="background:var(--color-alpine-green);color:white;">
            <div style="padding:20px;text-align:center;">
                <div style="font-size:1.2rem;">${t('hello')} <strong>${name}</strong>!</div>
                <div style="margin-top:8px;opacity:0.9;">${t('please_select_group')}</div>
            </div>
        </div>
        
        <div style="display:flex;flex-direction:column;gap:16px;">
            ${gruppen.map(g => `
                <button class="btn btn-primary" onclick="selectGruppe(${g.id}, '${g.name}')" style="padding:24px;font-size:1.3rem;">
                     ${g.name}
                </button>
            `).join('')}
        </div>
        
        <p style="text-align:center;margin-top:24px;color:#888;font-size:0.9rem;">
            ${t('group_saved')}
        </p>
    </div>`);
});

// Gruppe auswählen
window.selectGruppe = async (gruppeId, gruppeName) => {
    State.selectedGroup = gruppeName;
    
    // Gruppe auch im User speichern
    if (State.currentUser) {
        State.currentUser.group_name = gruppeName;
        
        // In DB aktualisieren
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
    UI.render(`<div class="main-content"><div style="max-width:500px;margin:60px auto;"><h1 class="page-title" style="text-align:center;"> Admin-Login</h1><div class="card"><div class="form-group"><label class="form-label">Admin-Passwort</label><input type="password" id="admin-password" class="form-input" placeholder="Passwort" onkeydown="if(event.key==='Enter')handleAdminLogin()" style="font-size:1.2rem;padding:16px;"></div><button class="btn btn-primary btn-block" onclick="handleAdminLogin()">Anmelden</button></div><button class="btn btn-secondary btn-block mt-3" onclick="handleBackToLogin()">← Zurück</button></div></div>`);
    setTimeout(() => document.getElementById('admin-password')?.focus(), 100);
});

Router.register('admin-dashboard', async () => {
    if (!State.isAdmin) { Router.navigate('admin-login'); return; }
    
    // NUR Supabase - keine lokalen DB Aufrufe!
    let guests = [];
    let artCount = 0;
    let bs = [];
    let auffüllListe = [];
    let fehlendeOffen = [];
    
    try {
        guests = await RegisteredGuests.getAll();
    } catch(e) { console.error('guests error:', e); }
    
    try {
        if (supabaseClient && isOnline) {
            const { count } = await supabaseClient.from('artikel').select('*', { count: 'exact', head: true });
            artCount = count || 0;
        }
    } catch(e) { console.error('artCount error:', e); }
    
    try {
        bs = await Buchungen.getAll();
    } catch(e) { console.error('bs error:', e); }
    
    try {
        auffüllListe = await Buchungen.getAuffuellliste();
    } catch(e) { console.error('auffüllliste error:', e); }
    
    try {
        fehlendeOffen = await FehlendeGetränke.getOffene();
    } catch(e) { console.error('fehlende error:', e); }
    
    const heute = Utils.getBuchungsDatum();
    const heuteB = bs.filter(b => b.datum === heute);
    const nichtExp = bs.filter(b => !b.exportiert);
    const auffüllAnzahl = auffüllListe.reduce((s, i) => s + i.menge, 0);
    
    // Aktive Nachricht laden
    const aktiveNachricht = await GastNachricht.getAktive();
    const verbleibendeZeit = aktiveNachricht ? GastNachricht.getVerbleibendeZeit(aktiveNachricht) : null;
    
    // Tagesmenü laden
    const menuData = await TagesMenu.getAktiv();
    const aktivesMenu = menuData && (menuData.mittag || menuData.abend); // true wenn mindestens eines aktiv
    const menuPreview = menuData?.mittag?.text || menuData?.abend?.text || '';
    
    // Aktueller Preismodus
    const preismodus = await PreisModus.getModus();
    const isHP = preismodus === PreisModus.HP;
    
    UI.render(`<div class="app-header"><div class="header-left"><div class="header-title"> Admin Dashboard</div></div><div class="header-right"><button class="btn btn-secondary" onclick="handleLogout()">Abmelden</button></div></div>
    <div class="main-content">
        <!-- PREISMODUS SWITCH - PROMINENT -->
        <div onclick="Router.navigate('admin-preismodus')" style="
            background: ${isHP ? 'linear-gradient(135deg, #9b59b6, #8e44ad)' : 'linear-gradient(135deg, #3498db, #2980b9)'};
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 16px;
            color: white;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        " onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 25px rgba(0,0,0,0.3)'" onmouseout="this.style.transform='';this.style.boxShadow='0 4px 15px rgba(0,0,0,0.2)'">
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-size: 2rem;">${isHP ? '' : ' '}</span>
                    <div>
                        <div style="font-weight: 700; font-size: 1.2rem;">
                            Preismodus: ${isHP ? 'HALBPENSION (HP)' : 'SELBSTVERSORGER'}
                        </div>
                        <div style="font-size: 0.9rem; opacity: 0.9;">
                            ${isHP ? 'HP-Preise werden für neue Buchungen verwendet' : 'Standard-Preise werden für neue Buchungen verwendet'}
                        </div>
                    </div>
                </div>
                <span style="font-size: 1.5rem;">⚙️</span>
            </div>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-value">${guests.length}</div><div class="stat-label">Gäste</div></div>
            <div class="stat-card"><div class="stat-value">${artCount}</div><div class="stat-label">Artikel</div></div>
            <div class="stat-card"><div class="stat-value">${heuteB.length}</div><div class="stat-label">Buchungen heute</div></div>
            <div class="stat-card"><div class="stat-value">${Utils.formatCurrency(heuteB.reduce((s,b) => s+b.preis*b.menge, 0))}</div><div class="stat-label">Umsatz heute</div></div>
        </div>
        
        <!-- GAeSTE-NACHRICHT/ANKUeNDIGUNG -->
        <div onclick="Router.navigate('admin-nachricht')" style="
            background: ${aktiveNachricht ? 'linear-gradient(135deg, #e74c3c, #c0392b)' : 'linear-gradient(135deg, #95a5a6, #7f8c8d)'};
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 16px;
            color: white;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        " onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 25px rgba(0,0,0,0.3)'" onmouseout="this.style.transform='';this.style.boxShadow='0 4px 15px rgba(0,0,0,0.2)'">
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-size: 2rem;">${aktiveNachricht ? '📢' : '📢'}</span>
                    <div>
                        <div style="font-weight: 700; font-size: 1.2rem;">
                            ${aktiveNachricht ? ' Nachricht aktiv!' : 'Gäste-Nachricht'}
                        </div>
                        <div style="font-size: 0.9rem; opacity: 0.9;">
                            ${aktiveNachricht 
                                ? `"${aktiveNachricht.text.substring(0, 40)}${aktiveNachricht.text.length > 40 ? '...' : ''} * Noch ${verbleibendeZeit}`
                                : 'Wichtige Info an alle Gäste senden'}
                        </div>
                    </div>
                </div>
                <span style="font-size: 1.5rem;">→</span>
            </div>
        </div>
        
        <!-- TAGESMENUe -->
        <div onclick="Router.navigate('admin-tagesmenu')" style="
            background: ${aktivesMenu ? 'linear-gradient(135deg, #8B4513, #D2691E)' : 'linear-gradient(135deg, #95a5a6, #7f8c8d)'};
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 16px;
            color: white;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        " onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 25px rgba(0,0,0,0.3)'" onmouseout="this.style.transform='';this.style.boxShadow='0 4px 15px rgba(0,0,0,0.2)'">
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-size: 2rem;"></span>
                    <div>
                        <div style="font-weight: 700; font-size: 1.2rem;">
                            ${aktivesMenu ? 'Tagesmenü aktiv!' : 'Tagesmenü'}
                        </div>
                        <div style="font-size: 0.9rem; opacity: 0.9;">
                            ${aktivesMenu 
                                ? `"${menuPreview.substring(0, 40)}${menuPreview.length > 40 ? '...' : ''}"`
                                : 'Menü für Gäste auf Startseite anzeigen'}
                        </div>
                    </div>
                </div>
                <span style="font-size: 1.5rem;">→</span>
            </div>
        </div>
        
        <!-- AUFFUeLLLISTE -->
        <button class="btn btn-primary btn-block" onclick="Router.navigate('admin-auffuellliste')" style="padding:20px;font-size:1.2rem;margin-bottom:12px;">
             Auffüllliste drucken<br>
            <small style="opacity:0.9;">(${auffüllAnzahl} Getränke zum Auffüllen)</small>
        </button>
        
        <!-- KAeSE-BESTELLUNGEN -->
        <button class="btn btn-block" onclick="Router.navigate('admin-cheese')" style="padding:20px;font-size:1.2rem;margin-bottom:12px;background:linear-gradient(135deg, #f4d03f, #f39c12);color:#5d4e37;border:none;">
             Käse-Bestellungen<br>
            <small style="opacity:0.9;">(Vorbestellungen verwalten)</small>
        </button>
        
        <!-- ALLE BUCHUNGEN ANSEHEN -->
        <button class="btn btn-block" onclick="Router.navigate('admin-alle-buchungen')" style="padding:20px;font-size:1.2rem;margin-bottom:24px;background:#6c5ce7;color:white;border:none;">
             Alle Buchungen ansehen<br>
            <small style="opacity:0.9;">(${bs.length} gesamt * bearbeiten/löschen)</small>
        </button>
        
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px;">
            <button class="btn btn-warning" onclick="Router.navigate('admin-fehlende')" style="padding:16px;background:#f39c12;color:white;">
                ⚠Fehlende Getränke<br><small>(${fehlendeOffen.length} offen)</small>
            </button>
            <button class="btn btn-danger" onclick="Router.navigate('admin-umlage')" style="padding:16px;">
                 Umlage buchen<br><small>(auf alle Gäste)</small>
            </button>
        </div>
        
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:24px;">
            <button class="btn btn-primary" onclick="Router.navigate('admin-guests')" style="padding:24px;"> Gästeverwaltung</button>
            <button class="btn btn-primary" onclick="Router.navigate('admin-articles')" style="padding:24px;"> Artikelverwaltung</button>
            <button class="btn btn-primary" onclick="Router.navigate('admin-artikel-sortierung')" style="padding:24px;"> Artikel sortieren</button>
            <button class="btn btn-primary" onclick="Router.navigate('admin-gruppen')" style="padding:24px;"> Gruppenverwaltung</button>
        </div>
        
        <div class="card">
            <div class="card-header"><h2 class="card-title"> Daten-Management</h2></div>
            <div class="card-body">
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;">
                    <div style="padding:16px;background:linear-gradient(135deg, #27ae60, #2ecc71);border-radius:var(--radius-md);color:white;">
                        <h3 style="font-weight:600;margin-bottom:8px;"> Backup erstellen</h3>
                        <div style="font-size:0.8rem;opacity:0.9;margin-bottom:8px;">Letztes: ${DataProtection.getLastBackupText()}</div>
                        <button class="btn" onclick="DataProtection.createFullBackup()" style="background:white;color:#27ae60;border:none;padding:8px 16px;"> Jetzt sichern</button>
                    </div>
                    <div style="padding:16px;background:linear-gradient(135deg, #e74c3c, #c0392b);border-radius:var(--radius-md);color:white;">
                        <h3 style="font-weight:600;margin-bottom:8px;"> Backup laden</h3>
                        <div style="font-size:0.8rem;opacity:0.9;margin-bottom:8px;">Daten aus JSON wiederherstellen</div>
                        <button class="btn" onclick="DataProtection.selectRestoreFile()" style="background:white;color:#e74c3c;border:none;padding:8px 16px;"> Datei wählen</button>
                    </div>
                    <div style="padding:16px;background:linear-gradient(135deg, #9b59b6, #8e44ad);border-radius:var(--radius-md);color:white;">
                        <h3 style="font-weight:600;margin-bottom:8px;">🔄 Lokale → Supabase</h3>
                        <div style="font-size:0.8rem;opacity:0.9;margin-bottom:8px;">Lokale Buchungen hochladen</div>
                        <button class="btn" onclick="migrateLocalToSupabase()" style="background:white;color:#9b59b6;border:none;padding:8px 16px;">🔄 Migrieren</button>
                    </div>
                    
                </div>
            </div>
        </div>
        
        <!-- NOTFALL - klein und unauffällig -->
        <div style="text-align:center;margin-top:24px;padding-top:16px;border-top:1px dashed #ccc;">
            <a href="#" onclick="Router.navigate('admin-notfall-export');return false;" style="color:#888;font-size:0.85rem;text-decoration:none;">
                 Notfall: Buchungen nach Datum exportieren
            </a>
        </div>
    </div>`);
    
    // Backup-Erinnerung prüfen (nach 24h)
    setTimeout(() => {
        if (DataProtection.isBackupNeeded()) {
            DataProtection.showBackupReminder();
        }
    }, 500);
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
        {kategorie_id:5, name:'HeiÃŸe Getränke', sortierung:50},
        {kategorie_id:6, name:'Suesses & Salziges', sortierung:60},
        {kategorie_id:7, name:'Sonstiges', sortierung:70}
    ]);
    
    // Alte Kategorie-IDs auf neue mappen:
    // ALTE Struktur: 1=Alkoholfrei, 2=Biere, 3=Wein, 4=Spirituosen, 5=HeiÃŸe, 6=Sonstiges, 7=Snacks, 8=Diverses
    // NEUE Struktur: 1=Alkoholfrei, 2=Biere, 3=Weine, 4=Schnäpse, 5=HeiÃŸe, 6=Suesses, 7=Sonstiges
    const migrationMap = {
        1: 1,  // Alkoholfrei bleibt
        2: 2,  // Biere bleibt
        3: 3,  // Wein -> Weine
        4: 4,  // Spirituosen -> Schnäpse & Spirituosen
        5: 5,  // HeiÃŸe Getränke bleibt
        6: 6,  // Sonstiges -> Suesses & Salziges
        7: 6,  // Snacks -> Suesses & Salziges
        8: 7   // Diverses -> Sonstiges
    };
    
    const iconMap = {1:'',2:'',3:'',4:'',5:'[Kaffee]',6:'',7:''};
    const katMap = {
        1:'Alkoholfreie Getränke',
        2:'Biere',
        3:'Weine',
        4:'Schnäpse & Spirituosen',
        5:'HeiÃŸe Getränke',
        6:'Suesses & Salziges',
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
            icon: a.bild ? a.icon : (iconMap[neueKat] || '')
        });
        
        if (alteKat !== neueKat) fixed++;
    }
    
    await DataProtection.createBackup();
    Utils.showToast(`Kategorien repariert! ${fixed} Artikel migriert.`, 'success');
    Router.navigate('admin-articles');
};

// Auffüllliste Route
Router.register('admin-auffuellliste', async () => {
    console.log('📋 Auffüllliste Route - isAdmin:', State.isAdmin);
    if (!State.isAdmin) { 
        console.log('⚠️ Nicht als Admin eingeloggt, leite zum Login');
        Router.navigate('admin-login'); 
        return; 
    }
    
    let liste = [];
    try {
        liste = await Buchungen.getAuffuellliste();
        console.log('✅ Auffüllliste geladen:', liste.length, 'Positionen');
    } catch(e) {
        console.error('❌ Auffüllliste Fehler:', e);
        Utils.showToast('Fehler beim Laden: ' + e.message, 'error');
    }
    
    // Nach Kategorie gruppieren
    const byKat = {};
    liste.forEach(item => {
        if (!byKat[item.kategorie_name]) byKat[item.kategorie_name] = [];
        byKat[item.kategorie_name].push(item);
    });
    
    const total = liste.reduce((s, i) => s + i.menge, 0);
    
    UI.render(`<div class="app-header"><div class="header-left"><button class="menu-btn" onclick="Router.navigate('admin-dashboard')">←</button><div class="header-title"> Auffüllliste</div></div><div class="header-right"><button class="btn btn-secondary" onclick="handleLogout()">Abmelden</button></div></div>
    <div class="main-content">
        <div class="card mb-3" style="background:var(--color-alpine-green);color:white;">
            <div style="padding:20px;text-align:center;">
                <div style="font-size:2rem;font-weight:700;">${total} Getränke</div>
                <div>zum Auffüllen</div>
            </div>
        </div>
        
        <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:24px;">
            <button class="btn btn-primary" onclick="printAuffuellliste()" style="padding:16px;font-size:1.1rem;">
                 Für Thermodrucker drucken
            </button>
            <button class="btn btn-success" onclick="resetAuffuelllisteOhneExport()" style="padding:16px;font-size:1.1rem;background:#27ae60;">
                ✅ Auffüllliste zurücksetzen<br>
                <small style="opacity:0.9;">(Getränke wurden aufgefuellt)</small>
            </button>
        </div>
        
        <div class="card mb-3" style="background:#fff3cd;border:1px solid #ffc107;">
            <div style="padding:12px;">
                <p style="margin:0;color:#856404;font-size:0.85rem;">
                     <strong>Tipp:</strong> Damit der Thermodrucker automatisch gewählt wird:<br>
                    Im Druckdialog → "EPSON TM-T88V" wählen → Haekchen bei "Als Standard speichern"
                </p>
            </div>
        </div>
        
        <div id="auffüllliste-print">
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
                                    <td style="padding:12px;text-align:right;font-size:1.3rem;font-weight:700;color:var(--color-alpine-green);">${item.menge}x</td>
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
    try {
        console.log('🖨️ printAuffuellliste gestartet...');
        
        if (!supabaseClient || !isOnline) {
            Utils.showToast('Keine Internetverbindung!', 'error');
            return;
        }
        
        const liste = await Buchungen.getAuffuellliste();
        console.log('✅ Auffüllliste für Druck geladen:', liste.length, 'Positionen');
        
        if (liste.length === 0) {
            Utils.showToast('Keine Getränke zum Auffüllen', 'info');
            return;
        }
        
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
        if (!printWindow) {
            Utils.showToast('Popup-Blocker aktiv! Bitte Popups erlauben.', 'error');
            return;
        }
        
        printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Auffüllliste - ${datum}</title>
            <style>
                @page { 
                    margin: 0; 
                    size: 80mm auto;
                }
                * { margin: 0; padding: 0; box-sizing: border-box; }
                html, body { 
                    height: auto !important;
                    min-height: 0 !important;
                }
                body { 
                    font-family: Arial, Helvetica, sans-serif; 
                    font-size: 14px;
                    font-weight: 600;
                    width: 80mm;
                    padding: 4mm;
                    padding-bottom: 10mm;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                .header { 
                    text-align: center; 
                    margin-bottom: 12px; 
                    border-bottom: 2px solid #000; 
                    padding-bottom: 10px; 
                }
                .header h1 { 
                    font-size: 22px; 
                    font-weight: 900; 
                    letter-spacing: 2px;
                    margin-bottom: 5px; 
                }
                .header .datum {
                    font-size: 14px;
                    font-weight: 700;
                }
                .kategorie { 
                    font-weight: 900; 
                    background: #000; 
                    color: #fff; 
                    padding: 5px 8px; 
                    margin: 12px 0 6px 0; 
                    font-size: 14px;
                    letter-spacing: 1px;
                }
                .item { 
                    display: flex; 
                    justify-content: space-between; 
                    align-items: center;
                    padding: 6px 2px; 
                    border-bottom: 1px solid #000; 
                    font-size: 14px;
                    font-weight: 700;
                }
                .item-name { 
                    flex: 1; 
                    font-weight: 700;
                }
                .item-check {
                    width: 50px;
                    text-align: center;
                    font-weight: 900;
                    font-size: 16px;
                    font-family: Arial, sans-serif;
                }
                .item-menge { 
                    min-width: 35px; 
                    text-align: right; 
                    font-weight: 900;
                    font-size: 16px;
                }
                .total { 
                    font-size: 18px; 
                    font-weight: 900; 
                    text-align: center; 
                    margin: 12px 0; 
                    border: 2px solid #000;
                    padding: 8px; 
                    letter-spacing: 1px;
                }
                .footer { 
                    margin-top: 12px; 
                    text-align: center; 
                    border-top: 2px solid #000; 
                    padding-top: 10px; 
                    font-size: 12px;
                    font-weight: 600;
                }
                @media print { 
                    html, body { 
                        width: 80mm; 
                        height: auto !important;
                    }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>AUFFUeLLLISTE</h1>
                <div class="datum">${datum} ${zeit}</div>
            </div>
            
            ${Object.keys(byKat).sort().map(kat => `
                <div class="kategorie">${kat.toUpperCase()}</div>
                ${byKat[kat].map(item => `
                    <div class="item">
                        <span class="item-name">${item.name}</span>
                        <span class="item-check">__:__</span>
                        <span class="item-menge">${item.menge}x</span>
                    </div>
                `).join('')}
            `).join('')}
            
            <div class="total">GESAMT: ${total} STUeCK</div>
            
            <div class="footer">
                Söllerhaus Kassa
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
    
    // Kurz warten dann automatisch drucken
    setTimeout(() => {
        printWindow.print();
    }, 300);
    
    } catch(e) {
        console.error('❌ printAuffuellliste Fehler:', e);
        Utils.showToast('Fehler beim Drucken: ' + e.message, 'error');
    }
};

// Nur Auffüllliste zurücksetzen (NICHT Export!)
window.resetAuffuelllisteOhneExport = async () => {
    if (!confirm('Auffüllliste zurücksetzen?\n\nDie Getränke wurden aufgefuellt und die Liste wird auf 0 gesetzt.\n\n(Dies hat keinen Einfluss auf den Registrierkasse-Export)')) return;
    
    try {
        await Buchungen.markAsAufgefuellt();
        Utils.showToast('✅ Auffüllliste zurückgesetzt', 'success');
        Router.navigate('admin-auffuellliste');
    } catch(e) {
        Utils.showToast('Fehler: ' + e.message, 'error');
    }
};

// ============ ALLE BUCHUNGEN ROUTE (Admin) ============
Router.register('admin-alle-buchungen', async () => {
    if (!State.isAdmin) { Router.navigate('admin-login'); return; }
    
    // Alle aktiven Gäste laden für Dropdown
    let alleGäste = [];
    if (supabaseClient && isOnline) {
        const { data } = await supabaseClient
            .from('profiles')
            .select('id, vorname, display_name')
            .eq('geloescht', false)
            .eq('aktiv', true)
            .order('vorname');
        if (data) {
            // DEDUPLIZIERUNG: Nur einen Eintrag pro Name
            const seenNames = new Set();
            alleGäste = data.filter(g => {
                const name = (g.display_name || g.vorname || '').toUpperCase().trim();
                if (seenNames.has(name)) return false;
                seenNames.add(name);
                return true;
            }).map(g => ({ id: g.id, name: g.display_name || g.vorname }));
        }
    }
    if (alleGäste.length === 0) {
        const local = await db.registeredGuests.toArray();
        const filtered = local.filter(g => !g.gelöscht && g.aktiv !== false);
        // Deduplizierung auch lokal
        const seenNames = new Set();
        alleGäste = filtered.filter(g => {
            const name = (g.nachname || g.firstName || '').toUpperCase().trim();
            if (seenNames.has(name)) return false;
            seenNames.add(name);
            return true;
        }).map(g => ({ id: g.id, name: g.nachname || g.firstName }));
    }
    
    // Ausgewählter Gast aus State
    const selectedGastId = State.selectedGastFilter || '';
    
    // Alle Buchungen laden (inkl. stornierte zur Anzeige)
    let bs = await Buchungen.getAll({ includeStorniert: true });
    
    // Filter nach Gast wenn ausgewählt
    if (selectedGastId) {
        bs = bs.filter(b => b.user_id === selectedGastId || b.gast_id === selectedGastId);
    }
    
    // Nach Datum gruppieren
    const byDatum = {};
    bs.forEach(b => {
        if (!byDatum[b.datum]) byDatum[b.datum] = [];
        byDatum[b.datum].push(b);
    });
    
    // Sortiert nach Datum (neueste zuerst)
    const sortedDates = Object.keys(byDatum).sort().reverse();
    
    // Gesamtsumme und Gastname
    const gesamtSumme = bs.filter(b => !b.storniert).reduce((s,b) => s + b.preis * b.menge, 0);
    const selectedGastName = alleGäste.find(g => g.id === selectedGastId)?.name || 'Alle Gäste';
    
    UI.render(`<div class="app-header"><div class="header-left"><button class="menu-btn" onclick="Router.navigate('admin-dashboard')">←</button><div class="header-title"> Alle Buchungen</div></div><div class="header-right"><button class="btn btn-secondary" onclick="handleLogout()">Abmelden</button></div></div>
    <div class="main-content">
        <!-- GÄSTE FILTER -->
        <div class="card mb-3" style="background:#fffde7;">
            <div style="padding:16px;">
                <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;">
                    <div style="flex:1;min-width:200px;">
                        <label style="font-weight:600;font-size:0.85rem;display:block;margin-bottom:4px;">Gast auswählen:</label>
                        <select id="gast-filter" class="form-input" style="width:100%;padding:12px;font-size:1rem;" onchange="filterBuchungenByGast(this.value)">
                            <option value="">-- Alle Gäste --</option>
                            ${alleGäste.map(g => `<option value="${g.id}" ${g.id === selectedGastId ? 'selected' : ''}>${g.name}</option>`).join('')}
                        </select>
                    </div>
                    ${selectedGastId ? `
                        <button class="btn btn-primary" onclick="showAddBuchungForGastModal('${selectedGastId}', '${selectedGastName}')" style="padding:12px 20px;">
                            + Buchung hinzufügen
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
        
        <div class="card mb-3" style="background:var(--color-alpine-green);color:white;">
            <div style="padding:16px;text-align:center;">
                <div style="font-size:1.5rem;font-weight:700;">${bs.length} Buchungen</div>
                <div>${selectedGastId ? selectedGastName : 'Alle Gäste'} | Summe: ${Utils.formatCurrency(gesamtSumme)}</div>
            </div>
        </div>
        
        
        ${sortedDates.length ? sortedDates.map(datum => {
            const buchungen = byDatum[datum].sort((a,b) => new Date(b.erstellt_am) - new Date(a.erstellt_am));
            const tagesUmsatz = buchungen.filter(b => !b.storniert).reduce((s,b) => s + b.preis * b.menge, 0);
            return `
            <div class="card mb-3">
                <div class="card-header" style="background:var(--color-stone-light);display:flex;justify-content:space-between;align-items:center;">
                    <h3 style="font-weight:700;margin:0;"> ${datum}</h3>
                    <div style="display:flex;align-items:center;gap:12px;">
                        <span style="font-weight:600;color:var(--color-alpine-green);">${buchungen.length} Buchungen * ${Utils.formatCurrency(tagesUmsatz)}</span>
                        <button class="btn btn-danger" style="padding:6px 12px;font-size:0.8rem;" onclick="handleDeleteBuchungenByDate('${datum}')" title="Alle Buchungen dieses Tages löschen"> Tag löschen</button>
                    </div>
                </div>
                <div class="card-body" style="padding:0;max-height:400px;overflow-y:auto;">
                    <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
                        <thead style="background:var(--color-stone-light);position:sticky;top:0;">
                            <tr>
                                <th style="padding:10px;text-align:left;">Zeit</th>
                                <th style="padding:10px;text-align:left;">Gast</th>
                                <th style="padding:10px;text-align:left;">Gruppe</th>
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
                                    <td style="padding:10px;font-size:0.85rem;color:#666;">${b.group_name || '-'}</td>
                                    <td style="padding:10px;">${b.artikel_name}</td>
                                    <td style="padding:10px;text-align:right;">${b.menge}x</td>
                                    <td style="padding:10px;text-align:right;font-weight:600;">${Utils.formatCurrency(b.preis * b.menge)}</td>
                                    <td style="padding:10px;text-align:center;">
                                        ${b.storniert 
                                            ? '<span style="color:#e74c3c;font-size:0.8rem;">Storniert</span>'
                                            : `<button class="btn btn-danger" style="padding:4px 12px;font-size:0.8rem;" onclick="handleAdminDeleteBuchung('${b.buchung_id}')"></button>`
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

// Gruppe abgereist - Alle Buchungen exportieren und abschlieÃŸen
// Filter Buchungen nach Gast
window.filterBuchungenByGast = (gastId) => {
    State.selectedGastFilter = gastId;
    Router.navigate('admin-alle-buchungen');
};

// Modal zum Hinzufügen von Buchungen öffnen
window.showAddBuchungForGastModal = async (gastId, gastName) => {
    const modalHtml = `
    <div id="add-buchung-modal" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;justify-content:center;align-items:center;">
        <div style="background:white;padding:24px;border-radius:12px;width:90%;max-width:500px;max-height:90vh;overflow-y:auto;">
            <h3 style="margin-bottom:16px;">Buchung hinzufügen für ${gastName}</h3>
            <input type="hidden" id="modal-gast-id" value="${gastId}">
            <input type="hidden" id="modal-gast-name" value="${gastName}">
            
            <div style="margin-bottom:16px;">
                <label style="font-weight:600;">Artikel suchen:</label>
                <input type="text" id="artikel-search-modal" class="form-input" placeholder="Artikelname eingeben..." oninput="searchArtikelForBuchungModal(this.value)" style="margin-top:4px;">
            </div>
            
            <div id="artikel-results-modal" style="max-height:300px;overflow-y:auto;border:1px solid #ddd;border-radius:8px;">
                <p style="padding:20px;text-align:center;color:#888;">Artikel suchen...</p>
            </div>
            
            <div style="display:flex;gap:12px;margin-top:24px;">
                <button class="btn btn-secondary" onclick="closeAddBuchungModal()" style="flex:1;padding:14px;">Abbrechen</button>
            </div>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('artikel-search-modal').focus();
};

window.closeAddBuchungModal = () => {
    const modal = document.getElementById('add-buchung-modal');
    if (modal) modal.remove();
};

// Artikel suchen für Modal
window.searchArtikelForBuchungModal = async (query) => {
    const resultsDiv = document.getElementById('artikel-results-modal');
    
    if (!query || query.length < 1) {
        resultsDiv.innerHTML = '<p style="padding:20px;text-align:center;color:#888;">Artikel suchen...</p>';
        return;
    }
    
    const artikel = await Artikel.getAll({ aktiv: true, search: query });
    
    if (artikel.length === 0) {
        resultsDiv.innerHTML = '<p style="padding:20px;text-align:center;color:#888;">Keine Artikel gefunden</p>';
        return;
    }
    
    resultsDiv.innerHTML = artikel.slice(0, 20).map(a => `
        <div style="padding:12px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;cursor:pointer;" onclick="addBuchungForSelectedGast(${a.artikel_id})" onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='white'">
            <div>
                <div style="font-weight:600;">${a.icon || ''} ${a.name}</div>
                <div style="font-size:0.85rem;color:#666;">${a.kategorie_name || ''}</div>
            </div>
            <div style="font-weight:700;color:var(--color-alpine-green);">${Utils.formatCurrency(a.preis)}</div>
        </div>
    `).join('');
};

// Buchung für ausgewählten Gast hinzufügen
window.addBuchungForSelectedGast = async (artikelId) => {
    const gastId = document.getElementById('modal-gast-id').value;
    const gastName = document.getElementById('modal-gast-name').value;
    
    try {
        const artikel = await Artikel.getById(artikelId);
        if (!artikel) throw new Error('Artikel nicht gefunden');
        
        // Buchung erstellen
        const buchung = {
            buchung_id: Utils.uuid(),
            user_id: gastId,
            gast_id: gastId,
            gast_vorname: gastName,
            artikel_id: artikel.artikel_id,
            artikel_name: artikel.name,
            preis: artikel.preis,
            menge: 1,
            datum: new Date().toLocaleDateString('de-AT'),
            uhrzeit: new Date().toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            erstellt_am: new Date().toISOString(),
            storniert: false,
            exportiert: false,
            aufgefuellt: false,
            group_name: 'keiner Gruppe zugehoerig'
        };
        
        // In Supabase speichern
        if (supabaseClient && isOnline) {
            const { error } = await supabaseClient.from('buchungen').insert(buchung);
            if (error) {
                console.error('Supabase Buchung Fehler:', error);
                throw new Error(error.message);
            }
        }
        
        // Lokal speichern
        try { await db.buchungen.add(buchung); } catch(e) {}
        
        Utils.showToast(`${artikel.name} für ${gastName} gebucht`, 'success');
        closeAddBuchungModal();
        Router.navigate('admin-alle-buchungen');
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

// Alle Buchungen eines Tages ENDGUeLTIG löschen
window.handleDeleteBuchungenByDate = async (datum) => {
    if (!confirm(`⚠️ ACHTUNG!\n\nAlle Buchungen vom ${datum} werden ENDGUeLTIG gelöscht!\n\nDies kann nicht rueckgängig gemacht werden.\n\nFortfahren?`)) return;
    
    try {
        // Buchungen von diesem Datum laden
        let buchungenIds = [];
        
        if (supabaseClient && isOnline) {
            const { data } = await supabaseClient
                .from('buchungen')
                .select('buchung_id')
                .eq('datum', datum);
            if (data) buchungenIds = data.map(b => b.buchung_id);
        }
        
        // Fallback: Auch lokal
        const lokale = await db.buchungen.where('datum').equals(datum).toArray();
        lokale.forEach(b => {
            if (!buchungenIds.includes(b.buchung_id)) {
                buchungenIds.push(b.buchung_id);
            }
        });
        
        if (buchungenIds.length === 0) {
            Utils.showToast('Keine Buchungen gefunden', 'warning');
            return;
        }
        
        // Endgueltig löschen (nicht nur stornieren)
        for (const id of buchungenIds) {
            // Lokal löschen
            try { await db.buchungen.delete(id); } catch(e) {}
            
            // Supabase löschen
            if (supabaseClient && isOnline) {
                await supabaseClient.from('buchungen').delete().eq('buchung_id', id);
            }
        }
        
        await DataProtection.createBackup();
        Utils.showToast(`✅ ${buchungenIds.length} Buchungen vom ${datum} gelöscht`, 'success');
        Router.navigate('admin-alle-buchungen');
    } catch (e) {
        Utils.showToast('Fehler: ' + e.message, 'error');
    }
};

// ============ FEHLENDE GETRAeNKE ROUTE ============
Router.register('admin-fehlende', async () => {
    if (!State.isAdmin) { Router.navigate('admin-login'); return; }
    const fehlendeOffen = await FehlendeGetränke.getOffene();
    const kats = await db.kategorien.toArray();
    const arts = await Artikel.getAll({ aktiv: true });
    
    // Nach Kategorie gruppieren
    const byKat = {};
    kats.forEach(k => { byKat[k.kategorie_id] = { name: k.name, artikel: [] }; });
    arts.forEach(a => {
        if (byKat[a.kategorie_id]) byKat[a.kategorie_id].artikel.push(a);
    });
    
    UI.render(`<div class="app-header"><div class="header-left"><button class="menu-btn" onclick="Router.navigate('admin-dashboard')">←</button><div class="header-title">⚠Fehlende Getränke</div></div><div class="header-right"><button class="btn btn-secondary" onclick="handleLogout()">Abmelden</button></div></div>
    <div class="main-content">
        <div class="card mb-3" style="background:#f39c12;color:white;">
            <div style="padding:16px;text-align:center;">
                <div style="font-size:1.5rem;font-weight:700;">${fehlendeOffen.length} offene Getränke</div>
                <div>warten auf Uebernahme durch Gäste</div>
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
                        <button class="btn btn-danger" onclick="deleteFehlendes(${f.id})" style="padding:4px 10px;"></button>
                    </div>
                </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
        
        <div class="card">
            <div class="card-header"><h3>Neues fehlendes Getraenk hinzufügen</h3></div>
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
                                <div style="font-size:1.5rem;">${a.icon||''}</div>
                                <div style="font-size:0.85rem;font-weight:500;">${a.name}</div>
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
    await FehlendeGetränke.add(artikelId, menge);
    Router.navigate('admin-fehlende');
};

window.deleteFehlendes = async (id) => {
    if (confirm('Eintrag löschen?')) {
        await FehlendeGetränke.löschen(id);
        Router.navigate('admin-fehlende');
    }
};

// ============ UMLAGE ROUTE ============
Router.register('admin-umlage', async () => {
    if (!State.isAdmin) { Router.navigate('admin-login'); return; }
    
    // Gäste von Supabase laden
    let totalGuests = 0;
    let ausgenommen = 0;
    
    if (supabaseClient && isOnline) {
        const { data: profiles } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('aktiv', true)
            .eq('geloescht', false);
        
        if (profiles) {
            // Gäste mit Ausnahme zählen
            const ohneAusnahme = profiles.filter(g => g.ausnahmeumlage !== true);
            totalGuests = ohneAusnahme.length;
            ausgenommen = profiles.length - totalGuests;
        }
    }
    
    // Fehlende Getränke laden
    const fehlendeOffen = await FehlendeGetränke.getOffene();
    const gesamtPreis = fehlendeOffen.reduce((s, f) => s + f.artikel_preis, 0);
    const preisProGast = totalGuests > 0 ? Math.ceil((gesamtPreis / totalGuests) * 100) / 100 : gesamtPreis;
    
    UI.render(`<div class="app-header"><div class="header-left"><button class="menu-btn" onclick="Router.navigate('admin-dashboard')">←</button><div class="header-title"> Umlage buchen</div></div><div class="header-right"><button class="btn btn-secondary" onclick="handleLogout()">Abmelden</button></div></div>
    <div class="main-content">
        <div class="card mb-3" style="background:var(--color-danger);color:white;">
            <div style="padding:20px;text-align:center;">
                <div style="font-size:2rem;font-weight:700;">${totalGuests} Gäste für Umlage</div>
                <div style="opacity:0.9;">Kosten werden gleichmäÃŸig verteilt</div>
                ${ausgenommen > 0 ? `<div style="margin-top:8px;background:rgba(255,255,255,0.2);padding:6px 12px;border-radius:20px;display:inline-block;">${ausgenommen} Gäste ausgenommen</div>` : ''}
            </div>
        </div>
        
        ${fehlendeOffen.length ? `
        <div class="card mb-3">
            <div class="card-header" style="background:#f39c12;color:white;">
                <h3 style="margin:0;">⚠Fehlende Getränke (${fehlendeOffen.length})</h3>
            </div>
            <div class="card-body">
                ${fehlendeOffen.map(f => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:var(--color-stone-light);border-radius:8px;margin-bottom:6px;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <span style="font-size:1.5rem;">${f.icon || ''}</span>
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
                
                <button class="btn btn-danger btn-block" onclick="bucheUmlageFürAlle()" style="margin-top:20px;padding:20px;font-size:1.3rem;font-weight:700;">
                     UMLAGE BUCHEN
                </button>
                <p style="text-align:center;margin-top:8px;color:var(--color-stone-dark);font-size:0.9rem;">
                    ${Utils.formatCurrency(preisProGast)} x ${totalGuests} Gäste = ${Utils.formatCurrency(preisProGast * totalGuests)}
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

window.bucheUmlageFürAlle = async () => {
    // NUR Supabase!
    if (!supabaseClient || !isOnline) {
        Utils.showToast('Keine Internetverbindung!', 'error');
        return;
    }
    
    // Alle aktiven Gäste von Supabase holen
    const { data: profiles, error: profileError } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('aktiv', true)
        .eq('geloescht', false);
    
    if (profileError) {
        Utils.showToast('Fehler beim Laden der Gäste', 'error');
        return;
    }
    
    // WICHTIG: Gäste mit Ausnahme Umlage filtern!
    const alleGäste = (profiles || []).filter(g => g.ausnahmeumlage !== true);
    const ausgenommen = (profiles || []).length - alleGäste.length;
    const totalGuests = alleGäste.length;
    
    if (totalGuests === 0) {
        Utils.showToast('Keine aktiven Gäste für Umlage', 'error');
        return;
    }
    
    const fehlendeOffen = await FehlendeGetränke.getOffene();
    if (fehlendeOffen.length === 0) {
        Utils.showToast('Keine fehlenden Getränke', 'error');
        return;
    }
    
    const gesamtPreis = fehlendeOffen.reduce((s, f) => s + f.artikel_preis, 0);
    const preisProGast = Math.ceil((gesamtPreis / totalGuests) * 100) / 100;
    
    let confirmMsg = `UMLAGE durchführen?\n\n${fehlendeOffen.length} fehlende Getränke\nGesamtwert: ${Utils.formatCurrency(gesamtPreis)}\n\n${Utils.formatCurrency(preisProGast)} x ${totalGuests} Gäste`;
    if (ausgenommen > 0) {
        confirmMsg += `\n\n(${ausgenommen} Gäste ausgenommen)`;
    }
    
    if (!confirm(confirmMsg)) {
        return;
    }
    
    const heute = Utils.getBuchungsDatum();
    const uhrzeit = Utils.formatTime(new Date());
    
    let erfolg = 0;
    let fehler = 0;
    
    // Für jeden Gast eine Buchung erstellen - DIREKT nach Supabase
    for (const gast of alleGäste) {
        const gastId = gast.id;
        const gastName = gast.vorname || gast.display_name || gast.first_name;
        
        const b = {
            buchung_id: Utils.uuid(),
            user_id: gastId,
            gast_vorname: gastName,
            artikel_id: 324,
            artikel_name: 'Umlage',
            preis: preisProGast,
            menge: 1,
            datum: heute,
            uhrzeit: uhrzeit,
            erstellt_am: new Date().toISOString(),
            storniert: false,
            exportiert: false,
            group_name: gast.group_name || 'keiner Gruppe zugehoerig'
        };
        
        // Direkt nach Supabase mit besserem Error-Logging
        const { data, error: insertError } = await supabaseClient.from('buchungen').insert(b).select();
        if (insertError) {
            console.error('❌ Umlage Buchung Fehler:', gastName, insertError.message, insertError.details, insertError.hint);
            fehler++;
        } else {
            console.log('✅ Umlage gebucht für:', gastName, data);
            erfolg++;
        }
    }
    
    // Alle fehlenden Getränke als umgelegt markieren - in Supabase
    for (const f of fehlendeOffen) {
        await supabaseClient
            .from('fehlende_getraenke')
            .update({ 
                uebernommen: true, 
                uebernommen_am: new Date().toISOString()
            })
            .eq('id', f.id);
    }
    
    if (ausgenommen > 0) {
        Utils.showToast(`✅ Umlage: ${Utils.formatCurrency(preisProGast)} auf ${erfolg} Gäste verteilt (${ausgenommen} ausgenommen)`, 'success');
    } else {
        Utils.showToast(`✅ Umlage: ${Utils.formatCurrency(preisProGast)} auf ${erfolg} Gäste verteilt`, 'success');
    }
    
    Router.navigate('admin-dashboard');
};

// ============ NOTFALL EXPORT (mit Datumsauswahl) ============
Router.register('admin-notfall-export', async () => {
    if (!State.isAdmin) { Router.navigate('admin-login'); return; }
    
    // Alle verfügbaren Datums-Werte laden
    let alleDaten = [];
    if (supabaseClient && isOnline) {
        try {
            const { data } = await supabaseClient
                .from('buchungen')
                .select('datum')
                .eq('storniert', false)
                .order('datum', { ascending: false });
            if (data) {
                // Unique Datums-Werte
                alleDaten = [...new Set(data.map(b => b.datum))].filter(d => d);
            }
        } catch(e) {
            console.error('Datums laden Fehler:', e);
        }
    }
    
    // Fallback lokal
    if (alleDaten.length === 0) {
        const bs = await db.buchungen.toArray();
        alleDaten = [...new Set(bs.filter(b => !b.storniert).map(b => b.datum))].filter(d => d);
        alleDaten.sort().reverse();
    }
    
    // Aktuelle letzte ID
    const lastExportId = ExportService.getLastExportId();
    
    UI.render(`<div class="app-header"><div class="header-left"><button class="menu-btn" onclick="Router.navigate('admin-dashboard')">←</button><div class="header-title"> Notfall-Export</div></div><div class="header-right"><button class="btn btn-secondary" onclick="handleLogout()">Abmelden</button></div></div>
    <div class="main-content">
        <div class="card mb-3" style="background:#95a5a6;color:white;">
            <div style="padding:16px;">
                <div style="font-weight:700;">⚠Nur im Notfall verwenden</div>
                <div style="font-size:0.9rem;opacity:0.9;">Exportiert Buchungen nach Datum (auch bereits exportierte)</div>
            </div>
        </div>
        
        <!-- LETZTE ID EINSTELLUNG -->
        <div class="card mb-3" style="border:2px solid #e74c3c;">
            <div class="card-header" style="background:#e74c3c;color:white;">
                <h3 style="margin:0;"> Letzte ID für Access</h3>
            </div>
            <div class="card-body">
                <p style="font-size:0.9rem;color:#666;margin-bottom:12px;">
                    Die ID wird fortlaufend hochgezaehlt. Stelle sicher, dass die ID mit Access uebereinstimmt!
                </p>
                <div style="display:flex;gap:12px;align-items:center;">
                    <input type="number" id="last-export-id" value="${lastExportId}" class="form-input" style="width:150px;font-size:1.2rem;font-weight:bold;">
                    <button class="btn btn-danger" onclick="saveLastExportId()"> Speichern</button>
                    <span style="color:#888;font-size:0.9rem;">Nächste Buchung: ID ${lastExportId + 1}</span>
                </div>
            </div>
        </div>
        
        <div class="card mb-3">
            <div class="card-header"><h3 style="margin:0;"> Zeitraum wählen</h3></div>
            <div class="card-body">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
                    <div>
                        <label style="font-weight:600;display:block;margin-bottom:8px;">Von Datum:</label>
                        <select id="notfall-von" class="form-input" style="width:100%;">
                            <option value="">-- Wählen --</option>
                            ${alleDaten.map(d => `<option value="${d}">${d}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label style="font-weight:600;display:block;margin-bottom:8px;">Bis Datum:</label>
                        <select id="notfall-bis" class="form-input" style="width:100%;">
                            <option value="">-- Wählen --</option>
                            ${alleDaten.map(d => `<option value="${d}">${d}</option>`).join('')}
                        </select>
                    </div>
                </div>
                
                <div style="margin-bottom:16px;padding:12px;background:#f8f9fa;border-radius:8px;">
                    <div id="notfall-vorschau" style="color:#666;">Bitte Zeitraum wählen...</div>
                </div>
                
                <button class="btn btn-secondary btn-block" onclick="handleNotfallExportMitDatum()" style="padding:12px;">
                     Ausgewählten Zeitraum exportieren (Excel für Access)
                </button>
            </div>
        </div>
        
        <div class="card" style="background:#f8f9fa;">
            <div style="padding:16px;">
                <strong> Info:</strong><br>
                <small style="color:#888;">
                    * Verfügbare Tage: ${alleDaten.length}<br>
                    * Aeltestes Datum: ${alleDaten[alleDaten.length-1] || '-'}<br>
                    * Neuestes Datum: ${alleDaten[0] || '-'}<br>
                    * Export-Format: Exakt wie Access-Tabelle "Buchenungsdetail"
                </small>
            </div>
        </div>
    </div>`);
    
    // Event Listener für Vorschau
    document.getElementById('notfall-von')?.addEventListener('change', updateNotfallVorschau);
    document.getElementById('notfall-bis')?.addEventListener('change', updateNotfallVorschau);
});

// Letzte ID speichern
window.saveLastExportId = () => {
    const input = document.getElementById('last-export-id');
    const newId = parseInt(input?.value);
    if (isNaN(newId) || newId < 0) {
        Utils.showToast('Ungueltige ID', 'error');
        return;
    }
    ExportService.setLastExportId(newId);
    Utils.showToast(`Letzte ID auf ${newId} gesetzt`, 'success');
    Router.navigate('admin-notfall-export'); // Seite neu laden
};

// Vorschau aktualisieren
window.updateNotfallVorschau = async () => {
    const von = document.getElementById('notfall-von')?.value;
    const bis = document.getElementById('notfall-bis')?.value;
    const vorschauEl = document.getElementById('notfall-vorschau');
    
    if (!von || !bis) {
        vorschauEl.innerHTML = 'Bitte Zeitraum wählen...';
        return;
    }
    
    // Buchungen zaehlen
    let count = 0;
    let summe = 0;
    
    if (supabaseClient && isOnline) {
        const { data } = await supabaseClient
            .from('buchungen')
            .select('preis, menge')
            .eq('storniert', false)
            .gte('datum', von)
            .lte('datum', bis);
        if (data) {
            count = data.length;
            summe = data.reduce((s, b) => s + (b.preis * b.menge), 0);
        }
    } else {
        const bs = await db.buchungen.toArray();
        const filtered = bs.filter(b => !b.storniert && b.datum >= von && b.datum <= bis);
        count = filtered.length;
        summe = filtered.reduce((s, b) => s + (b.preis * b.menge), 0);
    }
    
    vorschauEl.innerHTML = `<strong>${count} Buchungen</strong> im Zeitraum ${von} bis ${bis}<br>Gesamtsumme: <strong>${Utils.formatCurrency(summe)}</strong>`;
};

// Notfall Export mit Datum
window.handleNotfallExportMitDatum = async () => {
    const von = document.getElementById('notfall-von')?.value;
    const bis = document.getElementById('notfall-bis')?.value;
    
    if (!von || !bis) {
        Utils.showToast('Bitte Von und Bis Datum wählen', 'warning');
        return;
    }
    
    if (von > bis) {
        Utils.showToast('Von-Datum muss vor Bis-Datum liegen', 'warning');
        return;
    }
    
    // Buchungen laden
    let bs = [];
    if (supabaseClient && isOnline) {
        const { data } = await supabaseClient
            .from('buchungen')
            .select('*')
            .eq('storniert', false)
            .gte('datum', von)
            .lte('datum', bis)
            .order('datum', { ascending: true });
        if (data) bs = data;
    } else {
        const all = await db.buchungen.toArray();
        bs = all.filter(b => !b.storniert && b.datum >= von && b.datum <= bis);
    }
    
    if (bs.length === 0) {
        Utils.showToast('Keine Buchungen im gewählten Zeitraum', 'warning');
        return;
    }
    
    // Excel erstellen mit Access-kompatiblem Format
    const artikelCache = {};
    const allArt = await db.artikel.toArray();
    allArt.forEach(a => { artikelCache[a.artikel_id] = a; });
    
    let lastId = parseInt(localStorage.getItem('lastExportId') || '20037');
    
    // Datum formatieren für Access
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
            'Auffüllmenge2': 0,
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
    
    const filename = `Buchenungsdetail_${von}_bis_${bis}.xlsx`;
    XLSX.writeFile(wb, filename);
    
    localStorage.setItem('lastExportId', lastId.toString());
    Utils.showToast(`${bs.length} Buchungen exportiert (letzte ID: ${lastId})`, 'success');
};

// ============ GRUPPENVERWALTUNG ============
Router.register('admin-gruppen', async () => {
    if (!State.isAdmin) { Router.navigate('admin-login'); return; }
    
    const gruppen = await Gruppen.getAll();
    const isAktiv = await Gruppen.isAbfrageAktiv();
    
    UI.render(`<div class="app-header"><div class="header-left"><button class="menu-btn" onclick="Router.navigate('admin-dashboard')">←</button><div class="header-title"> Gruppenverwaltung</div></div><div class="header-right"><button class="btn btn-secondary" onclick="handleLogout()">Abmelden</button></div></div>
    <div class="main-content">
        <!-- TOGGLE: Gruppenabfrage aktiv -->
        <div class="card mb-3" style="background:${isAktiv ? 'var(--color-alpine-green)' : '#95a5a6'};color:white;">
            <div style="padding:20px;display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <div style="font-weight:700;font-size:1.2rem;">Gruppe bei Anmeldung abfragen</div>
                    <div style="font-size:0.9rem;opacity:0.9;">
                        ${isAktiv ? 'Gäste muessen nach Login eine Gruppe wählen' : 'Keine Gruppenabfrage beim Login'}
                    </div>
                </div>
                <label class="switch" style="position:relative;display:inline-block;width:60px;height:34px;">
                    <input type="checkbox" id="gruppenToggle" ${isAktiv ? 'checked' : ''} onchange="toggleGruppenAbfrage(this.checked)">
                    <span style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background-color:#ccc;transition:.4s;border-radius:34px;"></span>
                </label>
            </div>
        </div>
        
        <!-- GRUPPEN LISTE -->
        <div class="card mb-3">
            <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;">
                <h2 class="card-title" style="margin:0;">Gruppen (${gruppen.length}/3)</h2>
                ${gruppen.length < 3 ? `<button class="btn btn-primary" onclick="showAddGruppeModal()">+ Gruppe</button>` : ''}
            </div>
            <div class="card-body" style="padding:0;">
                ${gruppen.length > 0 ? `
                    <table style="width:100%;border-collapse:collapse;">
                        ${gruppen.map(g => `
                            <tr style="border-bottom:1px solid var(--color-stone-medium);">
                                <td style="padding:16px;font-weight:600;font-size:1.1rem;"> ${g.name}</td>
                                <td style="padding:16px;text-align:right;">
                                    <button class="btn btn-secondary" onclick="showEditGruppeModal(${g.id}, '${g.name}')" style="margin-right:8px;"></button>
                                    <button class="btn btn-danger" onclick="deleteGruppe(${g.id})"></button>
                                </td>
                            </tr>
                        `).join('')}
                    </table>
                ` : `
                    <div style="padding:40px;text-align:center;color:#888;">
                        <div style="font-size:3rem;margin-bottom:16px;"></div>
                        <div>Keine Gruppen vorhanden</div>
                        <div style="font-size:0.9rem;margin-top:8px;">Fuege bis zu 3 Gruppen hinzu (z.B. Unis)</div>
                    </div>
                `}
            </div>
        </div>
        
        ${isAktiv && gruppen.length === 0 ? `
            <div class="card" style="background:#e74c3c;color:white;">
                <div style="padding:16px;">
                    ⚠<strong>Achtung:</strong> Gruppenabfrage ist aktiv, aber keine Gruppen hinterlegt!
                    <br>Gäste können sich nicht anmelden, bis mindestens eine Gruppe existiert.
                </div>
            </div>
        ` : ''}
        
        <div class="card mt-3" style="background:var(--color-stone-light);">
            <div style="padding:16px;">
                <strong> Hinweis:</strong><br>
                * Wenn aktiv, muessen Gäste nach dem Login eine Gruppe wählen<br>
                * Die Gruppe wird bei jeder Buchung gespeichert<br>
                * Max. 3 Gruppen möglich (z.B. verschiedene Unis)
            </div>
        </div>
    </div>`);
    
    // CSS für Toggle
    const style = document.createElement('style');
    style.textContent = `
        .switch input { opacity: 0; width: 0; height: 0; }
        .switch span:before { position: absolute; content: ""; height: 26px; width: 26px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; }
        .switch input:checked + span { background-color: #27ae60; }
        .switch input:checked + span:before { transform: translateX(26px); }
    `;
    document.head.appendChild(style);
});

// Toggle Gruppenabfrage
window.toggleGruppenAbfrage = async (aktiv) => {
    if (aktiv) {
        const gruppen = await Gruppen.getAll();
        if (gruppen.length === 0) {
            Utils.showToast('Bitte erst mindestens eine Gruppe anlegen!', 'warning');
            document.getElementById('gruppenToggle').checked = false;
            return;
        }
    }
    await Gruppen.setAbfrageAktiv(aktiv);
    Utils.showToast(aktiv ? 'Gruppenabfrage aktiviert' : 'Gruppenabfrage deaktiviert', 'success');
    Router.navigate('admin-gruppen');
};

// Gruppe hinzufügen Modal
window.showAddGruppeModal = () => {
    const name = prompt('Gruppenname eingeben (z.B. "Uni Innsbruck"):');
    if (name && name.trim()) {
        addGruppe(name.trim());
    }
};

window.addGruppe = async (name) => {
    try {
        console.log('âž• Füge Gruppe hinzu:', name);
        const result = await Gruppen.add(name);
        console.log('✅ Gruppe hinzugefügt:', result);
        Utils.showToast(`Gruppe "${name}" hinzugefuegt`, 'success');
        Router.navigate('admin-gruppen');
    } catch (e) {
        console.error('❌ Gruppe hinzufügen Fehler:', e);
        Utils.showToast(e.message, 'error');
    }
};

// Gruppe bearbeiten
window.showEditGruppeModal = (id, currentName) => {
    const name = prompt('Neuer Gruppenname:', currentName);
    if (name && name.trim() && name.trim() !== currentName) {
        editGruppe(id, name.trim());
    }
};

window.editGruppe = async (id, name) => {
    try {
        await Gruppen.update(id, name);
        Utils.showToast(`Gruppe aktualisiert`, 'success');
        Router.navigate('admin-gruppen');
    } catch (e) {
        Utils.showToast(e.message, 'error');
    }
};

// Gruppe löschen
window.deleteGruppe = async (id) => {
    if (!confirm('Diese Gruppe wirklich löschen?\n\nBereits gespeicherte Buchungen behalten ihre Gruppenzuordnung.')) return;
    try {
        await Gruppen.delete(id);
        Utils.showToast('Gruppe gelöscht', 'success');
        Router.navigate('admin-gruppen');
    } catch (e) {
        Utils.showToast(e.message, 'error');
    }
};

// ============ PREISMODUS VERWALTUNG ============
Router.register('admin-preismodus', async () => {
    if (!State.isAdmin) { Router.navigate('admin-login'); return; }
    
    const currentModus = await PreisModus.getModus();
    const isHP = currentModus === PreisModus.HP;
    
    UI.render(`<div class="app-header"><div class="header-left"><button class="menu-btn" onclick="Router.navigate('admin-dashboard')">←</button><div class="header-title"> Preismodus</div></div><div class="header-right"><button class="btn btn-secondary" onclick="handleLogout()">Abmelden</button></div></div>
    <div class="main-content">
        
        <!-- AKTUELLER STATUS -->
        <div class="card mb-3" style="background:${isHP ? 'linear-gradient(135deg, #9b59b6, #8e44ad)' : 'linear-gradient(135deg, #3498db, #2980b9)'};color:white;">
            <div style="padding:24px;text-align:center;">
                <div style="font-size:4rem;margin-bottom:16px;">${isHP ? '' : ' '}</div>
                <div style="font-size:1.8rem;font-weight:700;margin-bottom:8px;">
                    ${isHP ? 'HALBPENSION (HP)' : 'SELBSTVERSORGER'}
                </div>
                <div style="font-size:1rem;opacity:0.9;">
                    ${isHP ? 'HP-Preise werden für alle neuen Buchungen verwendet' : 'Standard-Preise werden für alle neuen Buchungen verwendet'}
                </div>
            </div>
        </div>
        
        <!-- UMSCHALTEN -->
        <div class="card mb-3">
            <div class="card-header"><h3 style="margin:0;">Preismodus wechseln</h3></div>
            <div class="card-body">
                <p style="color:#666;margin-bottom:20px;">
                    Waehle den Preismodus für neue Gäste-Logins. Bereits getätigte Buchungen sind davon nicht betroffen.
                </p>
                
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                    <button onclick="setPreismodus('sv')" style="
                        padding:24px;
                        border-radius:16px;
                        border:3px solid ${!isHP ? '#3498db' : '#ddd'};
                        background:${!isHP ? 'linear-gradient(135deg, #3498db, #2980b9)' : 'white'};
                        color:${!isHP ? 'white' : '#333'};
                        cursor:pointer;
                        transition:all 0.2s;
                    ">
                        <div style="font-size:2.5rem;margin-bottom:8px;"> </div>
                        <div style="font-weight:700;font-size:1.1rem;">Selbstversorger</div>
                        <div style="font-size:0.85rem;opacity:0.8;margin-top:4px;">Standard-Preise</div>
                        ${!isHP ? '<div style="margin-top:8px;font-weight:bold;"> AKTIV</div>' : ''}
                    </button>
                    
                    <button onclick="setPreismodus('hp')" style="
                        padding:24px;
                        border-radius:16px;
                        border:3px solid ${isHP ? '#9b59b6' : '#ddd'};
                        background:${isHP ? 'linear-gradient(135deg, #9b59b6, #8e44ad)' : 'white'};
                        color:${isHP ? 'white' : '#333'};
                        cursor:pointer;
                        transition:all 0.2s;
                    ">
                        <div style="font-size:2.5rem;margin-bottom:8px;"></div>
                        <div style="font-weight:700;font-size:1.1rem;">Halbpension (HP)</div>
                        <div style="font-size:0.85rem;opacity:0.8;margin-top:4px;">HP-Preise</div>
                        ${isHP ? '<div style="margin-top:8px;font-weight:bold;"> AKTIV</div>' : ''}
                    </button>
                </div>
            </div>
        </div>
        
        <!-- INFO -->
        <div class="card" style="background:#f8f9fa;">
            <div style="padding:16px;">
                <h4 style="margin:0 0 12px 0;"> Hinweise</h4>
                <ul style="margin:0;padding-left:20px;color:#666;font-size:0.9rem;">
                    <li style="margin-bottom:8px;">Der Preismodus gilt für <strong>alle neuen Buchungen</strong> nach dem Wechsel</li>
                    <li style="margin-bottom:8px;">Bereits getätigte Buchungen behalten ihren urspruenglichen Preis</li>
                    <li style="margin-bottom:8px;">HP-Preise werden in der <strong>Artikelverwaltung</strong> gepflegt</li>
                    <li>Der Export enthaelt immer den tatsaechlich gebuchten Preis</li>
                </ul>
            </div>
        </div>
    </div>`);
});

// Preismodus setzen
window.setPreismodus = async (modus) => {
    await PreisModus.setModus(modus);
    State.currentPreisModus = modus;
    
    const name = modus === 'hp' ? 'Halbpension (HP)' : 'Selbstversorger';
    Utils.showToast(`Preismodus auf "${name}" geändert`, 'success');
    Router.navigate('admin-preismodus');
};

// ============ GAeSTE-NACHRICHT VERWALTUNG ============
Router.register('admin-nachricht', async () => {
    if (!State.isAdmin) { Router.navigate('admin-login'); return; }
    
    const aktiveNachricht = await GastNachricht.getAktive();
    const verbleibendeZeit = aktiveNachricht ? GastNachricht.getVerbleibendeZeit(aktiveNachricht) : null;
    
    UI.render(`<div class="app-header"><div class="header-left"><button class="menu-btn" onclick="Router.navigate('admin-dashboard')">←</button><div class="header-title"> Gäste-Nachricht</div></div><div class="header-right"><button class="btn btn-secondary" onclick="handleLogout()">Abmelden</button></div></div>
    <div class="main-content">
        
        <!-- INFO BOX -->
        <div class="card mb-3" style="background:linear-gradient(135deg, #3498db, #2980b9);color:white;">
            <div style="padding:20px;">
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
                    <span style="font-size:2rem;"></span>
                    <div>
                        <div style="font-weight:700;font-size:1.1rem;">So funktioniert's</div>
                        <div style="font-size:0.9rem;opacity:0.9;">
                            Sende wichtige Nachrichten an alle Gäste auf der Login-Seite
                        </div>
                    </div>
                </div>
                <ul style="margin:0;padding-left:20px;font-size:0.9rem;opacity:0.95;">
                    <li>Nachricht erscheint permanent auf der Login-Seite</li>
                    <li>Automatisches Ablaufen nach <strong>18 Stunden</strong></li>
                    <li>Gäste können die Nachricht <strong>nicht</strong> wegklicken</li>
                    <li>Nur du (Admin) kannst die Nachricht manuell löschen</li>
                </ul>
            </div>
        </div>
        
        ${aktiveNachricht ? `
        <!-- AKTIVE NACHRICHT -->
        <div class="card mb-3" style="border:3px solid #e74c3c;">
            <div class="card-header" style="background:#e74c3c;color:white;">
                <h2 class="card-title" style="margin:0;color:white;"> Aktive Nachricht</h2>
            </div>
            <div class="card-body">
                <div style="background:var(--color-stone-light);padding:16px;border-radius:8px;margin-bottom:16px;">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                        <span style="font-size:1.5rem;">${aktiveNachricht.typ === 'dringend' ? '' : aktiveNachricht.typ === 'warnung' ? '⚠' : ''}</span>
                        <span style="background:${aktiveNachricht.typ === 'dringend' ? '#e74c3c' : aktiveNachricht.typ === 'warnung' ? '#f39c12' : '#3498db'};color:white;padding:2px 10px;border-radius:12px;font-size:0.85rem;font-weight:600;">
                            ${aktiveNachricht.typ === 'dringend' ? 'DRINGEND' : aktiveNachricht.typ === 'warnung' ? 'Warnung' : 'Info'}
                        </span>
                    </div>
                    <div style="font-size:1.2rem;font-weight:600;line-height:1.4;">
                        "${aktiveNachricht.text}"
                    </div>
                </div>
                
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
                    <div style="text-align:center;padding:12px;background:var(--color-stone-light);border-radius:8px;">
                        <div style="font-size:0.85rem;color:var(--color-stone-dark);">Erstellt am</div>
                        <div style="font-weight:600;">${new Date(aktiveNachricht.erstellt_am).toLocaleString('de-AT')}</div>
                    </div>
                    <div style="text-align:center;padding:12px;background:#fff3cd;border-radius:8px;">
                        <div style="font-size:0.85rem;color:#856404;">🕐 Verbleibend</div>
                        <div style="font-weight:700;color:#856404;font-size:1.1rem;">${verbleibendeZeit}</div>
                    </div>
                </div>
                
                <button class="btn btn-danger btn-block" onclick="deaktiviereNachricht()" style="padding:16px;font-size:1.1rem;">
                     Nachricht jetzt deaktivieren
                </button>
            </div>
        </div>
        ` : `
        <!-- KEINE AKTIVE NACHRICHT -->
        <div class="card mb-3" style="background:var(--color-stone-light);">
            <div style="padding:40px;text-align:center;">
                <div style="font-size:4rem;margin-bottom:16px;opacity:0.5;"></div>
                <div style="font-size:1.2rem;font-weight:600;color:var(--color-stone-dark);">
                    Keine aktive Nachricht
                </div>
                <div style="font-size:0.9rem;color:var(--color-stone-dark);margin-top:8px;">
                    Erstelle eine neue Nachricht unten
                </div>
            </div>
        </div>
        `}
        
        <!-- NEUE NACHRICHT ERSTELLEN -->
        <div class="card">
            <div class="card-header" style="background:var(--color-alpine-green);color:white;">
                <h2 class="card-title" style="margin:0;color:white;">✏️ Neue Nachricht erstellen</h2>
            </div>
            <div class="card-body">
                <div class="form-group">
                    <label class="form-label" style="font-weight:600;">Nachrichtentext *</label>
                    <textarea id="nachricht-text" class="form-input" rows="3" placeholder="z.B. Auto mit Kennzeichen W-12345 bitte umparken!" style="font-size:1.1rem;"></textarea>
                    <small style="color:var(--color-stone-dark);">Halte die Nachricht kurz und praegnant</small>
                </div>
                
                <div class="form-group">
                    <label class="form-label" style="font-weight:600;">Dringlichkeit</label>
                    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
                        <label style="display:flex;flex-direction:column;align-items:center;padding:16px;background:var(--color-stone-light);border-radius:12px;cursor:pointer;border:3px solid transparent;transition:all 0.2s;" onclick="selectTyp('info')">
                            <input type="radio" name="nachricht-typ" value="info" checked style="display:none;">
                            <span style="font-size:2rem;margin-bottom:8px;"></span>
                            <span style="font-weight:600;">Info</span>
                            <span style="font-size:0.8rem;color:var(--color-stone-dark);">Normal</span>
                        </label>
                        <label style="display:flex;flex-direction:column;align-items:center;padding:16px;background:var(--color-stone-light);border-radius:12px;cursor:pointer;border:3px solid transparent;transition:all 0.2s;" onclick="selectTyp('warnung')">
                            <input type="radio" name="nachricht-typ" value="warnung" style="display:none;">
                            <span style="font-size:2rem;margin-bottom:8px;">⚠</span>
                            <span style="font-weight:600;">Warnung</span>
                            <span style="font-size:0.8rem;color:var(--color-stone-dark);">Auffällig</span>
                        </label>
                        <label style="display:flex;flex-direction:column;align-items:center;padding:16px;background:var(--color-stone-light);border-radius:12px;cursor:pointer;border:3px solid transparent;transition:all 0.2s;" onclick="selectTyp('dringend')">
                            <input type="radio" name="nachricht-typ" value="dringend" style="display:none;">
                            <span style="font-size:2rem;margin-bottom:8px;"></span>
                            <span style="font-weight:600;">Dringend</span>
                            <span style="font-size:0.8rem;color:var(--color-stone-dark);">Blinkt!</span>
                        </label>
                    </div>
                </div>
                
                <button class="btn btn-primary btn-block" onclick="erstelleNachricht()" style="padding:20px;font-size:1.2rem;margin-top:16px;">
                     Nachricht aktivieren
                </button>
                
                ${aktiveNachricht ? `
                <p style="text-align:center;margin-top:12px;color:#e74c3c;font-size:0.9rem;">
                    ⚠️ Die aktuelle Nachricht wird ersetzt!
                </p>
                ` : ''}
            </div>
        </div>
        
        <!-- BEISPIELE -->
        <div class="card mt-3" style="background:var(--color-stone-light);">
            <div style="padding:16px;">
                <strong> Beispiel-Nachrichten:</strong>
                <div style="margin-top:12px;display:flex;flex-direction:column;gap:8px;">
                    <button onclick="setBeispiel('Auto mit Kennzeichen W-12345 bitte umparken!')" style="text-align:left;padding:10px;background:white;border:1px solid var(--color-stone-medium);border-radius:8px;cursor:pointer;">
                         "Auto mit Kennzeichen W-12345 bitte umparken!"
                    </button>
                    <button onclick="setBeispiel('Heute Abend 19:00 Uhr gemeinsames Grillen auf der Terrasse!')" style="text-align:left;padding:10px;background:white;border:1px solid var(--color-stone-medium);border-radius:8px;cursor:pointer;">
                         "Heute Abend 19:00 Uhr gemeinsames Grillen auf der Terrasse!"
                    </button>
                    <button onclick="setBeispiel('Bitte Kuehlschrank kontrollieren - es fehlen Getränke!')" style="text-align:left;padding:10px;background:white;border:1px solid var(--color-stone-medium);border-radius:8px;cursor:pointer;">
                         "Bitte Kuehlschrank kontrollieren - es fehlen Getränke!"
                    </button>
                </div>
            </div>
        </div>
    </div>`);
    
    // Initial den ersten Typ markieren
    setTimeout(() => selectTyp('info'), 100);
});

// ===========================================
// TAGESMENUe VERWALTUNG
// ===========================================
Router.register('admin-tagesmenu', async () => {
    if (!State.isAdmin) { Router.navigate('admin-login'); return; }
    
    const menuData = await TagesMenu.getAlleMenus();
    
    UI.render(`<div class="app-header"><div class="header-left"><button class="menu-btn" onclick="Router.navigate('admin-dashboard')">←</button><div class="header-title"> Tagesmenü</div></div><div class="header-right"><button class="btn btn-secondary" onclick="handleLogout()">Abmelden</button></div></div>
    <div class="main-content">
        
        <!-- INFO BOX -->
        <div class="card mb-3" style="background:linear-gradient(135deg, #8B4513, #D2691E);color:white;">
            <div style="padding:20px;">
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
                    <span style="font-size:2rem;"></span>
                    <div>
                        <div style="font-weight:700;font-size:1.1rem;">So funktioniert's</div>
                        <div style="font-size:0.9rem;opacity:0.9;">
                            Zeige Mittags- und/oder Abendmenü auf der Startseite
                        </div>
                    </div>
                </div>
                <ul style="margin:0;padding-left:20px;font-size:0.9rem;opacity:0.95;">
                    <li>Menüs werden automatisch nach der eingestellten Uhrzeit ausgeblendet</li>
                    <li>Nutze *** oder **** als Trenner zwischen Gängen</li>
                    <li>Gäste sehen die Servierzeit im Button</li>
                </ul>
            </div>
        </div>
        
        <!-- MITTAGSMENUe -->
        <div class="card mb-3" style="border:3px solid ${menuData.mittag?.aktiv ? '#f39c12' : '#ddd'};">
            <div class="card-header" style="background:${menuData.mittag?.aktiv ? 'linear-gradient(135deg, #f39c12, #e67e22)' : '#95a5a6'};color:white;">
                <h2 class="card-title" style="margin:0;color:white;display:flex;align-items:center;gap:10px;">
                    <span></span> Mittagsmenü
                    ${menuData.mittag?.aktiv ? '<span style="background:rgba(255,255,255,0.3);padding:2px 10px;border-radius:12px;font-size:0.8rem;">AKTIV</span>' : ''}
                </h2>
            </div>
            <div class="card-body">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
                    <div class="form-group" style="margin:0;">
                        <label class="form-label" style="font-weight:600;font-size:0.85rem;"> Servierzeit</label>
                        <input type="time" id="mittag-uhrzeit" class="form-input" value="${menuData.mittag?.uhrzeit || '12:00'}">
                    </div>
                    <div class="form-group" style="margin:0;">
                        <label class="form-label" style="font-weight:600;font-size:0.85rem;"> Ausblenden um</label>
                        <input type="time" id="mittag-ausblenden" class="form-input" value="${menuData.mittag?.ausblenden_um || '14:30'}">
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label" style="font-weight:600;">Menü-Text</label>
                    <textarea id="mittag-text" class="form-input" rows="6" placeholder="Gemischter Salat

****

Käsespaetzle mit Roestzwiebeln

***

Dessert" style="font-size:0.95rem;line-height:1.5;">${menuData.mittag?.text || ''}</textarea>
                </div>
                
                <div style="display:flex;gap:12px;">
                    <button class="btn ${menuData.mittag?.aktiv ? 'btn-secondary' : 'btn-primary'}" onclick="toggleMittagMenu()" style="flex:1;padding:14px;">
                        ${menuData.mittag?.aktiv ? ' Deaktivieren' : '✅ Aktivieren'}
                    </button>
                    ${menuData.mittag?.aktiv ? `<button class="btn btn-primary" onclick="TagesMenu.showModal('mittag')" style="padding:14px;"> Vorschau</button>` : ''}
                </div>
            </div>
        </div>
        
        <!-- ABENDMENUe -->
        <div class="card mb-3" style="border:3px solid ${menuData.abend?.aktiv ? '#8B4513' : '#ddd'};">
            <div class="card-header" style="background:${menuData.abend?.aktiv ? 'linear-gradient(135deg, #8B4513, #D2691E)' : '#95a5a6'};color:white;">
                <h2 class="card-title" style="margin:0;color:white;display:flex;align-items:center;gap:10px;">
                    <span></span> Abendmenü
                    ${menuData.abend?.aktiv ? '<span style="background:rgba(255,255,255,0.3);padding:2px 10px;border-radius:12px;font-size:0.8rem;">AKTIV</span>' : ''}
                </h2>
            </div>
            <div class="card-body">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
                    <div class="form-group" style="margin:0;">
                        <label class="form-label" style="font-weight:600;font-size:0.85rem;"> Servierzeit</label>
                        <input type="time" id="abend-uhrzeit" class="form-input" value="${menuData.abend?.uhrzeit || '18:00'}">
                    </div>
                    <div class="form-group" style="margin:0;">
                        <label class="form-label" style="font-weight:600;font-size:0.85rem;"> Ausblenden um</label>
                        <input type="time" id="abend-ausblenden" class="form-input" value="${menuData.abend?.ausblenden_um || '19:30'}">
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label" style="font-weight:600;">Menü-Text</label>
                    <textarea id="abend-text" class="form-input" rows="6" placeholder="Tagessuppe

****

Schweinsbraten mit Knoedel
(Vegane Variante verfügbar)

***

Apfelstrudel mit Vanillesauce" style="font-size:0.95rem;line-height:1.5;">${menuData.abend?.text || ''}</textarea>
                </div>
                
                <div style="display:flex;gap:12px;">
                    <button class="btn ${menuData.abend?.aktiv ? 'btn-secondary' : 'btn-primary'}" onclick="toggleAbendMenu()" style="flex:1;padding:14px;">
                        ${menuData.abend?.aktiv ? ' Deaktivieren' : '✅ Aktivieren'}
                    </button>
                    ${menuData.abend?.aktiv ? `<button class="btn btn-primary" onclick="TagesMenu.showModal('abend')" style="padding:14px;"> Vorschau</button>` : ''}
                </div>
            </div>
        </div>
        
        <!-- ALLE SPEICHERN -->
        <button class="btn btn-block" onclick="speichereAlleMenus()" style="padding:20px;font-size:1.2rem;background:var(--color-alpine-green);color:white;border:none;">
             Alle Änderungen speichern
        </button>
        
    </div>`);
});

// Mittag aktivieren/deaktivieren
window.toggleMittagMenu = async () => {
    const menuData = await TagesMenu.getAlleMenus();
    const text = document.getElementById('mittag-text')?.value?.trim();
    const uhrzeit = document.getElementById('mittag-uhrzeit')?.value || '12:00';
    const ausblenden = document.getElementById('mittag-ausblenden')?.value || '14:30';
    
    if (!menuData.mittag.aktiv && !text) {
        Utils.showToast('Bitte erst Menü-Text eingeben!', 'error');
        return;
    }
    
    menuData.mittag = {
        aktiv: !menuData.mittag.aktiv,
        text: text || menuData.mittag.text,
        uhrzeit: uhrzeit,
        ausblenden_um: ausblenden
    };
    
    await TagesMenu.speichern(menuData);
    Router.navigate('admin-tagesmenu');
};

// Abend aktivieren/deaktivieren
window.toggleAbendMenu = async () => {
    const menuData = await TagesMenu.getAlleMenus();
    const text = document.getElementById('abend-text')?.value?.trim();
    const uhrzeit = document.getElementById('abend-uhrzeit')?.value || '18:00';
    const ausblenden = document.getElementById('abend-ausblenden')?.value || '19:30';
    
    if (!menuData.abend.aktiv && !text) {
        Utils.showToast('Bitte erst Menü-Text eingeben!', 'error');
        return;
    }
    
    menuData.abend = {
        aktiv: !menuData.abend.aktiv,
        text: text || menuData.abend.text,
        uhrzeit: uhrzeit,
        ausblenden_um: ausblenden
    };
    
    await TagesMenu.speichern(menuData);
    Router.navigate('admin-tagesmenu');
};

// Alle Menüs speichern (Text und Zeiten, ohne Aktivierungs-Status zu ändern)
window.speichereAlleMenus = async () => {
    const menuData = await TagesMenu.getAlleMenus();
    
    // Mittag
    menuData.mittag.text = document.getElementById('mittag-text')?.value?.trim() || '';
    menuData.mittag.uhrzeit = document.getElementById('mittag-uhrzeit')?.value || '12:00';
    menuData.mittag.ausblenden_um = document.getElementById('mittag-ausblenden')?.value || '14:30';
    
    // Abend
    menuData.abend.text = document.getElementById('abend-text')?.value?.trim() || '';
    menuData.abend.uhrzeit = document.getElementById('abend-uhrzeit')?.value || '18:00';
    menuData.abend.ausblenden_um = document.getElementById('abend-ausblenden')?.value || '19:30';
    
    await TagesMenu.speichern(menuData);
    Router.navigate('admin-tagesmenu');
};

// Typ auswählen (visuelle Markierung)
window.selectTyp = (typ) => {
    const labels = document.querySelectorAll('label[onclick^="selectTyp"]');
    labels.forEach(label => {
        label.style.borderColor = 'transparent';
        label.style.background = 'var(--color-stone-light)';
    });
    
    const colors = {
        info: '#3498db',
        warnung: '#f39c12',
        dringend: '#e74c3c'
    };
    
    const input = document.querySelector(`input[value="${typ}"]`);
    if (input) {
        input.checked = true;
        input.closest('label').style.borderColor = colors[typ];
        input.closest('label').style.background = `${colors[typ]}20`;
    }
};

// Beispiel-Text setzen
window.setBeispiel = (text) => {
    document.getElementById('nachricht-text').value = text;
    Utils.showToast('Text eingefügt!', 'info');
};

// Nachricht erstellen
window.erstelleNachricht = async () => {
    const text = document.getElementById('nachricht-text')?.value?.trim();
    const typ = document.querySelector('input[name="nachricht-typ"]:checked')?.value || 'info';
    
    if (!text) {
        Utils.showToast('Bitte Nachrichtentext eingeben!', 'warning');
        return;
    }
    
    if (text.length > 200) {
        Utils.showToast('Nachricht zu lang! Max. 200 Zeichen.', 'warning');
        return;
    }
    
    try {
        await GastNachricht.erstellen(text, typ);
        Router.navigate('admin-nachricht');
    } catch (e) {
        Utils.showToast(e.message, 'error');
    }
};

// Nachricht deaktivieren
window.deaktiviereNachricht = async () => {
    if (!confirm('Nachricht wirklich deaktivieren?\n\nSie wird für alle Gäste sofort ausgeblendet.')) return;
    
    try {
        await GastNachricht.deaktivieren();
        Router.navigate('admin-nachricht');
    } catch (e) {
        Utils.showToast(e.message, 'error');
    }
};

// ================================
// ADMIN: KAeSE-BESTELLUNGEN
// ================================
Router.register('admin-cheese', async () => {
    if (!State.isAdmin) { Router.navigate('admin-login'); return; }
    
    const orders = await CheeseOrders.getOpenOrders();
    
    const orderRows = orders.length ? orders.map(o => {
        const datum = new Date(o.created_at);
        const datumStr = datum.toLocaleDateString('de-AT');
        const zeitStr = datum.toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' });
        const verpackung = o.packaging_type === 'VACUUM' ? ' Vakuum' : ' Folie';
        const preis = CheeseOrders.formatPrice(o.total_price_cents);
        
        return `
        <tr style="border-bottom:1px solid #eee;">
            <td style="padding:12px 8px;font-size:0.9rem;">
                <div style="font-weight:600;">${datumStr}</div>
                <div style="color:#888;font-size:0.8rem;">${zeitStr}</div>
            </td>
            <td style="padding:12px 8px;font-weight:600;">${o.guest_name}</td>
            <td style="padding:12px 8px;text-align:center;font-weight:700;">${o.grams}g</td>
            <td style="padding:12px 8px;text-align:center;">${verpackung}</td>
            <td style="padding:12px 8px;text-align:right;font-weight:700;color:#27ae60;">${preis}</td>
            <td style="padding:12px 8px;text-align:center;">
                <button onclick="handleCheeseOrderDone('${o.id}')" style="
                    padding:8px 16px;
                    background:#27ae60;
                    color:white;
                    border:none;
                    border-radius:8px;
                    font-size:0.85rem;
                    font-weight:600;
                    cursor:pointer;
                "> Erledigt</button>
            </td>
        </tr>`;
    }).join('') : `
        <tr>
            <td colspan="6" style="padding:40px;text-align:center;color:#888;">
                <div style="font-size:3rem;margin-bottom:12px;"></div>
                <div style="font-size:1.1rem;">Keine offenen Käse-Bestellungen</div>
            </td>
        </tr>`;
    
    // Statistik berechnen
    const totalGrams = orders.reduce((s, o) => s + o.grams, 0);
    const totalRevenue = orders.reduce((s, o) => s + o.total_price_cents, 0);
    
    UI.render(`
    <div class="app-header">
        <div class="header-left">
            <button class="btn btn-secondary" onclick="Router.navigate('admin-dashboard')">← Zurück</button>
        </div>
        <div class="header-title"> Käse-Bestellungen</div>
        <div class="header-right">
            <button class="btn btn-secondary" onclick="Router.navigate('admin-cheese')"></button>
        </div>
    </div>
    <div class="main-content">
        <!-- Statistik -->
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px;">
            <div style="background:linear-gradient(135deg, #f4d03f, #f39c12);padding:16px;border-radius:12px;text-align:center;color:#5d4e37;">
                <div style="font-size:2rem;font-weight:700;">${orders.length}</div>
                <div style="font-size:0.85rem;">Offene Bestellungen</div>
            </div>
            <div style="background:linear-gradient(135deg, #3498db, #2980b9);padding:16px;border-radius:12px;text-align:center;color:white;">
                <div style="font-size:2rem;font-weight:700;">${totalGrams}g</div>
                <div style="font-size:0.85rem;">Gesamt Menge</div>
            </div>
            <div style="background:linear-gradient(135deg, #27ae60, #2ecc71);padding:16px;border-radius:12px;text-align:center;color:white;">
                <div style="font-size:2rem;font-weight:700;">${CheeseOrders.formatPrice(totalRevenue)}</div>
                <div style="font-size:0.85rem;">Gesamt Umsatz</div>
            </div>
        </div>
        
        <!-- Tabelle -->
        <div class="card" style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;">
                <thead>
                    <tr style="background:#f8f9fa;border-bottom:2px solid #dee2e6;">
                        <th style="padding:12px 8px;text-align:left;font-size:0.85rem;color:#666;">Datum</th>
                        <th style="padding:12px 8px;text-align:left;font-size:0.85rem;color:#666;">Name</th>
                        <th style="padding:12px 8px;text-align:center;font-size:0.85rem;color:#666;">Menge</th>
                        <th style="padding:12px 8px;text-align:center;font-size:0.85rem;color:#666;">Verpackung</th>
                        <th style="padding:12px 8px;text-align:right;font-size:0.85rem;color:#666;">Preis</th>
                        <th style="padding:12px 8px;text-align:center;font-size:0.85rem;color:#666;">Aktion</th>
                    </tr>
                </thead>
                <tbody>
                    ${orderRows}
                </tbody>
            </table>
        </div>
        
        <div style="margin-top:20px;padding:16px;background:#fff3cd;border-radius:10px;font-size:0.9rem;color:#856404;">
            <strong> Hinweis:</strong> Erledigte Bestellungen werden aus dieser Liste entfernt, bleiben aber für Auswertungen in der Datenbank erhalten.
        </div>
    </div>`);
});

// Käse-Bestellung als erledigt markieren
window.handleCheeseOrderDone = async (orderId) => {
    if (!confirm('Bestellung wirklich als erledigt markieren?')) return;
    
    try {
        await CheeseOrders.markAsDone(orderId);
        Utils.showToast(' Bestellung erledigt!', 'success');
        Router.navigate('admin-cheese');
    } catch (error) {
        Utils.showToast('Fehler: ' + error.message, 'error');
    }
};

Router.register('admin-guests', async () => {
    if (!State.isAdmin) { Router.navigate('admin-login'); return; }
    
    // Alle Gäste laden - IMMER von Supabase wenn online (enthält pin_hash)
    let guests = [];
    let loadedFrom = 'lokal';
    
    if (supabaseClient && isOnline) {
        try {
            const { data, error } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('geloescht', false)
                .eq('aktiv', true)  // Nur AKTIVE Gäste (nicht ausgecheckt)
                .order('vorname');
            
            if (error) {
                console.error('Supabase Gäste laden Fehler:', error);
            } else if (data && data.length > 0) {
                loadedFrom = 'Supabase';
                
                // DEDUPLIZIERUNG: Nur einen Eintrag pro Name behalten
                const seenNames = new Set();
                const uniqueData = data.filter(g => {
                    const name = (g.display_name || g.vorname || g.first_name || '').toUpperCase().trim();
                    if (seenNames.has(name)) {
                        console.log('⚠️ Duplikat übersprungen:', name);
                        return false;
                    }
                    seenNames.add(name);
                    return true;
                });
                
                // Supabase Daten mit korrekten Feldnamen mappen
                guests = uniqueData.map(g => {
                    const pin = g.pin_hash || g.pin || '';
                    console.log('Gast:', g.vorname || g.display_name, 'PIN:', pin ? '****' : 'KEINE');
                    return {
                        ...g,
                        nachname: g.display_name || g.vorname || g.first_name,
                        firstName: g.display_name || g.vorname || g.first_name,
                        passwort: pin,  // PIN aus Supabase
                        passwordHash: pin,
                        pin_hash: pin,
                        gruppenname: g.group_name || 'keiner Gruppe zugehörig',
                        ausnahmeumlage: g.ausnahmeumlage || false
                    };
                });
                console.log('✅ Gäste von Supabase geladen:', guests.length, '(nach Deduplizierung)');
            }
        } catch(e) {
            console.error('Supabase Gäste laden Exception:', e);
        }
    }
    
    // Fallback: Lokale Daten - nur aktive, dedupliziert
    if (guests.length === 0) {
        let localGuests = await db.registeredGuests.toArray();
        localGuests = localGuests.filter(g => !g.gelöscht && g.aktiv !== false);
        
        // Deduplizierung
        const seenNames = new Set();
        guests = localGuests.filter(g => {
            const name = (g.nachname || g.firstName || '').toUpperCase().trim();
            if (seenNames.has(name)) return false;
            seenNames.add(name);
            return true;
        });
        console.log('⚠️ Gäste von lokalem Cache geladen:', guests.length);
    }
    
    // Inaktive Gäste zaehlen (für Button)
    let inaktivCount = 0;
    if (supabaseClient && isOnline) {
        const { count } = await supabaseClient
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('geloescht', false)
            .eq('aktiv', false);
        inaktivCount = count || 0;
    }
    
    // Nach Nachname sortieren
    guests.sort((a, b) => {
        const nameA = (a.nachname || a.firstName || '').toUpperCase();
        const nameB = (b.nachname || b.firstName || '').toUpperCase();
        return nameA.localeCompare(nameB);
    });
    
    // Gruppen laden
    const gruppen = await db.gruppen.toArray();
    const gruppenAktiv = gruppen.filter(g => g.aktiv);
    
    UI.render(`<div class="app-header"><div class="header-left"><button class="menu-btn" onclick="Router.navigate('admin-dashboard')">←</button><div class="header-title"> Gästeverwaltung</div></div><div class="header-right"><button class="btn btn-secondary" onclick="handleLogout()">Abmelden</button></div></div>
    <div class="main-content">
        <style>
            .switch { position:relative; display:inline-block; width:50px; height:26px; }
            .switch input { opacity:0; width:0; height:0; }
            .slider { position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background-color:#ccc; transition:.3s; border-radius:26px; }
            .slider:before { position:absolute; content:""; height:20px; width:20px; left:3px; bottom:3px; background-color:white; transition:.3s; border-radius:50%; }
            input:checked + .slider { background-color:#e67e22; }
            input:checked + .slider:before { transform:translateX(24px); }
        </style>
        
        <!-- Such- und Filterleiste -->
        <div class="card mb-3" style="background:#fffde7;">
            <div class="card-body" style="padding:12px;">
                <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:end;">
                    <div style="flex:1;min-width:150px;">
                        <label style="font-weight:600;font-size:0.85rem;">Nachname:</label>
                        <div style="display:flex;gap:8px;">
                            <input type="text" id="search-nachname" class="form-input" style="flex:1;">
                            <button class="btn btn-secondary" onclick="filterGästeTabelle()">suchen</button>
                        </div>
                    </div>
                    <div style="flex:1;min-width:150px;">
                        <label style="font-weight:600;font-size:0.85rem;">Gruppe:</label>
                        <div style="display:flex;gap:8px;">
                            <select id="search-gruppe" class="form-input" style="flex:1;">
                                <option value="">Alle Gruppen</option>
                                ${gruppenAktiv.map(g => `<option value="${g.name}">${g.name}</option>`).join('')}
                                <option value="keiner Gruppe zugehörig">keiner Gruppe zugehörig</option>
                            </select>
                            <button class="btn btn-secondary" onclick="filterGästeTabelle()">suchen</button>
                        </div>
                    </div>
                    <button class="btn btn-secondary" onclick="clearGästeFilter()">Suche löschen</button>
                    <button class="btn btn-primary" onclick="openNeuerGastModal()">+ Neuer Gast</button>
                </div>
            </div>
        </div>
        
        <!-- Tabelle -->
        <div class="card">
            <div class="card-header" style="background:#fffde7;display:flex;justify-content:space-between;align-items:center;">
                <span style="font-weight:700;">Aktive Gäste (${guests.length})</span>
                <button class="btn btn-secondary" onclick="exportGästeExcel()"> Export für Access</button>
            </div>
            <div style="overflow-x:auto;">
                <table id="gäste-tabelle" style="width:100%;border-collapse:collapse;font-size:0.9rem;">
                    <thead>
                        <tr style="background:#fffde7;">
                            <th style="padding:10px;border:1px solid #ddd;text-align:left;min-width:120px;">Nachname</th>
                            <th style="padding:10px;border:1px solid #ddd;text-align:left;min-width:150px;">Gruppenname</th>
                            <th style="padding:10px;border:1px solid #ddd;text-align:center;min-width:100px;">Passwort (PIN)</th>
                            <th style="padding:10px;border:1px solid #ddd;text-align:center;min-width:120px;">Registriert</th>
                            <th style="padding:10px;border:1px solid #ddd;text-align:center;min-width:140px;">Letzter Login</th>
                            <th style="padding:10px;border:1px solid #ddd;text-align:center;min-width:100px;">Ausnahme Umlage</th>
                            <th style="padding:10px;border:1px solid #ddd;text-align:center;min-width:180px;">Aktionen</th>
                        </tr>
                    </thead>
                    <tbody id="gäste-tbody">
                        ${guests.length === 0 ? '<tr><td colspan="7" style="padding:20px;text-align:center;color:#666;">Keine Gäste vorhanden</td></tr>' : guests.map(g => {
                            const name = g.nachname || g.firstName || '-';
                            const grpName = g.gruppenname || g.group_name || 'keiner Gruppe zugehörig';
                            const pw = g.passwort || g.passwordHash || g.pin_hash;
                            const pwDisplay = pw ? pw : '<span style="color:#e74c3c;">⚠KEINE</span>';
                            const pwStyle = pw ? 'color:#2c3e50;' : 'color:#e74c3c;';
                            const ausnahme = g.ausnahmeumlage || false;
                            const createdAt = g.created_at || g.createdAt;
                            const createdFormatted = createdAt ? new Date(createdAt).toLocaleString('de-AT', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'}) : '-';
                            const lastLogin = g.last_login_at || g.lastLoginAt;
                            const lastLoginFormatted = lastLogin ? new Date(lastLogin).toLocaleString('de-AT', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'}) : '-';
                            return `
                            <tr class="gäste-row" data-name="${name.toLowerCase()}" data-gruppe="${grpName.toLowerCase()}" data-id="${g.id}">
                                <td style="padding:10px;border:1px solid #ddd;font-weight:600;">${name}</td>
                                <td style="padding:10px;border:1px solid #ddd;">${grpName}</td>
                                <td style="padding:10px;border:1px solid #ddd;text-align:center;font-family:monospace;font-size:1.2rem;font-weight:bold;${pwStyle}">${pwDisplay}</td>
                                <td style="padding:10px;border:1px solid #ddd;text-align:center;font-size:0.85rem;color:#27ae60;">${createdFormatted}</td>
                                <td style="padding:10px;border:1px solid #ddd;text-align:center;font-size:0.85rem;color:#666;">${lastLoginFormatted}</td>
                                <td style="padding:10px;border:1px solid #ddd;text-align:center;">
                                    <label class="switch">
                                        <input type="checkbox" ${ausnahme ? 'checked' : ''} onchange="toggleAusnahme('${g.id}', this.checked)">
                                        <span class="slider"></span>
                                    </label>
                                </td>
                                <td style="padding:10px;border:1px solid #ddd;text-align:center;white-space:nowrap;">
                                    <button class="btn btn-primary" onclick="adminBuchenFürGast('${g.id}')" style="padding:6px 12px;margin-right:4px;" title="Für diesen Gast buchen"></button>
                                    <button class="btn btn-secondary" onclick="editGast('${g.id}')" style="padding:6px 10px;margin-right:4px;" title="Bearbeiten">✏️</button>
                                    <button class="btn btn-danger" onclick="handleDeleteGast('${g.id}')" style="padding:6px 10px;" title="Löschen"></button>
                                </td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
            <div style="padding:12px;background:#f8f9fa;border-top:1px solid #ddd;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                <small>Gesamt: ${guests.length} aktive Gäste | Ausgenommen von Umlage: ${guests.filter(g => g.ausnahmeumlage).length}</small>
                <div style="display:flex;gap:8px;">
                    ${inaktivCount > 0 ? `<button class="btn btn-secondary" onclick="Router.navigate('admin-guests-inaktiv')" style="padding:6px 12px;font-size:0.85rem;"> Inaktive (${inaktivCount})</button>` : ''}
                    <button class="btn btn-secondary" onclick="syncPinsToSupabase()" style="padding:6px 12px;font-size:0.85rem;"> Sync</button>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Modal für Neuer/Bearbeiten Gast -->
    <div id="gast-modal" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:1000;justify-content:center;align-items:center;">
        <div style="background:white;padding:24px;border-radius:12px;width:90%;max-width:500px;max-height:90vh;overflow-y:auto;">
            <h3 id="gast-modal-title" style="margin-bottom:16px;">Neuer Gast</h3>
            <input type="hidden" id="gast-edit-id">
            
            <div style="display:grid;gap:16px;">
                <div>
                    <label style="font-weight:600;">Nachname: *</label>
                    <div style="display:flex;gap:8px;">
                        <input type="text" id="gast-nachname" class="form-input" placeholder="z.B. MUELLER" style="text-transform:uppercase;font-size:1.1rem;flex:1;">
                        <button type="button" class="btn btn-secondary" onclick="showKeyboard('gast-nachname')" style="padding:12px 16px;font-size:1.3rem;" title="Virtuelle Tastatur">⌨️</button>
                    </div>
                </div>
                <div>
                    <label style="font-weight:600;">Gruppenname:</label>
                    <select id="gast-gruppenname" class="form-input">
                        <option value="keiner Gruppe zugehörig">keiner Gruppe zugehörig</option>
                        ${gruppenAktiv.map(g => `<option value="${g.name}">${g.name}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label style="font-weight:600;">Passwort (PIN): *</label>
                    <div style="display:flex;gap:8px;">
                        <input type="text" id="gast-passwort" class="form-input" placeholder="4-stellige PIN" maxlength="4" style="font-family:monospace;font-size:1.5rem;letter-spacing:8px;text-align:center;font-weight:bold;flex:1;">
                        <button type="button" class="btn btn-secondary" onclick="showNumpad('gast-passwort')" style="padding:12px 16px;font-size:1.3rem;" title="Numpad">🔢</button>
                    </div>
                    <small style="color:#666;">Der Gast meldet sich mit dieser PIN an</small>
                </div>
            </div>
            
            <div style="display:flex;gap:12px;margin-top:24px;">
                <button class="btn btn-primary" onclick="saveGast()" style="flex:1;padding:14px;"> Speichern</button>
                <button class="btn btn-secondary" onclick="closeGastModal()" style="flex:1;padding:14px;">Abbrechen</button>
            </div>
        </div>
    </div>`);
});

// ============ INAKTIVE GAeSTE (ausgecheckt) ============
Router.register('admin-guests-inaktiv', async () => {
    if (!State.isAdmin) { Router.navigate('admin-login'); return; }
    
    // Inaktive Gäste laden (aktiv = false)
    let guests = [];
    
    if (supabaseClient && isOnline) {
        try {
            const { data, error } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('geloescht', false)
                .eq('aktiv', false)
                .order('vorname');
            
            if (!error && data) {
                guests = data.map(g => ({
                    ...g,
                    nachname: g.vorname || g.first_name,
                    firstName: g.vorname || g.first_name,
                    passwort: g.pin_hash,
                    gruppenname: g.group_name || 'keiner Gruppe zugehörig'
                }));
            }
        } catch(e) {
            console.error('Inaktive Gäste laden Fehler:', e);
        }
    }
    
    // Fallback lokal
    if (guests.length === 0) {
        const all = await db.registeredGuests.toArray();
        guests = all.filter(g => !g.gelöscht && g.aktiv === false);
    }
    
    UI.render(`<div class="app-header"><div class="header-left"><button class="menu-btn" onclick="Router.navigate('admin-guests')">→</button><div class="header-title"> Inaktive Gäste</div></div><div class="header-right"><button class="btn btn-secondary" onclick="handleLogout()">Abmelden</button></div></div>
    <div class="main-content">
        <div class="card mb-3" style="background:#95a5a6;color:white;">
            <div style="padding:16px;text-align:center;">
                <div style="font-size:1.5rem;font-weight:700;">${guests.length} inaktive Gäste</div>
                <div style="opacity:0.9;">Diese Gäste haben ausgecheckt und sind nicht mehr aktiv</div>
            </div>
        </div>
        
        <div class="card">
            <div style="overflow-x:auto;">
                <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
                    <thead>
                        <tr style="background:#f8f9fa;">
                            <th style="padding:10px;border:1px solid #ddd;text-align:left;">Nachname</th>
                            <th style="padding:10px;border:1px solid #ddd;text-align:left;">Gruppenname</th>
                            <th style="padding:10px;border:1px solid #ddd;text-align:center;">Aktionen</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${guests.length === 0 ? '<tr><td colspan="3" style="padding:20px;text-align:center;color:#666;">Keine inaktiven Gäste</td></tr>' : guests.map(g => {
                            const name = g.nachname || g.firstName || '-';
                            const grpName = g.gruppenname || g.group_name || '-';
                            return `
                            <tr>
                                <td style="padding:10px;border:1px solid #ddd;font-weight:600;">${name}</td>
                                <td style="padding:10px;border:1px solid #ddd;">${grpName}</td>
                                <td style="padding:10px;border:1px solid #ddd;text-align:center;">
                                    <button class="btn btn-primary" onclick="reactivateGast('${g.id}', '${name}')" style="padding:6px 12px;" title="Wieder aktivieren"> Reaktivieren</button>
                                    <button class="btn btn-danger" onclick="handleDeleteGast('${g.id}')" style="padding:6px 10px;margin-left:4px;" title="Endgueltig löschen"></button>
                                </td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
        
        <div class="card mt-3" style="background:#fff3cd;border:1px solid #ffc107;">
            <div style="padding:12px;">
                <strong> Hinweis:</strong> Ausgecheckte Gäste können sich nicht mehr anmelden. 
                Mit "Reaktivieren" kann ein Gast wieder aktiviert werden.
            </div>
        </div>
    </div>`);
});

// Filter Funktionen
// Sync alle lokalen PINs nach Supabase
window.syncPinsToSupabase = async () => {
    if (!supabaseClient || !isOnline) {
        Utils.showToast('Offline - Sync nicht möglich', 'error');
        return;
    }
    
    Utils.showToast('Synchronisiere PINs...', 'info');
    
    const localGuests = await db.registeredGuests.toArray();
    let synced = 0;
    let errors = 0;
    
    for (const g of localGuests) {
        if (!g.id || g.gelöscht) continue;
        
        const pin = g.passwort || g.passwordHash;
        if (!pin) continue;
        
        try {
            // Versuche Update
            const { error } = await supabaseClient
                .from('profiles')
                .update({ 
                    pin_hash: pin,
                    vorname: g.nachname || g.firstName,
                    group_name: g.gruppenname || g.group_name || 'keiner Gruppe zugehörig'
                })
                .eq('id', g.id);
            
            if (error) {
                // Falls nicht existiert, Insert versuchen
                const { error: insertError } = await supabaseClient
                    .from('profiles')
                    .insert({ 
                        id: g.id,
                        pin_hash: pin,
                        vorname: g.nachname || g.firstName,
                        group_name: g.gruppenname || g.group_name || 'keiner Gruppe zugehörig',
                        aktiv: true,
                        geloescht: false
                    });
                
                if (insertError) {
                    console.error('Sync Fehler für', g.id, insertError);
                    errors++;
                } else {
                    synced++;
                }
            } else {
                synced++;
            }
        } catch (e) {
            console.error('Sync Exception für', g.id, e);
            errors++;
        }
    }
    
    if (errors > 0) {
        Utils.showToast(`Sync: ${synced} OK, ${errors} Fehler`, 'warning');
    } else {
        Utils.showToast(`${synced} PINs synchronisiert!`, 'success');
    }
    
    // Seite neu laden
    Router.navigate('admin-guests');
};

// Gast wieder aktivieren (reaktivieren) - falls versehentlich inaktiv
window.reactivateGast = async (id, name) => {
    if (!confirm(`Gast "${name}" wieder AKTIVIEREN?`)) return;
    
    // Supabase updaten
    if (supabaseClient && isOnline) {
        try {
            await supabaseClient
                .from('profiles')
                .update({ 
                    aktiv: true
                })
                .eq('id', id);
        } catch(e) {
            console.error('Reactivate Exception:', e);
        }
    }
    
    // Lokal updaten
    try {
        await db.registeredGuests.update(id, { 
            aktiv: true
        });
    } catch(e) {}
    
    await DataProtection.createBackup();
    Utils.showToast(`✅ ${name} wieder aktiviert`, 'success');
    Router.navigate('admin-guests-inaktiv');
};

window.filterGästeTabelle = () => {
    const suchName = (document.getElementById('search-nachname')?.value || '').toLowerCase();
    const suchGruppe = (document.getElementById('search-gruppe')?.value || '').toLowerCase();
    
    document.querySelectorAll('.gäste-row').forEach(row => {
        const name = row.dataset.name || '';
        const gruppe = row.dataset.gruppe || '';
        
        const matchName = !suchName || name.includes(suchName);
        const matchGruppe = !suchGruppe || gruppe.includes(suchGruppe);
        
        row.style.display = (matchName && matchGruppe) ? '' : 'none';
    });
};

window.clearGästeFilter = () => {
    document.getElementById('search-nachname').value = '';
    document.getElementById('search-gruppe').value = '';
    document.querySelectorAll('.gäste-row').forEach(row => row.style.display = '');
};

// Modal Funktionen
window.openNeuerGastModal = async () => {
    document.getElementById('gast-modal-title').textContent = 'Neuer Gast anlegen';
    document.getElementById('gast-edit-id').value = '';
    document.getElementById('gast-nachname').value = '';
    document.getElementById('gast-gruppenname').value = 'keiner Gruppe zugehörig';
    document.getElementById('gast-passwort').value = '';
    
    document.getElementById('gast-modal').style.display = 'flex';
};

window.editGast = async (id) => {
    console.log('editGast called with id:', id);
    
    let gast = null;
    
    // Zuerst von Supabase laden (hat aktuellste Daten)
    if (supabaseClient && isOnline) {
        try {
            const { data, error } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', id)
                .single();
            
            if (!error && data) {
                gast = {
                    ...data,
                    nachname: data.vorname || data.first_name,
                    firstName: data.vorname || data.first_name,
                    passwort: data.pin_hash,
                    passwordHash: data.pin_hash,
                    gruppenname: data.group_name || 'keiner Gruppe zugehörig'
                };
                console.log('Gast von Supabase geladen:', gast.nachname);
            }
        } catch(e) {
            console.error('Supabase Fehler:', e);
        }
    }
    
    // Fallback: Lokaler Cache
    if (!gast) {
        const alleGäste = await db.registeredGuests.toArray();
        gast = alleGäste.find(g => String(g.id) === String(id));
    }
    
    if (!gast) {
        Utils.showToast('Gast nicht gefunden!', 'error');
        console.error('Gast nicht gefunden für ID:', id);
        return;
    }
    
    document.getElementById('gast-modal-title').textContent = 'Gast bearbeiten';
    document.getElementById('gast-edit-id').value = gast.id;
    document.getElementById('gast-nachname').value = gast.nachname || gast.firstName || '';
    document.getElementById('gast-gruppenname').value = gast.gruppenname || gast.group_name || 'keiner Gruppe zugehörig';
    document.getElementById('gast-passwort').value = gast.passwort || gast.passwordHash || '';
    
    document.getElementById('gast-modal').style.display = 'flex';
};

window.closeGastModal = () => {
    document.getElementById('gast-modal').style.display = 'none';
};

// Toggle Ausnahme direkt in Tabelle
window.toggleAusnahme = async (id, checked) => {
    try {
        // Supabase updaten
        if (supabaseClient && isOnline) {
            await supabaseClient
                .from('profiles')
                .update({ ausnahmeumlage: checked })
                .eq('id', id);
        }
        
        // Lokal updaten
        const alleGäste = await db.registeredGuests.toArray();
        const gast = alleGäste.find(g => String(g.id) === String(id));
        
        if (gast) {
            await db.registeredGuests.update(gast.id, { ausnahmeumlage: checked });
        }
        
        await DataProtection.createBackup();
        Utils.showToast(checked ? 'Ausnahme aktiviert' : 'Ausnahme deaktiviert', 'success');
    } catch (e) {
        console.error('Toggle Ausnahme Error:', e);
        Utils.showToast('Fehler beim Speichern', 'error');
    }
};

window.saveGast = async () => {
    const editId = document.getElementById('gast-edit-id').value;
    const nachname = document.getElementById('gast-nachname').value.trim().toUpperCase();
    const gruppenname = document.getElementById('gast-gruppenname').value;
    const passwort = document.getElementById('gast-passwort').value.trim();
    
    if (!nachname) {
        Utils.showToast('Nachname erforderlich!', 'error');
        return;
    }
    
    // Nur Buchstaben, Leerzeichen und Bindestrich erlaubt
    if (!/^[A-ZAeOeUe][A-ZAeOeUe\s\-]*$/.test(nachname)) {
        Utils.showToast('Name darf nur Buchstaben und Bindestriche enthalten!', 'error');
        return;
    }
    
    if (!passwort || passwort.length < 4) {
        Utils.showToast('PIN muss mindestens 4 Zeichen haben!', 'error');
        return;
    }
    
    // Alle Gäste laden (von Supabase wenn online)
    let alleGäste = [];
    if (supabaseClient && isOnline) {
        try {
            const { data } = await supabaseClient.from('profiles').select('*').eq('geloescht', false).eq('aktiv', true);
            if (data) alleGäste = data.map(g => ({ ...g, nachname: g.vorname, passwort: g.pin_hash }));
        } catch(e) {}
    }
    if (alleGäste.length === 0) {
        alleGäste = await db.registeredGuests.toArray();
        alleGäste = alleGäste.filter(g => !g.gelöscht && g.aktiv !== false);
    }
    
    // Prüfen ob Name schon vergeben - NUR bei AKTIVEN Gästen!
    // Ausgecheckte Gäste (aktiv=false) blockieren den Namen NICHT
    const nameExists = alleGäste.find(g => 
        ((g.nachname || g.vorname || g.firstName || '').toUpperCase() === nachname) && 
        String(g.id) !== String(editId)
    );
    if (nameExists) {
        Utils.showToast('Dieser Name ist bereits vergeben!', 'error');
        return;
    }
    
    // PIN-Duplikate sind erlaubt - keine Prüfung nötig
    
    if (editId) {
        // === BEARBEITEN ===
        console.log('Bearbeite Gast:', editId);
        
        // Supabase zuerst updaten
        if (supabaseClient && isOnline) {
            try {
                const { error } = await supabaseClient
                    .from('profiles')
                    .update({ 
                        vorname: nachname,
                        display_name: nachname,
                        first_name: nachname,
                        pin_hash: passwort,
                        group_name: gruppenname,
                        aktiv: true,
                        geloescht: false
                    })
                    .eq('id', editId);
                
                if (error) {
                    console.error('Supabase Update Fehler:', error);
                    Utils.showToast('Supabase Fehler: ' + error.message, 'error');
                } else {
                    console.log('✅ Gast in Supabase aktualisiert (PIN: ' + passwort + ')');
                }
            } catch (e) {
                console.error('Supabase Update Exception:', e);
            }
        }
        
        // Lokal auch updaten
        try {
            await db.registeredGuests.update(editId, {
                nachname: nachname,
                firstName: nachname,
                gruppenname: gruppenname,
                group_name: gruppenname,
                passwort: passwort,
                passwordHash: passwort,
                aktiv: true,
                geloescht: false
            });
        } catch(e) {
            // Falls ID nicht als Key existiert, versuche mit where
            const local = await db.registeredGuests.toArray();
            const found = local.find(g => String(g.id) === String(editId));
            if (found) {
                await db.registeredGuests.update(found.id, {
                    nachname: nachname,
                    firstName: nachname,
                    gruppenname: gruppenname,
                    group_name: gruppenname,
                    passwort: passwort,
                    passwordHash: passwort
                });
            }
        }
        
        Utils.showToast('Gast aktualisiert!', 'success');
        
    } else {
        // === NEU ANLEGEN ===
        console.log('Neuer Gast:', nachname);
        
        const now = new Date().toISOString();
        
        // Generiere pseudo-Email für Supabase Auth (WICHTIG für Buchungen!)
        const uniqueId = Utils.uuid().substring(0, 8);
        const email = `${nachname.toLowerCase().replace(/[^a-z]/g, '')}.${uniqueId}@kassa.local`;
        
        // Supabase erfordert min. 6 Zeichen - PIN mit Prefix erweitern
        const supabasePassword = 'PIN_' + passwort + '_KASSA';
        
        let finalId = Utils.uuid(); // Fallback ID
        
        // Supabase Auth User erstellen (WICHTIG für RLS/Buchungen!)
        if (supabaseClient && isOnline) {
            try {
                // 1. Supabase Auth SignUp - erstellt User UND ermöglicht Auth Session
                const { data: authData, error: authError } = await supabaseClient.auth.signUp({
                    email: email,
                    password: supabasePassword,
                    options: {
                        data: {
                            first_name: nachname,
                            display_name: nachname
                        }
                    }
                });
                
                if (authError) {
                    console.error('Supabase Auth Fehler:', authError);
                    Utils.showToast('Fehler beim Anlegen: ' + authError.message, 'error');
                    return;
                }
                
                // User ID aus Auth uebernehmen
                finalId = authData.user?.id || finalId;
                console.log('✅ Supabase Auth User erstellt mit ID:', finalId);
                
                // 2. Profile aktualisieren mit zusätzlichen Daten
                const { error: profileError } = await supabaseClient
                    .from('profiles')
                    .upsert({ 
                        id: finalId,
                        email: email,
                        vorname: nachname,
                        first_name: nachname,
                        display_name: nachname,
                        pin_hash: passwort,
                        group_name: gruppenname,
                        aktiv: true,
                        geloescht: false,
                        created_at: now
                    }, { onConflict: 'id' });
                
                if (profileError) {
                    console.error('Supabase Profile Update Fehler:', profileError);
                } else {
                    console.log('✅ Gast-Profil in Supabase aktualisiert');
                }
                
            } catch (e) {
                console.error('Supabase Anlage Exception:', e);
                Utils.showToast('Fehler: ' + e.message, 'error');
                return;
            }
        }
        
        // Lokal speichern (mit gleicher ID wie Supabase!)
        await db.registeredGuests.add({
            id: finalId,
            nachname: nachname,
            firstName: nachname,
            email: email,
            gruppenname: gruppenname,
            group_name: gruppenname,
            passwort: passwort,
            passwordHash: passwort,
            aktiv: true,
            geloescht: false,
            createdAt: now
        });
        
        Utils.showToast('Gast angelegt!', 'success');
    }
    
    await DataProtection.createBackup();
    closeGastModal();
    Router.navigate('admin-guests');
};

window.handleDeleteGast = async (id) => {
    console.log('handleDeleteGast called with id:', id);
    
    const alleGäste = await db.registeredGuests.toArray();
    const gast = alleGäste.find(g => String(g.id) === String(id));
    
    if (!gast) {
        Utils.showToast('Gast nicht gefunden!', 'error');
        return;
    }
    
    const name = gast.nachname || gast.firstName;
    if (!confirm(`Gast "${name}" wirklich löschen?`)) return;
    
    // Soft delete
    await db.registeredGuests.update(gast.id, {
        gelöscht: true,
        gelöschtAm: new Date().toISOString(),
        aktiv: false
    });
    
    await DataProtection.createBackup();
    Utils.showToast('Gast gelöscht', 'success');
    Router.navigate('admin-guests');
};

// Admin bucht für Gast
window.adminBuchenFürGast = async (id) => {
    console.log('adminBuchenFürGast called with id:', id);
    
    // Versuche zuerst das Profil von Supabase zu laden (hat Email für Auth)
    let gast = null;
    if (supabaseClient && isOnline) {
        try {
            const { data: profile } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', id)
                .single();
            if (profile) {
                gast = {
                    id: profile.id,
                    nachname: profile.vorname || profile.display_name,
                    firstName: profile.vorname || profile.display_name,
                    email: profile.email,
                    passwort: profile.pin_hash,
                    gruppenname: profile.group_name,
                    group_name: profile.group_name
                };
            }
        } catch(e) {
            console.error('Supabase Profile laden Fehler:', e);
        }
    }
    
    // Fallback: Lokal laden
    if (!gast) {
        const alleGäste = await db.registeredGuests.toArray();
        gast = alleGäste.find(g => String(g.id) === String(id));
    }
    
    if (!gast) {
        Utils.showToast('Gast nicht gefunden!', 'error');
        return;
    }
    
    const name = gast.nachname || gast.firstName;
    
    // WICHTIG: Auth Session für den Gast erstellen (für RLS/Buchungen)
    if (supabaseClient && isOnline && gast.email && gast.passwort) {
        try {
            const supabasePassword = 'PIN_' + gast.passwort + '_KASSA';
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: gast.email,
                password: supabasePassword
            });
            if (error) {
                console.warn('Auth Session für Gast fehlgeschlagen:', error.message);
                // Trotzdem fortfahren - Buchung wird lokal gespeichert
            } else {
                console.log('✅ Auth Session für Gast erstellt');
            }
        } catch(e) {
            console.warn('Auth Session Exception:', e);
        }
    }
    
    // Gast als aktuellen User setzen
    State.setUser({
        ...gast,
        firstName: name,
        id: gast.id
    });
    
    // Gruppe setzen falls vorhanden
    State.selectedGroup = gast.gruppenname || gast.group_name || null;
    
    Utils.showToast(`Buchen für: ${name}`, 'info');
    
    // Zum Buchungsmenü navigieren
    Router.navigate('buchen');
};

// Export für Access
window.exportGästeExcel = async () => {
    let guests = await db.registeredGuests.toArray();
    guests = guests.filter(g => !g.gelöscht);
    
    const rows = guests.map((g, index) => ({
        'ID': index + 6700,
        'Vorname': '',
        'Nachname': g.nachname || g.firstName || '',
        'Adresse': '',
        'Ort': '',
        'Postleitzahl': '',
        'Telefon/privat': '',
        'Email-Name': '',
        'Geburtsdatum': '',
        'Gruppennr': 0,
        'Gruppenname': g.gruppenname || g.group_name || 'keiner Gruppe zugehörig',
        'Aktiv': true,
        'Passwort': g.passwort || g.passwordHash || '',
        'Ausnahmeumlage': g.ausnahmeumlage || false
    }));
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Gäste');
    
    const heute = new Date();
    const datumStr = `${heute.getDate().toString().padStart(2,'0')}-${(heute.getMonth()+1).toString().padStart(2,'0')}-${heute.getFullYear()}`;
    XLSX.writeFile(wb, `Gäste_Export_${datumStr}.xlsx`);
    
    Utils.showToast(`${guests.length} Gäste exportiert`, 'success');
};

Router.register('admin-articles', async () => {
    if (!State.isAdmin) { Router.navigate('admin-login'); return; }
    
    console.log('📋 admin-articles: Lade Artikel...');
    
    // DIREKT aus Supabase laden (nicht aus Cache!)
    let articles = [];
    if (supabaseClient && isOnline) {
        try {
            console.log('📡 Lade aus Supabase...');
            const { data, error } = await supabaseClient
                .from('artikel')
                .select('*')
                .order('sortierung');
            if (error) {
                console.error('❌ Supabase Fehler:', error);
            } else if (data) {
                articles = data;
                // Zeige Aktivierungsstatus
                const aktive = data.filter(a => a.aktiv).length;
                const inaktive = data.filter(a => !a.aktiv).length;
                console.log('✅ Artikelverwaltung: ' + data.length + ' Artikel aus Supabase (' + aktive + ' aktiv, ' + inaktive + ' inaktiv)');
            }
        } catch(e) {
            console.error('Supabase Fehler:', e);
        }
    } else {
        console.log('⚠️ Keine Supabase-Verbindung, nutze lokale DB');
    }
    
    // Fallback: lokale Datenbank
    if (articles.length === 0) {
        console.log('📂 Fallback: Lade aus lokaler DB...');
        articles = await Artikel.getAll();
    }
    
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
            ? `<img src="${a.bild}" style="width:40px;height:40px;object-fit:cover;border-radius:6px;cursor:pointer;" onclick="triggerArtikelBildUpload(${a.artikel_id})">`
            : `<button onclick="triggerArtikelBildUpload(${a.artikel_id})" style="width:40px;height:40px;border:2px dashed #ccc;border-radius:6px;background:#f8f9fa;cursor:pointer;font-size:1.2rem;color:#888;">+</button>`;
        
        // Kategorie-Dropdown erstellen
        const katOptions = kats.map(k => 
            `<option value="${k.kategorie_id}" ${a.kategorie_id === k.kategorie_id ? 'selected' : ''}>${k.name}</option>`
        ).join('');
        
        // Beide Preise
        const preisSV = a.preis ?? 0;
        const preisHP = a.preis_hp ?? a.preis ?? 0;
        
        // Zeitbegrenzung Anzeige
        let zeitInfo = '';
        if (a.aktiv_bis) {
            const ablauf = new Date(a.aktiv_bis);
            const jetzt = new Date();
            const diffMs = ablauf - jetzt;
            const diffStunden = Math.floor(diffMs / (1000 * 60 * 60));
            const diffTage = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            
            if (diffMs > 0) {
                if (diffTage > 0) {
                    zeitInfo = `<div style="font-size:0.7rem;color:#e67e22;margin-top:2px;">⏰ ${diffTage}T uebrig</div>`;
                } else if (diffStunden > 0) {
                    zeitInfo = `<div style="font-size:0.7rem;color:#e74c3c;margin-top:2px;">⏰ ${diffStunden}h uebrig</div>`;
                } else {
                    zeitInfo = `<div style="font-size:0.7rem;color:#e74c3c;margin-top:2px;">⏰ <1h uebrig</div>`;
                }
            }
        }
        
        return `<tr class="article-row" data-name="${a.name.toLowerCase()}" data-sku="${(a.sku||'').toLowerCase()}" data-id="${a.artikel_id}">
            <td style="width:50px;text-align:center;font-family:monospace;font-size:0.85rem;">
                <span onclick="changeArtikelId(${a.artikel_id})" style="cursor:pointer;padding:4px 8px;background:#f0f0f0;border-radius:4px;border:1px solid #ddd;" title="Klicken zum Ändern der ID">${a.artikel_id}</span>
            </td>
            <td style="width:40px;text-align:center;font-weight:700;color:var(--color-alpine-green);">${pos}</td>
            <td style="width:50px;text-align:center;">${img}</td>
            <td><strong>${a.name}</strong>${a.sku?` <small style="color:var(--color-stone-dark);">(${a.sku})</small>`:''}</td>
            <td style="text-align:center;">
                <div style="display:flex;flex-direction:column;gap:2px;">
                    <div style="display:flex;align-items:center;justify-content:flex-end;gap:4px;">
                        <span style="font-size:0.7rem;color:#3498db;font-weight:600;">SV:</span>
                        <input type="number" value="${preisSV.toFixed(2)}" step="0.10" min="0" 
                            onchange="quickUpdatePreis(${a.artikel_id}, 'sv', this.value)"
                            style="width:70px;padding:4px;border:1px solid #3498db;border-radius:4px;text-align:right;font-weight:600;font-size:0.9rem;">
                    </div>
                    <div style="display:flex;align-items:center;justify-content:flex-end;gap:4px;">
                        <span style="font-size:0.7rem;color:#9b59b6;font-weight:600;">HP:</span>
                        <input type="number" value="${preisHP.toFixed(2)}" step="0.10" min="0" 
                            onchange="quickUpdatePreis(${a.artikel_id}, 'hp', this.value)"
                            style="width:70px;padding:4px;border:1px solid #9b59b6;border-radius:4px;text-align:right;font-weight:600;font-size:0.9rem;">
                    </div>
                </div>
            </td>
            <td style="min-width:150px;">
                <select onchange="changeArtikelKategorie(${a.artikel_id}, parseInt(this.value))" style="width:100%;padding:6px 8px;border:1px solid #ddd;border-radius:6px;font-size:0.85rem;background:white;cursor:pointer;">
                    ${katOptions}
                </select>
            </td>
            <td style="text-align:center;">
                <select onchange="quickUpdateMwst(${a.artikel_id}, parseInt(this.value))" style="padding:4px 8px;border:1px solid #ddd;border-radius:4px;font-size:0.85rem;background:white;cursor:pointer;">
                    <option value="10" ${(a.steuer_prozent || 10) === 10 ? 'selected' : ''}>10%</option>
                    <option value="19" ${(a.steuer_prozent || 10) === 19 ? 'selected' : ''}>19%</option>
                    <option value="20" ${(a.steuer_prozent || 10) === 20 ? 'selected' : ''}>20%</option>
                    <option value="0" ${(a.steuer_prozent || 10) === 0 ? 'selected' : ''}>0%</option>
                </select>
            </td>
            <td style="text-align:center;">
                <div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
                    <label class="switch">
                        <input type="checkbox" ${a.aktiv?'checked':''} onchange="toggleArtikelAktiv(${a.artikel_id}, this.checked)">
                        <span class="slider"></span>
                    </label>
                    ${zeitInfo}
                    <button onclick="showZeitbegrenzungModal(${a.artikel_id}, '${a.name.replace(/'/g, "\\'")}')" style="font-size:0.65rem;padding:2px 6px;border:1px solid #ddd;border-radius:4px;background:#f8f9fa;cursor:pointer;margin-top:2px;" title="Zeitbegrenzung setzen">⏰</button>
                </div>
            </td>
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
        tableContent += `<tr class="category-header"><td colspan="9" style="background:var(--color-alpine-green);color:white;padding:12px;font-weight:700;font-size:1.1rem;">${katName} (${artikelList.length})</td></tr>`;
        artikelList.forEach((a, idx) => {
            tableContent += renderArticleRow(a, idx + 1);
        });
    });
    
    UI.render(`<div class="app-header"><div class="header-left"><button class="menu-btn" onclick="Router.navigate('admin-dashboard')">←</button><div class="header-title"> Artikelverwaltung</div></div><div class="header-right"><button class="btn btn-secondary" onclick="handleLogout()">Abmelden</button></div></div>
    <style>
        .switch { position:relative; display:inline-block; width:50px; height:26px; }
        .switch input { opacity:0; width:0; height:0; }
        .switch .slider { position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background-color:#ccc; transition:.3s; border-radius:26px; }
        .switch .slider:before { position:absolute; content:""; height:20px; width:20px; left:3px; bottom:3px; background-color:white; transition:.3s; border-radius:50%; }
        .switch input:checked + .slider { background-color:#27ae60; }
        .switch input:checked + .slider:before { transform:translateX(24px); }
    </style>
    <div class="main-content">
        <div class="card mb-3">
            <div class="card-header"><h2 class="card-title"> CSV Import</h2></div>
            <div class="card-body">
                <p style="margin-bottom:16px;color:var(--color-stone-dark);">CSV: <code>ID,Artikelname,Preis,Warengruppe</code><br><small>Bei gleicher ID: Update</small></p>
                <input type="file" id="artikel-import" accept=".csv" style="display:none" onchange="handleArtikelImport(event)">
                <button class="btn btn-primary" onclick="document.getElementById('artikel-import').click()"> CSV auswählen</button>
                <button class="btn btn-secondary" onclick="DataProtection.exportArticlesCSV()" style="margin-left:8px;"> Export</button>
            </div>
        </div>
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Artikel (${articles.length})</h2>
                <button class="btn btn-primary" onclick="showAddArticleModal()">+ Neu</button>
            </div>
            <div class="card-body">
                <div class="form-group"><input type="text" class="form-input" placeholder=" Suchen..." oninput="filterArticleTable(this.value)"></div>
                <div style="overflow-x:auto;">
                    <table style="width:100%;border-collapse:collapse;" id="article-table">
                        <thead>
                            <tr style="background:var(--color-stone-light);text-align:left;">
                                <th style="padding:12px 8px;width:50px;">ID</th>
                                <th style="padding:12px 8px;width:40px;">Pos.</th>
                                <th style="padding:12px 8px;width:50px;">Foto</th>
                                <th style="padding:12px 8px;">Name</th>
                                <th style="padding:12px 8px;text-align:center;">
                                    <div>Preise</div>
                                    <div style="display:flex;gap:8px;justify-content:center;font-size:0.7rem;font-weight:normal;">
                                        <span style="color:#3498db;">  SV</span>
                                        <span style="color:#9b59b6;"> HP</span>
                                    </div>
                                </th>
                                <th style="padding:12px 8px;">Kategorie</th>
                                <th style="padding:12px 8px;text-align:center;">MwSt</th>
                                <th style="padding:12px 8px;text-align:center;">Aktiv</th>
                                <th style="padding:12px 8px;"></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableContent || '<tr><td colspan="9" style="text-align:center;padding:24px;color:var(--color-stone-dark);">Keine Artikel</td></tr>'}
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

// ================================
// ARTIKEL-SORTIERUNG (Drag & Drop)
// Nur aktive Artikel, Speicherung in Supabase
// ================================
Router.register('admin-artikel-sortierung', async () => {
    if (!State.isAdmin) { Router.navigate('admin-login'); return; }
    
    // Nur AKTIVE Artikel DIREKT aus Supabase laden (nicht aus Cache)
    let aktiveArtikel = [];
    if (supabaseClient && isOnline) {
        try {
            const { data, error } = await supabaseClient
                .from('artikel')
                .select('*')
                .eq('aktiv', true)
                .order('sortierung');
            if (!error && data) {
                aktiveArtikel = data;
                console.log('✅ Sortierung: ' + data.length + ' aktive Artikel aus Supabase geladen');
            }
        } catch(e) {
            console.error('Supabase Fehler:', e);
        }
    }
    
    // Fallback: lokale Datenbank
    if (aktiveArtikel.length === 0) {
        const alleArtikel = await Artikel.getAll();
        aktiveArtikel = alleArtikel.filter(a => a.aktiv);
    }
    
    const kats = await db.kategorien.toArray();
    kats.sort((a, b) => (a.sortierung || 0) - (b.sortierung || 0));
    
    // Artikel nach Kategorie gruppieren und sortieren
    const byCategory = {};
    kats.forEach(k => byCategory[k.kategorie_id] = []);
    
    aktiveArtikel.forEach(a => {
        const katId = a.kategorie_id || 0;
        if (!byCategory[katId]) byCategory[katId] = [];
        byCategory[katId].push(a);
    });
    
    // Innerhalb jeder Kategorie nach Sortierung sortieren
    Object.keys(byCategory).forEach(katId => {
        byCategory[katId].sort((a, b) => (a.sortierung || 0) - (b.sortierung || 0));
    });
    
    const katMap = {};
    kats.forEach(k => katMap[k.kategorie_id] = k.name);
    
    // Kategorien-HTML rendern
    let kategorienHtml = '';
    kats.forEach(kat => {
        const artikelInKat = byCategory[kat.kategorie_id] || [];
        if (artikelInKat.length === 0) return;
        
        let artikelHtml = artikelInKat.map((a, idx) => `
            <div class="sort-artikel-tile" draggable="true" 
                 data-artikel-id="${a.artikel_id}" 
                 data-kategorie-id="${kat.kategorie_id}"
                 data-sortierung="${a.sortierung || idx * 10}">
                <div class="sort-artikel-pos">${idx + 1}</div>
                <div class="sort-artikel-content">
                    ${a.bild ? `<img src="${a.bild}" class="sort-artikel-img">` : `<div class="sort-artikel-icon">${a.icon || ''}</div>`}
                    <div class="sort-artikel-name">${a.name}</div>
                </div>
                <div class="sort-artikel-handle">......</div>
            </div>
        `).join('');
        
        kategorienHtml += `
            <div class="sort-kategorie-block">
                <div class="sort-kategorie-header">${katMap[kat.kategorie_id] || 'Ohne Kategorie'} (${artikelInKat.length})</div>
                <div class="sort-artikel-container" data-kategorie-id="${kat.kategorie_id}">
                    ${artikelHtml}
                </div>
            </div>
        `;
    });
    
    UI.render(`
        <div class="admin-container" style="max-width:900px;margin:0 auto;padding:16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                <div>
                    <h1 style="font-size:1.5rem;margin:0;"> Artikel sortieren</h1>
                    <p style="color:#666;font-size:0.9rem;margin:4px 0 0;">Drag & Drop zum Umsortieren (nur aktive Artikel)</p>
                </div>
                <button class="btn btn-secondary" onclick="Router.navigate('admin')">← Zurück</button>
            </div>
            
            <div style="background:#d4edda;border:1px solid #c3e6cb;border-radius:8px;padding:12px;margin-bottom:20px;">
                <div style="display:flex;align-items:center;gap:8px;">
                    <span style="font-size:1.2rem;"></span>
                    <div>
                        <strong>Hinweis:</strong> Ziehen Sie Artikel innerhalb einer Kategorie um die Reihenfolge zu ändern.
                        Änderungen werden automatisch in der Cloud gespeichert.
                    </div>
                </div>
            </div>
            
            <div id="sortierung-status" style="display:none;position:fixed;top:20px;right:20px;padding:12px 20px;border-radius:8px;font-weight:600;z-index:1000;"></div>
            
            <div id="artikel-sortierung-container">
                ${kategorienHtml}
            </div>
            
            <div style="margin-top:24px;text-align:center;">
                <button class="btn btn-primary" onclick="speichereSortierungSupabase()" style="padding:16px 32px;font-size:1.1rem;">
                     Sortierung speichern
                </button>
            </div>
        </div>
        
        <style>
            .sort-kategorie-block {
                margin-bottom: 24px;
                background: white;
                border-radius: 12px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                overflow: hidden;
            }
            .sort-kategorie-header {
                background: linear-gradient(135deg, var(--color-alpine-green), #3a7ca5);
                color: white;
                padding: 12px 16px;
                font-weight: 700;
                font-size: 1.1rem;
            }
            .sort-artikel-container {
                padding: 12px;
                min-height: 60px;
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }
            .sort-artikel-tile {
                display: flex;
                align-items: center;
                gap: 8px;
                background: #f8f9fa;
                border: 2px solid #e9ecef;
                border-radius: 8px;
                padding: 8px 12px;
                cursor: grab;
                transition: all 0.2s;
                min-width: 140px;
            }
            .sort-artikel-tile:hover {
                border-color: var(--color-alpine-green);
                box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            }
            .sort-artikel-tile.dragging {
                opacity: 0.5;
                border-color: #3498db;
                background: #e3f2fd;
            }
            .sort-artikel-tile.drag-over {
                border-color: #27ae60;
                background: #e8f5e9;
                transform: scale(1.02);
            }
            .sort-artikel-pos {
                background: var(--color-alpine-green);
                color: white;
                width: 24px;
                height: 24px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.75rem;
                font-weight: 700;
                flex-shrink: 0;
            }
            .sort-artikel-content {
                display: flex;
                align-items: center;
                gap: 8px;
                flex: 1;
            }
            .sort-artikel-img {
                width: 32px;
                height: 32px;
                object-fit: cover;
                border-radius: 6px;
            }
            .sort-artikel-icon {
                font-size: 1.5rem;
            }
            .sort-artikel-name {
                font-size: 0.85rem;
                font-weight: 600;
                color: #333;
            }
            .sort-artikel-handle {
                color: #999;
                font-size: 1.2rem;
                cursor: grab;
            }
        </style>
    `);
    
    // Drag & Drop initialisieren
    initArtikelSortierungDragDrop();
});

// Drag & Drop für Artikel-Sortierung
function initArtikelSortierungDragDrop() {
    const containers = document.querySelectorAll('.sort-artikel-container');
    let draggedItem = null;
    
    containers.forEach(container => {
        const tiles = container.querySelectorAll('.sort-artikel-tile');
        
        tiles.forEach(tile => {
            tile.addEventListener('dragstart', (e) => {
                draggedItem = tile;
                tile.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });
            
            tile.addEventListener('dragend', () => {
                tile.classList.remove('dragging');
                document.querySelectorAll('.sort-artikel-tile').forEach(t => t.classList.remove('drag-over'));
                draggedItem = null;
                updatePositionNumbers();
            });
            
            tile.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (draggedItem && draggedItem !== tile) {
                    // Nur innerhalb derselben Kategorie erlauben
                    if (draggedItem.dataset.kategorieId === tile.dataset.kategorieId) {
                        tile.classList.add('drag-over');
                    }
                }
            });
            
            tile.addEventListener('dragleave', () => {
                tile.classList.remove('drag-over');
            });
            
            tile.addEventListener('drop', (e) => {
                e.preventDefault();
                tile.classList.remove('drag-over');
                
                if (draggedItem && draggedItem !== tile) {
                    // Nur innerhalb derselben Kategorie
                    if (draggedItem.dataset.kategorieId === tile.dataset.kategorieId) {
                        const parent = tile.parentNode;
                        const allTiles = Array.from(parent.querySelectorAll('.sort-artikel-tile'));
                        const draggedIdx = allTiles.indexOf(draggedItem);
                        const dropIdx = allTiles.indexOf(tile);
                        
                        if (draggedIdx < dropIdx) {
                            tile.after(draggedItem);
                        } else {
                            tile.before(draggedItem);
                        }
                        
                        updatePositionNumbers();
                        showSortierungStatus('Reihenfolge geändert - Speichern nicht vergessen!', 'warning');
                    }
                }
            });
        });
    });
}

// Positionsnummern aktualisieren
function updatePositionNumbers() {
    document.querySelectorAll('.sort-artikel-container').forEach(container => {
        const tiles = container.querySelectorAll('.sort-artikel-tile');
        tiles.forEach((tile, idx) => {
            const posEl = tile.querySelector('.sort-artikel-pos');
            if (posEl) posEl.textContent = idx + 1;
        });
    });
}

// Status-Anzeige
function showSortierungStatus(msg, type) {
    const status = document.getElementById('sortierung-status');
    if (!status) return;
    
    status.textContent = msg;
    status.style.display = 'block';
    status.style.background = type === 'success' ? '#27ae60' : type === 'warning' ? '#f39c12' : '#e74c3c';
    status.style.color = 'white';
    
    if (type === 'success') {
        setTimeout(() => { status.style.display = 'none'; }, 3000);
    }
}

// Sortierung in Supabase speichern
window.speichereSortierungSupabase = async () => {
    const status = document.getElementById('sortierung-status');
    showSortierungStatus('⏳ Speichere...', 'warning');
    
    try {
        const containers = document.querySelectorAll('.sort-artikel-container');
        const updates = [];
        
        containers.forEach(container => {
            const tiles = container.querySelectorAll('.sort-artikel-tile');
            tiles.forEach((tile, idx) => {
                const artikelId = parseInt(tile.dataset.artikelId);
                const sortierung = (idx + 1) * 10; // 10, 20, 30, ...
                updates.push({ artikel_id: artikelId, sortierung: sortierung });
            });
        });
        
        // Zuerst lokal speichern (IndexedDB)
        for (const upd of updates) {
            await db.artikel.update(upd.artikel_id, { sortierung: upd.sortierung });
        }
        
        // Dann in Supabase speichern
        if (supabaseClient && isOnline) {
            for (const upd of updates) {
                await supabaseClient
                    .from('artikel')
                    .update({ sortierung: upd.sortierung })
                    .eq('artikel_id', upd.artikel_id);
            }
            showSortierungStatus('✅ Sortierung gespeichert (lokal + Cloud)', 'success');
        } else {
            showSortierungStatus('✅ Lokal gespeichert (Cloud offline)', 'success');
        }
        
        // Cache invalidieren
        artikelCache = null;
        
        Utils.showToast('Sortierung erfolgreich gespeichert!', 'success');
        
    } catch (e) {
        console.error('Sortierung speichern Fehler:', e);
        showSortierungStatus(' Fehler: ' + e.message, 'error');
        Utils.showToast('Fehler beim Speichern: ' + e.message, 'error');
    }
};

Router.register('dashboard', async () => {
    if (!State.currentUser) { Router.navigate('login'); return; }
    // Prüfen ob Gruppenauswahl nötig
    const gruppenAktiv = await Gruppen.isAbfrageAktiv();
    if (gruppenAktiv && !State.selectedGroup) {
        Router.navigate('gruppe-wählen');
        return;
    }
    // Direkt zur Buchen-Seite weiterleiten
    Router.navigate('buchen');
});

Router.register('buchen', async () => {
    if (!State.currentUser) { Router.navigate('login'); return; }
    
    // SyncManager starten für Hintergrund-Synchronisation
    SyncManager.startBackgroundSync();
    
    // i18n Setup
    const t = (key, params) => i18n.t(key, params);
    
    // Prüfen ob Gruppenauswahl nötig
    const gruppenAktiv = await Gruppen.isAbfrageAktiv();
    if (gruppenAktiv && !State.selectedGroup) {
        Router.navigate('gruppe-wählen');
        return;
    }
    
    const kats = await db.kategorien.toArray();
    const arts = await Artikel.getAll({ aktiv: true });
    const name = State.currentUser.firstName || State.currentUser.vorname;
    const gastId = State.currentUser.id || State.currentUser.gast_id;
    
    // Standard: Alkoholfrei (ID 1) beim ersten Mal
    if (State.selectedCategory === null) State.selectedCategory = 1;
    
    const filtered = State.selectedCategory === 'alle' ? arts : arts.filter(a => a.kategorie_id === State.selectedCategory);
    const sessionBuchungen = await Buchungen.getSessionBuchungen();
    const sessionTotal = sessionBuchungen.reduce((s,b) => s + b.preis * b.menge, 0);
    const sessionCount = sessionBuchungen.reduce((s,b) => s + b.menge, 0);
    
    // ALLE Buchungen des Gastes laden
    let meineBuchungen = [];
    if (supabaseClient && isOnline) {
        const { data } = await supabaseClient
            .from('buchungen')
            .select('*')
            .eq('user_id', gastId)
            .eq('storniert', false)
            .eq('exportiert', false)
            .order('erstellt_am', { ascending: false });
        if (data) meineBuchungen = data.map(b => ({ ...b, gast_id: b.user_id }));
    }
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
    const fehlendeOffen = await FehlendeGetränke.getOffene();
    
    // Aktuelle Gruppe
    const currentGroup = (State.selectedGroup && State.selectedGroup !== 'keiner Gruppe zugehörig') ? State.selectedGroup : '';
    
    const renderTileContent = (a) => {
        if (a.bild && a.bild.startsWith('data:')) {
            return `<img src="${a.bild}" style="width:64px;height:64px;object-fit:cover;border-radius:8px;">`;
        }
        return `<div class="artikel-icon">${a.icon||''}</div>`;
    };
    
    const catColor = (id) => ({1:'#FF6B6B',2:'#FFD93D',3:'#95E1D3',4:'#AA4465',5:'#F38181',6:'#6C5B7B',7:'#4A5859'})[id] || '#2C5F7C';
    
    // Warenkorb-Button HTML (oben rechts, kompakt)
    const warenkorbBtnHtml = sessionBuchungen.length ? `
        <button onclick="toggleWarenkorbDropdown()" id="warenkorb-btn" style="
            position: relative;
            background: var(--color-alpine-green);
            color: white;
            border: none;
            border-radius: 10px;
            padding: 6px 12px;
            font-size: 0.95rem;
            font-weight: 700;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        ">
             <span style="background:white;color:var(--color-alpine-green);border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:0.85rem;">${sessionCount}</span>
            <span style="font-size:0.85rem;">${Utils.formatCurrency(sessionTotal)}</span>
        </button>
    ` : '';
    
    UI.render(`<div class="app-header">
        <div class="header-left">
            <div class="header-title"> ${name}</div>
            ${currentGroup ? `<div style="font-size:0.75rem;opacity:0.8;"> ${currentGroup}</div>` : ''}
        </div>
        <div class="header-right" style="display:flex;align-items:center;gap:8px;">
            ${SyncManager.getAmpelHtml()}
            ${warenkorbBtnHtml}
            <button class="btn btn-secondary" onclick="handleGastAbmelden()" style="padding:6px 10px;font-size:0.9rem;">${t('logout')}</button>
        </div>
    </div>
    
    <!-- WARENKORB DROPDOWN -->
    <div id="warenkorb-dropdown" style="
        display: none;
        position: fixed;
        top: 55px;
        right: 10px;
        width: 300px;
        max-width: calc(100vw - 20px);
        background: white;
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        border: 2px solid var(--color-alpine-green);
        z-index: 2000;
        overflow: hidden;
    ">
        <div style="padding:10px 14px;background:var(--color-alpine-green);color:white;display:flex;justify-content:space-between;align-items:center;">
            <strong style="font-size:0.95rem;"> Aktuell gebucht</strong>
            <button onclick="toggleWarenkorbDropdown()" style="background:none;border:none;color:white;font-size:1.3rem;cursor:pointer;line-height:1;">x</button>
        </div>
        <div style="padding:10px;max-height:250px;overflow-y:auto;">
            ${sessionBuchungen.length ? sessionBuchungen.map(b => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:#f5f5f5;border-radius:8px;margin-bottom:6px;">
                <div style="flex:1;">
                    <div style="font-weight:600;font-size:0.9rem;">${b.artikel_name}</div>
                    <div style="font-size:0.8rem;color:#666;">${b.menge}x ${Utils.formatCurrency(b.preis)}</div>
                </div>
                <div style="display:flex;align-items:center;gap:8px;">
                    <span style="font-weight:700;font-size:0.9rem;">${Utils.formatCurrency(b.preis * b.menge)}</span>
                    <button onclick="stornoBuchung('${b.buchung_id}')" style="background:#e74c3c;color:white;border:none;border-radius:6px;padding:5px 10px;cursor:pointer;font-size:0.85rem;">x</button>
                </div>
            </div>
            `).join('') : '<p style="text-align:center;color:#999;padding:15px;font-size:0.9rem;">Noch keine Buchungen</p>'}
        </div>
        <div style="padding:10px 14px;border-top:1px solid #ddd;background:#fafafa;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                <strong style="font-size:0.9rem;">Summe:</strong>
                <strong style="font-size:1.2rem;color:var(--color-alpine-green);">${Utils.formatCurrency(sessionTotal)}</strong>
            </div>
            <button onclick="handleGastAbmelden()" style="width:100%;background:var(--color-alpine-green);color:white;border:none;border-radius:10px;padding:12px;font-size:1rem;font-weight:700;cursor:pointer;">
                 Fertig & Abmelden
            </button>
        </div>
    </div>
    
    <div class="main-content" style="padding-bottom:20px;">`);
    
    // Ampel nach dem Rendern aktualisieren
    setTimeout(() => SyncManager.updateUI(), 100);
    
    UI.append(`
        ${meineBuchungen.length ? `
        <div class="buchungen-uebersicht" style="background:var(--color-alpine-green);border-radius:16px;margin-bottom:20px;overflow:hidden;">
            <div onclick="toggleBuchungsDetails()" style="padding:14px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;">
                <div style="color:white;">
                    <div style="font-weight:700;font-size:1rem;"> ${t('my_bookings')}</div>
                    <div style="font-size:0.85rem;opacity:0.9;">${meineBuchungen.length} Positionen</div>
                </div>
                <div style="text-align:right;color:white;">
                    <div style="font-size:1.3rem;font-weight:700;">${Utils.formatCurrency(gesamtSumme)}</div>
                    <div id="buchungen-arrow" style="font-size:1rem;"></div>
                </div>
            </div>
            <div id="buchungen-details" style="display:none;background:white;padding:12px;max-height:250px;overflow-y:auto;">
                ${Object.keys(nachDatum).map(datum => `
                <div style="margin-bottom:12px;">
                    <div style="font-weight:700;color:var(--color-alpine-green);margin-bottom:6px;padding-bottom:4px;border-bottom:2px solid #eee;font-size:0.9rem;">
                         ${datum}
                    </div>
                    ${nachDatum[datum].map(b => `
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;background:#f5f5f5;border-radius:6px;margin-bottom:4px;font-size:0.85rem;">
                        <div>
                            <div style="font-weight:600;">${b.artikel_name}</div>
                            <div style="font-size:0.75rem;color:#888;"> ${b.uhrzeit?.substring(0,5) || ''} * ${b.menge}x</div>
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
        <div style="background:linear-gradient(135deg, #f39c12, #e74c3c);border-radius:14px;padding:14px;margin-bottom:16px;color:white;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                <span style="font-size:1.3rem;">⚠</span>
                <div>
                    <div style="font-weight:700;font-size:1rem;">${t('missing_drinks_yesterday')}</div>
                    <div style="font-size:0.85rem;opacity:0.9;">${t('please_take_if_forgot')}</div>
                </div>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;">
                ${fehlendeOffen.map(f => `
                <button onclick="uebernehmeFehlend(${f.id})" style="background:white;color:#333;border:none;border-radius:10px;padding:8px 12px;cursor:pointer;display:flex;align-items:center;gap:6px;font-size:0.85rem;">
                    <span>${f.icon || ''}</span>
                    <span style="font-weight:600;">${f.artikel_name}</span>
                </button>
                `).join('')}
            </div>
        </div>
        ` : ''}
        
        <div class="form-group" style="margin-bottom:12px;"><input type="text" class="form-input" placeholder=" ${t('search')}" oninput="searchArtikel(this.value)" style="padding:10px 14px;"></div>
        <div class="category-tabs" style="margin-bottom:14px;">
            ${kats.sort((a,b) => (a.sortierung||0) - (b.sortierung||0)).map(k => `<div class="category-tab ${State.selectedCategory===k.kategorie_id?'active':''}" onclick="filterCategory(${k.kategorie_id})">${k.name}</div>`).join('')}
            <div class="category-tab ${State.selectedCategory==='alle'?'active':''}" onclick="filterCategory('alle')">${t('cat_all')}</div>
        </div>
        <div class="artikel-grid">
            ${filtered.map(a => `<div class="artikel-tile" style="--tile-color:${catColor(a.kategorie_id)}" data-artikel-id="${a.artikel_id}" onmousedown="artikelPressStart(event, ${a.artikel_id})" onmouseup="artikelPressEnd(event)" onmouseleave="artikelPressEnd(event)" ontouchstart="artikelPressStart(event, ${a.artikel_id})" ontouchmove="artikelPressMove(event)" ontouchend="artikelPressEnd(event)">${renderTileContent(a)}<div class="artikel-name">${a.name}</div><div class="artikel-price">${Utils.formatCurrency(a.preis)}</div></div>`).join('')}
        </div>
    </div>`);
});

// Warenkorb Dropdown toggle
window.toggleWarenkorbDropdown = () => {
    const dropdown = document.getElementById('warenkorb-dropdown');
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    }
};

// Dropdown schlieÃŸen wenn ausserhalb geklickt
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('warenkorb-dropdown');
    const btn = document.getElementById('warenkorb-btn');
    if (dropdown && dropdown.style.display === 'block') {
        if (!dropdown.contains(e.target) && (!btn || !btn.contains(e.target))) {
            dropdown.style.display = 'none';
        }
    }
});


// Buchungsdetails aufklappen/zuklappen
window.toggleBuchungsDetails = () => {
    const details = document.getElementById('buchungen-details');
    const arrow = document.getElementById('buchungen-arrow');
    if (details.style.display === 'none') {
        details.style.display = 'block';
        arrow.textContent = '';
    } else {
        details.style.display = 'none';
        arrow.textContent = '';
    }
};

// Fehlende Getränke uebernehmen
window.uebernehmeFehlend = async (id) => {
    const gastId = State.currentUser?.id || State.currentUser?.gast_id;
    const gastName = State.currentUser?.firstName || State.currentUser?.vorname;
    if (!gastId) return;
    
    try {
        await FehlendeGetränke.uebernehmen(id, gastId, gastName);
        Router.navigate('buchen'); // Seite neu laden - Artikel verschwindet
    } catch (e) {
        Utils.showToast(e.message || 'Fehler', 'error');
    }
};

// Direktes Buchen
window.bucheArtikelDirekt = async (id) => {
    try {
        const a = await Artikel.getById(id);
        if (!a) { Utils.showToast(i18n.t('article_not_found'), 'error'); return; }
        await Buchungen.create(a, 1);
        Utils.showToast(`${a.name} ${i18n.t('booked')}`, 'success');
        Router.navigate('buchen');
    } catch (e) {
        Utils.showToast(e.message || i18n.t('booking_error'), 'error');
    }
};

// Long-Press für Mengenauswahl
let artikelPressTimer = null;
let artikelPressId = null;
let artikelLongPressed = false;
// Touch-Position tracking um Scroll von Tap zu unterscheiden
let artikelTouchStartX = null;
let artikelTouchStartY = null;
let artikelPressStartTime = null; // Zeitpunkt des Touch-Starts
const TOUCH_MOVE_THRESHOLD = 30; // Pixel - wenn mehr bewegt, ist es ein Scroll (erhöht für besseres Scrollen)

window.artikelPressStart = (event, artikelId) => {
    // NICHT event.preventDefault() bei touchstart - sonst funktioniert Scrollen nicht!
    artikelPressId = artikelId;
    artikelLongPressed = false;
    artikelPressStartTime = Date.now(); // Touch-Startzeit merken
    
    // Touch-Startposition speichern
    if (event.touches && event.touches[0]) {
        artikelTouchStartX = event.touches[0].clientX;
        artikelTouchStartY = event.touches[0].clientY;
    } else {
        // Mouse-Event
        artikelTouchStartX = event.clientX;
        artikelTouchStartY = event.clientY;
    }
    
    // Nach 500ms Long-Press -> Mengen-Modal zeigen
    artikelPressTimer = setTimeout(async () => {
        artikelLongPressed = true;
        // Vibration feedback wenn verfügbar
        if (navigator.vibrate) navigator.vibrate(50);
        await showMengenModal(artikelId);
    }, 500);
};

// TouchMove: Wenn Finger sich bewegt, Long-Press Timer abbrechen
window.artikelPressMove = (event) => {
    if (!artikelPressTimer || artikelTouchStartX === null) return;
    
    let touchX, touchY;
    if (event.touches && event.touches[0]) {
        touchX = event.touches[0].clientX;
        touchY = event.touches[0].clientY;
    } else {
        return; // Mouse move ignorieren
    }
    
    const deltaX = Math.abs(touchX - artikelTouchStartX);
    const deltaY = Math.abs(touchY - artikelTouchStartY);
    
    // Wenn zu viel Bewegung, Long-Press abbrechen (User scrollt)
    if (deltaX > TOUCH_MOVE_THRESHOLD || deltaY > TOUCH_MOVE_THRESHOLD) {
        clearTimeout(artikelPressTimer);
        artikelPressTimer = null;
    }
};

window.artikelPressEnd = (event) => {
    if (artikelPressTimer) {
        clearTimeout(artikelPressTimer);
        artikelPressTimer = null;
    }
    
    // Touch-Endposition holen
    let touchEndX, touchEndY;
    if (event.changedTouches && event.changedTouches[0]) {
        touchEndX = event.changedTouches[0].clientX;
        touchEndY = event.changedTouches[0].clientY;
    } else {
        // Mouse-Event
        touchEndX = event.clientX;
        touchEndY = event.clientY;
    }
    
    // Prüfen ob es ein Scroll war (Finger hat sich zu viel bewegt)
    let wasScroll = false;
    if (artikelTouchStartX !== null && artikelTouchStartY !== null) {
        const deltaX = Math.abs(touchEndX - artikelTouchStartX);
        const deltaY = Math.abs(touchEndY - artikelTouchStartY);
        wasScroll = deltaX > TOUCH_MOVE_THRESHOLD || deltaY > TOUCH_MOVE_THRESHOLD;
    }
    
    // Wenn kein Long-Press UND kein Scroll, dann normaler Klick (1 Stück buchen)
    // Touch-Dauer prüfen (mindestens 20ms um versehentliches Antippen zu vermeiden)
    const touchDuration = artikelPressStartTime ? (Date.now() - artikelPressStartTime) : 1000;
    if (!artikelLongPressed && artikelPressId && !wasScroll && touchDuration >= 20) {
        bucheArtikelDirekt(artikelPressId);
    }
    
    // Reset
    artikelPressId = null;
    artikelTouchStartX = null;
    artikelTouchStartY = null;
    artikelPressStartTime = null;
};

// Mengen-Modal anzeigen
window.showMengenModal = async (artikelId) => {
    const artikel = await Artikel.getById(artikelId);
    if (!artikel) return;
    
    const t = i18n.t.bind(i18n);
    
    const modalHtml = `
    <div id="mengen-modal" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:2000;display:flex;align-items:center;justify-content:center;" onclick="if(event.target.id==='mengen-modal')closeMengenModal()">
        <div style="background:white;border-radius:20px;padding:24px;width:90%;max-width:350px;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,0.3);">
            <div style="font-size:3rem;margin-bottom:8px;">${artikel.icon || ''}</div>
            <div style="font-weight:700;font-size:1.3rem;margin-bottom:4px;">${artikel.name}</div>
            <div style="color:var(--color-alpine-green);font-size:1.2rem;font-weight:600;margin-bottom:20px;">${Utils.formatCurrency(artikel.preis)} / ${t('per_piece')}</div>
            
            <div style="display:flex;align-items:center;justify-content:center;gap:20px;margin-bottom:20px;">
                <button onclick="adjustMenge(-1)" style="width:50px;height:50px;border-radius:50%;border:2px solid var(--color-stone-medium);background:white;font-size:1.5rem;font-weight:bold;cursor:pointer;"></button>
                <div id="menge-display" style="font-size:2.5rem;font-weight:700;min-width:60px;">1</div>
                <button onclick="adjustMenge(1)" style="width:50px;height:50px;border-radius:50%;border:2px solid var(--color-stone-medium);background:white;font-size:1.5rem;font-weight:bold;cursor:pointer;">+</button>
            </div>
            
            <div style="display:flex;gap:8px;margin-bottom:16px;">
                ${[2,3,5,10].map(n => `<button onclick="setMenge(${n})" style="flex:1;padding:10px;border:2px solid var(--color-stone-medium);border-radius:10px;background:white;font-weight:600;cursor:pointer;">${n}x</button>`).join('')}
            </div>
            
            <div id="menge-total" style="font-size:1.1rem;color:#666;margin-bottom:16px;">${t('total')}: <strong>${Utils.formatCurrency(artikel.preis)}</strong></div>
            
            <div style="display:flex;gap:12px;">
                <button onclick="closeMengenModal()" style="flex:1;padding:14px;border:2px solid var(--color-stone-medium);border-radius:12px;background:white;font-weight:600;cursor:pointer;">${t('cancel')}</button>
                <button onclick="bucheMitMenge(${artikelId})" style="flex:2;padding:14px;border:none;border-radius:12px;background:var(--color-alpine-green);color:white;font-weight:700;font-size:1.1rem;cursor:pointer;"> ${t('book')}</button>
            </div>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    window.currentMenge = 1;
    window.currentArtikelPreis = artikel.preis;
};

window.adjustMenge = (delta) => {
    window.currentMenge = Math.max(1, Math.min(99, (window.currentMenge || 1) + delta));
    updateMengeDisplay();
};

window.setMenge = (menge) => {
    window.currentMenge = menge;
    updateMengeDisplay();
};

window.updateMengeDisplay = () => {
    const t = i18n.t.bind(i18n);
    document.getElementById('menge-display').textContent = window.currentMenge;
    document.getElementById('menge-total').innerHTML = `${t('total')}: <strong>${Utils.formatCurrency(window.currentArtikelPreis * window.currentMenge)}</strong>`;
};

window.closeMengenModal = () => {
    const modal = document.getElementById('mengen-modal');
    if (modal) modal.remove();
};

window.bucheMitMenge = async (artikelId) => {
    try {
        const artikel = await Artikel.getById(artikelId);
        if (!artikel) return;
        
        const menge = window.currentMenge || 1;
        await Buchungen.create(artikel, menge);
        
        closeMengenModal();
        Utils.showToast(`${menge}x ${artikel.name} ${i18n.t('booked')}`, 'success');
        Router.navigate('buchen');
    } catch (e) {
        Utils.showToast(e.message || i18n.t('booking_error'), 'error');
    }
};

// Storno durch Gast
window.stornoBuchung = async (buchung_id) => {
    if (confirm(i18n.t('cancel_booking'))) {
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
    Utils.showToast(i18n.t('goodbye'), 'success');
};

// Gast Abmelden (gleiche Funktion, immer Buchungen speichern)
window.handleGastAbmelden = async () => {
    // SyncManager stoppen
    SyncManager.stopBackgroundSync();
    
    // Noch ausstehende Buchungen synchronisieren bevor Abmeldung
    await SyncManager.syncPending();
    
    await Buchungen.fixSessionBuchungen();
    State.clearUser();
    Router.navigate('login');
    Utils.showToast(i18n.t('goodbye'), 'success');
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
window.handleRegisterClick = () => {
    // Auto-Refresh Timer stoppen
    if (typeof loginRefreshTimer !== 'undefined' && loginRefreshTimer) {
        clearInterval(loginRefreshTimer);
        loginRefreshTimer = null;
    }
    Router.navigate('register');
};
window.handleAdminClick = () => {
    // Auto-Refresh Timer stoppen
    if (typeof loginRefreshTimer !== 'undefined' && loginRefreshTimer) {
        clearInterval(loginRefreshTimer);
        loginRefreshTimer = null;
    }
    Router.navigate('admin-login');
};
window.handleBackToLogin = () => Router.navigate('login');
window.navigateToDashboard = () => Router.navigate('dashboard');
window.navigateToBuchen = () => Router.navigate('buchen');
window.navigateToHistorie = () => Router.navigate('historie');
window.navigateToProfil = () => Router.navigate('profil');
window.handleLogout = async () => { await Auth.logout(); };
window.handleLetterSelect = l => { 
    // Auto-Refresh Timer stoppen
    if (typeof loginRefreshTimer !== 'undefined' && loginRefreshTimer) {
        clearInterval(loginRefreshTimer);
        loginRefreshTimer = null;
    }
    window.currentLetter = l; 
    Router.navigate('name-select'); 
};
window.handleNameSelect = id => { window.selectedGastId = id; Router.navigate('pin-entry'); };
window.handlePinCancel = () => { window.selectedGastId = null; Router.navigate('login'); };

// SYNC VON CLOUD - Loescht lokalen Cache und laedt alles von Supabase
window.syncFromCloud = async (silent = false) => {
    if (!supabaseClient || !isOnline) {
        if (!silent) Utils.showToast('Keine Verbindung zur Cloud!', 'error');
        return;
    }
    
    if (!silent) Utils.showToast(' Synchronisiere...', 'info');
    
    try {
        // Lokalen Gäste-Cache löschen
        await db.registeredGuests.clear();
        console.log('✅ Lokaler Gäste-Cache gelöscht');
        
        // Alle Profile von Supabase laden
        const { data: profiles, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .order('display_name');
        
        if (error) {
            console.error(' Supabase Fehler:', error);
            if (!silent) Utils.showToast('Sync fehlgeschlagen: ' + error.message, 'error');
            return;
        }
        
        console.log('✅ Profile von Supabase:', profiles?.length || 0);
        
        // In lokalen Cache speichern
        if (profiles && profiles.length > 0) {
            for (const p of profiles) {
                const name = p.display_name || p.first_name;
                try {
                    await db.registeredGuests.put({
                        id: p.id,
                        firstName: name,
                        nachname: name,
                        passwort: p.pin_hash,
                        passwordHash: p.pin_hash,
                        gruppenname: p.group_name,
                        group_name: p.group_name,
                        gelöscht: p.gelöscht,
                        email: p.email
                    });
                } catch(e) {
                    console.error('Cache Fehler:', e);
                }
            }
        }
        
        if (!silent) Utils.showToast(`✅ Synchronisiert`, 'success');
        
        // Seite nur neu laden wenn nicht silent
        if (!silent) Router.navigate('login');
        
    } catch(e) {
        console.error(' Sync Fehler:', e);
        if (!silent) Utils.showToast('Sync fehlgeschlagen: ' + e.message, 'error');
    }
};

// Lokalen Cache komplett löschen (für Debugging)
window.clearLocalCache = async () => {
    if (!confirm('Lokalen Cache wirklich löschen?\n\nDaten werden beim nächsten Laden von Supabase neu geladen.')) return;
    
    try {
        await db.registeredGuests.clear();
        await db.buchungen.clear();
        localStorage.clear();
        Utils.showToast('✅ Cache gelöscht - Seite wird neu geladen', 'success');
        setTimeout(() => location.reload(), 1000);
    } catch(e) {
        Utils.showToast('Fehler: ' + e.message, 'error');
    }
};

window.handleRegisterSubmit = async () => {
    const v = document.getElementById('register-vorname')?.value;
    const p = window.registerPin;
    if (!v?.trim()) { Utils.showToast('Vorname eingeben', 'warning'); return; }
    if (!p || p.length !== 4) { Utils.showToast('4-stelligen PIN eingeben', 'warning'); return; }
    try { 
        console.log('Registrierung startet...', v.trim(), p.length);
        await RegisteredGuests.register(v.trim(), p); 
        // Nach Registrierung prüfen ob Gruppe gewählt werden muss
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
    if(confirm('Gast ENDGUeLTIG löschen?\n\nDiese Aktion kann nicht rueckgängig gemacht werden!')) { 
        await RegisteredGuests.deletePermanent(id); 
        Router.navigate('admin-guests'); 
    } 
};
window.handleDeleteArticle = async id => { if(confirm('Artikel löschen?')) { await Artikel.delete(id); Router.navigate('admin-articles'); } };
window.toggleArtikelAktiv = async (id, aktiv) => {
    console.log('🔄 toggleArtikelAktiv aufgerufen:', id, aktiv);
    
    try {
        // Bei manueller Deaktivierung auch aktiv_bis löschen
        const updateData = { aktiv: aktiv };
        if (!aktiv) {
            updateData.aktiv_bis = null; // Zeitbegrenzung entfernen
        }
        
        console.log('📤 Sende an Supabase:', updateData);
        
        // ZUERST Supabase updaten (wichtig!)
        if (supabaseClient && isOnline) {
            const { data, error } = await supabaseClient
                .from('artikel')
                .update(updateData)
                .eq('artikel_id', id)
                .select();
            
            if (error) {
                console.error('❌ Supabase Fehler:', error);
                throw new Error('Supabase Fehler: ' + error.message);
            }
            
            console.log('✅ Supabase Antwort:', data);
            console.log('✅ Artikel ' + id + ' in Supabase ' + (aktiv ? 'aktiviert' : 'deaktiviert'));
        } else {
            console.error('❌ Keine Supabase-Verbindung!');
            throw new Error('Keine Verbindung zu Supabase!');
        }
        
        // Dann lokal updaten
        await db.artikel.update(id, updateData);
        console.log('✅ Lokal aktualisiert');
        
        // Cache invalidieren
        artikelCache = null;
        
        Utils.showToast(aktiv ? 'Artikel aktiviert' : 'Artikel deaktiviert', 'success');
    } catch (e) {
        console.error('❌ Toggle Fehler:', e);
        Utils.showToast('Fehler: ' + e.message, 'error');
    }
};

// Zeitbegrenzung Modal anzeigen
window.showZeitbegrenzungModal = (artikelId, artikelName) => {
    const modalHtml = `
    <div id="zeit-modal-overlay" onclick="closeZeitModal()" style="
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.6);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
    ">
        <div onclick="event.stopPropagation()" style="
            background: white;
            border-radius: 16px;
            max-width: 400px;
            width: 100%;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        ">
            <div style="padding: 20px; border-bottom: 1px solid #eee;">
                <h3 style="margin: 0; display: flex; align-items: center; gap: 10px;">
                    <span>⏰</span> Zeitbegrenzung
                </h3>
                <p style="margin: 8px 0 0; color: #666; font-size: 0.9rem;">
                    "${artikelName}"
                </p>
            </div>
            
            <div style="padding: 20px;">
                <p style="margin: 0 0 16px; color: #666; font-size: 0.9rem;">
                    Artikel automatisch deaktivieren nach:
                </p>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <button onclick="setZeitbegrenzung(${artikelId}, 6)" class="btn" style="padding: 14px; background: #f8f9fa; border: 2px solid #ddd;">
                        🕐 6 Stunden
                    </button>
                    <button onclick="setZeitbegrenzung(${artikelId}, 12)" class="btn" style="padding: 14px; background: #f8f9fa; border: 2px solid #ddd;">
                        🕐 12 Stunden
                    </button>
                    <button onclick="setZeitbegrenzung(${artikelId}, 24)" class="btn" style="padding: 14px; background: #f8f9fa; border: 2px solid #ddd;">
                         1 Tag
                    </button>
                    <button onclick="setZeitbegrenzung(${artikelId}, 48)" class="btn" style="padding: 14px; background: #f8f9fa; border: 2px solid #ddd;">
                         2 Tage
                    </button>
                    <button onclick="setZeitbegrenzung(${artikelId}, 72)" class="btn" style="padding: 14px; background: #f8f9fa; border: 2px solid #ddd;">
                         3 Tage
                    </button>
                    <button onclick="setZeitbegrenzung(${artikelId}, 168)" class="btn" style="padding: 14px; background: #f8f9fa; border: 2px solid #ddd;">
                         7 Tage
                    </button>
                </div>
                
                <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #eee;">
                    <button onclick="setZeitbegrenzung(${artikelId}, 0)" class="btn btn-block" style="padding: 14px; background: #27ae60; color: white; border: none;">
                         Keine Begrenzung (dauerhaft aktiv)
                    </button>
                </div>
            </div>
            
            <div style="padding: 16px; border-top: 1px solid #eee; text-align: right;">
                <button onclick="closeZeitModal()" class="btn btn-secondary">Abbrechen</button>
            </div>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

// Zeitbegrenzung Modal schlieÃŸen
window.closeZeitModal = () => {
    const modal = document.getElementById('zeit-modal-overlay');
    if (modal) modal.remove();
};

// Zeitbegrenzung setzen
window.setZeitbegrenzung = async (artikelId, stunden) => {
    try {
        let aktiv_bis = null;
        
        if (stunden > 0) {
            const ablaufzeit = new Date();
            ablaufzeit.setHours(ablaufzeit.getHours() + stunden);
            aktiv_bis = ablaufzeit.toISOString();
        }
        
        // Lokal updaten
        await db.artikel.update(artikelId, { 
            aktiv_bis: aktiv_bis,
            aktiv: true // Artikel aktivieren wenn Zeitbegrenzung gesetzt wird
        });
        
        // Supabase updaten
        if (supabaseClient && isOnline) {
            await supabaseClient.from('artikel').update({ 
                aktiv_bis: aktiv_bis,
                aktiv: true 
            }).eq('artikel_id', artikelId);
        }
        
        // Cache invalidieren
        artikelCache = null;
        
        closeZeitModal();
        
        if (stunden > 0) {
            const tage = Math.floor(stunden / 24);
            const restStunden = stunden % 24;
            let zeitText = '';
            if (tage > 0) zeitText = `${tage} Tag(e)`;
            else zeitText = `${restStunden} Stunden`;
            Utils.showToast(`✅ Artikel aktiv für ${zeitText}`, 'success');
        } else {
            Utils.showToast('✅ Zeitbegrenzung entfernt', 'success');
        }
        
        // Seite neu laden
        Router.navigate('admin-articles');
        
    } catch (e) {
        Utils.showToast('Fehler: ' + e.message, 'error');
    }
};

// Preis direkt in Tabelle ändern (SV oder HP)
window.quickUpdatePreis = async (id, typ, wert) => {
    try {
        const preis = parseFloat(wert) || 0;
        const update = typ === 'hp' ? { preis_hp: preis } : { preis: preis };
        
        // ZUERST Supabase updaten (wichtig!)
        if (supabaseClient && isOnline) {
            const { error } = await supabaseClient.from('artikel').update(update).eq('artikel_id', id);
            if (error) throw new Error('Supabase Fehler: ' + error.message);
        }
        
        await db.artikel.update(id, update);
        artikelCache = null;
        
        const label = typ === 'hp' ? 'HP-Preis' : 'SV-Preis';
        Utils.showToast(`${label} auf ${Utils.formatCurrency(preis)} geändert`, 'success');
    } catch (e) {
        Utils.showToast('Fehler: ' + e.message, 'error');
    }
};

// MwSt direkt ändern
window.quickUpdateMwst = async (id, mwst) => {
    try {
        // ZUERST Supabase updaten (wichtig!)
        if (supabaseClient && isOnline) {
            const { error } = await supabaseClient.from('artikel').update({ steuer_prozent: mwst }).eq('artikel_id', id);
            if (error) throw new Error('Supabase Fehler: ' + error.message);
        }
        
        await db.artikel.update(id, { steuer_prozent: mwst });
        artikelCache = null;
        Utils.showToast(`MwSt auf ${mwst}% geändert`, 'success');
    } catch (e) {
        Utils.showToast('Fehler: ' + e.message, 'error');
    }
};

// Kategorie direkt ändern
window.changeArtikelKategorie = async (id, neueKategorieId) => {
    try {
        const katMap = {1:'Alkoholfreie Getränke',2:'Biere',3:'Weine',4:'Schnäpse & Spirituosen',5:'HeiÃŸe Getränke',6:'Suesses & Salziges',7:'Sonstiges'};
        const iconMap = {1:'',2:'',3:'',4:'',5:'[Kaffee]',6:'',7:''};
        
        const updateData = { 
            kategorie_id: neueKategorieId,
            kategorie_name: katMap[neueKategorieId] || 'Sonstiges'
        };
        
        // ZUERST Supabase updaten (wichtig!)
        if (supabaseClient && isOnline) {
            const { error } = await supabaseClient.from('artikel').update(updateData).eq('artikel_id', id);
            if (error) throw new Error('Supabase Fehler: ' + error.message);
        }
        
        await db.artikel.update(id, { 
            ...updateData,
            icon: iconMap[neueKategorieId] || ''
        });
        
        artikelCache = null;
        Utils.showToast('Kategorie geändert', 'success');
        
        // Seite neu laden um Artikel in neuer Kategorie zu zeigen
        Router.navigate('admin-articles');
    } catch (e) {
        Utils.showToast('Fehler: ' + e.message, 'error');
    }
};

// Artikel-ID ändern (für Registrierkasse wichtig!)
window.changeArtikelId = async (alteId) => {
    const artikel = await Artikel.getById(alteId);
    if (!artikel) {
        Utils.showToast('Artikel nicht gefunden', 'error');
        return;
    }
    
    const neueIdStr = prompt(`⚠️ ACHTUNG: Artikel-ID ändern\n\nDiese ID wird für die Registrierkasse verwendet!\nNur ändern wenn Sie genau wissen was Sie tun.\n\nAktuelle ID: ${alteId}\nArtikel: ${artikel.name}\n\nNeue ID eingeben:`, alteId);
    
    if (neueIdStr === null) return; // Abgebrochen
    
    const neueId = parseInt(neueIdStr);
    if (isNaN(neueId) || neueId <= 0) {
        Utils.showToast('Ungueltige ID (muss eine positive Zahl sein)', 'error');
        return;
    }
    
    if (neueId === alteId) {
        Utils.showToast('ID wurde nicht geändert', 'info');
        return;
    }
    
    // Prüfen ob neue ID bereits existiert
    const existing = await Artikel.getById(neueId);
    if (existing) {
        Utils.showToast(`ID ${neueId} ist bereits vergeben (${existing.name})`, 'error');
        return;
    }
    
    // Bestätigung einholen
    if (!confirm(`⚠️ LETZTE WARNUNG!\n\nArtikel-ID wirklich ändern?\n\nVon: ${alteId}\nNach: ${neueId}\n\nArtikel: ${artikel.name}\n\nDies kann Auswirkungen auf bestehende Buchungen haben!`)) {
        return;
    }
    
    try {
        // Neuen Artikel mit neuer ID erstellen
        const neuerArtikel = { ...artikel, artikel_id: neueId };
        
        // In IndexedDB: Alten löschen, neuen anlegen
        await db.artikel.delete(alteId);
        await db.artikel.add(neuerArtikel);
        
        // In Supabase: Alten löschen, neuen anlegen
        if (supabaseClient && isOnline) {
            await supabaseClient.from('artikel').delete().eq('artikel_id', alteId);
            await supabaseClient.from('artikel').insert(neuerArtikel);
        }
        
        artikelCache = null;
        await DataProtection.createBackup();
        
        Utils.showToast(`✅ Artikel-ID geändert: ${alteId} → ${neueId}`, 'success');
        Router.navigate('admin-articles');
    } catch (e) {
        console.error('ID ändern Fehler:', e);
        Utils.showToast('Fehler: ' + e.message, 'error');
    }
};

// Foto Upload für Artikel direkt in Tabelle
window.triggerArtikelBildUpload = (artikelId) => {
    // Hidden input erstellen falls nicht vorhanden
    let input = document.getElementById('artikel-bild-upload-hidden');
    if (!input) {
        input = document.createElement('input');
        input.type = 'file';
        input.id = 'artikel-bild-upload-hidden';
        input.accept = 'image/*';
        input.style.display = 'none';
        document.body.appendChild(input);
    }
    
    // Artikel-ID speichern und Upload starten
    input.dataset.artikelId = artikelId;
    input.onchange = handleArtikelBildUpload;
    input.click();
};

window.handleArtikelBildUpload = async (event) => {
    const file = event.target.files[0];
    const artikelId = parseInt(event.target.dataset.artikelId);
    
    if (!file || !artikelId) return;
    
    try {
        Utils.showToast('Bild wird verarbeitet...', 'info');
        const base64 = await Utils.resizeImage(file, 150);
        
        // In DB speichern
        await db.artikel.update(artikelId, { bild: base64 });
        
        if (supabaseClient && isOnline) {
            await supabaseClient.from('artikel').update({ bild: base64 }).eq('artikel_id', artikelId);
        }
        
        artikelCache = null;
        Utils.showToast('Foto gespeichert!', 'success');
        
        // Nur das Bild in der Zeile aktualisieren (ohne komplette Seite neu zu laden)
        const row = document.querySelector(`tr[data-id="${artikelId}"]`);
        if (row) {
            const imgCell = row.querySelector('td:nth-child(2)');
            if (imgCell) {
                imgCell.innerHTML = `<img src="${base64}" style="width:40px;height:40px;object-fit:cover;border-radius:6px;cursor:pointer;" onclick="triggerArtikelBildUpload(${artikelId})">`;
            }
        }
    } catch (e) {
        Utils.showToast('Fehler: ' + e.message, 'error');
    }
    
    // Input zurücksetzen
    event.target.value = '';
};
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
            : `<div class="artikel-icon">${a.icon||''}</div>`;
        return `<div class="artikel-tile" style="--tile-color:${catColor(a.kategorie_id)}" data-artikel-id="${a.artikel_id}" onmousedown="artikelPressStart(event, ${a.artikel_id})" onmouseup="artikelPressEnd(event)" onmouseleave="artikelPressEnd(event)" ontouchstart="artikelPressStart(event, ${a.artikel_id})" ontouchmove="artikelPressMove(event)" ontouchend="artikelPressEnd(event)">${content}<div class="artikel-name">${a.name}</div><div class="artikel-price">${Utils.formatCurrency(a.preis)}</div></div>`;
    };
    if (grid) grid.innerHTML = arts.map(renderTile).join('') || '<p class="text-muted" style="grid-column:1/-1;text-align:center;">Keine Ergebnisse</p>';
}, 300);

window.showAddArticleModal = () => {
    const c = document.getElementById('article-modal-container');
    c.innerHTML = `<div class="modal-container active"><div class="modal-backdrop" onclick="closeArticleModal()"></div><div class="modal-content" style="max-width:500px;max-height:90vh;overflow-y:auto;"><h2 style="margin-bottom:24px;">Neuer Artikel</h2>
    <div class="form-group" style="text-align:center;">
        <div id="article-image-preview" style="width:120px;height:120px;margin:0 auto 12px;border-radius:12px;background:var(--color-stone-light);display:flex;align-items:center;justify-content:center;font-size:3rem;overflow:hidden;"></div>
        <input type="file" id="article-image" accept="image/*" style="display:none" onchange="handleImagePreview(event)">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('article-image').click()" style="padding:8px 16px;"> Foto wählen</button>
        <button type="button" class="btn btn-secondary" onclick="clearImagePreview()" style="padding:8px 16px;margin-left:8px;">x</button>
    </div>
    <div class="form-group"><label class="form-label">Name *</label><input type="text" id="article-name" class="form-input" placeholder="z.B. Cola 0.5l"></div>
    <div class="form-group"><label class="form-label">Kurzname</label><input type="text" id="article-short" class="form-input" placeholder="z.B. Cola"></div>
    <div class="form-group"><label class="form-label">SKU</label><input type="text" id="article-sku" class="form-input" placeholder="z.B. COL-05"></div>
    
    <!-- BEIDE PREISE -->
    <div style="background:#f8f9fa;border-radius:12px;padding:16px;margin-bottom:16px;">
        <div style="font-weight:600;margin-bottom:12px;"> Preise</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
            <div class="form-group" style="margin-bottom:0;">
                <label class="form-label" style="color:#3498db;font-weight:600;">  Selbstversorger (EUR)</label>
                <input type="number" id="article-price-sv" class="form-input" placeholder="0.00" step="0.10" min="0" style="border-color:#3498db;font-size:1.2rem;font-weight:bold;">
            </div>
            <div class="form-group" style="margin-bottom:0;">
                <label class="form-label" style="color:#9b59b6;font-weight:600;"> Halbpension (EUR)</label>
                <input type="number" id="article-price-hp" class="form-input" placeholder="0.00" step="0.10" min="0" style="border-color:#9b59b6;font-size:1.2rem;font-weight:bold;">
            </div>
        </div>
        <div class="form-group" style="margin-top:12px;margin-bottom:0;">
            <label class="form-label">MwSt / Steuer</label>
            <select id="article-mwst" class="form-input">
                <option value="10">10%</option>
                <option value="19" selected>19%</option>
                <option value="20">20%</option>
                <option value="0">0%</option>
            </select>
        </div>
    </div>
    
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <div class="form-group"><label class="form-label">Position</label><input type="number" id="article-sort" class="form-input" placeholder="1" min="1" value="1"><small style="color:var(--color-stone-dark);">Reihenfolge in Kategorie</small></div>
        <div class="form-group"><label class="form-label">Kategorie</label><select id="article-category" class="form-input"><option value="1">Alkoholfreie Getränke</option><option value="2">Biere</option><option value="3">Weine</option><option value="4">Schnäpse & Spirituosen</option><option value="5">HeiÃŸe Getränke</option><option value="6">Suesses & Salziges</option><option value="7">Sonstiges</option></select></div>
    </div>
    <div class="form-checkbox"><input type="checkbox" id="article-active" checked><label for="article-active">Aktiv</label></div>
    <div style="display:flex;gap:16px;margin-top:24px;"><button class="btn btn-secondary" style="flex:1;" onclick="closeArticleModal()">Abbrechen</button><button class="btn btn-primary" style="flex:1;" onclick="saveNewArticle()">Speichern</button></div></div></div>`;
    window.currentArticleImage = null;
};
window.showEditArticleModal = async id => {
    const a = await Artikel.getById(id);
    if (!a) return;
    const c = document.getElementById('article-modal-container');
    const hasImage = a.bild && a.bild.startsWith('data:');
    const previewContent = hasImage ? `<img src="${a.bild}" style="width:100%;height:100%;object-fit:cover;">` : (a.icon || '');
    const preisSV = a.preis ?? 0;
    const preisHP = a.preis_hp ?? a.preis ?? 0;
    c.innerHTML = `<div class="modal-container active"><div class="modal-backdrop" onclick="closeArticleModal()"></div><div class="modal-content" style="max-width:500px;max-height:90vh;overflow-y:auto;"><h2 style="margin-bottom:24px;">Artikel bearbeiten</h2>
    <input type="hidden" id="article-id" value="${a.artikel_id}">
    <div class="form-group" style="text-align:center;">
        <div id="article-image-preview" style="width:120px;height:120px;margin:0 auto 12px;border-radius:12px;background:var(--color-stone-light);display:flex;align-items:center;justify-content:center;font-size:3rem;overflow:hidden;">${previewContent}</div>
        <input type="file" id="article-image" accept="image/*" style="display:none" onchange="handleImagePreview(event)">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('article-image').click()" style="padding:8px 16px;"> Foto wählen</button>
        <button type="button" class="btn btn-secondary" onclick="clearImagePreview()" style="padding:8px 16px;margin-left:8px;">x</button>
    </div>
    <div class="form-group"><label class="form-label">Name *</label><input type="text" id="article-name" class="form-input" value="${a.name}"></div>
    <div class="form-group"><label class="form-label">Kurzname</label><input type="text" id="article-short" class="form-input" value="${a.name_kurz||''}"></div>
    <div class="form-group"><label class="form-label">SKU</label><input type="text" id="article-sku" class="form-input" value="${a.sku||''}"></div>
    
    <!-- BEIDE PREISE -->
    <div style="background:#f8f9fa;border-radius:12px;padding:16px;margin-bottom:16px;">
        <div style="font-weight:600;margin-bottom:12px;"> Preise</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
            <div class="form-group" style="margin-bottom:0;">
                <label class="form-label" style="color:#3498db;font-weight:600;">  Selbstversorger (EUR)</label>
                <input type="number" id="article-price-sv" class="form-input" value="${preisSV.toFixed(2)}" step="0.10" min="0" style="border-color:#3498db;font-size:1.2rem;font-weight:bold;">
            </div>
            <div class="form-group" style="margin-bottom:0;">
                <label class="form-label" style="color:#9b59b6;font-weight:600;"> Halbpension (EUR)</label>
                <input type="number" id="article-price-hp" class="form-input" value="${preisHP.toFixed(2)}" step="0.10" min="0" style="border-color:#9b59b6;font-size:1.2rem;font-weight:bold;">
            </div>
        </div>
        <div class="form-group" style="margin-top:12px;margin-bottom:0;">
            <label class="form-label">MwSt / Steuer</label>
            <select id="article-mwst" class="form-input">
                <option value="10" ${(a.steuer_prozent || 10) === 10 ? 'selected' : ''}>10%</option>
                <option value="19" ${(a.steuer_prozent || 10) === 19 ? 'selected' : ''}>19%</option>
                <option value="20" ${(a.steuer_prozent || 10) === 20 ? 'selected' : ''}>20%</option>
                <option value="0" ${(a.steuer_prozent || 10) === 0 ? 'selected' : ''}>0%</option>
            </select>
        </div>
    </div>
    
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <div class="form-group"><label class="form-label">Position</label><input type="number" id="article-sort" class="form-input" value="${a.sortierung||1}" min="1"><small style="color:var(--color-stone-dark);">Reihenfolge in Kategorie</small></div>
        <div class="form-group"><label class="form-label">Kategorie</label><select id="article-category" class="form-input">${[1,2,3,4,5,6,7].map(i => `<option value="${i}" ${a.kategorie_id===i?'selected':''}>${{1:'Alkoholfreie Getränke',2:'Biere',3:'Weine',4:'Schnäpse & Spirituosen',5:'HeiÃŸe Getränke',6:'Suesses & Salziges',7:'Sonstiges'}[i]}</option>`).join('')}</select></div>
    </div>
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
    const iconMap = {1:'',2:'',3:'',4:'',5:'[Kaffee]',6:'',7:''};
    document.getElementById('article-image-preview').innerHTML = iconMap[katId] || '';
    document.getElementById('article-image').value = '';
};

window.saveNewArticle = async () => {
    const name = document.getElementById('article-name')?.value;
    if (!name?.trim()) { Utils.showToast('Name erforderlich', 'warning'); return; }
    const katId = parseInt(document.getElementById('article-category')?.value) || 1;
    const katMap = {1:'Alkoholfreie Getränke',2:'Biere',3:'Weine',4:'Schnäpse & Spirituosen',5:'HeiÃŸe Getränke',6:'Suesses & Salziges',7:'Sonstiges'};
    const iconMap = {1:'',2:'',3:'',4:'',5:'[Kaffee]',6:'',7:''};
    
    // Beide Preise lesen
    const preisSV = parseFloat(document.getElementById('article-price-sv')?.value) || 0;
    const preisHP = parseFloat(document.getElementById('article-price-hp')?.value) || preisSV; // Falls HP leer, gleich wie SV
    
    await Artikel.create({ 
        name: name.trim(), 
        name_kurz: document.getElementById('article-short')?.value?.trim() || name.trim().substring(0,15), 
        sku: document.getElementById('article-sku')?.value?.trim() || null, 
        preis: preisSV,
        preis_hp: preisHP,
        steuer_prozent: parseInt(document.getElementById('article-mwst')?.value) || 19, 
        kategorie_id: katId, 
        kategorie_name: katMap[katId] || 'Sonstiges', 
        aktiv: document.getElementById('article-active')?.checked, 
        sortierung: parseInt(document.getElementById('article-sort')?.value) || 1, 
        icon: iconMap[katId] || '',
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
    const katMap = {1:'Alkoholfreie Getränke',2:'Biere',3:'Weine',4:'Schnäpse & Spirituosen',5:'HeiÃŸe Getränke',6:'Suesses & Salziges',7:'Sonstiges'};
    const iconMap = {1:'',2:'',3:'',4:'',5:'[Kaffee]',6:'',7:''};
    
    // Beide Preise lesen
    const preisSV = parseFloat(document.getElementById('article-price-sv')?.value) || 0;
    const preisHP = parseFloat(document.getElementById('article-price-hp')?.value) || 0;
    
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
        preis: preisSV,
        preis_hp: preisHP,
        steuer_prozent: parseInt(document.getElementById('article-mwst')?.value) || 19,
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
    console.log(' Seollerhaus Kassa v3.0 (Supabase) startet...');
    
    // Funktion um Loading Screen zu verstecken und App zu zeigen
    const showApp = () => {
        const loadingScreen = document.getElementById('loading-screen');
        const appContainer = document.getElementById('app');
        if (loadingScreen) loadingScreen.style.display = 'none';
        if (appContainer) appContainer.style.display = 'block';
    };
    
    try {
        // Supabase initialisieren
        const supabaseReady = initSupabase();
        if (supabaseReady) {
            console.log('✅ Supabase bereit - Multi-Device Modus');
            // Artikel von Supabase laden
            try {
                await Artikel.loadFromSupabase();
            } catch(e) {
                console.error('Artikel laden Fehler:', e);
            }
            // Pending Buchungen synchronisieren
            try {
                syncPendingData();
            } catch(e) {
                console.error('Sync Fehler:', e);
            }
            
            // Gäste-Daten von Supabase laden
            try {
                const { data: profiles, error } = await supabaseClient
                    .from('profiles')
                    .select('*')
                    .order('display_name');
                
                if (!error && profiles) {
                    // Nur nicht-gelöschte Profile cachen
                    const aktive = profiles.filter(p => p.gelöscht !== true);
                    console.log('✅ Profile geladen:', aktive.length, 'aktiv von', profiles.length, 'gesamt');
                    
                    for (const p of aktive) {
                        const name = p.display_name || p.first_name;
                        try {
                            await db.registeredGuests.put({
                                id: p.id,
                                firstName: name,
                                nachname: name,
                                passwort: p.pin_hash,
                                passwordHash: p.pin_hash,
                                gruppenname: p.group_name,
                                group_name: p.group_name,
                                geloescht: false,
                                email: p.email
                            });
                        } catch(e) {}
                    }
                }
            } catch(e) {
                console.error('Profile laden Fehler:', e);
            }
        } else {
            console.log('⚠Offline-Modus - Lokale Daten');
        }
    
        // Seed Artikel falls nötig
        try {
            await Artikel.seed();
        } catch(e) {
            console.error('Artikel seed Fehler:', e);
        }
        
        // Kategorien IMMER auf korrekte Werte setzen (automatische Reparatur)
        try {
            await db.kategorien.clear();
            await db.kategorien.bulkAdd([
                {kategorie_id:1, name:'Alkoholfreie Getränke', sortierung:10},
                {kategorie_id:2, name:'Biere', sortierung:20},
                {kategorie_id:3, name:'Weine', sortierung:30},
                {kategorie_id:4, name:'Schnäpse & Spirituosen', sortierung:40},
                {kategorie_id:5, name:'HeiÃŸe Getränke', sortierung:50},
                {kategorie_id:6, name:'Suesses & Salziges', sortierung:60},
                {kategorie_id:7, name:'Sonstiges', sortierung:70}
            ]);
            console.log('✅ Kategorien automatisch repariert');
        } catch(e) {
            console.error('Kategorien init Fehler:', e);
        }
        
        // Preismodus laden (HP oder Selbstversorger)
        try {
            await State.loadPreisModus();
        } catch(e) {
            console.error('Preismodus laden Fehler:', e);
        }
        
        // KEIN Auto-Login - immer zur Startseite
        // Supabase Session ausloggen damit frisch gestartet wird
        try {
            if (supabaseClient) {
                await supabaseClient.auth.signOut();
            }
        } catch(e) {
            console.error('Supabase signOut Fehler:', e);
        }
        
        State.currentUser = null;
        
        // Loading Screen ausblenden und App zeigen
        setTimeout(() => {
            showApp();
            Router.init();
            
            // Online-Status anzeigen
            if (!isOnline) {
                Utils.showToast('Offline-Modus aktiv', 'info');
            }
        }, 1500);
        
    } catch(e) {
        // Bei JEDEM Fehler: App trotzdem zeigen!
        console.error(' KRITISCHER INIT FEHLER:', e);
        showApp();
        Router.init();
        Utils.showToast('Ladefehler - bitte neu laden', 'error');
    }
})();

// ===========================================
// WHATSAPP SUPPORT (nur auf Startseite)
// ===========================================
window.openWhatsAppSupport = () => {
    const whatsappNummer = '436701818001';
    const datum = new Date().toLocaleDateString('de-AT');
    const userName = State.currentUser?.firstName || State.currentUser?.vorname || '';
    
    // Einfache Nachricht
    const nachricht = `

Name: ${userName || '___'}
Datum: ${datum}

Screenshot beifuegen:`;
    
    // WhatsApp Link öffnen
    const encodedNachricht = encodeURIComponent(nachricht);
    const whatsappUrl = `https://wa.me/${whatsappNummer}?text=${encodedNachricht}`;
    
    window.open(whatsappUrl, '_blank');
};

// Migration: Lokale Buchungen nach Supabase hochladen
window.migrateLocalToSupabase = async () => {
    if (!supabaseClient || !isOnline) {
        Utils.showToast('Keine Verbindung zu Supabase!', 'error');
        return;
    }
    
    if (!confirm('Alle lokalen Buchungen nach Supabase migrieren?\n\nDies lädt alle Buchungen aus der lokalen Datenbank hoch.')) {
        return;
    }
    
    Utils.showToast('🔄 Migration gestartet...', 'info');
    
    try {
        // Alle lokalen Buchungen laden
        const lokaleBuchungen = await db.buchungen.toArray();
        console.log('📦 Lokale Buchungen gefunden:', lokaleBuchungen.length);
        
        if (lokaleBuchungen.length === 0) {
            Utils.showToast('Keine lokalen Buchungen gefunden', 'info');
            return;
        }
        
        let hochgeladen = 0;
        let uebersprungen = 0;
        let fehler = 0;
        
        for (const b of lokaleBuchungen) {
            try {
                // Prüfen ob schon in Supabase existiert
                const { data: existing } = await supabaseClient
                    .from('buchungen')
                    .select('buchung_id')
                    .eq('buchung_id', b.buchung_id)
                    .single();
                
                if (existing) {
                    uebersprungen++;
                    continue;
                }
                
                // Buchung für Supabase vorbereiten
                const buchungData = {
                    buchung_id: b.buchung_id,
                    user_id: b.user_id || b.gast_id,
                    gast_id: b.gast_id || b.user_id,
                    gast_vorname: b.gast_vorname || b.gastname || '',
                    artikel_id: b.artikel_id,
                    artikel_name: b.artikel_name,
                    preis: b.preis,
                    menge: b.menge || 1,
                    datum: b.datum,
                    uhrzeit: b.uhrzeit,
                    erstellt_am: b.erstellt_am,
                    storniert: b.storniert || false,
                    exportiert: b.exportiert || false,
                    aufgefuellt: b.aufgefuellt || false,
                    group_name: b.group_name || 'keiner Gruppe zugehoerig',
                    session_id: b.session_id || null
                };
                
                const { error } = await supabaseClient.from('buchungen').insert(buchungData);
                
                if (error) {
                    if (error.code === '23505') {
                        // Duplikat - schon vorhanden
                        uebersprungen++;
                    } else {
                        console.error('❌ Migration error:', b.buchung_id, error.message);
                        fehler++;
                    }
                } else {
                    hochgeladen++;
                    console.log('✅ Migriert:', b.buchung_id);
                }
            } catch(e) {
                console.error('❌ Migration exception:', e);
                fehler++;
            }
        }
        
        Utils.showToast(`✅ Migration fertig!\n${hochgeladen} hochgeladen\n${uebersprungen} übersprungen\n${fehler} Fehler`, 'success');
        console.log(`📊 Migration: ${hochgeladen} hochgeladen, ${uebersprungen} übersprungen, ${fehler} Fehler`);
        
        // Dashboard neu laden
        Router.navigate('admin-dashboard');
        
    } catch(e) {
        console.error('❌ Migration Fehler:', e);
        Utils.showToast('Migration fehlgeschlagen: ' + e.message, 'error');
    }
};

// ===========================================
// VIRTUELLE TASTATUR für Touch-Geräte
// ===========================================
const VirtualKeyboard = {
    activeInput: null,
    isVisible: false,
    
    // Tastatur HTML erstellen
    createKeyboardHTML(type = 'full') {
        if (type === 'numpad') {
            return `
                <div id="virtual-keyboard" class="virtual-keyboard numpad">
                    <div class="vk-header">
                        <span>PIN eingeben</span>
                        <button class="vk-close" onclick="VirtualKeyboard.hide()">✕</button>
                    </div>
                    <div class="vk-display">
                        <input type="password" id="vk-display" readonly>
                    </div>
                    <div class="vk-keys">
                        <div class="vk-row">
                            <button class="vk-key" onclick="VirtualKeyboard.press('1')">1</button>
                            <button class="vk-key" onclick="VirtualKeyboard.press('2')">2</button>
                            <button class="vk-key" onclick="VirtualKeyboard.press('3')">3</button>
                        </div>
                        <div class="vk-row">
                            <button class="vk-key" onclick="VirtualKeyboard.press('4')">4</button>
                            <button class="vk-key" onclick="VirtualKeyboard.press('5')">5</button>
                            <button class="vk-key" onclick="VirtualKeyboard.press('6')">6</button>
                        </div>
                        <div class="vk-row">
                            <button class="vk-key" onclick="VirtualKeyboard.press('7')">7</button>
                            <button class="vk-key" onclick="VirtualKeyboard.press('8')">8</button>
                            <button class="vk-key" onclick="VirtualKeyboard.press('9')">9</button>
                        </div>
                        <div class="vk-row">
                            <button class="vk-key vk-clear" onclick="VirtualKeyboard.clear()">C</button>
                            <button class="vk-key" onclick="VirtualKeyboard.press('0')">0</button>
                            <button class="vk-key vk-back" onclick="VirtualKeyboard.backspace()">⌫</button>
                        </div>
                        <div class="vk-row">
                            <button class="vk-key vk-enter" onclick="VirtualKeyboard.confirm()">OK ✔</button>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // Vollständige Tastatur für Namen
            return `
                <div id="virtual-keyboard" class="virtual-keyboard full">
                    <div class="vk-header">
                        <span>Name eingeben</span>
                        <button class="vk-close" onclick="VirtualKeyboard.hide()">✕</button>
                    </div>
                    <div class="vk-display">
                        <input type="text" id="vk-display" readonly style="text-transform:uppercase;">
                    </div>
                    <div class="vk-keys">
                        <div class="vk-row">
                            ${['Q','W','E','R','T','Z','U','I','O','P'].map(k => `<button class="vk-key" onclick="VirtualKeyboard.press('${k}')">${k}</button>`).join('')}
                        </div>
                        <div class="vk-row">
                            ${['A','S','D','F','G','H','J','K','L','Ä'].map(k => `<button class="vk-key" onclick="VirtualKeyboard.press('${k}')">${k}</button>`).join('')}
                        </div>
                        <div class="vk-row">
                            ${['Y','X','C','V','B','N','M','Ö','Ü'].map(k => `<button class="vk-key" onclick="VirtualKeyboard.press('${k}')">${k}</button>`).join('')}
                            <button class="vk-key vk-back" onclick="VirtualKeyboard.backspace()">⌫</button>
                        </div>
                        <div class="vk-row">
                            <button class="vk-key vk-clear" onclick="VirtualKeyboard.clear()">CLR</button>
                            <button class="vk-key" onclick="VirtualKeyboard.press('-')">-</button>
                            <button class="vk-key vk-space" onclick="VirtualKeyboard.press(' ')">LEER</button>
                            <button class="vk-key vk-enter" onclick="VirtualKeyboard.confirm()">OK ✔</button>
                        </div>
                    </div>
                </div>
            `;
        }
    },
    
    // Tastatur anzeigen
    show(inputElement, type = 'full') {
        this.hide(); // Alte schlieÃŸen
        this.activeInput = inputElement;
        
        // Container erstellen
        const container = document.createElement('div');
        container.id = 'vk-container';
        container.innerHTML = this.createKeyboardHTML(type);
        document.body.appendChild(container);
        
        // Display mit aktuellem Wert füllen
        const display = document.getElementById('vk-display');
        if (display) {
            display.value = inputElement.value || '';
        }
        
        this.isVisible = true;
        
        // Style hinzufügen falls noch nicht vorhanden
        if (!document.getElementById('vk-styles')) {
            const style = document.createElement('style');
            style.id = 'vk-styles';
            style.textContent = `
                #vk-container {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    z-index: 9999;
                    background: rgba(0,0,0,0.5);
                    padding: 10px;
                    box-sizing: border-box;
                }
                .virtual-keyboard {
                    background: #2c3e50;
                    border-radius: 16px 16px 0 0;
                    padding: 12px;
                    max-width: 450px;
                    width: 100%;
                    margin: 0 auto;
                    box-sizing: border-box;
                }
                .vk-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    color: white;
                    font-weight: 600;
                    margin-bottom: 8px;
                    padding: 0 5px;
                    font-size: 14px;
                }
                .vk-close {
                    background: #e74c3c;
                    color: white;
                    border: none;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    font-size: 16px;
                    cursor: pointer;
                }
                .vk-display {
                    margin-bottom: 10px;
                }
                .vk-display input {
                    width: 100%;
                    padding: 12px;
                    font-size: 22px;
                    text-align: center;
                    border: none;
                    border-radius: 8px;
                    background: white;
                    font-weight: bold;
                    letter-spacing: 2px;
                    box-sizing: border-box;
                }
                .vk-keys {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    width: 100%;
                }
                .vk-row {
                    display: flex;
                    justify-content: center;
                    gap: 4px;
                    width: 100%;
                }
                .vk-key {
                    width: 38px;
                    height: 44px;
                    font-size: 18px;
                    font-weight: 600;
                    border: none;
                    border-radius: 6px;
                    background: #ecf0f1;
                    color: #2c3e50;
                    cursor: pointer;
                    transition: all 0.1s;
                    padding: 0;
                    flex-shrink: 0;
                }
                .vk-key:active {
                    background: #3498db;
                    color: white;
                    transform: scale(0.95);
                }
                .numpad {
                    max-width: 280px;
                }
                .numpad .vk-row {
                    justify-content: center;
                }
                .numpad .vk-key {
                    width: 70px;
                    height: 58px;
                    font-size: 26px;
                }
                .vk-enter {
                    width: 80px !important;
                    background: #27ae60;
                    color: white;
                    font-size: 16px;
                }
                .vk-enter:active {
                    background: #2ecc71;
                }
                .vk-clear {
                    width: 60px !important;
                    background: #e74c3c;
                    color: white;
                    font-size: 14px;
                }
                .vk-back {
                    background: #f39c12;
                    color: white;
                }
                .vk-space {
                    width: 120px !important;
                    font-size: 14px;
                }
                @media (max-width: 400px) {
                    .vk-key {
                        width: 32px;
                        height: 40px;
                        font-size: 16px;
                    }
                    .numpad .vk-key {
                        width: 60px;
                        height: 50px;
                        font-size: 22px;
                    }
                    .vk-space { width: 90px !important; }
                    .vk-enter { width: 70px !important; }
                    .vk-clear { width: 50px !important; }
                }
            `;
            document.head.appendChild(style);
        }
    },
    
    // Tastatur verstecken
    hide() {
        const container = document.getElementById('vk-container');
        if (container) {
            container.remove();
        }
        this.isVisible = false;
        this.activeInput = null;
    },
    
    // Taste drücken
    press(key) {
        const display = document.getElementById('vk-display');
        if (display) {
            display.value += key;
        }
    },
    
    // Löschen
    backspace() {
        const display = document.getElementById('vk-display');
        if (display && display.value.length > 0) {
            display.value = display.value.slice(0, -1);
        }
    },
    
    // Alles löschen
    clear() {
        const display = document.getElementById('vk-display');
        if (display) {
            display.value = '';
        }
    },
    
    // Bestätigen
    confirm() {
        const display = document.getElementById('vk-display');
        if (this.activeInput && display) {
            this.activeInput.value = display.value;
            // Event auslösen damit andere Handler es mitbekommen
            this.activeInput.dispatchEvent(new Event('input', { bubbles: true }));
            this.activeInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        this.hide();
    }
};

// Global verfügbar machen
window.VirtualKeyboard = VirtualKeyboard;

// Hilfsfunktionen für einfache Nutzung
window.showNumpad = (inputId) => {
    const input = document.getElementById(inputId);
    if (input) VirtualKeyboard.show(input, 'numpad');
};

window.showKeyboard = (inputId) => {
    const input = document.getElementById(inputId);
    if (input) VirtualKeyboard.show(input, 'full');
};
