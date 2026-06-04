// Index page code
// ================= HERO BUTTON =================

const heroBtn = document.querySelector(".hero-btn");

if (heroBtn) {
    heroBtn.addEventListener("click", () => {
        window.location.href = "startup-register.html";
    });
}

// ================= ACTIVE NAVBAR =================

const currentPage = window.location.pathname.split("/").pop();

const navLinks = document.querySelectorAll("nav a");

navLinks.forEach(link => {

    const href = link.getAttribute("href");

    if (href === currentPage) {

        navLinks.forEach(item =>
            item.classList.remove("active")
        );

        link.classList.add("active");
    }
});

// ================= CATEGORY CARDS =================

const cards = document.querySelectorAll(".card");

cards.forEach(card => {

    card.addEventListener("mouseenter", () => {
        card.style.transform = "translateY(-8px)";
        card.style.transition = "0.3s";
    });

    card.addEventListener("mouseleave", () => {
        card.style.transform = "translateY(0)";
    });

});

// ================= EXPLORE CARD =================

const exploreCard = document.querySelector(".explore-card");

if (exploreCard) {

    exploreCard.addEventListener("click", () => {

        alert("More startup categories coming soon!");

    });

}

// ================= SOCIAL ICONS =================

const socialLinks = document.querySelectorAll(".social-icons a");

socialLinks.forEach(link => {

    link.addEventListener("click", (e) => {

        if(link.getAttribute("href") === "#"){

            e.preventDefault();

            alert("Social media link not added yet.");

        }

    });

});

// ================= FOOTER LINKS =================

const footerLinks = document.querySelectorAll(".footer-box a");

footerLinks.forEach(link => {

    link.addEventListener("mouseenter", () => {

        link.style.transition = "0.3s";

    });

});

// ================= PAGE LOADED =================

window.addEventListener("load", () => {

    console.log("Fund My Startup Website Loaded Successfully");

});
// Index Page Code End

// Startup Page Code
// ================= PAGE LOAD =================

document.addEventListener("DOMContentLoaded", function () {

    console.log("Startup Page Loaded Successfully");

});

// ================= ACTIVE NAVBAR =================

const currentPage = window.location.pathname.split("/").pop();

const navLinks = document.querySelectorAll(".nav-links a");

navLinks.forEach(link => {

    const linkPage = link.getAttribute("href");

    if (linkPage === currentPage) {

        navLinks.forEach(item =>
            item.classList.remove("active")
        );

        link.classList.add("active");
    }

});

// ================= LOGIN BUTTON =================

const loginBtn = document.querySelector(".login-btn");
const dropdown = document.querySelector(".dropdown-content");

if (loginBtn && dropdown) {

    loginBtn.addEventListener("click", function (e) {

        e.preventDefault();

        if (dropdown.style.display === "block") {
            dropdown.style.display = "none";
        } else {
            dropdown.style.display = "block";
        }

    });

    document.addEventListener("click", function (e) {

        if (!e.target.closest(".dropdown")) {
            dropdown.style.display = "none";
        }

    });

}

// ================= STARTUP CARDS HOVER =================

const startupCards = document.querySelectorAll(".startup-card");

startupCards.forEach(card => {

    card.addEventListener("mouseenter", () => {

        card.style.transform = "translateY(-8px)";
        card.style.transition = "0.3s ease";
        card.style.boxShadow = "0 8px 20px rgba(0,0,0,0.12)";

    });

    card.addEventListener("mouseleave", () => {

        card.style.transform = "translateY(0)";
        card.style.boxShadow = "0 2px 10px rgba(0,0,0,0.03)";

    });

});

// ================= STARTUP CARD CLICK =================

startupCards.forEach(card => {

    card.addEventListener("click", () => {

        const startupName =
            card.querySelector("h2").innerText;

        alert(startupName + "\n\nMore details will be available soon.");

    });

});

// ================= SCROLL ANIMATION =================

window.addEventListener("scroll", () => {

    const cards = document.querySelectorAll(".startup-card");

    cards.forEach(card => {

        const cardTop = card.getBoundingClientRect().top;

        if (cardTop < window.innerHeight - 100) {

            card.style.opacity = "1";
            card.style.transform = "translateY(0)";
            card.style.transition = "0.6s ease";

        }

    });

});

