/**
 * ================================
 * SAUNA BUCHUNG - CORE LOGIC
 * ================================
 * 
 * Hauptlogik für:
 * - Formular-Rendering
 * - Validierung
 * - Preisberechnung
 * - API-Kommunikation
 * - Fallback auf mailto:
 */

class SaunaBooking {
    constructor(config) {
        this.config = config;
        this.form = null;
        this.container = null;
        this.state = {
            currentView: 'form', // 'form' | 'summary' | 'confirmation' | 'error'
            formData: null,
            errors: [],
            saunaStatus: null
        };
        this.statusPollInterval = null;
    }

    /**
     * Initialisiert das Buchungssystem
     * @param {string} containerId - ID des Container-Elements
     */
    init(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('Sauna-Container nicht gefunden:', containerId);
            return;
        }

        // URL-Parameter auslesen
        this.prefillToken = this.getUrlParam('token') || this.getUrlParam('guest_id');
        
        // Selbstversorger-Modus (Sauna inklusive)
        this.selfServiceMode = this.getUrlParam('selfservice') === 'true';
        this.saunaIncluded = this.getUrlParam('included') === 'true';
        this.freeSessionsRemaining = parseInt(this.getUrlParam('free')) || 0;
        this.guestNights = parseInt(this.getUrlParam('nights')) || 0;
        this.guestEmail = this.getUrlParam('email') || '';
        
        // Bei 3+ Übernachtungen: 1 Gratis-Session (wenn nicht schon verbraucht)
        if (this.guestNights >= this.config.freeSessionAfterNights && this.freeSessionsRemaining > 0) {
            this.hasFreeSessions = true;
        } else {
            this.hasFreeSessions = false;
        }
        
        this.render();
        this.attachEventListeners();
        this.initDateTimeDefaults();
        
