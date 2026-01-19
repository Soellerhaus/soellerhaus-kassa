// ===============================================
// STORNO-EXPORT ERWEITERUNG v3 - FIXED
// ===============================================

console.log('🔧 Storno-Export Script wird geladen...');

// Funktion um Export-Service zu erweitern
function extendExportService() {
    if (typeof ExportService !== 'undefined' && ExportService.exportBuchungenExcel) {
        console.log('🎯 ExportService gefunden, erweitere Export-Funktion...');
        
        // Originale Funktion sichern
        ExportService._originalExportBuchungenExcel = ExportService.exportBuchungenExcel;
        
        // Neue Export-Funktion mit Storno-Support
        ExportService.exportBuchungenExcel = async function() {
            console.log('🔄 STORNO-EXPORT AKTIVIERT!');
            console.log('📊 Starte erweiterten Export mit Storno-Support...');
            
            try {
                // 1. Normale Buchungen
                console.log('1️⃣ Lade normale Buchungen...');
                const normaleBuchungen = await Buchungen.getAll({ exportiert: false });
                console.log(`   → ${normaleBuchungen.length} normale Buchungen gefunden`);
                
                // 2. Stornierte Buchungen
                console.log('2️⃣ Lade stornierte Buchungen...');
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
                            console.error('❌ Fehler beim Laden der Stornos:', error);
                            console.warn('⚠️ Storno-Export-Feld existiert nicht in Supabase!');
                            console.warn('⚠️ Führe aus: ALTER TABLE buchungen ADD COLUMN IF NOT EXISTS storno_exportiert BOOLEAN DEFAULT FALSE;');
                        } else if (data) {
                            stornierteBuchungen = data;
                            console.log(`   → ${stornierteBuchungen.length} Stornos gefunden`);
                        }
                    } catch (e) {
                        console.error('❌ Exception beim Laden der Stornos:', e);
                    }
                } else {
                    console.warn('⚠️ Supabase nicht verfügbar oder offline');
                }
                
                // 3. Check ob es was zu exportieren gibt
                if (!normaleBuchungen.length && !stornierteBuchungen.length) {
                    console.log('⚠️ Keine neuen Buchungen oder Stornos zum Exportieren');
                    Utils.showToast('Keine neuen Buchungen oder Stornos', 'warning');
                    return;
                }
                
                console.log('📤 EXPORT-ZUSAMMENFASSUNG:');
                console.log(`   • Normale Buchungen: ${normaleBuchungen.length}`);
                console.log(`   • Stornos: ${stornierteBuchungen.length}`);
                console.log(`   • GESAMT: ${normaleBuchungen.length + stornierteBuchungen.length}`);
                
                // 4. Stornos als Negativ-Buchungen erstellen
                console.log('3️⃣ Erstelle Negativ-Buchungen für Stornos...');
                const stornoBuchungen = stornierteBuchungen.map((b, index) => {
                    console.log(`   → Storno ${index + 1}: ${b.artikel_name} (${b.gast_vorname}) - Menge: -${b.menge || 1}`);
                    return {
                        ...b,
                        menge: -(b.menge || 1),
                        preis: -(b.preis || 0),
                        ist_storno: true,
                        original_buchung_id: b.buchung_id,
                        buchung_id: `STORNO_${b.buchung_id}`
                    };
                });
                
                // 5. Alle Buchungen zusammenführen
                const alleBuchungen = [...normaleBuchungen, ...stornoBuchungen];
                console.log('4️⃣ Exportiere alle Buchungen...');
                
                // 6. Export durchführen
                await this._exportToAccessFormat(alleBuchungen, 'Buchenungsdetail');
                console.log('✅ Excel-Datei erstellt!');
                
                // 7. Normale Buchungen markieren
                if (normaleBuchungen.length > 0) {
                    console.log('5️⃣ Markiere normale Buchungen als exportiert...');
                    await Buchungen.markAsExported(normaleBuchungen.map(b => b.buchung_id));
                    console.log(`   ✅ ${normaleBuchungen.length} normale Buchungen markiert`);
                }
                
                // 8. Stornos markieren
                if (stornierteBuchungen.length > 0 && supabaseClient && isOnline) {
                    console.log('6️⃣ Markiere Stornos als exportiert...');
                    try {
                        for (const b of stornierteBuchungen) {
                            await supabaseClient
                                .from('buchungen')
                                .update({ storno_exportiert: true })
                                .eq('buchung_id', b.buchung_id);
                        }
                        console.log(`   ✅ ${stornierteBuchungen.length} Stornos markiert`);
                    } catch (e) {
                        console.error('❌ Fehler beim Markieren der Stornos:', e);
                    }
                }
                
                // 9. Success!
                const msg = `✅ ${alleBuchungen.length} Buchungen exportiert (${normaleBuchungen.length} normal, ${stornierteBuchungen.length} Stornos)`;
                Utils.showToast(msg, 'success');
                console.log('🎉 ' + msg);
                
            } catch (error) {
                console.error('❌ FEHLER im Storno-Export:', error);
                console.error('Stack:', error.stack);
                Utils.showToast('Export fehlgeschlagen: ' + error.message, 'error');
            }
        };
        
        console.log('✅ Export-Funktion erfolgreich erweitert!');
        console.log('💡 Beim nächsten Export werden Stornos automatisch mitexportiert');
        return true;
    }
    return false;
}

