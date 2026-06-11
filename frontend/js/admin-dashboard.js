/**
 * Platform Admin Dashboard - approve startups and investors via API
 */
(function () {
    'use strict';

    function waitForApi() {
        if (window.FundMyStartupAPI) {
            initAdmin();
        } else {
            setTimeout(waitForApi, 50);
        }
    }

    async function approveStartup(api, id, status) {
        await api.fundMyStartupRequest(`/admin/startups/${id}/approve/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profile_status: status }),
        });
    }

    async function approveInvestor(api, id, status) {
        await api.fundMyStartupRequest(`/admin/investors/${id}/approve/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profile_status: status }),
        });
    }

    async function initAdmin() {
        const api = window.FundMyStartupAPI;
        if (!api.requireAuth('admin')) return;

        document.querySelector('.logout-btn')?.addEventListener('click', () => api.logoutUser());

        try {
            const data = await api.fundMyStartupRequest('/dashboard/admin/');
            const stats = data.stats || {};

            const statsEl = document.getElementById('adminStats');
            if (statsEl) {
                statsEl.innerHTML = `
                    <div class="card"><h2>${stats.total_startups || 0}</h2><p>Total Startups</p></div>
                    <div class="card"><h2>${stats.pending_startups || 0}</h2><p>Pending Startups</p></div>
                    <div class="card"><h2>${stats.total_investors || 0}</h2><p>Total Investors</p></div>
                    <div class="card"><h2>${stats.pending_investors || 0}</h2><p>Pending Investors</p></div>`;
            }

            const startupsEl = document.getElementById('pendingStartups');
            if (startupsEl) {
                startupsEl.innerHTML = '<div class="dashboard-box"><h2>Pending Startups</h2></div>';
                const box = startupsEl.querySelector('.dashboard-box');
                const pending = data.pending_startups || [];
                if (pending.length === 0) {
                    box.innerHTML += '<p>No pending startups.</p>';
                } else {
                    pending.forEach((s) => {
                        const row = document.createElement('div');
                        row.style.margin = '12px 0';
                        row.innerHTML = `<p><strong>${s.company_name}</strong> — ${s.founder_name} (${s.email})</p>`;
                        const approve = document.createElement('button');
                        approve.textContent = 'Approve';
                        approve.onclick = async () => {
                            await approveStartup(api, s.startup_id, 'approved');
                            location.reload();
                        };
                        const reject = document.createElement('button');
                        reject.textContent = 'Reject';
                        reject.style.marginLeft = '8px';
                        reject.onclick = async () => {
                            await approveStartup(api, s.startup_id, 'rejected');
                            location.reload();
                        };
                        row.appendChild(approve);
                        row.appendChild(reject);
                        box.appendChild(row);
                    });
                }
            }

            const investorsEl = document.getElementById('pendingInvestors');
            if (investorsEl) {
                investorsEl.innerHTML = '<div class="dashboard-box"><h2>Pending Investors</h2></div>';
                const box = investorsEl.querySelector('.dashboard-box');
                const pending = data.pending_investors || [];
                if (pending.length === 0) {
                    box.innerHTML += '<p>No pending investors.</p>';
                } else {
                    pending.forEach((inv) => {
                        const row = document.createElement('div');
                        row.style.margin = '12px 0';
                        row.innerHTML = `<p><strong>${inv.full_name}</strong> — ${inv.email} (${inv.investor_type})</p>`;
                        const approve = document.createElement('button');
                        approve.textContent = 'Approve';
                        approve.onclick = async () => {
                            await approveInvestor(api, inv.investor_id, 'approved');
                            location.reload();
                        };
                        const reject = document.createElement('button');
                        reject.textContent = 'Reject';
                        reject.style.marginLeft = '8px';
                        reject.onclick = async () => {
                            await approveInvestor(api, inv.investor_id, 'rejected');
                            location.reload();
                        };
                        row.appendChild(approve);
                        row.appendChild(reject);
                        box.appendChild(row);
                    });
                }
            }
        } catch (error) {
            alert(error.message || 'Failed to load admin dashboard.');
        }
    }

    const apiScript = document.createElement('script');
    apiScript.src = 'js/backend-api.js';
    apiScript.onload = waitForApi;
    document.body.appendChild(apiScript);
})();
