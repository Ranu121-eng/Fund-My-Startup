/**
 * Investor Dashboard - loads live data from API
 */
(function () {
    'use strict';

    function waitForDeps() {
        if (window.FundMyStartupAPI && window.FundMyStartupComponents) {
            initDashboard();
        } else {
            setTimeout(waitForDeps, 50);
        }
    }

    function loadScripts() {
        const scripts = ['js/backend-api.js', 'js/components.js'];
        let i = 0;
        function next() {
            if (i >= scripts.length) {
                waitForDeps();
                return;
            }
            const s = document.createElement('script');
            s.src = scripts[i++];
            s.onload = next;
            document.body.appendChild(s);
        }
        next();
    }

    async function initDashboard() {
        const api = window.FundMyStartupAPI;
        const components = window.FundMyStartupComponents;
        if (!api.requireAuth('investor')) return;

        components.ensureComponentStyles();
        document.querySelector('.logout-btn')?.addEventListener('click', () => api.logoutUser());
        document.getElementById('fms-profile-link')?.addEventListener('click', (e) => {
            e.preventDefault();
            components.openProfileModal();
        });

        try {
            const data = await api.fundMyStartupRequest('/dashboard/investor/');
            const investor = data.investor || {};
            const stats = data.stats || {};

            components.showPendingBanner(investor.profile_status, 'body');

            const heroTitle = document.querySelector('.hero h1');
            if (heroTitle) {
                heroTitle.textContent = `Welcome ${investor.full_name || 'Investor'} 💼`;
            }

            const statCards = document.querySelectorAll('.stats-section .card h2');
            if (statCards.length >= 4) {
                statCards[0].textContent = (data.startups || []).length;
                statCards[1].textContent = api.formatINR(stats.total_investments || 0);
                statCards[2].textContent = stats.offers_sent || 0;
                statCards[3].textContent = (data.my_investments || []).length;
            }

            components.wireTwoFactorAuth(api, investor.is_two_factor_enabled);

            const grid = document.querySelector('.dashboard-grid');
            if (!grid) return;

            grid.innerHTML = '';
            const startups = data.startups || [];
            const isApproved = investor.profile_status === 'approved';

            if (!isApproved) {
                grid.innerHTML = `
                    <div class="dashboard-box" style="grid-column:1/-1">
                        <h2>Startups</h2>
                        <p>Your investor profile is pending approval. Once approved, you can browse startups and submit investment offers.</p>
                    </div>`;
                return;
            }

            if (startups.length === 0) {
                grid.innerHTML = '<p class="fms-empty-state">No approved startups yet. Check back soon.</p>';
                return;
            }

            startups.forEach((s) => {
                const card = document.createElement('div');
                card.className = 'startup-card';
                card.innerHTML = `
                    <h2>${s.company_name}</h2>
                    <p>${s.category_name || 'Startup'} — ${s.district}, ${s.state}</p>
                    <p>Funding: ${api.formatINR(s.funding_required)}</p>
                    <button type="button" class="view-details-btn">View Details</button>
                    <button type="button" class="offer-btn">Make Offer</button>`;

                card.querySelector('.view-details-btn').addEventListener('click', () => {
                    components.openStartupModal(s.startup_id, { showOfferButton: true });
                });

                card.querySelector('.offer-btn').addEventListener('click', async () => {
                    const amount = prompt(`Enter offer amount (INR) for ${s.company_name}:`);
                    if (!amount) return;
                    try {
                        await api.fundMyStartupRequest('/investment-offers/', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ startup_id: s.startup_id, offer_amount: amount }),
                        });
                        alert('Investment offer submitted!');
                        location.reload();
                    } catch (e) {
                        alert(e.message);
                    }
                });

                grid.appendChild(card);
            });
        } catch (error) {
            alert(error.message || 'Failed to load dashboard.');
            if (error.message.includes('401')) {
                api.logoutUser();
            }
        }
    }

    loadScripts();
})();
