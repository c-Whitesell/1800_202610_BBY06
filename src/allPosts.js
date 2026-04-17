/**
 * FILE: allPosts.js
 * DESCRIPTION: Handles fetching and rendering of food posts from Firestore.
 * Supports filtering by dietary tags and by specific restaurant.
 * AUTHOR: BBY-06 team
 * DATE: 2026-04-17
 */
import { db } from "./firebaseConfig.js";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
} from "firebase/firestore";
import { multiQuery } from "./filter.js";
let activeFilters = [];

/**
 * DESCRIPTION: Fetches posts from Firestore based on current URL parameters and active filters.
 * DATABASE ACCESS: READ (Restaurant doc), QUERY (Posts collection)
 * @param: None
 * @returns {Promise<void>}: Async function that triggers UI rendering
 */
async function loadPosts() {
  //Check if this page is for a specific restaurant
  if (getURLQueryType() == "restaurants") {
    //Create a reference to the url document id
    const docRef = doc(db, getURLQueryType(), getURLId());
    //Fetch the document snapshot
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      //Extract restaurant data for titles
      const data = docSnap.data();
      const rest_name = data.name;
      const rest_adress = data.address;
      console.log(rest_name);
      console.log(rest_adress);
      //Change Title to restaurant name and restaurant address
      const titleElement = document.getElementById("page-title");
      titleElement.innerHTML =
        rest_name + `</br><small><i>` + rest_adress + `</i></small>`;
    } else {
      //restaurant doesn't exist for id
      console.log("No such restaurant found!");
    }
    //query for posts by restaurant id and dietary tags
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
    //query for posts by dietary tags only
    var thisQuery = await multiQuery(db, "posts", activeFilters);
  }

  //get query snapshot
  const snapshot = await getDocs(thisQuery);

  const posts = [];
  //add posts to post array
  for (const docSnap of snapshot.docs) {
    const post = docSnap.data();

    posts.push({
      ...post,
      id: docSnap.id,
    });
  }
  //render posts
  renderPosts(posts);
}

/**
 * DESCRIPTION: Navigates the user to the detailed view of a specific post.
 * @param {string} id - The Firestore document ID of the post.
 * @returns {void}
 */
window.viewPost = function (id) {
  window.location.href = `postDetails.html?id=${id}`;
};

//loads posts when document finshes loaading
document.addEventListener("DOMContentLoaded", loadPosts());

/**
 * DESCRIPTION: Generates HTML cards for each post and adds them into the DOM.
 * @param {Array<Object>} posts - Array of post objects from Firestore.
 * @returns {void}
 */
function renderPosts(posts) {
  const container = document.getElementById("postsContainer");
  container.innerHTML = "";
  //creates HTML for each post card
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
    <h5 class="card-title">${post.foodTitle}</h5>
    <p class="card-text">${post.description}</p>
    <p class="card-text"></p>
    <p class="card-text"><b>${post.restuarant}</b></p>
    <p class="card-text"><i>${post.location}</i></p>

    <p class="text-muted"><strong>Tags:</strong> ${post.dietaryTags.join(", ")}</p>
  </div>
</div>
    `;
    //adds html post card to post container
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
  // re-fetch posts from Firestore with filters
  await loadPosts();
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
  // re-fetch posts from Firestore with filters
  await loadPosts();
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
