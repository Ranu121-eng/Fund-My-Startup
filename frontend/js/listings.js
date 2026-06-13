/**
 * Dynamic listings for index, explore, and startup pages.
 */
(function () {
    'use strict';

    function waitForDeps(callback) {
        if (window.FundMyStartupAPI && window.FundMyStartupComponents) {
            callback();
        } else {
            setTimeout(() => waitForDeps(callback), 50);
        }
    }

    function getQueryCategory() {
        return new URLSearchParams(window.location.search).get('category');
    }

    async function renderIndexCategories(api, components) {
        const cardsContainer = document.querySelector('.categories .cards');
        if (!cardsContainer) return;

        const exploreCard = cardsContainer.querySelector('.explore-card');
        try {
            const categories = await api.fundMyStartupRequest('/categories/');
            if (!Array.isArray(categories) || categories.length === 0) return;

            cardsContainer.querySelectorAll('.card:not(.explore-card)').forEach((el) => el.remove());

            const display = categories.slice(0, 3);
            display.forEach((cat) => {
                cardsContainer.insertBefore(components.buildCategoryCard(cat), exploreCard);
            });
        } catch (e) {
            console.warn('Categories not loaded on index:', e.message);
        }
    }

    async function renderFeaturedStartups(api, components, container, options = {}) {
        if (!container) return;

        const categoryFilter = options.category || getQueryCategory();
        let startups;
        try {
            const url = categoryFilter
                ? `/startups/?category=${encodeURIComponent(categoryFilter)}`
                : '/startups/';
            startups = await api.fundMyStartupRequest(url);
        } catch (e) {
            container.innerHTML = `<p class="fms-empty-state">Unable to load startups. ${e.message}</p>`;
            return;
        }

        const grid = container.querySelector('.fms-startup-grid') || container;
        if (grid !== container) {
            grid.innerHTML = '';
        } else {
            container.innerHTML = '';
            const inner = document.createElement('div');
            inner.className = 'fms-startup-grid';
            container.appendChild(inner);
        }

        const targetGrid = container.querySelector('.fms-startup-grid') || container;

        if (!Array.isArray(startups) || startups.length === 0) {
            targetGrid.innerHTML = `
                <div class="fms-empty-state">
                    <p>No approved startups${categoryFilter ? ` in ${categoryFilter}` : ''} yet.</p>
                    <p>Register your startup or check back after admin approval.</p>
                </div>`;
            return;
        }

        startups.forEach((s) => {
            targetGrid.appendChild(
                components.buildStartupCard(s, api, { showOfferButton: true, cardClass: 'fms-startup-card' })
            );
        });
    }

    function injectFeaturedSection(title, subtitle, parentEl) {
        if (document.getElementById('fms-featured-startups')) {
            return document.getElementById('fms-featured-startups');
        }

        const section = document.createElement('section');
        section.id = 'fms-featured-startups';
        section.className = 'fms-startups-section';
        section.innerHTML = `
            <h2>${title}</h2>
            <p class="fms-section-sub">${subtitle}</p>
            <div class="fms-startup-grid"></div>`;

        if (parentEl) {
            parentEl.appendChild(section);
        }
        return section;
    }

    async function initIndexPage(api, components) {
        components.ensureComponentStyles();
        await renderIndexCategories(api, components);

        const main = document.querySelector('.main-container');
        const section = injectFeaturedSection(
            'Featured Startups',
            'Discover approved startups actively seeking investment.',
            main
        );
        await renderFeaturedStartups(api, components, section);
    }

    async function initExplorePage(api, components) {
        components.ensureComponentStyles();
        const grid = document.querySelector('.category-grid');
        const categoryFilter = getQueryCategory();

        if (grid) {
            try {
                const categories = await api.fundMyStartupRequest('/categories/');
                if (Array.isArray(categories) && categories.length > 0) {
                    grid.innerHTML = '';
                    categories.forEach((cat) => {
                        const card = document.createElement('div');
                        card.className = 'category-card';
                        if (categoryFilter && cat.category_name === categoryFilter) {
                            card.classList.add('fms-filter-active');
                        }
                        card.innerHTML = `
                            <div class="category-image">
                                <img src="${components.getCategoryImage(cat.category_name)}" alt="${cat.category_name}">
                            </div>
                            <h3>${cat.category_name}</h3>
                            <p>${cat.description || 'Startups innovating in this sector.'}</p>
                            <div class="examples"><strong>View startups →</strong></div>`;
                        card.style.cursor = 'pointer';
                        card.addEventListener('click', () => {
                            window.location.href = `explore.html?category=${encodeURIComponent(cat.category_name)}`;
                        });
                        grid.appendChild(card);
                    });
                }
            } catch (e) {
                console.warn('Explore categories failed:', e.message);
            }
        }

        let startupsBlock = document.getElementById('fms-explore-startups');
        if (!startupsBlock) {
            startupsBlock = document.createElement('section');
            startupsBlock.id = 'fms-explore-startups';
            startupsBlock.className = 'explore-startups-block';
            const cta = document.querySelector('.startup-cta');
            if (cta) {
                cta.parentNode.insertBefore(startupsBlock, cta);
            } else {
                document.body.appendChild(startupsBlock);
            }
        }

        const title = categoryFilter
            ? `Startups in ${categoryFilter}`
            : 'Approved Startups';
        startupsBlock.innerHTML = `
            <h2>${title}</h2>
            <p class="fms-section-sub">Click a startup to view full profile and investment details.</p>
            <div class="fms-startup-grid"></div>
            ${categoryFilter ? '<p style="margin-top:16px"><a href="explore.html">← View all categories</a></p>' : ''}`;

        await renderFeaturedStartups(api, components, startupsBlock, { category: categoryFilter });
    }

    async function initStartupListingPage(api, components) {
        components.ensureComponentStyles();
        const section = document.querySelector('.startup-section');
        if (!section) return;

        const heading = section.querySelector('h1');
        const intro = section.querySelector('.intro-text');

        section.querySelectorAll('.startup-card').forEach((c) => c.remove());

        let grid = section.querySelector('.fms-startup-grid');
        if (!grid) {
            grid = document.createElement('div');
            grid.className = 'fms-startup-grid';
            section.appendChild(grid);
        }

        if (heading) heading.textContent = 'Approved Startups';
        if (intro) {
            intro.textContent = 'Browse verified startups on Fund My Startup. Click any card to view the full profile.';
        }

        await renderFeaturedStartups(api, components, section);
    }

    function initListings() {
        waitForDeps(async () => {
            const api = window.FundMyStartupAPI;
            const components = window.FundMyStartupComponents;
            const path = window.location.pathname.toLowerCase();

            if (path.includes('explore.html')) {
                await initExplorePage(api, components);
            } else if (path.includes('startup.html') && !path.includes('startup-register') && !path.includes('startup-dashboard')) {
                await initStartupListingPage(api, components);
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initListings);
    } else {
        initListings();
    }
})();
