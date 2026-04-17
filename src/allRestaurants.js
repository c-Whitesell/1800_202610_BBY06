/**
 * FILE: allRestaurants.js
 * DESCRIPTION: Shows all restaurants as cards, or favorite restaurants of signed in user
 * with filtering by dietary tags.
 * AUTHOR: BBY-06 team
 * DATE: 2026-04-17
 */
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

/**
 * DESCRIPTION: Retrieves the list of favorite restaurant IDs for a specific user.
 * DATABASE ACCESS: READ (Users collection)
 * @param {string} uid - The unique authentication ID of the user.
 * @returns {Promise<Array>} - Resolves to an array of restaurant IDs.
 */
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

/**
 * DESCRIPTION: Fetches restaurant data from Firestore based on URL context and filters.
 * and displays them as cards
 * DATABASE ACCESS: QUERY (Restaurants collection)
 * @returns {Promise<void>}
 */
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

/**
 * DESCRIPTION: Redirects the browser to a restaurant's specific posts page.
 * @param {string} id - Restaurant document ID.
 * @returns {void}
 */
window.viewPost = function (id) {
  window.location.href = `allPosts.html?id=${id}&type=restaurants`;
};

/**
 * DESCRIPTION: toggles the favorite button; updates UI icon and calls database logic.
 * @param {string} postId - The ID of the restaurant being favorited.
 * @returns {Promise<void>}
 */
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

/**
 * DESCRIPTION: The logic to add/remove a post ID from the favorites field
 * in the users Firestore document.
 * DATABASE ACCESS: READ (User doc), WRITE (Update/Set User doc)
 * @param {string} uid - User ID.
 * @param {string} postId - Restaurant ID.
 * @returns {Promise<string>} - Returns "added" or "removed".
 */
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

/**
 * DESCRIPTION: Adds restaurant cards into the DOM.
 * @param {Array<Object>} posts - The list of restaurant objects to display.
 * @returns {void}
 */
function renderPosts(posts) {
  const container = document.getElementById("postsContainer");
  container.innerHTML = "";

  //create HTML for each restaurant card
  for (const post of posts) {
    const div = document.createElement("div");
    div.className = "col-12 col-md-6 col-lg-4 mb-4";
    div.id = `card_${post.id}`;

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

/**
 * DESCRIPTION: Adds or removes a tag from the activeFilters array and reloads posts.
 * @param {string} tag - The dietary tag to toggle.
 * @returns {Promise<void>}
 */
window.toggleFilter = async function (tag) {
  if (activeFilters.includes(tag)) {
    activeFilters = activeFilters.filter((t) => t !== tag);
  } else {
    activeFilters.push(tag);
  }

  await loadPosts(); // re-fetch from Firestore with filters
};

/**
 * DESCRIPTION: Toggles the visibility of the dietary filter dropdown menu.
 * @returns {void}
 */
window.toggleDropdown = function () {
  const dropdown = document.getElementById("filterDropdown");
  dropdown.style.display = dropdown.style.display === "none" ? "block" : "none";
};

/**
 * DESCRIPTION: Handles checkbox status change to update active filters.
 * @param {HTMLInputElement} checkbox - The checkbox element being toggled.
 * @returns {Promise<void>}
 */
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

/**
 * DESCRIPTION: Resets all active filters and clears filter checkboxes.
 * @returns {Promise<void>}
 */
window.clearFilters = async function () {
  activeFilters = [];

  // uncheck all boxes
  document
    .querySelectorAll("#filterDropdown input[type='checkbox']")
    .forEach((cb) => (cb.checked = false));

  await loadPosts(); // re-fetch posts from Firestore with filters
};

//Closes filter drop down if clicked outside of it
document.addEventListener("click", function (e) {
  const dropdown = document.getElementById("filterDropdown");

  if (!dropdown.contains(e.target) && !e.target.closest("button")) {
    dropdown.style.display = "none";
  }
});

/**
 * DESCRIPTION: get URL parameter: id
 * @returns {string|null} - The ID found in the URL.
 */
function getURLId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

/**
 * DESCRIPTION: get URL parameter: type
 * @returns {string|null} - The query type found in the URL.
 */
function getURLQueryType() {
  const params = new URLSearchParams(window.location.search);
  return params.get("type");
}
