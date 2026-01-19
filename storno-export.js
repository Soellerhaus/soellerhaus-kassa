// ===============================================
// STORNO-EXPORT ERWEITERUNG v4 - FINAL FIX
// ===============================================

console.log('🔧 Storno-Export Script v4 wird geladen...');

// Storno-Export Funktion
async function stornoExportFunction() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔄 STORNO-EXPORT AKTIVIERT!');
    console.log('📊 Starte erweiterten Export mit Storno-Support...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    try {
        // 1. Normale Buchungen
        console.log('1️⃣ Lade normale Buchungen...');
        const normaleBuchungen = await Buchungen.getAll({ exportiert: false });
        console.log(`   ✓ ${normaleBuchungen.length} normale Buchungen gefunden`);
        
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
                    console.error('   ❌ Fehler:', error.message);
                    console.warn('   ⚠️ Storno-Feld fehlt! Führe SQL aus:');
                    console.warn('   ALTER TABLE buchungen ADD COLUMN storno_exportiert BOOLEAN DEFAULT FALSE;');
                } else if (data) {
                    stornierteBuchungen = data;
                    console.log(`   ✓ ${stornierteBuchungen.length} Stornos gefunden`);
                }
            } catch (e) {
                console.error('   ❌ Exception:', e.message);
            }
        }
        
        // 3. Check
        if (!normaleBuchungen.length && !stornierteBuchungen.length) {
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('⚠️ Keine neuen Buchungen oder Stornos');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            Utils.showToast('Keine neuen Buchungen oder Stornos', 'warning');
            return;
        }
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📤 EXPORT-ZUSAMMENFASSUNG:');
        console.log(`   • Normale Buchungen: ${normaleBuchungen.length}`);
        console.log(`   • Stornos: ${stornierteBuchungen.length}`);
        console.log(`   • GESAMT: ${normaleBuchungen.length + stornierteBuchungen.length}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        // 4. Stornos als Negativ-Buchungen
        if (stornierteBuchungen.length > 0) {
            console.log('3️⃣ Erstelle Negativ-Buchungen für Stornos:');
        }
        
        const stornoBuchungen = stornierteBuchungen.map((b, index) => {
            console.log(`   → Storno ${index + 1}: ${b.artikel_name} (${b.gast_vorname}) - Menge: -${b.menge || 1}, Preis: -${b.preis || 0}€`);
            return {
                ...b,
                menge: -(b.menge || 1),
                preis: -(b.preis || 0),
                ist_storno: true,
                original_buchung_id: b.buchung_id,
                buchung_id: `STORNO_${b.buchung_id}`
            };
        });
        
        // 5. Zusammenführen
        const alleBuchungen = [...normaleBuchungen, ...stornoBuchungen];
        console.log('4️⃣ Exportiere alle Buchungen...');
        
        // 6. Export
        await ExportService._exportToAccessFormat(alleBuchungen, 'Buchenungsdetail');
        console.log('   ✓ Excel-Datei erstellt!');
        
        // 7. Normale markieren
        if (normaleBuchungen.length > 0) {
            console.log('5️⃣ Markiere normale Buchungen...');
            await Buchungen.markAsExported(normaleBuchungen.map(b => b.buchung_id));
            console.log(`   ✓ ${normaleBuchungen.length} markiert`);
        }
        
        // 8. Stornos markieren
        if (stornierteBuchungen.length > 0 && supabaseClient && isOnline) {
            console.log('6️⃣ Markiere Stornos...');
            try {
                for (const b of stornierteBuchungen) {
                    await supabaseClient
                        .from('buchungen')
                        .update({ storno_exportiert: true })
                        .eq('buchung_id', b.buchung_id);
                }
                console.log(`   ✓ ${stornierteBuchungen.length} Stornos markiert`);
            } catch (e) {
                console.error('   ❌ Fehler:', e.message);
            }
        }
        
        // 9. Success!
        const msg = `✅ ${alleBuchungen.length} Buchungen exportiert (${normaleBuchungen.length} normal, ${stornierteBuchungen.length} Stornos)`;
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🎉 ' + msg);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        Utils.showToast(msg, 'success');
        
    } catch (error) {
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('❌ FEHLER im Storno-Export:', error);
        console.error('Stack:', error.stack);
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        Utils.showToast('Export fehlgeschlagen: ' + error.message, 'error');
    }
}

// Extension installieren
function extendExportService() {
    if (typeof ExportService !== 'undefined' && 
        typeof window.handleExportExcel !== 'undefined') {
        
        console.log('🎯 ExportService und handleExportExcel gefunden!');
        
        // Sichere originale Funktionen
        ExportService._originalExportBuchungenExcel = ExportService.exportBuchungenExcel;
        window._originalHandleExportExcel = window.handleExportExcel;
        
        // Überschreibe BEIDE Funktionen
        ExportService.exportBuchungenExcel = stornoExportFunction;
        
        window.handleExportExcel = async () => {
            await stornoExportFunction();
            Router.navigate('admin-dashboard');
        };
        
        console.log('✅ ExportService.exportBuchungenExcel überschrieben');
        console.log('✅ window.handleExportExcel überschrieben');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ STORNO-EXPORT EXTENSION AKTIV!');
        console.log('💡 Beim nächsten Export werden Stornos automatisch mitexportiert');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        return true;
    }
    return false;
}

// Mehrere Versuche
let attempts = 0;
const maxAttempts = 15;

function tryExtend() {
    attempts++;
    console.log(`🔄 Versuch ${attempts}/${maxAttempts}...`);
    
    if (extendExportService()) {
        console.log('🎊 Extension erfolgreich installiert!');
    } else if (attempts < maxAttempts) {
        setTimeout(tryExtend, 500);
    } else {
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('❌ Extension konnte nicht installiert werden!');
        console.error('❌ ExportService oder handleExportExcel nicht gefunden');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
}

// Start
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(tryExtend, 100));
} else {
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
            }
            
        } catch (e) {
            console.error('❌ Exception:', e);
        }
    } else {
        console.error('❌ Offline oder Supabase nicht verfügbar');
    }
};

console.log('💡 Tipp: testStornoExport() ausführen');