// ================= INITIAL CARD STATE =================

startupCards.forEach(card => {

    card.style.opacity = "0";
    card.style.transform = "translateY(40px)";

});

window.dispatchEvent(new Event("scroll"));
// Startup Page Code End

// Investor Page Code
// ================= PAGE LOAD =================

document.addEventListener("DOMContentLoaded", () => {

    console.log("Investor Page Loaded Successfully");

});

// ================= ACTIVE NAVBAR =================

const currentPage = window.location.pathname.split("/").pop();

const navLinks = document.querySelectorAll(".nav-links a");

navLinks.forEach(link => {

    const href = link.getAttribute("href");

    if (href === currentPage) {

        navLinks.forEach(item =>
            item.classList.remove("active")
        );

        link.classList.add("active");
    }
});

// ================= LOGIN DROPDOWN =================

const loginBtn = document.querySelector(".login-btn");
const dropdown = document.querySelector(".dropdown-content");

if (loginBtn && dropdown) {

    loginBtn.addEventListener("click", (e) => {

        e.preventDefault();

        if (dropdown.style.display === "block") {
            dropdown.style.display = "none";
        }
        else {
            dropdown.style.display = "block";
        }

    });

    document.addEventListener("click", (e) => {

        if (!e.target.closest(".dropdown")) {
            dropdown.style.display = "none";
        }

    });

}

// ================= CARD HOVER EFFECT =================

const cards = document.querySelectorAll(".card");

cards.forEach(card => {

    card.addEventListener("mouseenter", () => {

        card.style.transform = "translateY(-8px)";
        card.style.transition = "0.3s ease";
        card.style.boxShadow = "0 10px 25px rgba(0,0,0,0.12)";

    });

    card.addEventListener("mouseleave", () => {

        card.style.transform = "translateY(0)";
        card.style.boxShadow = "0 2px 5px rgba(0,0,0,0.04)";

    });

});

// ================= CARD CLICK =================

cards.forEach(card => {

    card.addEventListener("click", () => {

        const investorName =
            card.querySelector("h2").innerText;

        alert(
            investorName +
            "\n\nInvestor profile details will be available soon."
        );

    });

});

// ================= SCROLL ANIMATION =================

cards.forEach(card => {

    card.style.opacity = "0";
    card.style.transform = "translateY(40px)";

});

window.addEventListener("scroll", () => {

    cards.forEach(card => {

        const position =
            card.getBoundingClientRect().top;

        if (position < window.innerHeight - 100) {

            card.style.opacity = "1";
            card.style.transform = "translateY(0)";
            card.style.transition = "0.6s ease";

        }

    });

});

window.dispatchEvent(new Event("scroll"));

// ================= STAR ANIMATION =================

const star = document.querySelector(".star");

if (star) {

    setInterval(() => {

        star.style.transform = "scale(1.15)";

        setTimeout(() => {

            star.style.transform = "scale(1)";

        }, 500);

    }, 1000);

}
// Investor Page Code End

// About Page Code
document.addEventListener("DOMContentLoaded", function () {

    // =============================
    // ACTIVE NAVBAR LINK
    // =============================

    const navLinks = document.querySelectorAll(".nav-links a");

    navLinks.forEach(link => {

        if (
            link.href === window.location.href ||
            window.location.pathname.includes(link.getAttribute("href"))
        ) {
            link.classList.add("active");
        }

    });

    // =============================
    // LOGIN BUTTON EFFECT
    // =============================

    const loginBtn = document.querySelector(".login-btn");

    if(loginBtn){

        loginBtn.addEventListener("click", function(){

            console.log("Login/Register clicked");

        });

    }

    // =============================
    // SOCIAL ICON CLICK
    // =============================

    const socialLinks = document.querySelectorAll(".social-icons a");

    socialLinks.forEach(link => {

        link.addEventListener("click", function(e){

            if(this.getAttribute("href") === "#"){

                e.preventDefault();

                alert("Social media link will be added soon.");

            }

        });

    });

    // =============================
    // ABOUT CARD ANIMATION
    // =============================

    const aboutCard = document.querySelector(".about-card");

    if(aboutCard){

        aboutCard.style.opacity = "0";
        aboutCard.style.transform = "translateY(30px)";
        aboutCard.style.transition = "0.8s ease";

        setTimeout(() => {

            aboutCard.style.opacity = "1";
            aboutCard.style.transform = "translateY(0)";

        }, 300);

    }

});
//About Page Code End

