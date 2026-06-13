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

    function buildInvestorCard(investor, api) {
        const card = document.createElement('div');
        card.className = 'card';

        // Use default profile image fallback
        const imgUrl = 'images/profile.png';
        const investorType = investor.investor_type || 'Investor';

        card.innerHTML = `
            <img src="${imgUrl}" alt="${investor.full_name}" style="object-fit: cover; border-radius: 14px;">
            <div class="card-content">
                <h2>${investor.full_name} <span>(${investorType})</span></h2>
                <p>
                    ${investor.investor_description || 'No description provided.'}
                </p>
                <p style="font-size: 15px; margin-top: 8px; color: #555;">
                    Domain: <strong>${investor.investor_domain || '-'}</strong> | Range: <strong>Up to ${api.formatINR(investor.max_investment_range || 0)}</strong>
                </p>
                <p style="font-size: 14px; color: #777; margin-top: 4px;">
                    Location: ${investor.district || ''}, ${investor.state || ''}
                </p>
            </div>
        `;
        return card;
    }

    global.FundMyStartupComponents = {
        getCategoryImage,
        openStartupModal,
        closeStartupModal,
        showPendingBanner,
        wirePitchDeckUpload,
        buildStartupCard,
        buildCategoryCard,
        ensureComponentStyles,
        wireTwoFactorAuth,
        buildInvestorCard,
    };
})(window);
