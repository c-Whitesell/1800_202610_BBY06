import { db, auth } from "/src/firebaseConfig.js";
import {
  doc,
  getDocs,
  addDoc,
  deleteDoc,
  collection,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

// ── Restaurant data (keep in sync with favorite.js) ──────────────────────────
const allRestaurants = [
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

// Helpers
function getRestaurantId() {
  return new URLSearchParams(window.location.search).get("id");
}

function updateStarsUI(rating) {
  document.querySelectorAll("#ratingContainer .star").forEach((star) => {
    star.textContent =
      Number(star.dataset.value) <= rating ? "star" : "star_outline";
    star.classList.toggle("selected", Number(star.dataset.value) <= rating);
  });
}

// Load restaurant info
function loadRestaurant() {
  const rawId = getRestaurantId();
  const id = Number(rawId);
  const restaurant = allRestaurants.find((r) => r.id === id);

  if (!restaurant) {
    document.querySelector(".container").innerHTML =
      `<p class="text-danger mt-4">Restaurant not found. (id=${rawId})</p>`;
    return;
  }

  document.getElementById("restaurantName").textContent = restaurant.name;
  document.getElementById("restaurantAddress").textContent = restaurant.address;

  const img = document.getElementById("restaurantImage");
  img.src = restaurant.image;
  img.alt = restaurant.name;
  img.style.display = "block";
}

// Load reviews
async function loadReviews() {
  const id = getRestaurantId();
  const q = query(
    collection(db, "restaurantReviews"),
    where("restaurantId", "==", id),
  );
  const snapshot = await getDocs(q);
  const container = document.getElementById("reviewsContainer");
  container.innerHTML = "";

  let total = 0,
    count = 0;

  snapshot.forEach((docSnap) => {
    const review = docSnap.data();
    const reviewId = docSnap.id;
    const rating = review.rating ?? 0;
    total += rating;
    count++;

    let starsHTML = "";
    for (let i = 1; i <= 5; i++) {
      starsHTML += `<span class="material-icons text-warning">${i <= rating ? "star" : "star_outline"}</span>`;
    }

    const div = document.createElement("div");
    div.className = "border-bottom py-2";
    div.innerHTML = `
      <p class="mb-1">${starsHTML}</p>
      <p class="mb-1">${review.text}</p>
      <div class="d-flex justify-content-between align-items-center">
        <small class="text-muted">User: ${review.userID}</small>
        ${
          auth.currentUser && auth.currentUser.uid === review.userID
            ? `<button class="btn btn-sm btn-danger delete-review" data-id="${reviewId}">Delete</button>`
            : ""
        }
      </div>
    `;
    container.appendChild(div);
  });

  const avg = count > 0 ? (total / count).toFixed(1) : 0;
  document.getElementById("avgRating").textContent =
    count > 0 ? `Average Rating: ${avg} / 5` : "No ratings yet";
}

// Add review
async function addReview(e) {
  e.preventDefault();
  const text = document.getElementById("reviewText").value.trim();
  const selectedStars = document.querySelectorAll(
    "#ratingContainer .star.selected",
  );
  const rating = selectedStars.length;
  const user = auth.currentUser;
  const id = getRestaurantId();

  if (!user) {
    alert("You must be logged in to leave a review.");
    return;
  }
  if (!text && rating === 0) {
    alert("Please write a review or select a rating.");
    return;
  }

  await addDoc(collection(db, "restaurantReviews"), {
    text,
    userID: user.uid,
    restaurantId: id,
    rating,
    createdAt: serverTimestamp(),
  });

  document.getElementById("reviewForm").reset();
  updateStarsUI(0);
  loadReviews();
}

// DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
  loadRestaurant();

  // Wait for auth to resolve before loading reviews (so delete button shows correctly)
  onAuthStateChanged(auth, () => {
    loadReviews();
  });

  document.getElementById("reviewForm").addEventListener("submit", addReview);

  // Star click handler
  const stars = document.querySelectorAll("#ratingContainer .star");
  stars.forEach((star) => {
    star.addEventListener("click", () => {
      const val = Number(star.dataset.value);
      updateStarsUI(val);
    });
  });

  // Delete review handler
  document
    .getElementById("reviewsContainer")
    .addEventListener("click", async (e) => {
      if (e.target.classList.contains("delete-review")) {
        const reviewId = e.target.dataset.id;
        if (confirm("Delete this review?")) {
          await deleteDoc(doc(db, "restaurantReviews", reviewId));
          loadReviews();
        }
      }
    });
});