// Contact Page Code
// ================= CONTACT FORM VALIDATION =================

document.addEventListener("DOMContentLoaded", () => {

    const contactForm = document.getElementById("contactForm");

    if (contactForm) {

        contactForm.addEventListener("submit", function (e) {

            e.preventDefault();

            const name = this.querySelector('input[type="text"]').value.trim();
            const email = this.querySelector('input[type="email"]').value.trim();
            const message = this.querySelector("textarea").value.trim();

            // Empty field validation
            if (name === "" || email === "" || message === "") {
                alert("Please fill all fields.");
                return;
            }

            // Email validation
            const emailPattern =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!emailPattern.test(email)) {
                alert("Please enter a valid email address.");
                return;
            }

            // Success message
            alert("Message sent successfully!");

            // Reset form
            contactForm.reset();
        });
    }

});


// ================= ACTIVE NAVIGATION =================

const navLinks = document.querySelectorAll(".nav-links a");

navLinks.forEach(link => {

    link.addEventListener("click", () => {

        navLinks.forEach(item =>
            item.classList.remove("active")
        );

        link.classList.add("active");
    });

});


// ================= SMOOTH SCROLL =================

document.querySelectorAll('a[href^="#"]').forEach(anchor => {

    anchor.addEventListener("click", function (e) {

        e.preventDefault();

        const target = document.querySelector(
            this.getAttribute("href")
        );

        if (target) {
            target.scrollIntoView({
                behavior: "smooth"
            });
        }
    });

});


// ================= BUTTON HOVER EFFECT =================

const buttons = document.querySelectorAll(
    ".login-btn, .send-btn"
);

buttons.forEach(button => {

    button.addEventListener("mouseenter", () => {
        button.style.transform = "scale(1.03)";
    });

    button.addEventListener("mouseleave", () => {
        button.style.transform = "scale(1)";
    });

});
// Contact Page Code End

// Startup Register Page Code
// ================= STARTUP REGISTRATION FORM =================

document.addEventListener("DOMContentLoaded", () => {

    const startupForm = document.getElementById("startupForm");

    if (startupForm) {

        startupForm.addEventListener("submit", function (e) {

            e.preventDefault();

            const inputs = startupForm.querySelectorAll("input");
            const fullName = inputs[0].value.trim();
            const email = inputs[1].value.trim();
            const contact = inputs[2].value.trim();
            const password = inputs[3].value.trim();

            // Name validation
            if (fullName.length < 3) {
                alert("Please enter a valid full name.");
                return;
            }

            // Email validation
            const emailPattern =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!emailPattern.test(email)) {
                alert("Please enter a valid email address.");
                return;
            }

            // Contact validation
            const phonePattern = /^[0-9]{10}$/;

            if (!phonePattern.test(contact)) {
                alert("Contact number must contain 10 digits.");
                return;
            }

            // Password validation
            if (password.length < 6) {
                alert("Password must be at least 6 characters.");
                return;
            }

            // Checkbox validation
            const checkbox =
                document.querySelector('.checkbox-area input[type="checkbox"]');

            if (!checkbox.checked) {
                alert("Please accept Terms & Privacy Policy.");
                return;
            }

            alert("Startup Registration Submitted Successfully!");

            startupForm.reset();
        });
    }

});


// ================= FILE UPLOAD NAME DISPLAY =================

const fileInputs = document.querySelectorAll('input[type="file"]');

fileInputs.forEach(input => {

    input.addEventListener("change", function () {

        const label = this.previousElementSibling;

        if (this.files.length > 0) {

            label.innerHTML =
                this.files[0].name +
                ' <i class="fa-regular fa-file-lines"></i>';

        }
    });

});


// ================= BUTTON HOVER EFFECT =================

const submitBtn = document.querySelector(".submit-btn");

if (submitBtn) {

    submitBtn.addEventListener("mouseenter", () => {
        submitBtn.style.transform = "scale(1.05)";
    });

    submitBtn.addEventListener("mouseleave", () => {
        submitBtn.style.transform = "scale(1)";
    });

}


