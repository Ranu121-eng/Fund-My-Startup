/**
 * Fund My Startup - Reset Password Flow
 */

document.addEventListener('DOMContentLoaded', () => {
    // Parse query params
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const email = urlParams.get('email');
    const userType = urlParams.get('type');

    if (!token || !email || !userType) {
        alert('Invalid or missing password reset parameters. Redirecting to login.');
        window.location.href = 'login.html';
        return;
    }

    const resetForm = document.getElementById('resetForm');
    
    if (resetForm) {
        resetForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const newPasswordInput = document.getElementById('newPassword');
            const confirmPasswordInput = document.getElementById('confirmPassword');
            
            const password = newPasswordInput.value;
            const confirmPassword = confirmPasswordInput.value;
            
            if (password.length < 6) {
                alert('Password must be at least 6 characters long.');
                return;
            }
            
            if (password !== confirmPassword) {
                alert('Passwords do not match.');
                return;
            }
            
            const submitBtn = resetForm.querySelector('.submit-btn');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Resetting...';
            
            try {
                const result = await window.FundMyStartupAPI.fundMyStartupRequest('/auth/reset-password/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: email,
                        token: token,
                        password: password,
                        user_type: userType
                    })
                });
                
                alert(result.message || 'Your password has been successfully reset. Redirecting to login.');
                window.location.href = 'login.html';
            } catch (error) {
                alert(error.message || 'An error occurred. Please try again.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }
});
