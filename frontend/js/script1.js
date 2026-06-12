/**
 * Fund My Startup - Shared frontend UI behaviors (no duplicate globals).
 * API integration lives in backend-api.js
 */
(function () {
    'use strict';

    // Hero button (index page)
    const heroBtn = document.querySelector('.hero-btn');
    if (heroBtn) {
        heroBtn.addEventListener('click', () => {
            window.location.href = 'startup-register.html';
        });
    }

    // Active navbar link
    const currentPage = window.location.pathname.split('/').pop();
    document.querySelectorAll('.nav-links a, nav a').forEach((link) => {
        const href = link.getAttribute('href');
        if (href === currentPage) {
            link.classList.add('active');
        }
    });

    // Card hover effects
    document.querySelectorAll('.card, .startup-card, .terms-card').forEach((card) => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-8px)';
            card.style.transition = '0.3s';
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
        });
    });

    // Explore card
    const exploreCard = document.querySelector('.explore-card');
    if (exploreCard) {
        exploreCard.addEventListener('click', () => {
            window.location.href = 'explore.html';
        });
    }

    // Login / register dropdown
    const loginBtn = document.querySelector('.login-btn');
    const dropdownContent = document.querySelector('.dropdown-content');
    if (loginBtn && dropdownContent) {
        loginBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownContent.style.display =
                dropdownContent.style.display === 'block' ? 'none' : 'block';
        });
        document.addEventListener('click', () => {
            dropdownContent.style.display = 'none';
        });
    }

    // Social / footer link stubs
    document.querySelectorAll('.social-icons a, .footer-box a[href="#"]').forEach((link) => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
        });
    });

    // Smooth scroll for hash links
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener('click', function (e) {
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // Button hover
    document.querySelectorAll('.login-btn, .send-btn, .submit-btn').forEach((btn) => {
        btn.addEventListener('mouseenter', () => {
            btn.style.transform = 'scale(1.03)';
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'scale(1)';
        });
    });

    // File upload name display
    document.querySelectorAll('input[type="file"]').forEach((input) => {
        input.addEventListener('change', function () {
            const label = document.querySelector(`label[for="${this.id}"]`);
            if (label && this.files.length > 0) {
                const icon = label.querySelector('i');
                label.textContent = this.files[0].name;
                if (icon) {
                    label.appendChild(icon);
                }
            }
        });
    });

    // Login password toggle
    const togglePassword = document.getElementById('togglePassword');
    const passwordField = document.getElementById('password');
    if (togglePassword && passwordField) {
        togglePassword.addEventListener('click', () => {
            const isPassword = passwordField.type === 'password';
            passwordField.type = isPassword ? 'text' : 'password';
            togglePassword.classList.toggle('fa-eye', !isPassword);
            togglePassword.classList.toggle('fa-eye-slash', isPassword);
        });
    }

    // About page star animation
    const star = document.querySelector('.star');
    if (star) {
        star.addEventListener('mouseenter', () => {
            star.style.transform = 'scale(1.15)';
            star.style.transition = '0.3s';
        });
        star.addEventListener('mouseleave', () => {
            star.style.transform = 'scale(1)';
        });
    }

    // Social icon hover
    document.querySelectorAll('.social-icons img').forEach((icon) => {
        icon.addEventListener('mouseenter', () => {
            icon.style.transform = 'scale(1.1)';
            icon.style.transition = '0.3s ease';
        });
        icon.addEventListener('mouseleave', () => {
            icon.style.transform = 'scale(1)';
        });
    });
})();

// Load backend API + UI components + listings
(function loadAppScripts() {
    const scripts = ['js/backend-api.js', 'js/components.js', 'js/listings.js'];
    let index = 0;
    function loadNext() {
        if (index >= scripts.length) return;
        const script = document.createElement('script');
        script.src = scripts[index];
        script.async = false;
        script.onload = () => {
            index += 1;
            loadNext();
        };
        document.body.appendChild(script);
    }
    loadNext();
})();
