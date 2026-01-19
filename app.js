// ===============================================
// STORNO-EXPORT ERWEITERUNG
// ===============================================
// Diese Datei erweitert die Export-Funktion um Storno-Support
// 
// INSTALLATION:
// 1. Diese Datei als "storno-export.js" hochladen
// 2. In index.html NACH app.js einbinden:
//    <script src="storno-export.js"></script>
// 3. Supabase-Migration ausführen (siehe supabase_migration.sql)
// ===============================================

// Originale Export-Funktion sichern
if (typeof Admin !== 'undefined' && Admin.exportBuchungenExcel) {
    Admin._originalExportBuchungenExcel = Admin.exportBuchungenExcel;
    
    // Neue Export-Funktion mit Storno-Support
    Admin.exportBuchungenExcel = async function() {
        console.log('🔄 Storno-Export Extension aktiviert');
        
        // 1. Normale Buchungen holen (noch nicht exportiert)
        const normaleBuchungen = await Buchungen.getAll({ exportiert: false });
        
        // 2. Stornierte Buchungen holen (bereits exportiert, aber Storno noch nicht exportiert)
        let stornierteBuchungen = [];
        if (typeof supabaseClient !== 'undefined' && supabaseClient && isOnline) {
            try {
                const { data, error } = await supabaseClient
                    .from('buchungen')
                    .select('*')
                    .eq('storniert', true)
                    .or('storno_exportiert.is.null,storno_exportiert.eq.false')
                    .eq('exportiert', true);
                
                if (error) {
                    console.warn('⚠️ storno_exportiert Feld existiert noch nicht. Führe Supabase-Migration aus!');
                    console.warn('SQL: ALTER TABLE buchungen ADD COLUMN IF NOT EXISTS storno_exportiert BOOLEAN DEFAULT FALSE;');
                } else if (data) {
                    stornierteBuchungen = data;
                }
            } catch (e) {
                console.error('❌ Fehler beim Laden der Stornos:', e);
            }
        }
        
        // Wenn keine Buchungen zum Exportieren
        if (!normaleBuchungen.length && !stornierteBuchungen.length) {
            Utils.showToast('Keine neuen Buchungen oder Stornos', 'warning');
            return;
        }
        
        console.log('📤 Export:', normaleBuchungen.length, 'normale Buchungen,', stornierteBuchungen.length, 'Stornos');
        
        // 3. Stornos als Negativ-Buchungen erstellen
        const stornoBuchungen = stornierteBuchungen.map(b => ({
            ...b,
            menge: -(b.menge || 1),           // Negative Menge
            preis: -(b.preis || 0),           // Negativer Preis  
            ist_storno: true,
            original_buchung_id: b.buchung_id,
            buchung_id: `STORNO_${b.buchung_id}`
        }));
        
        // 4. Beide Listen zusammenführen
        const alleBuchungen = [...normaleBuchungen, ...stornoBuchungen];
        
        console.log('📦 Exportiere insgesamt:', alleBuchungen.length, 'Buchungen');
        
        // 5. Export durchführen
        await this._exportToAccessFormat(alleBuchungen, 'Buchenungsdetail');
        
        // 6. Als exportiert markieren
        if (normaleBuchungen.length > 0) {
            await Buchungen.markAsExported(normaleBuchungen.map(b => b.buchung_id));
            console.log('✅', normaleBuchungen.length, 'normale Buchungen als exportiert markiert');
        }
        
        // 7. Stornos als exportiert markieren
        if (stornierteBuchungen.length > 0 && typeof supabaseClient !== 'undefined' && supabaseClient && isOnline) {
            try {
                for (const b of stornierteBuchungen) {
                    await supabaseClient
                        .from('buchungen')
                        .update({ storno_exportiert: true })
                        .eq('buchung_id', b.buchung_id);
                }
                console.log('✅', stornierteBuchungen.length, 'Stornos als exportiert markiert');
            } catch (e) {
                console.error('❌ Fehler beim Markieren der Stornos:', e);
            }
        }
        
        // 8. Success-Nachricht
        const msg = `✅ ${alleBuchungen.length} Buchungen exportiert (${normaleBuchungen.length} normal, ${stornierteBuchungen.length} Stornos)`;
        Utils.showToast(msg, 'success');
        console.log(msg);
    };
    
    console.log('✅ Storno-Export Extension geladen');
    console.log('ℹ️  Vergiss nicht die Supabase-Migration auszuführen!');
    console.log('ℹ️  SQL: ALTER TABLE buchungen ADD COLUMN IF NOT EXISTS storno_exportiert BOOLEAN DEFAULT FALSE;');
} else {
    console.error('❌ Admin.exportBuchungenExcel nicht gefunden. Ist app.js geladen?');
}

// Hilfsfunktion zum manuellen Testen
window.testStornoExport = async function() {
    console.log('🧪 TEST: Storno-Export');
    
    // Zeige alle stornierten Buchungen
    if (typeof supabaseClient !== 'undefined' && supabaseClient && isOnline) {
        const { data } = await supabaseClient
            .from('buchungen')
            .select('buchung_id, gast_vorname, artikel_name, preis, storniert, exportiert, storno_exportiert')
            .eq('storniert', true)
            .limit(5);
        
        console.table(data);
        console.log('👆 Stornierte Buchungen (max 5)');
        
        // Zeige welche exportiert werden würden
        const bereit = data.filter(b => 
            b.exportiert === true && 
            (b.storno_exportiert === false || b.storno_exportiert === null)
        );
        
        console.log('📤 Beim nächsten Export werden', bereit.length, 'Stornos exportiert:');
        console.table(bereit);
    }
};

console.log('💡 Tipp: Führe testStornoExport() in der Console aus um Stornos zu prüfen');
