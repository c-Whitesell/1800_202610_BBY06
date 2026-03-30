import { db } from "./firebaseConfig.js";
import { auth } from "./firebaseConfig.js";
import { doc, getDocs, collection, addDoc, serverTimestamp, query, orderBy } from "firebase/firestore";
import * as bootstrap from "bootstrap";

async function loadPosts() {
    const container = document.getElementById("postsContainer");

    const q = query(collection(db, "posts"));
    const snapshot = await getDocs(q);

    container.innerHTML = "";

    snapshot.forEach(doc => {
        const post = doc.data();
        const id = doc.id;

        const div = document.createElement("div");
        div.className = "col-12 mb-4";

        div.innerHTML = `
            <div class="card h-100 shadow-sm">
    <div class="card-body">
      <h5 class="card-title">${post.foodTitle}</h5>
      <p class="card-text">${post.description}</p>
      <p class="text-muted"><strong>Tags:</strong> ${post.dietaryTags.join(", ")}</p>
      <div class="card-body">
            <span class="material-icons star" id="star1">star_outline</span>
            <span class="material-icons star" id="star2">star_outline</span>
            <span class="material-icons star" id="star3">star_outline</span>
            <span class="material-icons star" id="star4">star_outline</span>
            <span class="material-icons star" id="star5">star_outline</span>
      </div>
    </div>
    <div class="card-footer bg-transparent border-0">
      <button class="btn btn-success w-100" onclick="viewPost('${id}')">
        View Details
      </button>
    </div>
  </div>
        `;

        container.appendChild(div);
    });
}

window.viewPost = function(id) {
    window.location.href = `postDetails.html?id=${id}`;
};

document.addEventListener("DOMContentLoaded", loadPosts);

