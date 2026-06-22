/**
 * Shared UI components: startup detail modal, pending banner, document upload.
 */
(function (global) {
    'use strict';

    const CATEGORY_IMAGES = {
        'Health Tech': 'images/connection.png',
        'EdTech': 'images/growth.png',
        'FinTech': 'images/profile.png',
        'AI & ML': 'images/exploration.png',
        'E-Commerce': 'images/conditions.png',
        'Food Tech': 'images/terms.png',
    };

    function getCategoryImage(name) {
        return CATEGORY_IMAGES[name] || 'images/exploration.png';
    }

    function ensureComponentStyles() {
        if (document.getElementById('fms-components-css')) return;
        const link = document.createElement('link');
        link.id = 'fms-components-css';
        link.rel = 'stylesheet';
        link.href = 'css/components.css';
        document.head.appendChild(link);
    }

    function ensureModalRoot() {
        let root = document.getElementById('fms-startup-modal');
        if (root) return root;

        root = document.createElement('div');
        root.id = 'fms-startup-modal';
        root.className = 'fms-modal-overlay';
        root.innerHTML = `
            <div class="fms-modal" role="dialog" aria-modal="true" aria-labelledby="fms-modal-title">
                <button type="button" class="fms-modal-close" aria-label="Close">&times;</button>
                <div class="fms-modal-body"></div>
            </div>`;
        document.body.appendChild(root);

        root.addEventListener('click', (e) => {
            if (e.target === root || e.target.classList.contains('fms-modal-close')) {
                closeStartupModal();
            }
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeStartupModal();
        });
        return root;
    }

    function closeStartupModal() {
        const root = document.getElementById('fms-startup-modal');
        if (root) {
            root.classList.remove('is-open');
            document.body.style.overflow = '';
        }
    }

    async function openStartupModal(startupId, options = {}) {
        ensureComponentStyles();
        const api = global.FundMyStartupAPI;
        if (!api) {
            alert('Application is still loading. Please try again.');
            return;
        }

        const root = ensureModalRoot();
        const body = root.querySelector('.fms-modal-body');
        body.innerHTML = '<p class="fms-modal-loading">Loading startup profile...</p>';
        root.classList.add('is-open');
        document.body.style.overflow = 'hidden';

        try {
            const data = await api.fundMyStartupRequest(`/startups/${startupId}/`);
            const s = data.startup || data;
            const formatINR = api.formatINR;

            let contactHtml = '';
            if (s.email || s.phone) {
                contactHtml = `
                    <div class="fms-modal-section">
                        <h4>Contact</h4>
                        ${s.email ? `<p><strong>Email:</strong> ${s.email}</p>` : ''}
                        ${s.phone ? `<p><strong>Phone:</strong> ${s.phone}</p>` : ''}
                    </div>`;
            }

            body.innerHTML = `
                <div class="fms-modal-header">
                    <span class="fms-modal-badge">${s.category_name || 'Startup'}</span>
                    <h2 id="fms-modal-title">${s.company_name}</h2>
                    <p class="fms-modal-founder">Founded by ${s.founder_name}</p>
                </div>
                <div class="fms-modal-grid">
                    <div class="fms-modal-section">
                        <h4>Overview</h4>
                        <p>${s.startup_description || 'No description provided yet.'}</p>
                    </div>
                    <div class="fms-modal-section">
                        <h4>Funding & Location</h4>
                        <p><strong>Funding Required:</strong> ${formatINR(s.funding_required)}</p>
                        <p><strong>Location:</strong> ${[s.district, s.state, s.country].filter(Boolean).join(', ')}</p>
                        ${s.website_url ? `<p><strong>Website:</strong> <a href="${s.website_url}" target="_blank" rel="noopener">${s.website_url}</a></p>` : ''}
                    </div>
                    ${contactHtml}
                </div>
                <div class="fms-modal-actions" id="fms-modal-actions"></div>`;

            const actions = body.querySelector('#fms-modal-actions');
            if (options.showOfferButton && localStorage.getItem('fms_user_type') === 'investor') {
                const offerBtn = document.createElement('button');
                offerBtn.type = 'button';
                offerBtn.className = 'fms-btn fms-btn-primary';
                offerBtn.textContent = 'Make Investment Offer';
                offerBtn.onclick = async () => {
                    const amount = prompt(`Enter offer amount (INR) for ${s.company_name}:`);
                    if (!amount) return;
                    try {
                        await api.fundMyStartupRequest('/investment-offers/', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ startup_id: s.startup_id, offer_amount: amount }),
                        });
                        alert('Investment offer submitted successfully!');
                        closeStartupModal();
                    } catch (err) {
                        alert(err.message);
                    }
                };
                actions.appendChild(offerBtn);
            } else if (!localStorage.getItem('fms_access_token')) {
                const loginLink = document.createElement('a');
                loginLink.href = 'login.html';
                loginLink.className = 'fms-btn fms-btn-secondary';
                loginLink.textContent = 'Login as Investor to Connect';
                actions.appendChild(loginLink);
            }
        } catch (error) {
            body.innerHTML = `<p class="fms-modal-error">${error.message || 'Could not load startup.'}</p>`;
        }
    }

    function showPendingBanner(profileStatus, containerSelector = 'body') {
        if (profileStatus !== 'pending') return;

        ensureComponentStyles();
        const container = document.querySelector(containerSelector);
        if (!container || document.getElementById('fms-pending-banner')) return;

        const banner = document.createElement('div');
        banner.id = 'fms-pending-banner';
        banner.className = 'fms-pending-banner';
        banner.innerHTML = `
            <div class="fms-pending-banner-inner">
                <span class="fms-pending-icon">⏳</span>
                <div>
                    <strong>Pending Admin Approval</strong>
                    <p>Your account is under review. Some features may be limited until an admin approves your profile.</p>
                </div>
            </div>`;

        const navbar = container.querySelector('.navbar, header, nav.navbar');
        if (navbar && navbar.parentNode) {
            navbar.parentNode.insertBefore(banner, navbar.nextSibling);
        } else {
            container.insertBefore(banner, container.firstChild);
        }
    }

    function wirePitchDeckUpload(buttonSelector, api) {
        const btn = document.querySelector(buttonSelector);
        if (!btn || btn.dataset.uploadWired) return;

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.ppt,.pptx,.jpg,.jpeg,.png';
        input.style.display = 'none';
        document.body.appendChild(input);

        btn.dataset.uploadWired = 'true';
        btn.addEventListener('click', () => input.click());

        input.addEventListener('change', async () => {
            if (!input.files || !input.files[0]) return;
            const formData = new FormData();
            formData.append('document_type', 'pitch_deck');
            formData.append('file', input.files[0]);
            try {
                btn.disabled = true;
                btn.textContent = 'Uploading...';
                const result = await api.fundMyStartupRequest('/documents/upload/', {
                    method: 'POST',
                    body: formData,
                });
                alert(result.message || 'Pitch deck uploaded successfully!');
            } catch (error) {
                alert(error.message || 'Upload failed.');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Upload Pitch Deck';
                input.value = '';
            }
        });
    }

    function buildStartupCard(startup, api, options = {}) {
        const card = document.createElement('div');
        card.className = options.cardClass || 'fms-startup-card';
        card.innerHTML = `
            <div class="fms-startup-card-inner">
                <span class="fms-startup-category">${startup.category_name || 'Startup'}</span>
                <h3>${startup.company_name}</h3>
                <p class="fms-startup-founder">${startup.founder_name}</p>
                <p class="fms-startup-desc">${startup.description_preview || startup.startup_description || 'Innovative startup seeking investment.'}</p>
                <p class="fms-startup-meta">${api.formatINR(startup.funding_required)} · ${startup.district || ''}, ${startup.state || ''}</p>
                <button type="button" class="fms-btn fms-btn-outline fms-view-details">View Details</button>
            </div>`;
        card.querySelector('.fms-view-details').addEventListener('click', (e) => {
            e.stopPropagation();
            openStartupModal(startup.startup_id, { showOfferButton: options.showOfferButton });
        });
        card.addEventListener('click', () => {
            openStartupModal(startup.startup_id, { showOfferButton: options.showOfferButton });
        });
        return card;
    }

    function buildCategoryCard(category) {
        const card = document.createElement('div');
        card.className = 'card fms-category-card';
        card.dataset.category = category.category_name;
        card.innerHTML = `
            <img src="${getCategoryImage(category.category_name)}" alt="${category.category_name}">
            <h3>${category.category_name.toUpperCase()}</h3>
            <p>${category.description || 'Explore startups in this category.'}</p>`;
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
            window.location.href = `explore.html?category=${encodeURIComponent(category.category_name)}`;
        });
        return card;
    }

    function wireTwoFactorAuth(api, isTwoFactorEnabled) {
        const container = document.getElementById('twoFactorStatusContainer');
        if (!container) return;

        function renderEnabled() {
            container.innerHTML = `
                <p style="color: #5cb85c; font-weight: 600; margin-bottom: 15px;">
                    ✓ Two-Factor Authentication is currently ENABLED.
                </p>
                <p style="margin-bottom: 20px; color: #555;">
                    Your account is secure. You will be prompted for an authenticator code when logging in.
                </p>
                <button type="button" id="btnDisable2fa" style="background: #d9534f; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600;">
                    Disable 2FA
                </button>
                <div id="disableForm" style="display: none; margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd;">
                    <p style="margin-bottom: 10px;">Enter the 6-digit code to disable 2FA:</p>
                    <input type="text" id="disableCode" placeholder="6-digit Code" maxlength="6" style="width: 200px; height: 40px; text-align: center; font-size: 18px; margin-bottom: 10px; display: block; border: 1px solid #ccc; border-radius: 4px;">
                    <button type="button" id="btnConfirmDisable" style="background: #222; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
                        Confirm Disable
                    </button>
                    <button type="button" id="btnCancelDisable" style="background: transparent; color: #333; border: none; padding: 10px 20px; cursor: pointer; text-decoration: underline;">
                        Cancel
                    </button>
                </div>
            `;

            document.getElementById('btnDisable2fa').addEventListener('click', () => {
                document.getElementById('disableForm').style.display = 'block';
                document.getElementById('btnDisable2fa').style.display = 'none';
            });

            document.getElementById('btnCancelDisable').addEventListener('click', () => {
                document.getElementById('disableForm').style.display = 'none';
                document.getElementById('btnDisable2fa').style.display = 'block';
            });

            document.getElementById('btnConfirmDisable').addEventListener('click', async () => {
                const code = document.getElementById('disableCode').value.trim();
                if (!code || code.length !== 6) {
                    alert('Please enter a 6-digit code.');
                    return;
                }
                try {
                    const res = await api.fundMyStartupRequest('/auth/2fa/disable/', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ code })
                    });
                    alert(res.message || '2FA disabled successfully.');
                    wireTwoFactorAuth(api, false);
                } catch (err) {
                    alert(err.message);
                }
            });
        }

        function renderDisabled() {
            container.innerHTML = `
                <p style="color: #777; margin-bottom: 15px;">
                    Two-Factor Authentication is currently DISABLED.
                </p>
                <p style="margin-bottom: 20px; color: #555;">
                    Add an extra layer of security to your account.
                </p>
                <button type="button" id="btnSetup2fa" style="background: #f79a4b; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600;">
                    Enable 2FA
                </button>
                <div id="setupForm" style="display: none; margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd; text-align: left;">
                    <p style="margin-bottom: 15px; font-weight: 600;">Step 1: Scan this QR Code with your authenticator app (e.g., Google Authenticator):</p>
                    <div style="text-align: center; margin-bottom: 15px;">
                        <img id="qrCodeImg" src="" alt="QR Code" style="border: 1px solid #ccc; padding: 10px; border-radius: 8px;">
                    </div>
                    <p style="margin-bottom: 15px; font-size: 14px; color: #666; word-break: break-all;">
                        Or enter secret key manually: <strong id="secretText"></strong>
                    </p>
                    <p style="margin-bottom: 10px; font-weight: 600;">Step 2: Enter the 6-digit code generated by the app to verify:</p>
                    <input type="text" id="verifyCode" placeholder="6-digit Code" maxlength="6" style="width: 200px; height: 40px; text-align: center; font-size: 18px; margin-bottom: 10px; display: block; border: 1px solid #ccc; border-radius: 4px;">
                    <button type="button" id="btnConfirmSetup" style="background: #5cb85c; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600;">
                        Confirm Enable
                    </button>
                    <button type="button" id="btnCancelSetup" style="background: transparent; color: #333; border: none; padding: 10px 20px; cursor: pointer; text-decoration: underline;">
                        Cancel
                    </button>
                </div>
            `;

            document.getElementById('btnSetup2fa').addEventListener('click', async () => {
                const btnSetup = document.getElementById('btnSetup2fa');
                btnSetup.disabled = true;
                btnSetup.textContent = 'Loading...';
                try {
                    const data = await api.fundMyStartupRequest('/auth/2fa/setup/');
                    document.getElementById('qrCodeImg').src = data.qr_code_url;
                    document.getElementById('secretText').textContent = data.secret;
                    document.getElementById('setupForm').style.display = 'block';
                    btnSetup.style.display = 'none';
                } catch (err) {
                    alert(err.message);
                } finally {
                    btnSetup.disabled = false;
                    btnSetup.textContent = 'Enable 2FA';
                }
            });

            document.getElementById('btnCancelSetup').addEventListener('click', () => {
                document.getElementById('setupForm').style.display = 'none';
                document.getElementById('btnSetup2fa').style.display = 'block';
            });

            document.getElementById('btnConfirmSetup').addEventListener('click', async () => {
                const code = document.getElementById('verifyCode').value.trim();
                if (!code || code.length !== 6) {
                    alert('Please enter a 6-digit verification code.');
                    return;
                }
                try {
                    const res = await api.fundMyStartupRequest('/auth/2fa/verify/', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ code })
                    });
                    alert(res.message || '2FA enabled successfully.');
                    wireTwoFactorAuth(api, true);
                } catch (err) {
                    alert(err.message);
                }
            });
        }

        if (isTwoFactorEnabled) {
            renderEnabled();
        } else {
            renderDisabled();
        }
    }

    function ensureInvestorModalRoot() {
        let root = document.getElementById('fms-investor-modal');
        if (root) return root;

        root = document.createElement('div');
        root.id = 'fms-investor-modal';
        root.className = 'fms-modal-overlay';
        root.innerHTML = `
            <div class="fms-modal" role="dialog" aria-modal="true" aria-labelledby="fms-modal-title-investor">
                <button type="button" class="fms-modal-close" aria-label="Close">&times;</button>
                <div class="fms-modal-body"></div>
            </div>`;
        document.body.appendChild(root);

        root.addEventListener('click', (e) => {
            if (e.target === root || e.target.classList.contains('fms-modal-close')) {
                closeInvestorModal();
            }
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeInvestorModal();
        });
        return root;
    }

    function closeInvestorModal() {
        const root = document.getElementById('fms-investor-modal');
        if (root) {
            root.classList.remove('is-open');
            document.body.style.overflow = '';
        }
    }

    async function openInvestorModal(investorId) {
        ensureComponentStyles();
        const api = global.FundMyStartupAPI;
        if (!api) {
            alert('Application is still loading. Please try again.');
            return;
        }

        const root = ensureInvestorModalRoot();
        const body = root.querySelector('.fms-modal-body');
        body.innerHTML = '<p class="fms-modal-loading">Loading investor profile...</p>';
        root.classList.add('is-open');
        document.body.style.overflow = 'hidden';

        try {
            const data = await api.fundMyStartupRequest(`/investors/${investorId}/`);
            const inv = data.investor || data;

            let contactHtml = '';
            if (inv.email || inv.phone) {
                contactHtml = `
                    <div class="fms-modal-section">
                        <h4>Contact Information</h4>
                        ${inv.email ? `<p><strong>Email:</strong> <a href="mailto:${inv.email}">${inv.email}</a></p>` : ''}
                        ${inv.phone ? `<p><strong>Phone:</strong> ${inv.phone}</p>` : ''}
                    </div>`;
            }

            body.innerHTML = `
                <div class="fms-modal-header">
                     <span class="fms-modal-badge">${inv.investor_type || 'Investor'}</span>
                     <h2 id="fms-modal-title-investor">${inv.full_name}</h2>
                     ${inv.company_name ? `<p class="fms-modal-founder">Company: ${inv.company_name}</p>` : ''}
                </div>
                <div class="fms-modal-grid">
                     <div class="fms-modal-section">
                         <h4>Description</h4>
                         <p>${inv.investor_description || 'No description provided.'}</p>
                     </div>
                     <div class="fms-modal-section">
                         <h4>Investment details & Location</h4>
                         <p><strong>Investment Range:</strong> Up to ${api.formatINR(inv.max_investment_range || 0)}</p>
                         <p><strong>Investment Domain:</strong> ${inv.investor_domain || '-'}</p>
                         <p><strong>Location:</strong> ${[inv.district, inv.state, inv.country].filter(Boolean).join(', ')}</p>
                     </div>
                     ${contactHtml}
                </div>
                <div class="fms-modal-actions" id="fms-modal-actions-investor"></div>`;

            const actions = body.querySelector('#fms-modal-actions-investor');
            if (localStorage.getItem('fms_user_type') === 'startup') {
                const msgBtn = document.createElement('button');
                msgBtn.type = 'button';
                msgBtn.className = 'fms-btn fms-btn-primary';
                msgBtn.textContent = 'Contact Investor via Email';
                msgBtn.onclick = () => {
                    window.location.href = `mailto:${inv.email}?subject=Partnership%20Inquiry%20-%20Fund%20My%20Startup`;
                };
                actions.appendChild(msgBtn);
            } else if (!localStorage.getItem('fms_access_token')) {
                const loginLink = document.createElement('a');
                loginLink.href = 'login.html';
                loginLink.className = 'fms-btn fms-btn-secondary';
                loginLink.textContent = 'Login as Startup to Connect';
                actions.appendChild(loginLink);
            }
        } catch (error) {
            body.innerHTML = `<p class="fms-modal-error">${error.message || 'Could not load investor profile.'}</p>`;
        }
    }

    function buildInvestorCard(investor, api) {
        const card = document.createElement('div');
        card.className = 'fms-startup-card';
        card.innerHTML = `
            <div class="fms-startup-card-inner">
                <span class="fms-startup-category">${investor.investor_type || 'Investor'}</span>
                <h3>${investor.full_name}</h3>
                <p class="fms-startup-founder">${investor.company_name || 'Individual Investor'}</p>
                <p class="fms-startup-desc">${investor.description_preview || investor.investor_description || 'No description provided.'}</p>
                <p class="fms-startup-meta">Domain: ${investor.investor_domain || '-'} · Max Range: ${api.formatINR(investor.max_investment_range || 0)}</p>
                <button type="button" class="fms-btn fms-btn-outline fms-view-details">View Details</button>
            </div>`;
        card.querySelector('.fms-view-details').addEventListener('click', (e) => {
            e.stopPropagation();
            openInvestorModal(investor.investor_id);
        });
        card.addEventListener('click', () => {
            openInvestorModal(investor.investor_id);
        });
        return card;
    }

    function initChatbot() {
        if (document.getElementById('fms-chatbot-trigger')) return;

        ensureComponentStyles();

        // 1. Create Floating Trigger Button
        const trigger = document.createElement('button');
        trigger.id = 'fms-chatbot-trigger';
        trigger.setAttribute('aria-label', 'Open chatbot');
        trigger.innerHTML = `
            <svg viewBox="0 0 24 24">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
            </svg>`;
        document.body.appendChild(trigger);

        // 2. Create Chat Window
        const chatWindow = document.createElement('div');
        chatWindow.id = 'fms-chatbot-window';
        chatWindow.innerHTML = `
            <div class="fms-chat-header">
                <div class="fms-chat-header-info">
                    <span class="fms-chat-status"></span>
                    <h3>Fund My Startup Bot</h3>
                </div>
                <button type="button" class="fms-chat-close">&times;</button>
            </div>
            <div class="fms-chat-messages"></div>
            <div class="fms-chat-typing">
                <span></span><span></span><span></span>
            </div>
            <div class="fms-chat-quick-replies"></div>
            <div class="fms-chat-input-area">
                <input type="text" class="fms-chat-input" placeholder="Type a message..." required>
                <button type="button" class="fms-chat-send" aria-label="Send message">
                    <svg viewBox="0 0 24 24">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                    </svg>
                </button>
            </div>`;
        document.body.appendChild(chatWindow);

        const closeBtn = chatWindow.querySelector('.fms-chat-close');
        const messagesArea = chatWindow.querySelector('.fms-chat-messages');
        const typingIndicator = chatWindow.querySelector('.fms-chat-typing');
        const inputField = chatWindow.querySelector('.fms-chat-input');
        const sendBtn = chatWindow.querySelector('.fms-chat-send');
        const quickRepliesArea = chatWindow.querySelector('.fms-chat-quick-replies');

        trigger.addEventListener('click', () => {
            chatWindow.classList.toggle('is-open');
            if (chatWindow.classList.contains('is-open')) {
                inputField.focus();
                if (messagesArea.children.length === 0) {
                    sendBotMessage("Hi! I am the Fund My Startup Assistant. How can I help you today?");
                    renderQuickReplies();
                }
            }
        });

        closeBtn.addEventListener('click', () => {
            chatWindow.classList.remove('is-open');
        });

        const QUICK_REPLIES = [
            { text: "How to register?", handler: () => handleUserQuestion("How do I register an account?") },
            { text: "How to invest?", handler: () => handleUserQuestion("How can I make an investment offer?") },
            { text: "Approval process?", handler: () => handleUserQuestion("What is the profile verification/approval process?") },
            { text: "Contact Support", handler: () => handleUserQuestion("How do I contact support?") }
        ];

        function renderQuickReplies() {
            quickRepliesArea.innerHTML = '';
            QUICK_REPLIES.forEach(q => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'fms-chat-quick-btn';
                btn.textContent = q.text;
                btn.addEventListener('click', q.handler);
                quickRepliesArea.appendChild(btn);
            });
        }

        function appendMessage(text, sender) {
            const msg = document.createElement('div');
            msg.className = `fms-chat-msg ${sender}`;
            msg.textContent = text;
            messagesArea.appendChild(msg);
            messagesArea.scrollTop = messagesArea.scrollHeight;
        }

        function sendBotMessage(text) {
            appendMessage(text, 'bot');
        }

        function showTyping(show) {
            typingIndicator.style.display = show ? 'flex' : 'none';
            messagesArea.scrollTop = messagesArea.scrollHeight;
        }

        function handleUserQuestion(text) {
            appendMessage(text, 'user');
            showTyping(true);

            setTimeout(() => {
                showTyping(false);
                const reply = getBotReply(text);
                sendBotMessage(reply);
            }, 1000);
        }

        function getBotReply(query) {
            const q = query.toLowerCase();
            if (q.includes('hello') || q.includes('hi') || q.includes('hey')) {
                return "Hello! Hope you are having a wonderful day. Ask me anything about registering, investing, or finding support on the Fund My Startup platform!";
            }
            if (q.includes('register') || q.includes('signup') || q.includes('create') || q.includes('account')) {
                return "To register: click 'Login/Register' in the top-right corner. You can register as a 'Startup' (requires Aadhaar, PAN card, and Pitch Deck uploads) or an 'Investor' (requires Aadhaar and PAN card). Once registered, your account status will show 'Pending' until approved by our administrator.";
            }
            if (q.includes('invest') || q.includes('offer') || q.includes('deal') || q.includes('money')) {
                return "Approved investors can view the list of startups, check their financial stats/descriptions, and make investment offers directly from their dashboard. Startups can then review and accept or reject offers in their own dashboard.";
            }
            if (q.includes('approve') || q.includes('pending') || q.includes('verification') || q.includes('verify')) {
                return "After registering, the Platform Administrator verifies your uploaded documents (Aadhaar Card, PAN Card, and Pitch Deck). Once verified, the Admin approves your profile. Startups are then displayed publicly, and investors can start making offers!";
            }
            if (q.includes('contact') || q.includes('support') || q.includes('help') || q.includes('email') || q.includes('message')) {
                return "You can get in touch with us by clicking the 'Contact us' page in the navbar and submitting the contact form, or by writing directly to our support team at support@fundmystartup.com.";
            }
            if (q.includes('startup') || q.includes('company')) {
                return "Our platform features startups across categories like Health Tech, EdTech, FinTech, AI & ML, E-Commerce, and Food Tech. Startups gain visibility, upload pitch decks, and receive real investment offers from venture capitals and individual investors.";
            }
            return "I'm sorry, I'm not sure about that. Try asking about 'how to register', 'how to invest', 'admin approval', or click one of the quick replies below.";
        }

        function triggerSend() {
            const text = inputField.value.trim();
            if (!text) return;
            inputField.value = '';
            handleUserQuestion(text);
        }

    }

    async function openProfileModal() {
        ensureComponentStyles();
        const api = global.FundMyStartupAPI;
        if (!api) {
            alert('Application is still loading. Please try again.');
            return;
        }

        let overlay = document.getElementById('fms-profile-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'fms-profile-overlay';
            overlay.className = 'fms-profile-modal-overlay';
            overlay.innerHTML = `
                <div class="fms-profile-modal" role="dialog" aria-modal="true" aria-labelledby="fms-profile-title">
                    <button type="button" class="fms-profile-modal-close" aria-label="Close">&times;</button>
                    <h2 id="fms-profile-title" style="margin-bottom: 20px;">Edit Profile Dashboard</h2>
                    
                    <div class="fms-profile-tabs">
                        <button type="button" class="fms-profile-tab-btn active" data-tab="info">Personal & Business Info</button>
                        <button type="button" class="fms-profile-tab-btn" data-tab="files">Photo & Documents</button>
                        <button type="button" class="fms-profile-tab-btn" data-tab="security">Security</button>
                    </div>

                    <div class="fms-profile-body">
                        <p class="fms-modal-loading">Loading profile...</p>
                    </div>
                </div>`;
            document.body.appendChild(overlay);

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay || e.target.classList.contains('fms-profile-modal-close')) {
                    overlay.classList.remove('is-open');
                    document.body.style.overflow = '';
                }
            });
        }

        const body = overlay.querySelector('.fms-profile-body');
        body.innerHTML = '<p class="fms-modal-loading">Loading profile details...</p>';
        overlay.classList.add('is-open');
        document.body.style.overflow = 'hidden';

        try {
            const res = await api.fundMyStartupRequest('/profile/');
            const userType = res.user_type;
            const profile = res.profile;
            const documents = res.documents || [];

            let categories = [];
            if (userType === 'startup') {
                try {
                    categories = await api.fundMyStartupRequest('/categories/');
                } catch (e) {
                    console.error('Failed to load categories', e);
                }
            }

            renderProfileContent(body, userType, profile, documents, categories);
            wireTabSwitching(overlay);
            wireProfileForms(overlay, api, userType);

        } catch (error) {
            body.innerHTML = `<p class="fms-modal-error">Error: ${error.message}</p>`;
        }
    }

    function renderProfileContent(body, userType, profile, documents, categories) {
        const photoUrl = profile.profile_photo_url || 'images/profile.png';
        
        let infoFieldsHtml = '';
        if (userType === 'startup') {
            const catOptions = categories.map(c => 
                `<option value="${c.category_id}" ${profile.category_id === c.category_id ? 'selected' : ''}>${c.category_name}</option>`
            ).join('');

            infoFieldsHtml = `
                <div class="fms-profile-grid">
                    <div class="fms-profile-form-group">
                        <label>Founder Full Name</label>
                        <input type="text" name="founder_name" value="${profile.founder_name || ''}" required>
                    </div>
                    <div class="fms-profile-form-group">
                        <label>Email Address</label>
                        <input type="email" name="email" value="${profile.email || ''}" required>
                    </div>
                    <div class="fms-profile-form-group">
                        <label>Contact Number</label>
                        <input type="text" name="phone" value="${profile.phone || ''}" required>
                    </div>
                    <div class="fms-profile-form-group">
                        <label>Company Name</label>
                        <input type="text" name="company_name" value="${profile.company_name || ''}" required>
                    </div>
                    <div class="fms-profile-form-group">
                        <label>Website URL</label>
                        <input type="url" name="website_url" value="${profile.website_url || ''}">
                    </div>
                    <div class="fms-profile-form-group">
                        <label>Category</label>
                        <select name="category_id">
                            <option value="">Select Category</option>
                            ${catOptions}
                        </select>
                    </div>
                    <div class="fms-profile-form-group">
                        <label>Funding Required (INR)</label>
                        <input type="number" name="funding_required" value="${profile.funding_required || ''}" step="0.01">
                    </div>
                    <div class="fms-profile-form-group">
                        <label>Country</label>
                        <input type="text" name="country" value="${profile.country || ''}">
                    </div>
                    <div class="fms-profile-form-group">
                        <label>State</label>
                        <input type="text" name="state" value="${profile.state || ''}">
                    </div>
                    <div class="fms-profile-form-group">
                        <label>District</label>
                        <input type="text" name="district" value="${profile.district || ''}">
                    </div>
                    <div class="fms-profile-form-group fms-profile-fullwidth">
                        <label>Company Description</label>
                        <textarea name="startup_description" rows="3">${profile.startup_description || ''}</textarea>
                    </div>
                </div>`;
        } else {
            infoFieldsHtml = `
                <div class="fms-profile-grid">
                    <div class="fms-profile-form-group">
                        <label>Full Name</label>
                        <input type="text" name="full_name" value="${profile.full_name || ''}" required>
                    </div>
                    <div class="fms-profile-form-group">
                        <label>Email Address</label>
                        <input type="email" name="email" value="${profile.email || ''}" required>
                    </div>
                    <div class="fms-profile-form-group">
                        <label>Contact Number</label>
                        <input type="text" name="phone" value="${profile.phone || ''}" required>
                    </div>
                    <div class="fms-profile-form-group">
                        <label>Company Name</label>
                        <input type="text" name="company_name" value="${profile.company_name || ''}">
                    </div>
                    <div class="fms-profile-form-group">
                        <label>Investor Type</label>
                        <input type="text" name="investor_type" value="${profile.investor_type || ''}" placeholder="e.g. Venture Capital, Angel Investor">
                    </div>
                    <div class="fms-profile-form-group">
                        <label>Investor Domain</label>
                        <input type="text" name="investor_domain" value="${profile.investor_domain || ''}" placeholder="e.g. Health Tech, SaaS">
                    </div>
                    <div class="fms-profile-form-group">
                        <label>Max Investment Range (INR)</label>
                        <input type="number" name="max_investment_range" value="${profile.max_investment_range || ''}" step="0.01">
                    </div>
                    <div class="fms-profile-form-group">
                        <label>Country</label>
                        <input type="text" name="country" value="${profile.country || ''}">
                    </div>
                    <div class="fms-profile-form-group">
                        <label>State</label>
                        <input type="text" name="state" value="${profile.state || ''}">
                    </div>
                    <div class="fms-profile-form-group">
                        <label>District</label>
                        <input type="text" name="district" value="${profile.district || ''}">
                    </div>
                    <div class="fms-profile-form-group fms-profile-fullwidth">
                        <label>Bio / Investor Description</label>
                        <textarea name="investor_description" rows="3">${profile.investor_description || ''}</textarea>
                    </div>
                </div>`;
        }

        const getDocRow = (docType, label) => {
            const doc = documents.filter(d => d.document_type === docType).sort((a, b) => b.document_id - a.document_id)[0];
            const badgeClass = doc ? doc.status : 'pending';
            const statusLabel = doc ? doc.status : 'Not Uploaded';
            return `
                <div class="fms-profile-doc-row">
                    <div class="fms-profile-doc-info">
                        <h5>${label}</h5>
                        <span>${doc ? `Uploaded on ${new Date(doc.uploaded_at).toLocaleDateString()}` : 'Awaiting upload'}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        ${doc ? `<a href="${doc.file_url}" target="_blank" style="font-size: 13px; color: #f7934c; font-weight: 600; text-decoration: none;">View File</a>` : ''}
                        <span class="fms-profile-doc-badge ${badgeClass}">${statusLabel}</span>
                    </div>
                </div>
                <div class="fms-profile-form-group" style="margin-bottom: 20px;">
                    <input type="file" class="fms-profile-doc-input" data-doc-type="${docType}">
                </div>`;
        };

        const docsHtml = userType === 'startup' 
            ? getDocRow('aadhaar', 'Aadhaar Card') + getDocRow('pan', 'PAN Card') + getDocRow('pitch_deck', 'Pitch Deck')
            : getDocRow('aadhaar', 'Aadhaar Card') + getDocRow('pan', 'PAN Card');

        body.innerHTML = `
            <div class="fms-profile-tab-content active" id="fms-profile-tab-info">
                <form id="fms-profile-info-form">
                    <div class="fms-profile-photo-section">
                        <img src="${photoUrl}" alt="Profile Photo" class="fms-profile-photo-preview" id="fms-profile-photo-preview-img">
                        <div class="fms-profile-photo-actions">
                            <label style="font-size: 13px; font-weight: 600; color: #475569;">Profile Photo</label>
                            <input type="file" id="fms-profile-photo-input" accept="image/*">
                        </div>
                    </div>
                    
                    ${infoFieldsHtml}
                    
                    <button type="submit" class="fms-profile-save-btn">Update Profile Information</button>
                </form>
            </div>

            <div class="fms-profile-tab-content" id="fms-profile-tab-files">
                <div style="margin-bottom: 20px;">
                    <p style="font-size: 14px; color: #475569; margin-bottom: 15px;">Update your documents below. Files must be PDFs or Images under 5MB. Newly uploaded files will show as Pending until reviewed by the Administrator.</p>
                    ${docsHtml}
                </div>
            </div>

            <div class="fms-profile-tab-content" id="fms-profile-tab-security">
                <form id="fms-profile-security-form">
                    <div class="fms-profile-form-group">
                        <label>Current Password</label>
                        <input type="password" name="old_password" required placeholder="Enter current password">
                    </div>
                    <div class="fms-profile-form-group">
                        <label>New Password</label>
                        <input type="password" name="new_password" required placeholder="Min 6 characters">
                    </div>
                    <div class="fms-profile-form-group">
                        <label>Confirm New Password</label>
                        <input type="password" name="confirm_password" required placeholder="Re-enter new password">
                    </div>
                    <button type="submit" class="fms-profile-save-btn">Change Password</button>
                </form>
            </div>`;
    }

    function wireTabSwitching(overlay) {
        const tabBtns = overlay.querySelectorAll('.fms-profile-tab-btn');
        const tabContents = overlay.querySelectorAll('.fms-profile-tab-content');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.tab;
                
                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));

                btn.classList.add('active');
                overlay.querySelector(`#fms-profile-tab-${target}`).classList.add('active');
            });
        });
    }

    function wireProfileForms(overlay, api, userType) {
        const infoForm = overlay.querySelector('#fms-profile-info-form');
        if (infoForm) {
            infoForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const formData = new FormData(infoForm);
                const photoInput = overlay.querySelector('#fms-profile-photo-input');
                if (photoInput && photoInput.files && photoInput.files[0]) {
                    formData.append('profile_photo', photoInput.files[0]);
                }

                const submitBtn = infoForm.querySelector('.fms-profile-save-btn');
                try {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Updating...';

                    const result = await api.fundMyStartupRequest('/profile/', {
                        method: 'PATCH',
                        body: formData
                    });

                    alert('Profile updated successfully!');
                    if (result.profile && result.profile.profile_photo_url) {
                        overlay.querySelector('#fms-profile-photo-preview-img').src = result.profile.profile_photo_url;
                    }
                    location.reload();
                } catch (error) {
                    alert(error.message || 'Failed to update profile.');
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Update Profile Information';
                }
            });
        }

        const docInputs = overlay.querySelectorAll('.fms-profile-doc-input');
        docInputs.forEach(input => {
            input.addEventListener('change', async () => {
                if (!input.files || !input.files[0]) return;
                
                const docType = input.dataset.docType;
                const formData = new FormData();
                formData.append('document_type', docType);
                formData.append('file', input.files[0]);

                try {
                    input.disabled = true;
                    const result = await api.fundMyStartupRequest('/documents/upload/', {
                        method: 'POST',
                        body: formData
                    });
                    alert(result.message || 'Document uploaded successfully!');
                    openProfileModal();
                } catch (error) {
                    alert(error.message || 'Document upload failed.');
                } finally {
                    input.disabled = false;
                    input.value = '';
                }
            });
        });

        const securityForm = overlay.querySelector('#fms-profile-security-form');
        if (securityForm) {
            securityForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const oldPassword = securityForm.querySelector('[name="old_password"]').value;
                const newPassword = securityForm.querySelector('[name="new_password"]').value;
                const confirmPassword = securityForm.querySelector('[name="confirm_password"]').value;

                if (newPassword !== confirmPassword) {
                    alert('New passwords do not match.');
                    return;
                }

                const submitBtn = securityForm.querySelector('.fms-profile-save-btn');
                try {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Changing...';

                    await api.fundMyStartupRequest('/profile/change-password/', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            old_password: oldPassword,
                            new_password: newPassword
                        })
                    });

                    alert('Password changed successfully!');
                    securityForm.reset();
                } catch (error) {
                    alert(error.message || 'Password change failed.');
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Change Password';
                }
            });
        }
    }

    global.FundMyStartupComponents = {
        getCategoryImage,
        openStartupModal,
        closeStartupModal,
        openInvestorModal,
        closeInvestorModal,
        showPendingBanner,
        wirePitchDeckUpload,
        buildStartupCard,
        buildCategoryCard,
        ensureComponentStyles,
        wireTwoFactorAuth,
        buildInvestorCard,
        openProfileModal,
    };

    // Auto-run chatbot on script load
    initChatbot();
})(window);

