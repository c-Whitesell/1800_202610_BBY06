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

// load post
async function loadPost() {
  const postId = getPostId();
  console.log("Post ID:", postId);

  const docRef = doc(db, "posts", postId);
  const docSnap = await getDoc(docRef);

  const post = docSnap.data();

  document.getElementById("title").innerText = post.foodTitle;
  document.getElementById("description").innerText = post.description;
  document.getElementById("tags").innerText = post.dietaryTags.join(", ");
}

// load reviews
async function loadReviews() {
  const postId = getPostId();

  const q = query(collection(db, "reviews"), where("postID", "==", postId));

  const snapshot = await getDocs(q);
  const container = document.getElementById("reviewsContainer");

  container.innerHTML = "";

  snapshot.forEach((doc) => {
    const review = doc.data();

    const div = document.createElement("div");
    div.className = "border rounded p-2 mb-2";

    div.innerHTML = `
        <p class="mb-1">${review.text}</p>
  <small class="text-muted">User: ${review.userID}</small>
  `;

    container.appendChild(div);
  });
}

// add review
async function addReview(e) {
  e.preventDefault();

  const text = document.getElementById("reviewText").value;
  const user = auth.currentUser;
  const postId = getPostId();

  if (!user) {
    alert("You must be logged in");
    return;
  }

  await addDoc(collection(db, "reviews"), {
    text: text,
    userID: user.uid,
    postID: postId,
    createdAt: serverTimestamp(),
  });

  alert("Review added!");

  loadReviews(); 
}

document.addEventListener("DOMContentLoaded", () => {
  loadPost();
  loadReviews();

  document.getElementById("reviewForm").addEventListener("submit", addReview);
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
