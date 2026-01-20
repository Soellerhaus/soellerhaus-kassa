/**
 * ================================
 * SAUNA BUCHUNG - KONFIGURATION
 * ================================
 * 
 * Alle anpassbaren Werte für die Sauna-Buchungsseite.
 * Änderungen hier erfordern KEINE Code-Anpassungen.
 */

const SAUNA_CONFIG = {
    // ===== PREISE & ZEITEN =====
    pricePerHour: 45,           // Euro pro Stunde Nutzung
    minimumHours: 2,            // Mindestdauer in Stunden
    heatingTimeHours: 3,        // Aufheizzeit in Stunden (Vorlauf)
    doorCheckHours: 2,          // Tür-Check X Stunden vor Aufheizen
    currency: '€',
    
    // ===== TEMPERATUR =====
    temperature: {
        min: 40,                // Minimum °C
        max: 90,                // Maximum °C (HUUM erlaubt 110, wir limitieren auf 90)
        default: 80,            // Standard-Temperatur
        step: 5                 // Schritte (40, 45, 50, ...)
    },
    
    // ===== RABATT-SYSTEM =====
    freeSessionAfterNights: 3,  // Ab X Übernachtungen → 1 Session gratis
    freeSessionHours: 3,        // Gratis-Session = X Stunden (darüber hinaus wird berechnet)
    
    // ===== BETRIEBSZEITEN =====
    openingHour: 8,             // Früheste Startzeit (8:00)
    closingHour: 22,            // Späteste Endzeit (22:00)
    maxHoursPerBooking: 6,      // Maximale Buchungsdauer
    
    // ===== INKLUSIVLEISTUNGEN =====
    includedTowels: 6,          // Anzahl bereitgestellter Handtücher
    
    // ===== E-MAIL KONFIGURATION =====
    email: {
        recipient: 'rezeption@soellerhaus.at',
        subject: 'Neue Sauna-Anfrage',
        // API Endpoint (dein Windows Server)
        apiEndpoint: 'http://185.237.252.90:3000/api/sauna/request',
        // Fallback auf mailto: wenn API nicht erreichbar
        useFallbackMailto: true
    },
    
    // ===== TEXTE & LABELS =====
    texts: {
        pageTitle: 'Sauna-Anfrage',
        pageSubtitle: 'Buchen Sie Ihre private Sauna-Zeit',
        
        // Formular-Labels
        labelGuestAccount: 'Gäste-Account ID',
        labelGuestName: 'Ihr Name',
        labelEmail: 'E-Mail-Adresse',
        labelDate: 'Gewünschtes Datum',
        labelStartTime: 'Gewünschte Startzeit',
        labelDuration: 'Dauer (Stunden)',
        labelNotes: 'Besondere Wünsche (optional)',
        
        // Platzhalter
        placeholderGuestAccount: 'z.B. GA-12345',
        placeholderGuestName: 'Vor- und Nachname',
        placeholderEmail: 'ihre@email.at',
        placeholderNotes: 'z.B. Allergien, besondere Anforderungen...',
        
        // Buttons
        buttonSubmit: 'Anfrage absenden',
        buttonBack: 'Zurück zur Kasse',
        buttonNewRequest: 'Neue Anfrage',
        
        // Hinweise
        heatingNote: 'Die Sauna benötigt ca. {hours} Stunden Aufheizzeit. Bitte planen Sie entsprechend.',
        towelNote: '{count} Handtücher sind inklusive und liegen für Sie bereit.',
        priceNote: 'Preis: {price} {currency}/Stunde · Mindestens {min} Stunden',
        
        // Bestätigungen
        confirmationTitle: 'Anfrage eingegangen!',
        confirmationText: 'Vielen Dank für Ihre Sauna-Anfrage. Wir prüfen die Verfügbarkeit und melden uns in Kürze per E-Mail bei Ihnen.',
        
        // Fehlermeldungen
        errorMinHours: 'Mindestbuchung: {min} Stunden',
        errorHeatingTime: 'Anfrage muss mindestens {hours} Stunden vor Startzeit erfolgen (Aufheizzeit)',
        errorPastDate: 'Bitte wählen Sie ein Datum in der Zukunft',
        errorOpeningHours: 'Die Sauna ist von {open}:00 bis {close}:00 Uhr verfügbar',
        errorRulesNotAccepted: 'Bitte bestätigen Sie die Sauna-Regeln',
        errorMissingFields: 'Bitte füllen Sie alle Pflichtfelder aus',
        errorEmailSend: 'Fehler beim Senden. Bitte versuchen Sie es erneut oder kontaktieren Sie uns direkt.',
        
        // Zusammenfassung
        summaryTitle: 'Ihre Buchungsanfrage',
        summaryDate: 'Datum',
        summaryTime: 'Startzeit',
        summaryDuration: 'Dauer',
        summaryPrice: 'Gesamtpreis',
        summaryHeating: 'Aufheizen ab'
    },
    
    // ===== SAUNA-REGELN =====
    rules: [
        'Nicht mit leerem Magen oder direkt nach dem Essen in die Sauna gehen.',
        'Die Sauna darf nicht in alkoholisiertem Zustand betreten werden.',
        'Bei Problemen mit Bluthochdruck bitten wir Sie, die Sauna nicht zu nützen.',
        'Bitte betreten Sie die Sauna ohne Schuhe.',
        'Vor dem Betreten der Sauna immer duschen – nicht nur aufgrund der Hygiene, sondern auch um den störenden Fettfilm der Haut zu entfernen.',
        'Vor der Sauna gut abtrocknen (die trockene Haut schwitzt besser).',
        'Legen Sie immer ein Handtuch auf die Sitzbank. Für Sauna-Anfänger ist es ratsam, die unteren Bänke zu bevorzugen.',
        'Um Schwindel zu vermeiden, erheben Sie sich die letzten 2 Minuten aus der Liegeposition und setzen sich senkrecht.',
        'Verlassen Sie die Sauna frühzeitig, wenn Sie sich nicht wohl fühlen.',
        'Ein Saunabad dauert zwischen 8 und 12 Minuten, jedoch nicht über 15 Minuten.',
        'Nach dem Saunabad etwa 2 Minuten an die frische Luft gehen, um Ihre Atemwege zu kühlen.',
        'Maximale Personenzahl: 6 Personen gleichzeitig.',
        'Kein Wasser auf den Holzboden – dies beschädigt das Holz!',
        'Schäden, die durch fahrlässiges Verhalten entstehen, werden in Rechnung gestellt.'
    ],
    
    // Haftungshinweis
    liabilityNote: 'Im Falle eines Unfalls wird keine Haftung übernommen.',
    
    // ===== CHECKBOXEN =====
    checkboxRulesLabel: 'Ich habe die Sauna-Regeln gelesen und akzeptiere diese.',
    checkboxDataLabel: 'Ich bin damit einverstanden, dass meine Daten zur Bearbeitung der Anfrage gespeichert werden.',
    
    // ===== STYLING =====
    style: {
        // Verwendet CSS-Variablen aus styles.css
        primaryColor: 'var(--color-mountain-blue)',
        accentColor: 'var(--color-alpine-green)',
        saunaIcon: '🧖‍♀️',
        headerImage: null // Optional: URL zu Headerbild
    }
};

// Export für Module (falls verwendet)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SAUNA_CONFIG;
}
