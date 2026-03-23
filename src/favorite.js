(function injectGlobalStyles() {
  const style = document.createElement("style");
  style.textContent = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background: #fff275;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      font-family: 'Helvetica Neue', Arial, sans-serif;
      padding: 40px 20px 80px;
    }

    .page-wrapper {
      background: #f5f5f5;
      border-radius: 16px;
      width: 100%;
      max-width: 960px;
      overflow: hidden;
    }

    /* Navbar */
    .navbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 22px 40px;
      background: #fff;
    }
    .logo {
      font-weight: 800;
      font-size: 1rem;
      letter-spacing: 0.05em;
      color: #111;
    }
    .nav-links {
      display: flex;
      gap: 32px;
    }
    .nav-links a {
      text-decoration: none;
      font-size: 0.78rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      color: #111;
      transition: opacity .2s;
    }
    .nav-links a:hover { opacity: 0.55; }
    .nav-icons {
      display: flex;
      gap: 16px;
      color: #111;
      cursor: pointer;
    }

    /* Main */
    .main-content {
      padding: 48px 40px 40px;
      background: #fff275;
    }
    .section-title {
      font-size: 1.75rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      color: #111;
      margin-bottom: 28px;
    }

    /* Product grid */
    .product-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
      margin-bottom: 28px;
    }
    .product-card { cursor: pointer; }
    .product-card img {
      width: 100%;
      aspect-ratio: 1 / 1;
      object-fit: cover;
      border-radius: 4px;
      display: block;
      background: #e0e0e0;
    }
    .product-info {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-top: 10px;
    }
    .product-name {
      font-size: 0.85rem;
      font-weight: 600;
      color: #111;
    }
    .heart-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      font-size: 1rem;
      line-height: 1;
      color: #e74c3c;
      transition: transform .15s;
    }
    .heart-btn:hover { transform: scale(1.2); }
    .heart-btn.inactive { color: #ccc; }
    .product-meta {
      display: flex;
      justify-content: space-between;
      margin-top: 4px;
    }
    .product-artist { font-size: 0.78rem; color: #888; }
    .product-price  { font-size: 0.78rem; color: #555; }

    /* Load more */
    .load-more {
      display: block;
      width: 100%;
      padding: 16px;
      background: #fff;
      border: 1.5px solid #111;
      border-radius: 2px;
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      cursor: pointer;
      transition: background .2s, color .2s;
    }
    .load-more:hover { background: #111; color: #fff; }

    /* Footer — sits on yellow background below the white card */
    .site-footer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 20px;
      padding: 24px 20px;
      background: transparent;
      width: 100%;
      max-width: 960px;
      margin: 0 auto;
    }
    .site-footer .material-icons { font-size: 1.3rem; color: #111; cursor: pointer; }
    .footer-copy { font-size: 0.78rem; color: #555; }

    /* Responsive */
    @media (max-width: 640px) {
      .product-grid { grid-template-columns: repeat(2, 1fr) !important; }
      .nav-links { gap: 16px !important; }
      .navbar, .main-content { padding-left: 20px !important; padding-right: 20px !important; }
    }
    @media (max-width: 420px) {
      .product-grid { grid-template-columns: 1fr !important; }
      .nav-links { display: none !important; }
    }
  `;
  document.head.appendChild(style);
})();

// ── FIREBASE IMPORTS ──────────────────────────────────────────────────────────
// The path "./firebaseConfig.js" works because both files are in the "src" folder
import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "./firebaseConfig.js";

let currentUserId = null; // Store the logged-in user's ID

// ── Product Data ──────────────────────────────────────────────────────────────
const allProducts = [
  {
    id: 1,
    name: "Veggie Cafe",
    artist: "4592 Nash Avenue",
    price: "$32",
    image:
      "https://th.bing.com/th/id/OIP.6xbT585YV2aY0FPosR9icgHaHa?w=203&h=203&c=7&r=0&o=7&dpr=1.5&pid=1.7&rm=3",
    liked: false, // Defaulting all to false initially
  },
  {
    id: 2,
    name: "Salads Corner",
    artist: "4563 Yasas Drive",
    price: "$17",
    image:
      "https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=400&q=80",
    liked: false,
  },
  {
    id: 3,
    name: "Lentil Market",
    artist: "4974 Connor Street",
    price: "$23",
    image:
      "https://th.bing.com/th/id/OIP.vCalokOuknlIeQrTuyQS7wHaFE?w=234&h=180&c=7&r=0&o=7&dpr=1.5&pid=1.7&rm=3",
    liked: false,
  },
  {
    id: 4,
    name: "Speckled Corner",
    artist: "8472 Austin Avenue",
    price: "$34",
    image:
      "https://th.bing.com/th/id/OIP.mzRCkF8hiT8J8u1R9DeeBgHaE7?w=297&h=198&c=7&r=0&o=7&dpr=1.5&pid=1.7&rm=3",
    liked: false,
  },
  {
    id: 5,
    name: "Celery Club",
    artist: "8719 Josh Drive",
    price: "$21",
    image:
      "https://th.bing.com/th/id/OIP.W6TChWlKXrIHh6w4Y1rLoAHaHa?w=198&h=198&c=7&r=0&o=7&dpr=1.5&pid=1.7&rm=3",
    liked: false,
  },
  {
    id: 6,
    name: "Indigo Palace",
    artist: "9838 Vancouver Way",
    price: "$32",
    image:
      "https://th.bing.com/th/id/OIP.WzQNvsjdHwzIny_cZGRMFAHaFc?w=226&h=180&c=7&r=0&o=7&dpr=1.5&pid=1.7&rm=3",
    liked: false,
  },
];

// ── State ─────────────────────────────────────────────────────────────────────
const BATCH = 3;
let visibleCount = BATCH;
const likedState = {};

// Initialize state to false for all products
allProducts.forEach((p) => (likedState[p.id] = false));

// ── FIREBASE: Sync initial state on load ──────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUserId = user.uid;
    try {
      // Fetch this specific user's favourites from Firestore
      const favRef = collection(db, "users", currentUserId, "favourites");
      const snapshot = await getDocs(favRef);

      // Update the likedState object with data from the database
      snapshot.forEach((doc) => {
        const favData = doc.data();
        if (favData.itemId) {
          likedState[Number(favData.itemId)] = true;
        }
      });

      // Re-render the products now that we know the true liked state
      renderProducts();
    } catch (error) {
      console.error("Error fetching favourites:", error);
    }
  } else {
    currentUserId = null;
    console.log("No user logged in. Showing default state.");
    renderProducts();
  }
});

// ── Build a single product card ───────────────────────────────────────────────
function createCard(product) {
  const card = document.createElement("div");
  card.className = "product-card";
  card.dataset.id = product.id;

  card.innerHTML = `
    <img src="${product.image}" alt="${product.name}" loading="lazy" />
    <div class="product-info">
      <span class="product-name">${product.name}</span>
      <button class="heart-btn ${likedState[product.id] ? "" : "inactive"}"
              aria-label="Toggle favourite" data-id="${product.id}">&#10084;</button>
    </div>
    <div class="product-meta">
      <span class="product-artist">${product.artist}</span>
      <span class="product-price">${product.price}</span>
    </div>
  `;
  return card;
}

// ── Render into the existing #productGrid in your HTML ────────────────────────
function renderProducts() {
  const grid = document.getElementById("productGrid");
  const btn = document.getElementById("loadMoreBtn");
  if (!grid || !btn) return;

  grid.innerHTML = "";
  allProducts
    .slice(0, visibleCount)
    .forEach((p) => grid.appendChild(createCard(p)));
  btn.style.display = visibleCount >= allProducts.length ? "none" : "block";
}

// ── Wire up Load More & Firebase Clicks ───────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  // We wait for Firebase auth state to load before initial render,
  // so we don't call renderProducts() immediately here anymore.

  const btn = document.getElementById("loadMoreBtn");
  const grid = document.getElementById("productGrid");

  btn?.addEventListener("click", () => {
    visibleCount = Math.min(visibleCount + BATCH, allProducts.length);
    renderProducts();
  });

  // Heart toggle — event delegation on the grid
  grid?.addEventListener("click", async (e) => {
    const heartBtn = e.target.closest(".heart-btn");
    if (!heartBtn) return;

    // If no one is logged in, alert them
    if (!currentUserId) {
      alert("Please log in to save favourites!");
      return;
    }

    const id = Number(heartBtn.dataset.id);
    const isNowLiked = !likedState[id]; // Determine the new state

    // 1. Update the UI immediately
    likedState[id] = isNowLiked;
    heartBtn.style.color = isNowLiked ? "#e74c3c" : "#ccc";
    heartBtn.classList.toggle("inactive", !isNowLiked);

    // 2. FIREBASE: Save the change to the database
    try {
      const docRef = doc(
        db,
        "users",
        currentUserId,
        "favourites",
        id.toString(),
      );

      if (isNowLiked) {
        // Add to database
        await setDoc(docRef, {
          itemId: id,
          addedAt: new Date(),
        });
      } else {
        // Remove from database
        await deleteDoc(docRef);
      }
    } catch (error) {
      console.error("Error updating database:", error);
      // Optional: Revert UI if database fails
      // likedState[id] = !isNowLiked;
      // renderProducts();
    }
  });
});
