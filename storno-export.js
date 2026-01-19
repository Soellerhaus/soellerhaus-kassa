// ===============================================
// STORNO-EXPORT ERWEITERUNG v2
// ===============================================
// Diese Datei erweitert die Export-Funktion um Storno-Support
// ===============================================

// Warte bis DOM geladen ist
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStornoExport);
} else {
    initStornoExport();
}

function initStornoExport() {
    // Warte kurz bis alle Scripts geladen sind
    setTimeout(() => {
        if (typeof ExportService !== 'undefined' && ExportService.exportBuchungenExcel) {
            // Originale Funktion sichern
            ExportService._originalExportBuchungenExcel = ExportService.exportBuchungenExcel;
            
            // Neue Funktion mit Storno-Support
            ExportService.exportBuchungenExcel = async function() {
                console.log('🔄 Storno-Export Extension aktiviert');
                
                try {
                    // 1. Normale Buchungen holen
                    const normaleBuchungen = await Buchungen.getAll({ exportiert: false });
                    
                    // 2. Stornierte Buchungen holen
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
                                console.warn('⚠️ storno_exportiert Feld existiert noch nicht.');
                                console.warn('SQL: ALTER TABLE buchungen ADD COLUMN IF NOT EXISTS storno_exportiert BOOLEAN DEFAULT FALSE;');
                            } else if (data) {
                                stornierteBuchungen = data;
                            }
                        } catch (e) {
                            console.error('❌ Fehler beim Laden der Stornos:', e);
                        }
                    }
                    
                    // Wenn keine Buchungen
                    if (!normaleBuchungen.length && !stornierteBuchungen.length) {
                        Utils.showToast('Keine neuen Buchungen oder Stornos', 'warning');
                        return;
                    }
                    
                    console.log('📤 Export:', normaleBuchungen.length, 'normale Buchungen,', stornierteBuchungen.length, 'Stornos');
                    
                    // 3. Stornos als Negativ-Buchungen
                    const stornoBuchungen = stornierteBuchungen.map(b => ({
                        ...b,
                        menge: -(b.menge || 1),
                        preis: -(b.preis || 0),
                        ist_storno: true,
                        original_buchung_id: b.buchung_id,
                        buchung_id: `STORNO_${b.buchung_id}`
                    }));
                    
                    const alleBuchungen = [...normaleBuchungen, ...stornoBuchungen];
                    
                    console.log('📦 Exportiere insgesamt:', alleBuchungen.length, 'Buchungen');
                    
                    // 4. Export
                    await this._exportToAccessFormat(alleBuchungen, 'Buchenungsdetail');
                    
                    // 5. Normale Buchungen markieren
                    if (normaleBuchungen.length > 0) {
                        await Buchungen.markAsExported(normaleBuchungen.map(b => b.buchung_id));
                        console.log('✅', normaleBuchungen.length, 'normale Buchungen markiert');
                    }
                    
                    // 6. Stornos markieren
                    if (stornierteBuchungen.length > 0 && supabaseClient && isOnline) {
                        try {
                            for (const b of stornierteBuchungen) {
                                await supabaseClient
                                    .from('buchungen')
                                    .update({ storno_exportiert: true })
                                    .eq('buchung_id', b.buchung_id);
                            }
                            console.log('✅', stornierteBuchungen.length, 'Stornos markiert');
                        } catch (e) {
                            console.error('❌ Fehler beim Markieren:', e);
                        }
                    }
                    
                    // 7. Success
                    const msg = `✅ ${alleBuchungen.length} Buchungen exportiert (${normaleBuchungen.length} normal, ${stornierteBuchungen.length} Stornos)`;
                    Utils.showToast(msg, 'success');
                    console.log(msg);
                    
                } catch (error) {
                    console.error('❌ Fehler im Storno-Export:', error);
                    Utils.showToast('Export fehlgeschlagen: ' + error.message, 'error');
                }
            };
            
            console.log('✅ Storno-Export Extension geladen');
            console.log('ℹ️  Vergiss nicht die Supabase-Migration!');
            console.log('ℹ️  SQL: ALTER TABLE buchungen ADD COLUMN IF NOT EXISTS storno_exportiert BOOLEAN DEFAULT FALSE;');
            
        } else {
            console.error('❌ ExportService.exportBuchungenExcel nicht gefunden');
            console.log('ℹ️  Verfügbare Objekte:', Object.keys(window).filter(k => k.includes('Export') || k.includes('Admin')));
        }
    }, 1000); // 1 Sekunde warten
}

// Test-Funktion
window.testStornoExport = async function() {
    console.log('🧪 TEST: Storno-Export');
    
    if (typeof supabaseClient !== 'undefined' && supabaseClient && isOnline) {
        const { data } = await supabaseClient
            .from('buchungen')
            .select('buchung_id, gast_vorname, artikel_name, preis, storniert, exportiert, storno_exportiert')
            .eq('storniert', true)
            .limit(10);
        
        console.table(data);
        console.log('👆 Stornierte Buchungen');
        
        const bereit = data.filter(b => 
            b.exportiert === true && 
            (b.storno_exportiert === false || b.storno_exportiert === null)
        );
        
        console.log('📤 Beim nächsten Export:', bereit.length, 'Stornos');
        console.table(bereit);
    } else {
        console.error('❌ Nicht online oder Supabase nicht verfügbar');
    }
};

console.log('💡 Tipp: testStornoExport() in Console ausführen');
