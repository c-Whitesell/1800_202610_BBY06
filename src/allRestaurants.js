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
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  setDoc,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
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

async function getUserFavorites(uid) {
  const userRef = doc(db, "users", uid);

  try {
    // 2. Fetch the document snapshot
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      // 3. Extract the 'favorites' field (default to empty array if it doesn't exist)
      const favorites = userSnap.data().favorites || [];
      console.log("User Favorites:", favorites);
      return favorites;
    } else {
      console.log("No user document found for this UID.");
      return [];
    }
  } catch (error) {
    console.error("Error fetching favorites:", error);
    return [];
  }
}

let uid;
let username;
let userFavorites = [];
onAuthStateChanged(auth, async (user) => {
  if (user) {
    uid = user.uid;
    username = user.displayName;
    userFavorites = await getUserFavorites(uid);
    loadPosts();
  } else {
    userFavorites = [];
    loadPosts();
  }
});

async function loadPosts() {
  //const posts = await fetchPostsByTags(activeFilters, getAverageRating);
  //console.log(getURLQueryType());
  //console.log(getURLId());
  const auth = getAuth();

  if (getURLQueryType() == "users" && uid != undefined) {
    console.log(uid);
    // 1. Select the existing H2
    const titleElement = document.getElementById("page-title");
    // 2. Change the text of the H2
    titleElement.textContent = username + "'s Favorite Restaurants";

    var thisQuery = await multiQuery(
      db,
      "restaurants",
      activeFilters,
      30, //limit
      getURLQueryType(),
      uid,
      "favorites",
    );
  } else {
    var thisQuery = await multiQuery(db, "restaurants", activeFilters, 30);
  }

  const snapshot = await getDocs(thisQuery);

  const posts = [];

  for (const docSnap of snapshot.docs) {
    const post = docSnap.data();

    posts.push({
      ...post,
      id: docSnap.id,
      fav: userFavorites.includes(docSnap.id),
      //avgRating: await getAverageRating(docSnap.id),
    });

    //console.log(posts);
  }
  renderPosts(posts);
}

window.viewPost = function (id) {
  window.location.href = `allPosts.html?id=${id}&type=restaurants`;
};

window.toggleFavorite = async (postId) => {
  const user = auth.currentUser;
  if (!user) {
    alert("Please log in to favorite posts!");
    return;
  }

  const result = await toggleFavoriteLogic(user.uid, postId);

  const icon = document.querySelector(`#fav-${postId} span`);
  //console.log(icon);
  if (result === "added") {
    icon.textContent = "favorite";
  } else {
    icon.textContent = "favorite_border";
  }
};

async function toggleFavoriteLogic(uid, postId) {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  // 1. If user doc doesn't exist, create it and add the favorite
  if (!userSnap.exists()) {
    await setDoc(userRef, { favorites: [postId] });
    return "added";
  }

  const userData = userSnap.data();
  const favorites = userData.favorites || [];

  // 2. Check if already favorited
  if (favorites.includes(postId)) {
    // Already exists -> Remove it
    await updateDoc(userRef, {
      favorites: arrayRemove(postId),
    });
    return "removed";
  } else {
    // Doesn't exist -> Add it
    await updateDoc(userRef, {
      favorites: arrayUnion(postId),
    });
    return "added";
  }
}

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
    /*     let starsHTML = "";
    for (let i = 1; i <= 5; i++) {
      starsHTML += `
        <span class="material-icons text-dark" style="font-size: 20px">
          ${i <= Math.round(post.avgRating) ? "star" : "star_outline"}
        </span>
      `;
    } */

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
    <div class="d-flex justify-content-between align-items-center mb-2">
      <h5 class="card-title mb-0">${post.name}</h5>
      <button 
        id="fav-${post.id}" 
        class="btn btn-link p-0 text-danger" 
        onclick="toggleFavorite('${post.id}')"
        style="text-decoration: none;"
      >
        <span class="material-icons">${post.fav ? "favorite" : "favorite_border"}</span>
      </button>
    </div>
     <p class="card-text">${post.address}</p>

  <div class="card-footer bg-transparent border-0">
    <button class="btn bg-info w-100" onclick="viewPost('${post.id}')">
      View Details
    </button>
  </div>

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
