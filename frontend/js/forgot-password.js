/**
 * Fund My Startup - Forgot Password Flow
 */

document.addEventListener('DOMContentLoaded', () => {
    const forgotForm = document.getElementById('forgotForm');
    
    if (forgotForm) {
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const emailInput = document.getElementById('resetEmail');
            const userTypeSelect = document.getElementById('userTypeSelect');
            
            const email = emailInput.value.trim();
            const userType = userTypeSelect.value;
            
            if (!email || !userType) {
                alert('Please fill in your email and select an account type.');
                return;
            }
            
            const submitBtn = forgotForm.querySelector('.submit-btn');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending...';
            
            try {
                const result = await window.FundMyStartupAPI.fundMyStartupRequest('/auth/forgot-password/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: email,
                        user_type: userType
                    })
                });
                
                alert(result.message || 'If the email is registered, a password reset link has been sent to it.');
                forgotForm.reset();
            } catch (error) {
                alert(error.message || 'An error occurred. Please try again.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }
});
