import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { logoutUser } from "../authentication";
//need to pass image this way to inner html for vite to build properly
import thisLogo from "/images/salad.png";

//defines site top-nav-bar to keep same across all pages
class SiteNavbar extends HTMLElement {
  constructor() {
    super();
    this.renderNavbar();
    this.renderAuthControls();
  }
  //html of navbar-has logo/title and hamburger menu items
  renderNavbar() {
    this.innerHTML = `
       <!-- Navbar: single source of truth -->
        <nav class="navbar navbar-expand-lg navbar-light bg-info">
          <div class="container-fluid">

            <a class="navbar-brand" href="/">
              <img src="${thisLogo}" height="36">
                Thoughtful Food
            </a>

            <button class="navbar-toggler" type="button" 
            data-bs-toggle="offcanvas" data-bs-target="#offcanvasNavbar"
            aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
              <span class="navbar-toggler-icon"></span>
            </button>
           <div class="offcanvas offcanvas-end" tabindex="-1" id="offcanvasNavbar" aria-labelledby="offcanvasNavbarLabel">
  
  <div class="offcanvas-header">
    <h5 class="offcanvas-title" id="offcanvasNavbarLabel">Menu</h5>
    <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
  </div>

  <div class="offcanvas-body">
    <ul class="navbar-nav justify-content-end flex-grow-1 pe-3">
      <li class="nav-item">
        <strong><a class="nav-link" href="/main.html">Home</a></strong>
      </li>
      <li class="nav-item">
        <strong><a class="nav-link" href="./MyPosts.html">My Posts</a></strong>
      </li>
      <li class="nav-item">
        <strong><a class="nav-link" href="./allRestaurants.html?type=users">Favourites</a></strong>
      </li>
      <li class="nav-item">
        <strong><a class="nav-link" href="./allPosts.html">Posts</a></strong>
      </li>
      <li class="nav-item">
        <strong><a class="nav-link" href="./allRestaurants.html">Restaurants</a></strong>
      </li>
    </ul>
    
    <div id="authControls" class="auth-controls d-flex flex-column gap-2 mt-3">
       </div>
  </div>
</div>
          </div>
        </nav>
        `;
  }
  renderAuthControls() {
    const authControls = this.querySelector("#authControls");

    // Initialize with invisible placeholder to maintain layout space
    authControls.innerHTML = `<div class="btn btn-outline-light" style="visibility: hidden; min-width: 80px;">Log out</div>`;
    //user authentication determines what type of log-in/log-out button shows in navbar
    onAuthStateChanged(auth, (user) => {
      let updatedAuthControl;
      if (user) {
        updatedAuthControl = `<button class="btn btn-outline-light" id="signOutBtn" type="button" style="min-width: 80px;">Log out</button>`;
        authControls.innerHTML = updatedAuthControl;
        const signOutBtn = authControls.querySelector("#signOutBtn");
        signOutBtn?.addEventListener("click", logoutUser);
      } else {
        updatedAuthControl = `<a class="btn btn-outline-light" id="loginBtn" href="/login.html" style="min-width: 80px;">Log in</a>`;
        authControls.innerHTML = updatedAuthControl;
      }
    });
  }
}

customElements.define("site-navbar", SiteNavbar);
