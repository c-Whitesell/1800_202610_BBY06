import { db } from "./firebaseConfig.js";
import { auth } from "./firebaseConfig.js";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  where,
  deleteDoc,
} from "firebase/firestore";
import * as bootstrap from "bootstrap";

function getPostId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

// Update stars visually
function updateStarsUI(rating) {
  const stars = document.querySelectorAll("#ratingContainer .star");
  stars.forEach((star) => {
    star.textContent =
      Number(star.dataset.value) <= rating ? "star" : "star_outline";
  });
}

// load post
async function loadPost() {
  const postId = getPostId();
  console.log("Post ID:", postId);

  const docRef = doc(db, "posts", postId);
  const docSnap = await getDoc(docRef);

  const post = docSnap.data();

  console.log("Image exists?", post.image?.length);

  document.getElementById("title").innerText = post.foodTitle;
  document.getElementById("description").innerText = post.description;
  document.getElementById("tags").innerText = post.dietaryTags.join(", ");

  if (post.image) {
    document.getElementById("postImage").src =
      `data:image/*;base64,${post.image}`;
  }
}

// load reviews
async function loadReviews() {
  const postId = getPostId();

  const q = query(collection(db, "reviews"), where("postID", "==", postId));

  const snapshot = await getDocs(q);
  const container = document.getElementById("reviewsContainer");

  container.innerHTML = "";

  let totalRating = 0;
  let count = 0;

  snapshot.forEach((docSnap) => {
    const review = docSnap.data();
    const reviewId = docSnap.id;

    const div = document.createElement("div");
    div.className = "border rounded p-2 mb-2";

    const rating = review.rating ?? 0;

    totalRating += rating;
    count++;

    let starsHTML = "";
    for (let i = 1; i <= 5; i++) {
      starsHTML += `<span class="material-icons text-secondary" style="font-size: 20px">${i <= rating ? "star" : "star_outline"}</span>`;
    }

    div.innerHTML = `
    <p>${starsHTML}</p>
    <p class="mb-1">${review.text}</p>
    <div class="d-flex justify-content-between align-items-center">
  <small class="text-muted">User: ${review.userID}</small>
  ${
    auth.currentUser && auth.currentUser.uid === review.userID
      ? `<button class="btn btn-sm btn-danger delete-review" data-id="${reviewId}">
          Delete
        </button>`
      : ""
  }
</div>
  `;

    container.appendChild(div);
  });

  const avgRating = count > 0 ? (totalRating / count).toFixed(1) : 0;
  document.getElementById("avgRating").textContent =
    count > 0 ? `Average Rating: ${avgRating} / 5` : "No ratings yet";
}

// add review
async function addReview(e) {
  e.preventDefault();

  const text = document.getElementById("reviewText").value;
  const selectedStars = document.querySelectorAll(
    "#ratingContainer .star.selected",
  );
  const rating = selectedStars.length;
  const user = auth.currentUser;
  const postId = getPostId();

  if (!user) {
    alert("You must be logged in");
    return;
  }

  if (!text && rating === 0) {
    alert("Please add a review or select a rating.");
    return;
  }

  await addDoc(collection(db, "reviews"), {
    text: text,
    userID: user.uid,
    postID: postId,
    rating: rating,
    createdAt: serverTimestamp(),
  });

  document.getElementById("reviewForm").reset();
  updateStarsUI(0); // reset stars
  loadReviews();

  const modal = new bootstrap.Modal(
    document.getElementById("reviewSuccessModal"),
  );
  modal.show();
}

let reviewToDelete = null;

document.addEventListener("DOMContentLoaded", () => {
  loadPost();
  loadReviews();

  document.getElementById("reviewForm").addEventListener("submit", addReview);

  // handle star clicks
  const stars = document.querySelectorAll("#ratingContainer .star");
  stars.forEach((star) => {
    star.addEventListener("click", () => {
      const ratingValue = Number(star.dataset.value);

      // update selected class
      stars.forEach((s) => {
        s.classList.remove("selected");
        if (Number(s.dataset.value) <= ratingValue) {
          s.classList.add("selected");
        }
      });

      // update star icons
      updateStarsUI(ratingValue);
    });
  });

  // Delete Handler
  document.getElementById("reviewsContainer").addEventListener("click", (e) => {
    const btn = e.target.closest(".delete-review");

    if (btn) {
      reviewToDelete = btn.dataset.id;

      const modal = new bootstrap.Modal(document.getElementById("deleteModal"));
      modal.show();
    }
  });

  document
    .getElementById("confirmDelete")
    .addEventListener("click", async () => {
      if (!reviewToDelete) return;

      await deleteDoc(doc(db, "reviews", reviewToDelete));

      reviewToDelete = null;

      const modalEl = document.getElementById("deleteModal");
      const modal = bootstrap.Modal.getInstance(modalEl);
      modal.hide();

      loadReviews();
    });
});

function showAlert(message) {
  const container = document.getElementById("alertContainer");

  container.innerHTML = `
    <div class="alert alert-success alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  `;
}
