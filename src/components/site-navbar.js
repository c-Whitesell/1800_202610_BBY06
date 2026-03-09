import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { logoutUser } from '../authentication';

class SiteNavbar extends HTMLElement {
  constructor() {
    super();
    this.renderNavbar();
    this.renderAuthControls();
  }

  renderNavbar() {
    this.innerHTML = `
       <!-- Navbar: single source of truth -->
        <nav class="navbar navbar-expand-lg navbar-light bg-info">
          <div class="container-fluid">

            <a class="navbar-brand" href="/">
              <img src="/images/salad.png" height="36">
                Thoughtful Food
            </a>

            <button class="navbar-toggler" type="button" 
            data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent"
            aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
              <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarSupportedContent">
              
              <div class="ms-auto d-flex align-items-center gap-2" id="rightControls">
              <ul class="navbar-nav ms-auto">
                
                <li class="nav-item">
                  <a class="nav-link" href="/">Home</a>
                </li>

                <li class="nav-item">
                  <a class="nav-link" href="./post.html">Post</a>
                </li>
                
                <li class="nav-item">
                  <a class="nav-link" href="./favourite.html">Favourites</a>
                </li>

                <li class="nav-item">
                  <a class="nav-link" href="./help.html">Help</a>
                </li>

                <div id="authControls" class="auth-controls d-flex align-items-center gap-2 my-2 my-lg-0">
                  <!-- populated by JS -->
                </div>
                </ul>
              </div>

            </div>
          </div>
        </nav>
        `;
  }
  renderAuthControls() {
    const authControls = this.querySelector('#authControls');

    // Initialize with invisible placeholder to maintain layout space
    authControls.innerHTML = `<div class="btn btn-outline-light" style="visibility: hidden; min-width: 80px;">Log out</div>`;

    onAuthStateChanged(auth, (user) => {
      let updatedAuthControl;
      if (user) {
        updatedAuthControl = `<button class="btn btn-outline-light" id="signOutBtn" type="button" style="min-width: 80px;">Log out</button>`;
        authControls.innerHTML = updatedAuthControl;
        const signOutBtn = authControls.querySelector('#signOutBtn');
        signOutBtn?.addEventListener('click', logoutUser);
      } else {
        updatedAuthControl = `<a class="btn btn-outline-light" id="loginBtn" href="/login.html" style="min-width: 80px;">Log in</a>`;
        authControls.innerHTML = updatedAuthControl;
      }
    });
  }
}

customElements.define('site-navbar', SiteNavbar);