// ================= ACTIVE NAVIGATION =================

const navLinks = document.querySelectorAll(".nav-links a");

navLinks.forEach(link => {

    link.addEventListener("click", () => {

        navLinks.forEach(item =>
            item.classList.remove("active")
        );

        link.classList.add("active");
    });

});
// Startup Register Page Code End

// Investor Register Page Code
// ===============================
// FUND MY STARTUP - SCRIPT.JS
// ===============================

document.addEventListener("DOMContentLoaded", () => {

    // ===============================
    // ACTIVE NAVBAR LINK
    // ===============================

    const currentPage = window.location.pathname.split("/").pop();

    document.querySelectorAll(".nav-links a").forEach(link => {

        const href = link.getAttribute("href");

        if (href === currentPage) {
            link.classList.add("active");
        } else {
            link.classList.remove("active");
        }

    });

    // ===============================
    // CONTACT FORM
    // ===============================

    const contactForm = document.getElementById("contactForm");

    if (contactForm) {

        contactForm.addEventListener("submit", function (e) {

            e.preventDefault();

            const inputs = contactForm.querySelectorAll("input, textarea");

            let isValid = true;

            inputs.forEach(input => {

                if (input.value.trim() === "") {
                    isValid = false;
                }

            });

            if (!isValid) {

                alert("Please fill all fields.");

                return;
            }

            alert("Message sent successfully!");

            contactForm.reset();

        });

    }

    // ===============================
    // STARTUP REGISTER FORM
    // ===============================

    const startupForm = document.getElementById("startupForm");

    if (startupForm) {

        startupForm.addEventListener("submit", function (e) {

            e.preventDefault();

            const checkbox = startupForm.querySelector(
                '.checkbox-area input[type="checkbox"]'
            );

            if (checkbox && !checkbox.checked) {

                alert("Please accept Terms & Privacy Policy.");

                return;
            }

            alert("Registration Submitted Successfully!");

            startupForm.reset();

        });

    }

    // ===============================
    // FILE UPLOAD NAME DISPLAY
    // ===============================

    const fileInputs = document.querySelectorAll('input[type="file"]');

    fileInputs.forEach(input => {

        input.addEventListener("change", function () {

            const fileName =
                this.files.length > 0
                    ? this.files[0].name
                    : "No file selected";

            const label = document.querySelector(
                `label[for="${this.id}"]`
            );

            if (label) {

                const icon = label.querySelector("i");

                label.innerHTML = fileName;

                if (icon) {
                    label.appendChild(icon);
                }

            }

        });

    });

    // ===============================
    // SMOOTH SCROLL
    // ===============================

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {

        anchor.addEventListener("click", function (e) {

            const target = document.querySelector(
                this.getAttribute("href")
            );

            if (target) {

                e.preventDefault();

                target.scrollIntoView({
                    behavior: "smooth"
                });

            }

        });

    });

});
// Investor Register Page Code End

// Login Page Code
// LOGIN PASSWORD SHOW/HIDE

const togglePassword = document.getElementById("togglePassword");
const password = document.getElementById("password");

if(togglePassword && password){

    togglePassword.addEventListener("click", () => {

        if(password.type === "password"){

            password.type = "text";

            togglePassword.classList.remove("fa-eye");
            togglePassword.classList.add("fa-eye-slash");

        }else{

            password.type = "password";

            togglePassword.classList.remove("fa-eye-slash");
            togglePassword.classList.add("fa-eye");

        }

    });

}

// LOGIN FORM

const loginForm = document.getElementById("loginForm");

if(loginForm){

    loginForm.addEventListener("submit",(e)=>{

        e.preventDefault();

        alert("Login Successful!");

        loginForm.reset();

    });

}
// Login Page Code End
const togglePassword = document.getElementById("togglePassword");
const password = document.getElementById("password");

togglePassword.addEventListener("click", () => {

    if(password.type === "password"){

        password.type = "text";

        togglePassword.classList.remove("fa-eye");
        togglePassword.classList.add("fa-eye-slash");

    }else{

        password.type = "password";

        togglePassword.classList.remove("fa-eye-slash");
        togglePassword.classList.add("fa-eye");
    }

});
// Login Page Code End