        // Live-Status der Sauna laden (falls API verfügbar)
        this.fetchSaunaStatus();
        this.startStatusPolling();
    }

    /**
     * Sauna-Status vom Server abrufen
     */
    async fetchSaunaStatus() {
        try {
            // Server-URL aus Config holen
            const apiBase = this.config.email.apiEndpoint.replace('/api/sauna/request', '');
            const response = await fetch(apiBase + '/api/sauna/status');
            if (response.ok) {
                const status = await response.json();
                this.state.saunaStatus = status;
                this.updateStatusDisplay();
            }
        } catch (error) {
            // API nicht verfügbar - kein Problem, läuft auch ohne
            console.log('Sauna-Status API nicht erreichbar:', error.message);
            this.updateStatusDisplayOffline();
        }
    }

    /**
     * Status-Anzeige wenn offline
     */
    updateStatusDisplayOffline() {
        const statusEl = document.getElementById('sauna-live-status');
        if (statusEl) {
            statusEl.className = 'sauna-live-status status-offline';
            statusEl.innerHTML = `
                <span class="status-icon">⚫</span>
                <span class="status-text">Status nicht verfügbar</span>
            `;
        }
    }

    /**
     * Status alle 30 Sekunden aktualisieren
     */
    startStatusPolling() {
        this.statusPollInterval = setInterval(() => {
            if (this.state.currentView === 'form') {
                this.fetchSaunaStatus();
            }
        }, 30000);
    }

    /**
     * Status-Anzeige aktualisieren
     */
    updateStatusDisplay() {
        const statusEl = document.getElementById('sauna-live-status');
        if (!statusEl || !this.state.saunaStatus) return;
        
        const s = this.state.saunaStatus;
        let statusClass = 'status-unknown';
        let statusIcon = '❓';
        let statusText = 'Status unbekannt';
        
        if (s.isHeating) {
            statusClass = 'status-heating';
            statusIcon = '🔥';
            statusText = `Heizt auf (${s.temperature}°C → ${s.targetTemperature}°C)`;
        } else if (s.available) {
            statusClass = 'status-available';
            statusIcon = '✅';
            statusText = `Verfügbar (${s.temperature}°C)`;
        } else if (s.statusCode === 233) {
            statusClass = 'status-busy';
            statusIcon = '🔒';
            statusText = 'Belegt';
        } else if (!s.isDoorClosed) {
            statusClass = 'status-warning';
            statusIcon = '🚪';
            statusText = 'Tür offen';
        } else {
            statusClass = 'status-offline';
            statusIcon = '⚫';
            statusText = s.status || 'Offline';
        }
        
        statusEl.className = `sauna-live-status ${statusClass}`;
        statusEl.innerHTML = `
            <span class="status-icon">${statusIcon}</span>
            <span class="status-text">${statusText}</span>
        `;
    }

    /**
     * URL-Parameter auslesen
     */
    getUrlParam(name) {
        const params = new URLSearchParams(window.location.search);
        return params.get(name);
    }

    /**
     * Hauptrender-Methode
     */
    render() {
        switch (this.state.currentView) {
            case 'form':
                this.renderForm();
                break;
            case 'summary':
                this.renderSummary();
                break;
            case 'confirmation':
                this.renderConfirmation();
                break;
            case 'error':
                this.renderError();
                break;
        }
    }

    /**
     * Formular rendern
     */
    renderForm() {
        const c = this.config;
        const t = c.texts;
        
        // Selbstversorger-Banner
        const selfServiceBanner = this.selfServiceMode ? `
            <div class="selfservice-banner">
                <span class="banner-icon">🏠</span>
                <div class="banner-content">
                    <strong>Selbstversorger-Modus</strong>
                    ${this.saunaIncluded ? '<p>Sauna ist in Ihrer Buchung inklusive!</p>' : ''}
                    ${this.hasFreeSessions ? `<p class="free-session">🎁 Sie haben noch ${this.freeSessionsRemaining} Gratis-Session(s)!</p>` : ''}
                </div>
            </div>
        ` : '';
        
        // Temperatur-Optionen generieren
        const tempOptions = [];
        for (let t = c.temperature.min; t <= c.temperature.max; t += c.temperature.step) {
            tempOptions.push(`<option value="${t}" ${t === c.temperature.default ? 'selected' : ''}>${t}°C</option>`);
        }
        
        this.container.innerHTML = `
            <div class="sauna-booking ${this.selfServiceMode ? 'selfservice-mode' : ''}">
                <header class="sauna-header">
                    <span class="sauna-icon">${c.style.saunaIcon}</span>
                    <h1>${t.pageTitle}</h1>
                    <p class="sauna-subtitle">${t.pageSubtitle}</p>
                    
                    <!-- Live-Status der Sauna -->
                    <div id="sauna-live-status" class="sauna-live-status status-loading">
                        <span class="status-icon">⏳</span>
                        <span class="status-text">Status wird geladen...</span>
                    </div>
                </header>

                ${selfServiceBanner}

                <div class="sauna-info-cards">
                    <div class="info-card price">
                        <span class="info-icon">💰</span>
                        <span class="info-text">${this.formatText(t.priceNote, {
                            price: c.pricePerHour,
                            currency: c.currency,
                            min: c.minimumHours
                        })}${this.hasFreeSessions ? ` · <strong>🎁 ${c.freeSessionHours}h GRATIS</strong>` : ''}</span>
                    </div>
                    <div class="info-card heating">
                        <span class="info-icon">🔥</span>
                        <span class="info-text">${this.formatText(t.heatingNote, { hours: c.heatingTimeHours })}</span>
                    </div>
                    <div class="info-card towels">
                        <span class="info-icon">🧴</span>
                        <span class="info-text">${this.formatText(t.towelNote, { count: c.includedTowels })}</span>
                    </div>
                </div>

                <form id="sauna-form" class="sauna-form" novalidate>
                    <!-- Gast-Identifikation -->
                    <fieldset class="form-section">
                        <legend>Gast-Identifikation</legend>
                        
                        <div class="form-group">
                            <label for="guest_account">${t.labelGuestAccount}</label>
                            <input type="text" id="guest_account" name="guest_account" 
                                   placeholder="${t.placeholderGuestAccount}"
                                   value="${this.prefillToken || ''}"
                                   ${this.selfServiceMode ? 'readonly' : ''}>
                            ${!this.selfServiceMode ? '<small>Oder verwenden Sie Buchungsnummer + E-Mail:</small>' : ''}
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="booking_number">${t.labelBookingNumber}</label>
                                <input type="text" id="booking_number" name="booking_number" 
                                       placeholder="${t.placeholderBookingNumber}"
                                       ${this.selfServiceMode ? 'readonly' : ''}>
                            </div>
                            <div class="form-group">
                                <label for="email">${t.labelEmail} *</label>
                                <input type="email" id="email" name="email" 
                                       placeholder="${t.placeholderEmail}" 
                                       value="${this.guestEmail}"
                                       ${this.selfServiceMode && this.guestEmail ? 'readonly' : ''}
                                       required>
                            </div>
                        </div>
                    </fieldset>

                    <!-- Buchungsdetails -->
                    <fieldset class="form-section">
                        <legend>Buchungsdetails</legend>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="date">${t.labelDate} *</label>
                                <input type="date" id="date" name="date" required>
                            </div>
                            <div class="form-group">
                                <label for="start_time">${t.labelStartTime} *</label>
                                <input type="time" id="start_time" name="start_time" 
                                       min="${String(c.openingHour).padStart(2, '0')}:00"
                                       max="${String(c.closingHour - c.minimumHours).padStart(2, '0')}:00"
                                       step="1800" required>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="duration">${t.labelDuration} *</label>
                                <div class="duration-selector">
                                    <button type="button" class="duration-btn" data-action="decrease">−</button>
                                    <input type="number" id="duration" name="duration" 
                                           min="${c.minimumHours}" max="${c.maxHoursPerBooking}" 
                                           value="${c.minimumHours}" required>
                                    <button type="button" class="duration-btn" data-action="increase">+</button>
                                    <span class="duration-unit">Stunden</span>
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="temperature">Temperatur *</label>
                                <div class="temperature-selector">
                                    <select id="temperature" name="temperature" class="temp-select">
                                        ${tempOptions.join('')}
                                    </select>
                                    <span class="temp-icon">🌡️</span>
                                </div>
                            </div>
                        </div>

                        <!-- Live-Preisanzeige -->
                        <div class="price-display" id="price-display">
                            ${this.hasFreeSessions ? `
                            <div class="free-info">
                                <span>🎁 Gratis: ${c.freeSessionHours} Stunden</span>
                            </div>
                            ` : ''}
                            <div class="price-breakdown">
                                <span class="price-label">Gesamtpreis:</span>
                                <span class="price-value" id="total-price">${c.minimumHours * c.pricePerHour} ${c.currency}</span>
                            </div>
                            ${this.hasFreeSessions ? `
                            <div class="price-breakdown free">
                                <span class="price-label">🎁 Ihr Preis:</span>
                                <span class="price-value free-price" id="final-price">0 ${c.currency}</span>
                            </div>
                            ` : ''}
                            <div class="heating-time" id="heating-display">
                                <span class="heating-label">Sauna wird aufgeheizt ab:</span>
                                <span class="heating-value" id="heating-time">--:--</span>
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="notes">${t.labelNotes}</label>
                            <textarea id="notes" name="notes" rows="3" 
                                      placeholder="${t.placeholderNotes}"></textarea>
                        </div>
                    </fieldset>

                    <!-- Sauna-Regeln -->
                    <fieldset class="form-section rules-section">
                        <legend>Sauna-Regeln</legend>
                        <ul class="rules-list">
                            ${c.rules.map(rule => `<li>${rule}</li>`).join('')}
                        </ul>
                        
                        <div class="form-group checkbox-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="accept_rules" name="accept_rules" required>
                                <span class="checkmark"></span>
                                ${c.checkboxRulesLabel}
                            </label>
                        </div>
                        
                        <div class="form-group checkbox-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="accept_data" name="accept_data" required>
                                <span class="checkmark"></span>
                                ${c.checkboxDataLabel}
                            </label>
                        </div>
                    </fieldset>

                    <!-- Fehlermeldungen -->
                    <div class="error-container" id="error-container" style="display: none;">
                        <ul id="error-list"></ul>
                    </div>

                    <!-- Buttons -->
                    <div class="form-actions">
                        <a href="index.html" class="btn btn-secondary">${t.buttonBack}</a>
                        <button type="submit" class="btn btn-primary">
                            ${this.selfServiceMode ? '🚀 Sauna jetzt starten' : t.buttonSubmit}
                        </button>
                    </div>
                </form>
            </div>
        `;
    }

    /**
     * Zusammenfassung vor Absenden anzeigen
     */
    renderSummary() {
        const c = this.config;
        const t = c.texts;
        const d = this.state.formData;
        
        const heatingTime = this.calculateHeatingTime(d.start_time);
        const totalPrice = d.duration * c.pricePerHour;
        
        // Gratis-Stunden berechnen
        const freeHours = c.freeSessionHours || 3;
        const chargeableHours = d.isFreeSession ? Math.max(0, d.duration - freeHours) : d.duration;
        const finalPrice = d.isFreeSession ? (chargeableHours * c.pricePerHour) : totalPrice;
        
        // Preis-Anzeige Text
        let priceDisplay = '';
        if (d.isFreeSession) {
            if (chargeableHours > 0) {
                priceDisplay = `
                    <div>🎁 ${freeHours}h gratis, ${chargeableHours}h × ${c.pricePerHour}${c.currency}</div>
                    <div class="summary-value price">${finalPrice} ${c.currency}</div>
                `;
            } else {
                priceDisplay = `
                    <div>🎁 Gratis-Session (${freeHours}h inklusive)</div>
                    <div class="summary-value price free-price">0 ${c.currency}</div>
                `;
            }
        } else {
            priceDisplay = `<span class="summary-value price">${totalPrice} ${c.currency}</span>`;
        }
        
        this.container.innerHTML = `
            <div class="sauna-booking ${this.selfServiceMode ? 'selfservice-mode' : ''}">
                <header class="sauna-header">
                    <span class="sauna-icon">📋</span>
                    <h1>${t.summaryTitle}</h1>
                    ${this.selfServiceMode ? '<p class="selfservice-badge">🏠 Selbstversorger</p>' : ''}
                </header>

                <div class="summary-card">
                    <div class="summary-row">
                        <span class="summary-label">${t.summaryDate}:</span>
                        <span class="summary-value">${this.formatDate(d.date)}</span>
                    </div>
                    <div class="summary-row">
                        <span class="summary-label">${t.summaryTime}:</span>
                        <span class="summary-value">${d.start_time} Uhr</span>
                    </div>
                    <div class="summary-row">
                        <span class="summary-label">${t.summaryDuration}:</span>
                        <span class="summary-value">${d.duration} Stunden</span>
                    </div>
                    <div class="summary-row">
                        <span class="summary-label">🌡️ Temperatur:</span>
                        <span class="summary-value">${d.temperature}°C</span>
                    </div>
                    <div class="summary-row">
                        <span class="summary-label">${t.summaryHeating}:</span>
                        <span class="summary-value">${heatingTime} Uhr</span>
                    </div>
                    <div class="summary-row highlight">
                        <span class="summary-label">${t.summaryPrice}:</span>
                        ${priceDisplay}
                    </div>
                    
                    <div class="summary-contact">
                        <p><strong>Kontakt:</strong> ${d.email}</p>
                        ${d.guest_account ? `<p><strong>Gäste-Account:</strong> ${d.guest_account}</p>` : ''}
                        ${d.booking_number ? `<p><strong>Buchungsnummer:</strong> ${d.booking_number}</p>` : ''}
                        ${d.notes ? `<p><strong>Notizen:</strong> ${d.notes}</p>` : ''}
                    </div>
                </div>

                ${this.selfServiceMode ? `
                <div class="selfservice-notice">
                    <p>⚡ <strong>Sofort-Buchung:</strong> Die Sauna wird automatisch aufgeheizt. Sie erhalten eine Benachrichtigung wenn sie bereit ist.</p>
                    <p>🚪 <strong>Wichtig:</strong> Bitte stellen Sie sicher, dass die Sauna-Tür geschlossen ist!</p>
                </div>
                ` : ''}

                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" id="btn-back-to-form">Zurück bearbeiten</button>
                    <button type="button" class="btn btn-primary" id="btn-confirm-submit">
                        ${this.selfServiceMode ? '🚀 Jetzt starten' : 'Verbindlich anfragen'}
                    </button>
                </div>
            </div>
        `;

        // Event-Listener für Buttons
        document.getElementById('btn-back-to-form').addEventListener('click', () => {
            this.state.currentView = 'form';
            this.render();
            this.restoreFormData();
        });

        document.getElementById('btn-confirm-submit').addEventListener('click', () => {
            this.submitRequest();
        });
    }

    /**
     * Bestätigungsseite rendern
     */
    renderConfirmation() {
        const c = this.config;
        const t = c.texts;
        const d = this.state.formData;
        const bookingId = d.bookingId || null;
        
        this.container.innerHTML = `
            <div class="sauna-booking">
                <header class="sauna-header success">
                    <span class="sauna-icon">✅</span>
                    <h1>${t.confirmationTitle}</h1>
                    ${bookingId ? `<p class="booking-id">Buchungs-Nr: <strong>${bookingId}</strong></p>` : ''}
                </header>

                <div class="confirmation-card">
                    <p>${t.confirmationText}</p>
                    <div class="confirmation-details">
                        <p><strong>Ihre Anfrage:</strong></p>
                        <p>📅 ${this.formatDate(d.date)}</p>
                        <p>🕐 ${d.start_time} Uhr</p>
                        <p>⏱️ ${d.duration} Stunden</p>
                        <p>💰 ${d.duration * c.pricePerHour} ${c.currency}</p>
                    </div>
                    <p class="confirmation-note">
                        Sie erhalten eine Bestätigung an: <strong>${d.email}</strong>
                    </p>
                    <p class="confirmation-note">
                        <em>Die Sauna wird bei Bestätigung automatisch rechtzeitig für Sie aufgeheizt.</em>
                    </p>
                </div>

                <div class="form-actions">
                    <a href="index.html" class="btn btn-primary">${t.buttonBack}</a>
                    <button type="button" class="btn btn-secondary" id="btn-new-request">${t.buttonNewRequest}</button>
                </div>
            </div>
        `;

        document.getElementById('btn-new-request')?.addEventListener('click', () => {
            this.state.currentView = 'form';
            this.state.formData = null;
            this.render();
            this.initDateTimeDefaults();
        });
    }

    /**
     * Fehlerseite rendern
     */
    renderError() {
        const c = this.config;
        
        this.container.innerHTML = `
            <div class="sauna-booking">
                <header class="sauna-header error">
                    <span class="sauna-icon">❌</span>
                    <h1>Fehler beim Senden</h1>
                </header>

                <div class="error-card">
                    <p>${c.texts.errorEmailSend}</p>
                    <p>Telefon: +43 xxx xxx xxxx</p>
                    <p>E-Mail: ${c.email.recipient}</p>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn btn-primary" id="btn-retry">Erneut versuchen</button>
                </div>
            </div>
        `;

        document.getElementById('btn-retry')?.addEventListener('click', () => {
            this.state.currentView = 'summary';
            this.render();
        });
    }

    /**
     * Event-Listener anbinden
     */
    attachEventListeners() {
        // Formular-Submit
        this.container.addEventListener('submit', (e) => {
            if (e.target.id === 'sauna-form') {
                e.preventDefault();
                this.handleFormSubmit();
            }
        });

        // Dauer +/- Buttons
        this.container.addEventListener('click', (e) => {
            if (e.target.classList.contains('duration-btn')) {
                const action = e.target.dataset.action;
                const input = document.getElementById('duration');
                const current = parseInt(input.value) || this.config.minimumHours;
                
                if (action === 'increase' && current < this.config.maxHoursPerBooking) {
                    input.value = current + 1;
                } else if (action === 'decrease' && current > this.config.minimumHours) {
                    input.value = current - 1;
                }
                
                this.updatePriceDisplay();
            }
        });

        // Live-Updates bei Änderungen
        this.container.addEventListener('input', (e) => {
            if (['duration', 'start_time', 'date'].includes(e.target.name)) {
                this.updatePriceDisplay();
            }
        });

        this.container.addEventListener('change', (e) => {
            if (['duration', 'start_time', 'date'].includes(e.target.name)) {
                this.updatePriceDisplay();
            }
        });
    }

    /**
     * Standard-Datum und -Zeit setzen
     */
    initDateTimeDefaults() {
        const dateInput = document.getElementById('date');
        const timeInput = document.getElementById('start_time');
        
        if (dateInput) {
            // Morgen als Standard
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            dateInput.value = tomorrow.toISOString().split('T')[0];
            dateInput.min = new Date().toISOString().split('T')[0];
        }
        
        if (timeInput) {
            // 14:00 als Standard
            timeInput.value = '14:00';
        }
        
        this.updatePriceDisplay();
    }

    /**
     * Preis und Aufheizzeit aktualisieren
     */
    updatePriceDisplay() {
        const duration = parseInt(document.getElementById('duration')?.value) || this.config.minimumHours;
        const startTime = document.getElementById('start_time')?.value;
        const c = this.config;
        
        // Gesamtpreis (ohne Rabatt)
        const totalPrice = duration * c.pricePerHour;
        const priceEl = document.getElementById('total-price');
        if (priceEl) {
            priceEl.textContent = `${totalPrice} ${c.currency}`;
        }
        
        // Endpreis mit Gratis-Stunden
        if (this.hasFreeSessions) {
            const freeHours = c.freeSessionHours || 3;
            const chargeableHours = Math.max(0, duration - freeHours);
            const finalPrice = chargeableHours * c.pricePerHour;
            
            const finalPriceEl = document.getElementById('final-price');
            if (finalPriceEl) {
                if (chargeableHours > 0) {
                    finalPriceEl.textContent = `${finalPrice} ${c.currency}`;
                    finalPriceEl.classList.remove('free-price');
                } else {
                    finalPriceEl.textContent = `0 ${c.currency}`;
                    finalPriceEl.classList.add('free-price');
                }
            }
        }
        
        const heatingEl = document.getElementById('heating-time');
        if (heatingEl && startTime) {
            heatingEl.textContent = this.calculateHeatingTime(startTime);
        }
    }

    /**
     * Aufheizzeit berechnen
     */
    calculateHeatingTime(startTime) {
        if (!startTime) return '--:--';
        
        const [hours, minutes] = startTime.split(':').map(Number);
        let heatingHours = hours - this.config.heatingTimeHours;
        
        if (heatingHours < 0) {
            heatingHours += 24;
        }
        
        return `${String(heatingHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    /**
     * Formular validieren
     */
    validateForm(formData) {
        const errors = [];
        const c = this.config;
        const t = c.texts;
        
        // Gast-Identifikation prüfen
        if (!formData.guest_account && !formData.booking_number) {
            errors.push('Bitte geben Sie eine Gäste-Account ID oder Buchungsnummer an.');
        }
        
        // E-Mail Pflicht
        if (!formData.email || !formData.email.includes('@')) {
            errors.push('Bitte geben Sie eine gültige E-Mail-Adresse an.');
        }
        
        // Datum prüfen
        const selectedDate = new Date(formData.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
            errors.push(t.errorPastDate);
        }
        
        // Startzeit prüfen
        const [startHour] = formData.start_time.split(':').map(Number);
        if (startHour < c.openingHour || startHour > (c.closingHour - c.minimumHours)) {
            errors.push(this.formatText(t.errorOpeningHours, {
                open: c.openingHour,
                close: c.closingHour
            }));
        }
        
        // Dauer prüfen
        if (formData.duration < c.minimumHours) {
            errors.push(this.formatText(t.errorMinHours, { min: c.minimumHours }));
        }
        
        // Endzeit innerhalb Öffnungszeiten
        const endHour = startHour + parseInt(formData.duration);
        if (endHour > c.closingHour) {
            errors.push(`Ende (${endHour}:00) liegt nach Schließzeit (${c.closingHour}:00)`);
        }
        
        // Aufheizzeit-Vorlauf prüfen
        const now = new Date();
        const requestedStart = new Date(formData.date + 'T' + formData.start_time);
        const minRequestTime = new Date(requestedStart.getTime() - (c.heatingTimeHours * 60 * 60 * 1000));
        
        if (now > minRequestTime) {
            errors.push(this.formatText(t.errorHeatingTime, { hours: c.heatingTimeHours }));
        }
        
        // Regeln akzeptiert
        if (!formData.accept_rules) {
            errors.push(t.errorRulesNotAccepted);
        }
        
        // Datenschutz akzeptiert
        if (!formData.accept_data) {
            errors.push('Bitte akzeptieren Sie die Datenschutzbestimmungen.');
        }
        
        return errors;
    }

    /**
     * Formular-Submit Handler
     */
    handleFormSubmit() {
        const form = document.getElementById('sauna-form');
        const formDataObj = new FormData(form);
        
        const formData = {
            guest_account: formDataObj.get('guest_account'),
            booking_number: formDataObj.get('booking_number'),
            email: formDataObj.get('email'),
            date: formDataObj.get('date'),
            start_time: formDataObj.get('start_time'),
            duration: parseInt(formDataObj.get('duration')),
            temperature: parseInt(formDataObj.get('temperature')),
            notes: formDataObj.get('notes'),
            accept_rules: formDataObj.get('accept_rules') === 'on',
            accept_data: formDataObj.get('accept_data') === 'on',
            // Selbstversorger-Daten
            selfService: this.selfServiceMode,
            saunaIncluded: this.saunaIncluded,
            isFreeSession: this.hasFreeSessions,
            guestNights: this.guestNights
        };
        
        // Validieren
        const errors = this.validateForm(formData);
        
        if (errors.length > 0) {
            this.showErrors(errors);
            return;
        }
        
        // Speichern und zur Zusammenfassung
        this.state.formData = formData;
        this.state.currentView = 'summary';
        this.render();
    }

    /**
     * Fehler anzeigen
     */
    showErrors(errors) {
        const container = document.getElementById('error-container');
        const list = document.getElementById('error-list');
        
        if (container && list) {
            list.innerHTML = errors.map(e => `<li>${e}</li>`).join('');
            container.style.display = 'block';
            container.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    /**
     * Anfrage absenden
     */
    async submitRequest() {
        const c = this.config;
        const d = this.state.formData;
        
        const requestData = {
            ...d,
            total_price: d.duration * c.pricePerHour,
            heating_time: this.calculateHeatingTime(d.start_time),
            currency: c.currency,
            timestamp: new Date().toISOString()
        };
        
        // Versuche API-Endpoint
        try {
            const response = await fetch(c.email.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                mode: 'cors',
                body: JSON.stringify(requestData)
            });
            
            if (response.ok) {
                const result = await response.json();
                // Buchungs-ID speichern wenn vorhanden
                if (result.bookingId) {
                    this.state.formData.bookingId = result.bookingId;
                }
                this.state.currentView = 'confirmation';
                this.render();
                return;
            }
            
            throw new Error('API response not ok');
        } catch (error) {
            console.warn('API nicht erreichbar, nutze mailto: Fallback', error);
            
            if (c.email.useFallbackMailto) {
                this.sendMailtoFallback(requestData);
            } else {
                this.state.currentView = 'error';
                this.render();
            }
        }
    }

    /**
     * mailto: Fallback
     */
    sendMailtoFallback(data) {
        const c = this.config;
        
        const subject = encodeURIComponent(`${c.email.subject} - ${this.formatDate(data.date)}`);
        
        const body = encodeURIComponent(`
Neue Sauna-Anfrage
==================

Gast-Information:
- E-Mail: ${data.email}
- Gäste-Account: ${data.guest_account || '-'}
- Buchungsnummer: ${data.booking_number || '-'}

Buchungsdetails:
- Datum: ${this.formatDate(data.date)}
- Startzeit: ${data.start_time} Uhr
- Dauer: ${data.duration} Stunden
- Ende: ${this.calculateEndTime(data.start_time, data.duration)} Uhr
- Aufheizen ab: ${data.heating_time} Uhr

Preis: ${data.total_price} ${data.currency}

Notizen:
${data.notes || 'Keine'}

---
Gesendet am: ${new Date().toLocaleString('de-AT')}
        `.trim());
        
        const mailtoUrl = `mailto:${c.email.recipient}?subject=${subject}&body=${body}`;
        
        // E-Mail-Client öffnen
        window.location.href = mailtoUrl;
        
        // Zur Bestätigung wechseln (Nutzer hat mailto: geöffnet)
        setTimeout(() => {
            this.state.currentView = 'confirmation';
            this.render();
        }, 1000);
    }

    /**
     * Endzeit berechnen
     */
    calculateEndTime(startTime, duration) {
        const [hours, minutes] = startTime.split(':').map(Number);
        const endHours = hours + duration;
        return `${String(endHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    /**
     * Datum formatieren
     */
    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('de-AT', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    }

    /**
     * Formulardaten wiederherstellen
     */
    restoreFormData() {
        if (!this.state.formData) return;
        
        const d = this.state.formData;
        
        setTimeout(() => {
            const fields = ['guest_account', 'booking_number', 'email', 'date', 'start_time', 'duration', 'temperature', 'notes'];
            fields.forEach(field => {
                const el = document.getElementById(field);
                if (el && d[field]) {
                    el.value = d[field];
                }
            });
            
            const rulesCheckbox = document.getElementById('accept_rules');
            const dataCheckbox = document.getElementById('accept_data');
            if (rulesCheckbox) rulesCheckbox.checked = d.accept_rules;
            if (dataCheckbox) dataCheckbox.checked = d.accept_data;
            
            this.updatePriceDisplay();
        }, 50);
    }

    /**
     * Text mit Platzhaltern formatieren
     */
    formatText(template, values) {
        let result = template;
        for (const [key, value] of Object.entries(values)) {
            result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
        }
        return result;
    }
}

// Export für Module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SaunaBooking;
}
