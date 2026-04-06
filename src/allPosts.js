import { db } from "./firebaseConfig.js";
import { auth } from "./firebaseConfig.js";
import {
  doc,
  getDocs,
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  where,
} from "firebase/firestore";
import * as bootstrap from "bootstrap";

// Calculate the average rating for each post
async function getAverageRating(postId) {
  const q = query(collection(db, "reviews"), where("postID", "==", postId));

  const snapshot = await getDocs(q);

  let total = 0;
  let count = 0;

  snapshot.forEach((doc) => {
    const r = doc.data().rating ?? 0;
    total += r;
    count++;
  });

  if (count === 0) return 0;

  return total / count;
}

async function loadPosts() {
  const container = document.getElementById("postsContainer");

  const q = query(collection(db, "posts"));
  const snapshot = await getDocs(q);

  container.innerHTML = "";

  for (const docSnap of snapshot.docs) {
    const post = docSnap.data();
    const id = docSnap.id;

    // get average rating
    const avgRating = await getAverageRating(id);

    // build stars
    let starsHTML = "";
    for (let i = 1; i <= 5; i++) {
      starsHTML += `
        <span class="material-icons text-dark" style="font-size: 20px">
          ${i <= Math.round(avgRating) ? "star" : "star_outline"}
        </span>
      `;
    }

    const div = document.createElement("div");
    div.className = "col-12 col-md-6 col-lg-4 mb-4";

    div.innerHTML = `
<div class="card h-100 shadow-sm">

  ${
    post.image
      ? `
  <img 
    src="data:image/*;base64,${post.image}" 
    class="card-img-top" 
    "
  >`
      : ""
  }

  <div class="card-body">
    <h5 class="card-title">${post.foodTitle}</h5>
    <p class="card-text">${post.description}</p>

    <p class="mb-2">${starsHTML}</p>

    <p class="text-muted"><strong>Tags:</strong> ${post.dietaryTags.join(", ")}</p>

 
  </div>

  <div class="card-footer bg-transparent border-0">
    <button class="btn btn-success w-100" onclick="viewPost('${id}')">
      View Details
    </button>
  </div>

</div>
`;

    container.appendChild(div);
  }
}

window.viewPost = function (id) {
  window.location.href = `postDetails.html?id=${id}`;
};

document.addEventListener("DOMContentLoaded", loadPosts);
