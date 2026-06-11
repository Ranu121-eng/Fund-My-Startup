/**
 * Startup Dashboard - loads live data from API
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

    async function initDashboard() {
        const api = window.FundMyStartupAPI;
        if (!api.requireAuth('startup')) return;

        const logoutBtn = document.querySelector('.logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => api.logoutUser());
        }

        try {
            const data = await api.fundMyStartupRequest('/dashboard/startup/');
            const startup = data.startup || {};
            const stats = data.stats || {};

            const heroTitle = document.querySelector('.hero-left h1');
            if (heroTitle) {
                heroTitle.textContent = `Welcome ${startup.founder_name || 'Startup'} 🚀`;
            }

            const fundingCard = document.querySelector('.hero-right .stats-card h2');
            if (fundingCard) {
                fundingCard.textContent = api.formatINR(stats.total_funding_raised || 0);
            }

            const statCards = document.querySelectorAll('.stats-section .card h2');
            if (statCards.length >= 4) {
                statCards[0].textContent = stats.interested_investors || 0;
                statCards[1].textContent = data.investment_offers?.length || 0;
                statCards[2].textContent = stats.documents_uploaded || 0;
                statCards[3].textContent = `${stats.profile_completion_percent || 0}%`;
            }

            const detailsBox = document.querySelector('.dashboard-grid .dashboard-box');
            if (detailsBox) {
                const status = startup.profile_status || 'pending';
                detailsBox.innerHTML = `
                    <h2>Startup Details</h2>
                    <p><strong>Startup Name:</strong> ${startup.company_name || '-'}</p>
                    <p><strong>Category:</strong> ${startup.category_name || '-'}</p>
                    <p><strong>Funding Required:</strong> ${api.formatINR(startup.funding_required)}</p>
                    <p><strong>Location:</strong> ${startup.district || ''}, ${startup.state || ''}</p>
                    <p><strong>Status:</strong> ${status}</p>
                    <p><strong>Email:</strong> ${startup.email || '-'}</p>`;
            }

            const activityBox = document.querySelectorAll('.dashboard-grid .dashboard-box')[1];
            if (activityBox) {
                const offers = data.investment_offers || [];
                let html = '<h2>Investment Offers</h2><ul>';
                if (offers.length === 0) {
                    html += '<li>No investment offers yet.</li>';
                } else {
                    offers.forEach((offer) => {
                        html += `<li>${offer.investor_name}: ${api.formatINR(offer.offer_amount)} — ${offer.status}</li>`;
                    });
                }
                html += '</ul>';
                if (offers.some((o) => o.status === 'pending')) {
                    html += '<p><em>Use buttons below to accept/reject pending offers.</em></p>';
                }
                activityBox.innerHTML = html;

                offers.filter((o) => o.status === 'pending').forEach((offer) => {
                    const acceptBtn = document.createElement('button');
                    acceptBtn.textContent = `Accept ${offer.investor_name} (${api.formatINR(offer.offer_amount)})`;
                    acceptBtn.style.margin = '8px 4px';
                    acceptBtn.onclick = async () => {
                        await api.fundMyStartupRequest(`/investment-offers/${offer.offer_id}/action/`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'accepted' }),
                        });
                        alert('Offer accepted!');
                        location.reload();
                    };
                    const rejectBtn = document.createElement('button');
                    rejectBtn.textContent = 'Reject';
                    rejectBtn.style.margin = '8px 4px';
                    rejectBtn.onclick = async () => {
                        await api.fundMyStartupRequest(`/investment-offers/${offer.offer_id}/action/`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'rejected' }),
                        });
                        alert('Offer rejected.');
                        location.reload();
                    };
                    activityBox.appendChild(acceptBtn);
                    activityBox.appendChild(rejectBtn);
                });
            }
        } catch (error) {
            alert(error.message || 'Failed to load dashboard.');
            if (error.message.includes('401') || error.message.includes('token')) {
                api.logoutUser();
            }
        }
    }

    // Load backend-api first
    const apiScript = document.createElement('script');
    apiScript.src = 'js/backend-api.js';
    apiScript.onload = waitForApi;
    document.body.appendChild(apiScript);
})();
