(function injectGlobalStyles() {
  const style = document.createElement("style");
  style.textContent = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background: #fff275;
      min-height: 100vh;
      font-family: 'Helvetica Neue', Arial, sans-serif;
    }

    .fav-body {
      padding: 40px 20px 80px;
      max-width: 1100px;
      margin: 0 auto;
    }

    .section-title {
      font-size: 1.75rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      color: #111;
      margin-bottom: 28px;
    }

    /* Grid */
    .product-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
      margin-bottom: 28px;
    }

    /* Card */
    .fav-card {
      background: #fff;
      border-radius: 10px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .fav-card img {
      width: 100%;
      aspect-ratio: 1 / 1;
      object-fit: cover;
      display: block;
    }
    .fav-card-body {
      padding: 14px 14px 10px;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .fav-card-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
    }
    .fav-card-name {
      font-size: 1rem;
      font-weight: 700;
      color: #111;
    }
    .heart-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      font-size: 1.2rem;
      line-height: 1;
      color: #e74c3c;
      transition: transform .15s;
    }
    .heart-btn:hover { transform: scale(1.2); }
    .heart-btn.inactive { color: #ccc; }
    .fav-card-address {
      font-size: 0.82rem;
      color: #888;
    }

    /* View Details button */
    .fav-card-footer {
      padding: 0 14px 14px;
    }
    .btn-view {
      display: block;
      width: 100%;
      padding: 10px;
      background: #2e7d32;
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      text-align: center;
      transition: background .2s;
    }
    .btn-view:hover { background: #1b5e20; }

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

    /* Footer */
    .site-footer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 20px;
      padding: 24px 20px;
    }
    .site-footer .material-icons { font-size: 1.3rem; color: #111; cursor: pointer; }
    .site-footer a { color: #111; text-decoration: none; }
    .footer-copy { font-size: 0.78rem; color: #555; }

    @media (max-width: 640px) {
      .product-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 420px) {
      .product-grid { grid-template-columns: 1fr; }
    }
  `;
  document.head.appendChild(style);
})();

// ── FIREBASE IMPORTS ──────────────────────────────────────────────────────────
import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "./firebaseConfig.js";

let currentUserId = null;

// Product Data
const allProducts = [
  {
    id: 1,
    name: "Veggie Cafe",
    address: "4592 Nash Avenue",
    image:
      "https://th.bing.com/th/id/OIP.6xbT585YV2aY0FPosR9icgHaHa?w=203&h=203&c=7&r=0&o=7&dpr=1.5&pid=1.7&rm=3",
  },
  {
    id: 2,
    name: "Salads Corner",
    address: "4563 Yasas Drive",
    image:
      "https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=400&q=80",
  },
  {
    id: 3,
    name: "Lentil Market",
    address: "4974 Connor Street",
    image:
      "https://th.bing.com/th/id/OIP.vCalokOuknlIeQrTuyQS7wHaFE?w=234&h=180&c=7&r=0&o=7&dpr=1.5&pid=1.7&rm=3",
  },
  {
    id: 4,
    name: "Speckled Corner",
    address: "8472 Austin Avenue",
    image:
      "https://th.bing.com/th/id/OIP.mzRCkF8hiT8J8u1R9DeeBgHaE7?w=297&h=198&c=7&r=0&o=7&dpr=1.5&pid=1.7&rm=3",
  },
  {
    id: 5,
    name: "Celery Club",
    address: "8719 Josh Drive",
    image:
      "https://th.bing.com/th/id/OIP.W6TChWlKXrIHh6w4Y1rLoAHaHa?w=198&h=198&c=7&r=0&o=7&dpr=1.5&pid=1.7&rm=3",
  },
  {
    id: 6,
    name: "Indigo Palace",
    address: "9838 Vancouver Way",
    image:
      "https://th.bing.com/th/id/OIP.WzQNvsjdHwzIny_cZGRMFAHaFc?w=226&h=180&c=7&r=0&o=7&dpr=1.5&pid=1.7&rm=3",
  },
];

const BATCH = 3;
let visibleCount = BATCH;
const likedState = {};
allProducts.forEach((p) => (likedState[p.id] = false));

// ── Sync liked state from Firestore on auth ───────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUserId = user.uid;
    try {
      const snapshot = await getDocs(
        collection(db, "users", currentUserId, "favourites"),
      );
      snapshot.forEach((d) => {
        const data = d.data();
        if (data.itemId) likedState[Number(data.itemId)] = true;
      });
    } catch (err) {
      console.error("Error fetching favourites:", err);
    }
  } else {
    currentUserId = null;
  }
  renderProducts();
});

// ── Build a single card ───────────────────────────────────────────────────────
function createCard(product) {
  const card = document.createElement("div");
  card.className = "fav-card";
  card.innerHTML = `
    <img src="${product.image}" alt="${product.name}" loading="lazy" />
    <div class="fav-card-body">
      <div class="fav-card-header">
        <span class="fav-card-name">${product.name}</span>
        <button class="heart-btn ${likedState[product.id] ? "" : "inactive"}"
                aria-label="Toggle favourite" data-id="${product.id}">&#10084;</button>
      </div>
      <span class="fav-card-address">${product.address}</span>
    </div>
    <div class="fav-card-footer">
      <button class="btn-view" data-id="${product.id}">View Details</button>
    </div>
  `;
  return card;
}

// ── Render grid ───────────────────────────────────────────────────────────────
function renderProducts() {
  const grid = document.getElementById("productGrid");
  const btn = document.getElementById("loadMoreBtn");
  if (!grid) return;
  grid.innerHTML = "";
  allProducts
    .slice(0, visibleCount)
    .forEach((p) => grid.appendChild(createCard(p)));
  if (btn)
    btn.style.display = visibleCount >= allProducts.length ? "none" : "block";
}

// ── Wire up events ────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("loadMoreBtn");
  const grid = document.getElementById("productGrid");

  btn?.addEventListener("click", () => {
    visibleCount = Math.min(visibleCount + BATCH, allProducts.length);
    renderProducts();
  });

  grid?.addEventListener("click", async (e) => {
    // Heart toggle
    const heartBtn = e.target.closest(".heart-btn");
    if (heartBtn) {
      if (!currentUserId) {
        alert("Please log in to save favourites!");
        return;
      }
      const id = Number(heartBtn.dataset.id);
      const isNowLiked = !likedState[id];
      likedState[id] = isNowLiked;
      heartBtn.style.color = isNowLiked ? "#e74c3c" : "#ccc";
      heartBtn.classList.toggle("inactive", !isNowLiked);
      try {
        const docRef = doc(
          db,
          "users",
          currentUserId,
          "favourites",
          id.toString(),
        );
        isNowLiked
          ? await setDoc(docRef, { itemId: id, addedAt: new Date() })
          : await deleteDoc(docRef);
      } catch (err) {
        console.error("Error updating database:", err);
      }
      return;
    }

    // View Details — goes to new restaurant details page
    const viewBtn = e.target.closest(".btn-view");
    if (viewBtn) {
      window.location.href = `favoriteDetails.html?id=${viewBtn.dataset.id}`;
    }
  });
});
