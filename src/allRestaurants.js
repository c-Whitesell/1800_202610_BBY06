//This is for the page that shows all restaurants as cards, or favorite restaurants of signed in user
import { db } from "./firebaseConfig.js";
import { auth } from "./firebaseConfig.js";
import {
  doc,
  getDocs,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  setDoc,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { multiQuery } from "./filter.js";
let activeFilters = [];

//Fetch the user's favorite restuarant from firestore
async function getUserFavorites(uid) {
  const userRef = doc(db, "users", uid);

  try {
    //Fetch the user document snapshot
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      //Extract the 'favorites' field (empty array if it doesn't exist)
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
//Get user info on authentication and load posts
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

//Load restaurant cards
async function loadPosts() {
  //check authentication
  const auth = getAuth();
  //check if looking at favorites from url, and check if user id exists
  if (getURLQueryType() == "users" && uid != undefined) {
    //Add username to title element
    const titleElement = document.getElementById("page-title");
    titleElement.textContent = username + "'s Favorite Restaurants";

    //query the users favorite restaurants with filters
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
    //query all restaurants with filters
    var thisQuery = await multiQuery(db, "restaurants", activeFilters, 30);
  }
  //get snapshot
  const snapshot = await getDocs(thisQuery);

  const posts = [];
  //add restaurant info to array
  for (const docSnap of snapshot.docs) {
    const post = docSnap.data();

    posts.push({
      ...post,
      id: docSnap.id,
      fav: userFavorites.includes(docSnap.id),
    });
  }
  //render restaurant cards
  renderPosts(posts);
}

//lead to restaurant's post page
window.viewPost = function (id) {
  window.location.href = `allPosts.html?id=${id}&type=restaurants`;
};

//toggle restaurant as user's favorite (icon)
window.toggleFavorite = async (postId) => {
  const user = auth.currentUser;
  if (!user) {
    alert("Please log in to favorite posts!");
    return;
  }
  //toggle restaurant as user's favorite in firestore
  const result = await toggleFavoriteLogic(user.uid, postId);

  const icon = document.querySelector(`#fav-${postId} span`);
  //console.log(icon);
  if (result === "added") {
    icon.textContent = "favorite";
  } else {
    icon.textContent = "favorite_border";
  }
};

//toggle restaurant as user's favorite (firestore)
async function toggleFavoriteLogic(uid, postId) {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  //If user facorites field doesn't exist, create it and add the restaurant
  if (!userSnap.exists()) {
    await setDoc(userRef, { favorites: [postId] });
    return "added";
  }

  //get user favorites
  const userData = userSnap.data();
  const favorites = userData.favorites || [];

  //Check if already favorited
  if (favorites.includes(postId)) {
    // Already exists: Remove restaurant
    await updateDoc(userRef, {
      favorites: arrayRemove(postId),
    });
    return "removed";
  } else {
    // Doesn't exist: Add restaurant
    await updateDoc(userRef, {
      favorites: arrayUnion(postId),
    });
    return "added";
  }
}

//load posts on content load, sometimes happens after authentication
document.addEventListener("DOMContentLoaded", loadPosts());

//renders restaurant cards
function renderPosts(posts) {
  const container = document.getElementById("postsContainer");
  container.innerHTML = "";

  //create HTML for each restaurant card
  for (const post of posts) {
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
    //add restaurant card to container
    container.appendChild(div);
  }
}

//adds/removes dietary tag if in-active/active
window.toggleFilter = async function (tag) {
  if (activeFilters.includes(tag)) {
    activeFilters = activeFilters.filter((t) => t !== tag);
  } else {
    activeFilters.push(tag);
  }

  await loadPosts(); // re-fetch from Firestore with filters
};

//dietary tag filter checkbox dropdown
window.toggleDropdown = function () {
  const dropdown = document.getElementById("filterDropdown");
  dropdown.style.display = dropdown.style.display === "none" ? "block" : "none";
};

//dietary tag filter checkboxes, adds/removes tag if checked/unchecked
window.handleFilterChange = async function (checkbox) {
  const tag = checkbox.value;

  if (checkbox.checked) {
    if (!activeFilters.includes(tag)) {
      activeFilters.push(tag);
    }
  } else {
    activeFilters = activeFilters.filter((t) => t !== tag);
  }
  // re-fetch posts from Firestore with filters
  await loadPosts();
};

// clear filter button
window.clearFilters = async function () {
  activeFilters = [];

  // uncheck all boxes
  document
    .querySelectorAll("#filterDropdown input[type='checkbox']")
    .forEach((cb) => (cb.checked = false));

  await loadPosts(); // re-fetch posts from Firestore with filters
};

//Closes filter drop down if doc is clicked
document.addEventListener("click", function (e) {
  const dropdown = document.getElementById("filterDropdown");

  if (!dropdown.contains(e.target) && !e.target.closest("button")) {
    dropdown.style.display = "none";
  }
});

//get URL parameter: id
function getURLId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

//get URL parameter: type
function getURLQueryType() {
  const params = new URLSearchParams(window.location.search);
  return params.get("type");
}
