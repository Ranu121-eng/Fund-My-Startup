/**
 * Fund My Startup - Email Verification Flow
 */

document.addEventListener('DOMContentLoaded', async () => {
    const heading = document.getElementById('verifyHeading');
    const message = document.getElementById('verifyMessage');
    const statusSubtitle = document.getElementById('verifyStatusSubtitle');
    const actionBtn = document.getElementById('actionBtn');

    // Parse query params
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const email = urlParams.get('email');
    const userType = urlParams.get('type');

    if (!token || !email || !userType) {
        heading.textContent = "Invalid Request";
        heading.style.color = "#d9534f";
        message.textContent = "The verification link is incomplete or corrupted. Please register again or contact support.";
        statusSubtitle.textContent = "Verification Failed";
        actionBtn.textContent = "Go to Login";
        actionBtn.href = "login.html";
        actionBtn.style.display = "inline-block";
        return;
    }

    try {
        const result = await window.FundMyStartupAPI.fundMyStartupRequest('/auth/verify-email/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: token,
                email: email,
                user_type: userType
            })
        });

        heading.textContent = "Verified!";
        heading.style.color = "#5cb85c";
        message.innerHTML = `Your email address (<strong>${email}</strong>) has been successfully verified.<br>Your account is now pending admin review and approval. You will be redirected to the login page shortly.`;
        statusSubtitle.textContent = "Verification Successful";
        actionBtn.textContent = "Proceed to Login";
        actionBtn.href = "login.html";
        actionBtn.style.display = "inline-block";

        // Auto-redirect to login after 5 seconds
        setTimeout(() => {
            window.location.href = "login.html";
        }, 5000);

    } catch (error) {
        heading.textContent = "Verification Failed";
        heading.style.color = "#d9534f";
        message.textContent = error.message || "The verification link is invalid, expired, or has already been used.";
        statusSubtitle.textContent = "Error Occurred";
        actionBtn.textContent = "Back to Login";
        actionBtn.href = "login.html";
        actionBtn.style.display = "inline-block";
    }
});
