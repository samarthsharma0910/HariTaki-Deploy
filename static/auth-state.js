import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

console.log("auth-state.js loaded");

const firebaseConfig = {
  apiKey: "AIzaSyAA6YDh0NRgZGLisfkFDjrBMH4J7ifogHI",
  authDomain: "healthai-31286.firebaseapp.com",
  projectId: "healthai-31286",
  storageBucket: "healthai-31286.firebasestorage.app",
  messagingSenderId: "1087922261314",
  appId: "1:1087922261314:web:78cb5ac563609094b18cdb",
  measurementId: "G-XYE0JK0RC4"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const authArea = document.getElementById('authArea');
console.log("authArea:", authArea);

function renderLoggedOut() {
  if (!authArea) return;
  authArea.innerHTML = `
    <a href="templates/login.html" class="topbar-login-btn" id="loginLink">
      <i class="fas fa-user-circle"></i>
      <span>Login</span>
    </a>
  `;
}

function renderLoggedIn(user) {
  if (!authArea) return;

  const name = user.displayName || user.email || "User";

  authArea.innerHTML = `
    <div class="topbar-profile">
      <button class="topbar-login-btn" id="profileBtn">
        <i class="fas fa-user-circle"></i>
        <span>${name}</span>
        <i class="fas fa-caret-down profile-caret"></i>
      </button>
      <div class="profile-dropdown" id="profileDropdown">
        <button class="profile-dropdown-item" id="logoutBtn">
          Logout
        </button>
      </div>
    </div>
  `;

  const logoutBtn = document.getElementById('logoutBtn');
  const profileBtn = document.getElementById('profileBtn');
  const dropdown  = document.getElementById('profileDropdown');

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await signOut(auth);
    });
  }

  if (profileBtn && dropdown) {
    profileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });

    // close dropdown when clicking outside
    document.addEventListener('click', () => {
      dropdown.classList.remove('open');
    });
  }
}


onAuthStateChanged(auth, (user) => {
  console.log("onAuthStateChanged fired. User:", user);
  if (user) {
    console.log("User logged in on dashboard:", user.email || user.displayName);
    renderLoggedIn(user);
  } else {
    console.log("No user on dashboard");
    renderLoggedOut();
  }
});
