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

  snapshot.forEach((doc) => {
    const review = doc.data();

    const div = document.createElement("div");
    div.className = "border rounded p-2 mb-2";

    div.innerHTML = `
      ${review.rating ? `<p>Rating: ${"⭐".repeat(review.rating)}${"☆".repeat(5 - review.rating)}</p>` : ""}
      <p class="mb-1">${review.text}</p>
  <small class="text-muted">User: ${review.userID}</small>
  `;

    container.appendChild(div);

    // calculate average rating
    if (review.rating) {
      totalRating += review.rating;
      count++;
    }
  });

  const avgRating = count > 0 ? (totalRating / count).toFixed(1) : 0;
  document.getElementById("avgRating").textContent =
    count > 0 ? `Average Rating: ${avgRating} / 5` : "No ratings yet";
}

// add review
async function addReview(e) {
  e.preventDefault();

  const text = document.getElementById("reviewText").value;
  const rating =
    Number(
      document.querySelector("#ratingContainer .star.selected")?.dataset.value,
    ) || 0;
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

  alert("Review added!");
  document.getElementById("reviewForm").reset();
  updateStarsUI(0); // reset stars
  loadReviews();
}

document.addEventListener("DOMContentLoaded", () => {
  loadPost();
  loadReviews();

  document.getElementById("reviewForm").addEventListener("submit", addReview);

  // handle star clicks
  const stars = document.querySelectorAll("#ratingContainer .star");
  stars.forEach((star) => {
    star.addEventListener("click", () => {
      // mark all stars up to clicked one as selected
      const ratingValue = Number(star.dataset.value);
      stars.forEach((s) => {
        s.classList.remove("selected");
        if (Number(s.dataset.value) <= ratingValue) s.classList.add("selected");
      });
    });
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