// Help & Support Page Code
// ===============================
// LOGIN / REGISTER DROPDOWN
// ===============================

const dropdownBtn = document.querySelector(".login-btn");
const dropdownContent = document.querySelector(".dropdown-content");

if (dropdownBtn && dropdownContent) {

    dropdownBtn.addEventListener("click", function (e) {

        e.stopPropagation();

        if (
            dropdownContent.style.display === "block"
        ) {
            dropdownContent.style.display = "none";
        } else {
            dropdownContent.style.display = "block";
        }

    });

    document.addEventListener("click", function () {
        dropdownContent.style.display = "none";
    });

}

// ===============================
// SMOOTH SCROLL (OPTIONAL)
// ===============================

document.querySelectorAll('a[href^="#"]').forEach(link => {

    link.addEventListener("click", function(e){

        const target = document.querySelector(
            this.getAttribute("href")
        );

        if(target){

            e.preventDefault();

            target.scrollIntoView({
                behavior: "smooth"
            });

        }

    });

});

// ===============================
// PAGE LOADED
// ===============================

window.addEventListener("load", function(){

    console.log("Fund My Startup Loaded Successfully");

});
// Help & Support Page Code End

// Terms & Conditions Page Code
// ================================
// DROPDOWN MENU TOGGLE
// ================================

const loginBtn = document.querySelector(".login-btn");
const dropdownContent = document.querySelector(".dropdown-content");

if (loginBtn && dropdownContent) {

    loginBtn.addEventListener("click", function (e) {

        e.stopPropagation();

        dropdownContent.style.display =
            dropdownContent.style.display === "block"
                ? "none"
                : "block";
    });

    document.addEventListener("click", function () {
        dropdownContent.style.display = "none";
    });

}

// ================================
// CARD HOVER EFFECT
// ================================

const termsCards = document.querySelectorAll(".terms-card");

termsCards.forEach(card => {

    card.addEventListener("mouseenter", () => {

        card.style.transform = "translateY(-5px)";
        card.style.transition = "0.3s ease";
        card.style.boxShadow = "0 10px 25px rgba(0,0,0,0.12)";

    });

    card.addEventListener("mouseleave", () => {

        card.style.transform = "translateY(0)";
        card.style.boxShadow = "0 2px 10px rgba(0,0,0,0.08)";

    });

});

// ================================
// SOCIAL ICONS EFFECT
// ================================

const socialIcons = document.querySelectorAll(".social-icons img");

socialIcons.forEach(icon => {

    icon.addEventListener("mouseenter", () => {

        icon.style.transform = "scale(1.1)";
        icon.style.transition = "0.3s ease";

    });

    icon.addEventListener("mouseleave", () => {

        icon.style.transform = "scale(1)";

    });

});

// ================================
// SMOOTH SCROLL
// ================================

document.querySelectorAll('a[href^="#"]').forEach(anchor => {

    anchor.addEventListener("click", function(e) {

        const target = document.querySelector(
            this.getAttribute("href")
        );

        if(target){

            e.preventDefault();

            target.scrollIntoView({
                behavior: "smooth"
            });

        }

    });

});

// ================================
// PAGE LOADED MESSAGE
// ================================

window.addEventListener("load", () => {

    console.log("Terms & Conditions Page Loaded");

});
// Terms & Conditions Page Code End

// Explore Page Code
document.addEventListener("DOMContentLoaded", () => {

    const cards = document.querySelectorAll(".category-card");

    cards.forEach(card => {

        card.addEventListener("mouseenter", () => {
            card.style.transform = "translateY(-8px)";
        });

        card.addEventListener("mouseleave", () => {
            card.style.transform = "translateY(0)";
        });

    });

});
// Explore Page Code Ends

// How it works Page Code
document.addEventListener("DOMContentLoaded", () => {

    const cards = document.querySelectorAll(".step-card");

    cards.forEach(card => {

        card.addEventListener("mouseenter", () => {

            card.style.transform = "translateY(-8px)";
        });

        card.addEventListener("mouseleave", () => {

            card.style.transform = "translateY(0)";
        });

    });

});
// How it works Page Code Ends