// Mehrere Versuche die Extension zu laden
let attempts = 0;
const maxAttempts = 10;

function tryExtend() {
    attempts++;
    console.log(`🔄 Versuch ${attempts}/${maxAttempts} Export-Service zu erweitern...`);
    
    if (extendExportService()) {
        console.log('✅ STORNO-EXPORT EXTENSION ERFOLGREICH GELADEN!');
        console.log('ℹ️  Vergiss nicht die Supabase-Migration:');
        console.log('ℹ️  ALTER TABLE buchungen ADD COLUMN IF NOT EXISTS storno_exportiert BOOLEAN DEFAULT FALSE;');
    } else if (attempts < maxAttempts) {
        console.log(`⏳ ExportService noch nicht verfügbar, warte 500ms...`);
        setTimeout(tryExtend, 500);
    } else {
        console.error('❌ ExportService konnte nicht erweitert werden!');
        console.error('❌ Storno-Export wird NICHT funktionieren!');
        console.log('🔍 Verfügbare Objekte:', Object.keys(window).filter(k => 
            k.includes('Export') || k.includes('export')
        ).join(', '));
    }
}

// Starte Erweiterungsversuche
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryExtend);
} else {
    // Warte kurz, dann starte
    setTimeout(tryExtend, 100);
}

// Test-Funktion
window.testStornoExport = async function() {
    console.log('🧪 TEST: Storno-Export');
    console.log('═══════════════════════════════════════');
    
    if (typeof supabaseClient !== 'undefined' && supabaseClient && isOnline) {
        try {
            const { data, error } = await supabaseClient
                .from('buchungen')
                .select('buchung_id, gast_vorname, artikel_name, preis, menge, storniert, exportiert, storno_exportiert')
                .eq('storniert', true)
                .limit(10);
            
            if (error) {
                console.error('❌ Fehler:', error);
                return;
            }
            
            console.log('📊 Stornierte Buchungen (max 10):');
            console.table(data);
            
            const bereit = data.filter(b => 
                b.exportiert === true && 
                (b.storno_exportiert === false || b.storno_exportiert === null)
            );
            
            console.log('═══════════════════════════════════════');
            console.log(`📤 Beim nächsten Export: ${bereit.length} Storno(s)`);
            
            if (bereit.length > 0) {
                console.log('📋 Diese Stornos werden exportiert:');
                console.table(bereit);
            } else {
                console.log('ℹ️  Keine Stornos zum Exportieren');
            }
            
        } catch (e) {
            console.error('❌ Exception:', e);
        }
    } else {
        console.error('❌ Nicht online oder Supabase nicht verfügbar');
    }
};

console.log('💡 Tipp: testStornoExport() ausführen um Stornos zu prüfen');
