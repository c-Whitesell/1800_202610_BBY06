//This is for the page that shows all posts as cards, or posts of specific restaurant
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

//Load the posts
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
      //Change Title to restaurant name
      const titleElement = document.getElementById("page-title");
      titleElement.textContent = rest_name;
      //Add restaurant address
      const addressElement = document.createElement("h3");
      addressElement.textContent = rest_adress;
      titleElement.after(addressElement);
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

window.viewPost = function (id) {
  window.location.href = `postDetails.html?id=${id}`;
};

//loads posts when document finshes loaading
document.addEventListener("DOMContentLoaded", loadPosts());

//renders posts from array of post data
function renderPosts(posts) {
  const container = document.getElementById("postsContainer");
  container.innerHTML = "";
  //creates HTML for each post card
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

//adds/removes dietary tag if in-active/active
window.toggleFilter = async function (tag) {
  if (activeFilters.includes(tag)) {
    activeFilters = activeFilters.filter((t) => t !== tag);
  } else {
    activeFilters.push(tag);
  }
  // re-fetch posts from Firestore with filters
  await loadPosts();
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
  // re-fetch posts from Firestore with filters
  await loadPosts();
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
