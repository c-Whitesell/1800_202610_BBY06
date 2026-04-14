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
import { fetchPostsByTags, multiQuery } from "./filter.js";
let activeFilters = [];

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
  //const posts = await fetchPostsByTags(activeFilters, getAverageRating);
  console.log(getURLQueryType());
  console.log(getURLId());
  if (getURLQueryType() == "restaurants") {
    //changing page title
    // 1. Create a reference to the specific document
    const docRef = doc(db, getURLQueryType(), getURLId());
    // 2. Fetch the document snapshot
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      // 3. Extract only the specific fields you need
      const data = docSnap.data();
      const rest_name = data.name;
      const rest_adress = data.address;
      console.log(rest_name);
      console.log(rest_adress);
      // 1. Select the existing H2
      const titleElement = document.getElementById("page-title");
      // 2. Change the text of the H2
      titleElement.textContent = rest_name;
      // 3. Create and insert the H3 right after the H2
      const addressElement = document.createElement("h3");
      addressElement.textContent = rest_adress;
      titleElement.after(addressElement);
    } else {
      console.log("No such restaurant found!");
    }

    var thisQuery = await multiQuery(
      db,
      "posts",
      activeFilters,
      999, //limit
      getURLQueryType(),
      getURLId(),
      "posts",
    );
  } else {
    var thisQuery = await multiQuery(db, "posts", activeFilters);
  }

  const snapshot = await getDocs(thisQuery);

  const posts = [];

  for (const docSnap of snapshot.docs) {
    const post = docSnap.data();

    posts.push({
      ...post,
      id: docSnap.id,
      avgRating: await getAverageRating(docSnap.id),
    });
  }
  renderPosts(posts);
}

window.viewPost = function (id) {
  window.location.href = `postDetails.html?id=${id}`;
};

document.addEventListener("DOMContentLoaded", loadPosts());

// div.querySelector('.favourite-btn').addEventListener('click', (e) => {
//   const icon = e.currentTarget.querySelector('.material-icons');
//   icon.textContent =
//     icon.textContent === 'favorite_border' ? 'favorite' : 'favorite_border';
// });

function renderPosts(posts) {
  const container = document.getElementById("postsContainer");
  container.innerHTML = "";

  for (const post of posts) {
    let starsHTML = "";
    for (let i = 1; i <= 5; i++) {
      starsHTML += `
        <span class="material-icons text-dark" style="font-size: 20px">
          ${i <= Math.round(post.avgRating) ? "star" : "star_outline"}
        </span>
      `;
    }

    const div = document.createElement("div");
    div.className = "col-12 col-md-6 col-lg-4 mb-4";
    div.id = "card_${post.id}";

    div.innerHTML = `
<div class="card h-100 shadow-sm">

  ${
    post.image
      ? `<img src="data:image/*;base64,${post.image}" class="card-img-top">`
      : ""
  }

  <div class="card-body">
    <h5 class="card-title">${post.foodTitle}</h5>
    <p class="card-text">${post.description}</p>
    <p class="card-text"></p>
    <p class="card-text"><b>${post.restuarant}</b></p>
    <p class="card-text"><i>${post.location}</i></p>

    <!--<p class="mb-2">${starsHTML}</p>-->

    <p class="text-muted"><strong>Tags:</strong> ${post.dietaryTags.join(", ")}</p>
  </div>

  <!-- <div class="card-footer bg-transparent border-0">
    <button class="btn bg-info w-100" onclick="viewPost('${post.id}')">
      View Details
    </button>
  </div> -->

</div>
    `;

    container.appendChild(div);
  }
}

//
window.toggleFilter = async function (tag) {
  if (activeFilters.includes(tag)) {
    activeFilters = activeFilters.filter((t) => t !== tag);
  } else {
    activeFilters.push(tag);
  }

  await loadPosts(); // re-fetch from Firestore with filters
};

window.toggleDropdown = function () {
  const dropdown = document.getElementById("filterDropdown");
  dropdown.style.display = dropdown.style.display === "none" ? "block" : "none";
};

window.handleFilterChange = async function (checkbox) {
  const tag = checkbox.value;

  if (checkbox.checked) {
    if (!activeFilters.includes(tag)) {
      activeFilters.push(tag);
    }
  } else {
    activeFilters = activeFilters.filter((t) => t !== tag);
  }

  await loadPosts();
};

window.clearFilters = async function () {
  activeFilters = [];

  // uncheck all boxes
  document
    .querySelectorAll("#filterDropdown input[type='checkbox']")
    .forEach((cb) => (cb.checked = false));

  await loadPosts();
};

//Closes filter drop down if doc is clicked
document.addEventListener("click", function (e) {
  const dropdown = document.getElementById("filterDropdown");

  if (!dropdown.contains(e.target) && !e.target.closest("button")) {
    dropdown.style.display = "none";
  }
});

function getURLId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function getURLQueryType() {
  const params = new URLSearchParams(window.location.search);
  return params.get("type");
}
