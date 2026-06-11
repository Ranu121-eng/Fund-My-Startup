/**
 * Investor Dashboard - loads live data from API
 */
(function () {
    'use strict';

    function waitForApi() {
        if (window.FundMyStartupAPI) {
            initDashboard();
        } else {
            setTimeout(waitForApi, 50);
        }
    }

    async function submitOffer(startupId, amount) {
        const api = window.FundMyStartupAPI;
        return api.fundMyStartupRequest('/investment-offers/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ startup_id: startupId, offer_amount: amount }),
        });
    }

    async function initDashboard() {
        const api = window.FundMyStartupAPI;
        if (!api.requireAuth('investor')) return;

        const logoutBtn = document.querySelector('.logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => api.logoutUser());
        }

        try {
            const data = await api.fundMyStartupRequest('/dashboard/investor/');
            const investor = data.investor || {};
            const stats = data.stats || {};

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

            const grid = document.querySelector('.dashboard-grid');
            if (grid) {
                grid.innerHTML = '';
                const startups = data.startups || [];
                if (startups.length === 0) {
                    grid.innerHTML = '<p>No approved startups yet. Check back after admin approval.</p>';
                } else {
                    startups.forEach((s) => {
                        const card = document.createElement('div');
                        card.className = 'startup-card';
                        card.innerHTML = `
                            <h2>${s.company_name}</h2>
                            <p>${s.category_name || 'Startup'} — ${s.district}, ${s.state}</p>
                            <p>Funding: ${api.formatINR(s.funding_required)}</p>
                            <button type="button" class="offer-btn">Make Investment Offer</button>`;
                        card.querySelector('.offer-btn').addEventListener('click', async () => {
                            const amount = prompt(
                                `Enter offer amount (INR) for ${s.company_name}:`
                            );
                            if (!amount) return;
                            try {
                                await submitOffer(s.startup_id, amount);
                                alert('Investment offer submitted!');
                                location.reload();
                            } catch (e) {
                                alert(e.message);
                            }
                        });
                        grid.appendChild(card);
                    });
                }
            }
        } catch (error) {
            alert(error.message || 'Failed to load dashboard.');
            if (error.message.includes('401')) {
                api.logoutUser();
            }
        }
    }

    const apiScript = document.createElement('script');
    apiScript.src = 'js/backend-api.js';
    apiScript.onload = waitForApi;
    document.body.appendChild(apiScript);
})();
