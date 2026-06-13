/**
 * Fund My Startup - Backend API integration
 */
const FUNDMYSTARTUP_API_BASE = window.FUNDMYSTARTUP_API_BASE || 'http://127.0.0.1:8000/api';

async function fundMyStartupRequest(endpoint, options = {}) {
    const token = localStorage.getItem('fms_access_token');
    const headers = { ...(options.headers || {}) };

    if (token && !headers.Authorization) {
        headers.Authorization = `Bearer ${token}`;
    }

    let response;
    try {
        response = await fetch(`${FUNDMYSTARTUP_API_BASE}${endpoint}`, {
            ...options,
            headers,
        });
    } catch (error) {
        throw new Error(
            'Cannot connect to backend. Run: cd backend && python manage.py runserver'
        );
    }

    let data = {};
    try {
        data = await response.json();
    } catch (error) {
        data = { success: false, message: 'Invalid server response.' };
    }

    if (response.status === 401 && localStorage.getItem('fms_refresh_token')) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
            return fundMyStartupRequest(endpoint, options);
        }
    }

    if (!response.ok) {
        const message = data.message || data.detail || formatApiErrors(data);
        throw new Error(message || 'Request failed.');
    }

    return data;
}

async function refreshAccessToken() {
    const refresh = localStorage.getItem('fms_refresh_token');
    if (!refresh) {
        return false;
    }
    try {
        const response = await fetch(`${FUNDMYSTARTUP_API_BASE}/auth/token/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh }),
        });
        const data = await response.json();
        if (response.ok && data.access) {
            localStorage.setItem('fms_access_token', data.access);
            return true;
        }
    } catch (e) {
        /* ignore */
    }
    clearAuthSession();
    return false;
}

function formatApiErrors(data) {
    if (typeof data === 'string') return data;
    if (Array.isArray(data)) return data.join(', ');
    if (data && typeof data === 'object') {
        return Object.entries(data)
            .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
            .join('\n');
    }
    return 'Request failed.';
}

function saveAuthSession(payload) {
    if (payload.tokens) {
        localStorage.setItem('fms_access_token', payload.tokens.access);
        localStorage.setItem('fms_refresh_token', payload.tokens.refresh);
    }
    localStorage.setItem('fms_user_type', payload.user_type);
    localStorage.setItem('fms_user_id', String(payload.user_id));
    localStorage.setItem('fms_display_name', payload.display_name || '');
    if (payload.profile_status) {
        localStorage.setItem('fms_profile_status', payload.profile_status);
    }
}

function clearAuthSession() {
    [
        'fms_access_token', 'fms_refresh_token', 'fms_user_type',
        'fms_user_id', 'fms_display_name', 'fms_profile_status',
    ].forEach((key) => localStorage.removeItem(key));
}

function requireAuth(expectedType) {
    const token = localStorage.getItem('fms_access_token');
    const userType = localStorage.getItem('fms_user_type');
    if (!token || !userType) {
        window.location.href = 'login.html';
        return false;
    }
    if (expectedType && userType !== expectedType) {
        if (userType === 'admin') {
            window.location.href = 'admin-dashboard.html';
        } else if (userType === 'investor') {
            window.location.href = 'investor-dashboard.html';
        } else {
            window.location.href = 'startup-dashboard.html';
        }
        return false;
    }
    return true;
}

function logoutUser() {
    clearAuthSession();
    window.location.href = 'login.html';
}

function formatINR(amount) {
    const num = Number(amount);
    if (Number.isNaN(num)) return amount;
    if (num >= 10000000) return `₹ ${(num / 10000000).toFixed(1)} Cr`;
    if (num >= 100000) return `₹ ${(num / 100000).toFixed(1)} L`;
    return `₹ ${num.toLocaleString('en-IN')}`;
}

function isPlaceholderSelect(value) {
    if (!value) return true;
    const lower = value.toLowerCase();
    return lower.startsWith('select') || lower.includes('category/domain') ||
        lower.includes('funding required') || lower.includes('investment range') ||
        lower.includes('investor domain') || lower === 'select country' ||
        lower === 'select state' || lower === 'select district';
}

function validateRegistrationForm(form, isInvestor) {
    const inputs = form.querySelectorAll('input[required], input[type="email"], input[type="password"]');
    inputs.forEach((input) => {
        if (input.type === 'checkbox') return;
        if (!input.value.trim()) {
            throw new Error('Please fill all required fields.');
        }
    });

    const email = form.querySelector('input[type="email"]');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
        throw new Error('Please enter a valid email address.');
    }

    const phoneInput = form.querySelectorAll('input')[2];
    if (phoneInput && !/^[0-9]{10}$/.test(phoneInput.value.trim())) {
        throw new Error('Contact number must be 10 digits.');
    }

    const passwordInput = form.querySelector('input[type="password"]');
    if (passwordInput && passwordInput.value.length < 6) {
        throw new Error('Password must be at least 6 characters.');
    }

    form.querySelectorAll('select[required]').forEach((sel) => {
        if (isPlaceholderSelect(sel.value)) {
            throw new Error('Please complete all dropdown selections.');
        }
    });

    const locationSelects = form.querySelectorAll('.grid-3 select');
    locationSelects.forEach((sel) => {
        if (!sel.value || isPlaceholderSelect(sel.value)) {
            throw new Error('Please select country, state, and district.');
        }
    });

    const aadhaar = form.querySelector('#aadhaarUpload');
    const pitch = form.querySelector('#pitchUpload, #pitchDeckUpload');
    const pan = form.querySelector('#panUpload');
    if (!aadhaar?.files[0] || !pitch?.files[0] || !pan?.files[0]) {
        throw new Error('Please upload Aadhaar, Pitch Deck, and PAN documents.');
    }
}

async function submitContactToApi(name, email, message) {
    return fundMyStartupRequest('/contact/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
    });
}

async function submitLoginToApi(email, password, userType) {
    return fundMyStartupRequest('/auth/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, user_type: userType.toLowerCase() }),
    });
}

function collectStartupRegistrationForm(form) {
    const inputs = form.querySelectorAll('input');
    const selects = form.querySelectorAll('select');
    const textarea = form.querySelector('textarea');
    const formData = new FormData();
    formData.append('founder_name', inputs[0].value.trim());
    formData.append('email', inputs[1].value.trim());
    formData.append('phone', inputs[2].value.trim());
    formData.append('password', inputs[3].value);
    formData.append('company_name', inputs[4].value.trim());
    formData.append('website_url', inputs[5].value.trim());
    formData.append('category_name', selects[0].value);
    formData.append('startup_description', textarea ? textarea.value.trim() : '');
    formData.append('funding_range', selects[1] ? selects[1].value : '');
    const locationSelects = form.querySelectorAll('.grid-3 select');
    formData.append('country', locationSelects[0]?.value || '');
    formData.append('state', locationSelects[1]?.value || '');
    formData.append('district', locationSelects[2]?.value || '');
    formData.append('aadhaar_card', form.querySelector('#aadhaarUpload').files[0]);
    formData.append('pitch_deck', form.querySelector('#pitchUpload, #pitchDeckUpload').files[0]);
    formData.append('pan_card', form.querySelector('#panUpload').files[0]);
    return formData;
}

function collectInvestorRegistrationForm(form) {
    const inputs = form.querySelectorAll('input');
    const selects = form.querySelectorAll('select');
    const formData = new FormData();
    formData.append('full_name', inputs[0].value.trim());
    formData.append('email', inputs[1].value.trim());
    formData.append('phone', inputs[2].value.trim());
    formData.append('password', inputs[3].value);
    formData.append('investor_type', inputs[4].value.trim());
    formData.append('investor_domain', selects[0].value);
    formData.append('company_name', inputs[5].value.trim());
    formData.append('investor_description', '');
    formData.append('investment_range', selects[1]?.value || '');
    const locationSelects = form.querySelectorAll('.grid-3 select');
    formData.append('country', locationSelects[0]?.value || '');
    formData.append('state', locationSelects[1]?.value || '');
    formData.append('district', locationSelects[2]?.value || '');
    formData.append('aadhaar_card', form.querySelector('#aadhaarUpload').files[0]);
    formData.append('pitch_deck', form.querySelector('#pitchDeckUpload, #pitchUpload').files[0]);
    formData.append('pan_card', form.querySelector('#panUpload').files[0]);
    return formData;
}

async function loadApprovedStartups() {
    return fundMyStartupRequest('/startups/');
}

async function loadCategories() {
    return fundMyStartupRequest('/categories/');
}

function bindBackendForms() {
    const contactForm = document.getElementById('contactForm');
    if (contactForm && !contactForm.dataset.apiBound) {
        contactForm.dataset.apiBound = 'true';
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            e.stopImmediatePropagation();
            const name = contactForm.querySelector('input[type="text"]').value.trim();
            const email = contactForm.querySelector('input[type="email"]').value.trim();
            const message = contactForm.querySelector('textarea').value.trim();
            if (!name || !email || !message) {
                alert('Please fill all fields.');
                return;
            }
            try {
                const result = await submitContactToApi(name, email, message);
                alert(result.message || 'Message sent successfully!');
                contactForm.reset();
            } catch (error) {
                alert(error.message);
            }
        }, true);
    }

    const registrationForm = document.getElementById('startupForm');
    if (registrationForm && !registrationForm.dataset.apiBound) {
        registrationForm.dataset.apiBound = 'true';
        registrationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            e.stopImmediatePropagation();
            const checkbox = registrationForm.querySelector('.checkbox-area input[type="checkbox"]');
            if (checkbox && !checkbox.checked) {
                alert('Please accept Terms & Privacy Policy.');
                return;
            }
            const isInvestor = window.location.pathname.toLowerCase().includes('investor-register');
            try {
                validateRegistrationForm(registrationForm, isInvestor);
                if (isInvestor) {
                    const result = await fundMyStartupRequest('/register/investor/', {
                        method: 'POST',
                        body: collectInvestorRegistrationForm(registrationForm),
                    });
                    alert(result.message || 'Investor registration submitted!');
                } else {
                    const result = await fundMyStartupRequest('/register/startup/', {
                        method: 'POST',
                        body: collectStartupRegistrationForm(registrationForm),
                    });
                    alert(result.message || 'Startup registration submitted!');
                }
                registrationForm.reset();
            } catch (error) {
                alert(error.message);
            }
        }, true);
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm && !loginForm.dataset.apiBound) {
        loginForm.dataset.apiBound = 'true';
        let twoFactorToken = null;

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            e.stopImmediatePropagation();
            const emailInput = loginForm.querySelector('input[type="text"], input[type="email"]');
            const passwordInput = loginForm.querySelector('input[type="password"]');
            const userTypeSelect = loginForm.querySelector('select');
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            const userTypeRaw = userTypeSelect.value;
            if (!email || !password || userTypeRaw.toLowerCase() === 'select') {
                alert('Please fill all login fields and select user type.');
                return;
            }
            try {
                const result = await submitLoginToApi(email, password, userTypeRaw);
                if (result.requires_2fa) {
                    twoFactorToken = result.two_factor_token;
                    document.getElementById('loginFields').style.display = 'none';
                    document.getElementById('twoFactorContainer').style.display = 'block';
                    return;
                }
                handleLoginSuccess(result);
            } catch (error) {
                alert(error.message);
            }
        }, true);

        const verify2faBtn = document.getElementById('verify2faBtn');
        if (verify2faBtn) {
            verify2faBtn.addEventListener('click', async () => {
                const otpCodeInput = document.getElementById('otpCode');
                const otpCode = otpCodeInput.value.trim();
                if (!otpCode || otpCode.length !== 6) {
                    alert('Please enter a 6-digit verification code.');
                    return;
                }
                try {
                    verify2faBtn.disabled = true;
                    const result = await fundMyStartupRequest('/auth/login-2fa/', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            two_factor_token: twoFactorToken,
                            otp_code: otpCode
                        })
                    });
                    handleLoginSuccess(result);
                } catch (error) {
                    alert(error.message);
                } finally {
                    verify2faBtn.disabled = false;
                }
            });
        }

        const cancel2faLink = document.getElementById('cancel2faLink');
        if (cancel2faLink) {
            cancel2faLink.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('loginFields').style.display = 'block';
                document.getElementById('twoFactorContainer').style.display = 'none';
                document.getElementById('otpCode').value = '';
                twoFactorToken = null;
            });
        }

        function handleLoginSuccess(result) {
            saveAuthSession(result);
            if (result.profile_status === 'rejected') {
                alert('Your account was rejected. Contact support.');
                clearAuthSession();
                return;
            }
            if (result.profile_status === 'pending' && result.user_type !== 'admin') {
                alert('Login successful. Your profile is pending admin approval.');
            }
            if (result.user_type === 'startup') {
                window.location.href = 'startup-dashboard.html';
            } else if (result.user_type === 'investor') {
                window.location.href = 'investor-dashboard.html';
            } else if (result.user_type === 'admin') {
                window.location.href = 'admin-dashboard.html';
            }
            loginForm.reset();
        }
    }

    document.querySelectorAll('.logout-btn').forEach((btn) => {
        btn.addEventListener('click', () => logoutUser());
    });
}

async function populateStartupListingPage() {
    /* Handled by listings.js */
}

async function populateCategoryDropdowns() {
    try {
        const categories = await loadCategories();
        if (!Array.isArray(categories)) return;
        document.querySelectorAll('select').forEach((sel) => {
            const first = sel.options[0]?.textContent || '';
            if (first.toLowerCase().includes('category') || first.toLowerCase().includes('domain')) {
                const placeholder = sel.options[0];
                sel.innerHTML = '';
                sel.appendChild(placeholder);
                categories.forEach((cat) => {
                    const opt = document.createElement('option');
                    opt.value = cat.category_name;
                    opt.textContent = cat.category_name;
                    sel.appendChild(opt);
                });
            }
        });
    } catch (e) {
        console.warn('Categories not loaded:', e.message);
    }
}

function initApp() {
    bindBackendForms();
    if (window.location.pathname.includes('register')) {
        populateCategoryDropdowns();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Export for dashboard scripts
window.FundMyStartupAPI = {
    fundMyStartupRequest,
    requireAuth,
    logoutUser,
    formatINR,
    clearAuthSession,
    loadApprovedStartups,
    loadCategories,
};
