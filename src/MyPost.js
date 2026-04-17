/**
 * FILE: MyPost.js
 * DESCRIPTION: Manages the user's posts page.
 * Allows users to view, edit, and delete their own posts.
 * AUTHOR: BBY-06 Team
 * DATE: 2026-04-17
 */
import { db, auth } from "./firebaseConfig.js";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

// Uses Auth and then handles posts creation.
onAuthStateChanged(auth, (user) => {
  if (user) {
    fetchUserPosts(user.uid);
  } else {
    console.log("No user signed in.");
    const container = document.getElementById("posts-container");
    if (container) {
      container.innerHTML = "<p>Please log in to see your posts.</p>";
    }
  }
});

/**
 * DESCRIPTION: Fetches all post documents from Firestore that match the logged-in user's ID.
 * DATABASE ACCESS: QUERY (Posts collection filtered by userID)
 * @param {string} userId - The user ID of the authenticated user.
 * @returns {Promise<void>}
 */
async function fetchUserPosts(userId) {
  const postsContainer = document.getElementById("posts-container");
  try {
    const postsRef = collection(db, "posts");
    const userPostsQuery = query(postsRef, where("userID", "==", userId));
    const querySnapshot = await getDocs(userPostsQuery);

    const posts = [];
    querySnapshot.forEach((docSnap) => {
      posts.push({ id: docSnap.id, ...docSnap.data() });
    });

    displayPostsOnPage(posts);
  } catch (error) {
    console.error("Error fetching user posts:", error);
    if (postsContainer) {
      postsContainer.innerHTML =
        "<p>Error loading posts. Please try again.</p>";
    }
  }
}

/**
 * DESCRIPTION: Dynamically generates cards for each post and attaches event listeners for CRUD operations.
 * @param {Array<Object>} posts - List of post objects retrieved from Firestore.
 * @returns {void}
 */
function displayPostsOnPage(posts) {
  const postsContainer = document.getElementById("posts-container");
  if (!postsContainer) return;

  console.log(posts);
  postsContainer.innerHTML = "";

  if (posts.length === 0) {
    postsContainer.innerHTML = "<p>You have no posts yet.</p>";
    return;
  }

  posts.forEach((post) => {
    const card = document.createElement("div");
    card.classList.add("post-card");
    card.dataset.id = post.id;

    card.innerHTML = `
      <div class="post-view">
        <h3>${post.foodTitle ?? "Untitled"}</h3>
        <img src="data:image/*;base64,${post.image}" class="card-img-top">
        <p><strong>Price:</strong> $${post.price ?? "—"}</p>
        <p><strong>Restaurant:</strong> ${post.restuarant ?? "—"}</p>
        <p><strong>Location:</strong> ${post.location ?? "—"}</p>
        <div class="post-section">
          <p class="section-title">Description</p>
          <p>${post.description ?? ""}</p>
        </div>
        <p><strong>Tags:</strong></p>
        <div class="tags-container">
          ${(post.dietaryTags || [])
            .map((tag) => `<span class="tag">${tag}</span>`)
            .join("")}
        </div>
        <div class="post-actions">
          <button class="btn-edit">Edit</button>
          <button class="btn-delete">Delete</button>
        </div>
      </div>

      <div class="post-edit d-none">
        <input  class="edit-foodTitle"   value="${post.foodTitle ?? ""}"   placeholder="Food title" />
        <input  class="edit-price"       value="${post.price ?? ""}"       placeholder="Price"      type="number" />
        <input  class="edit-restaurant"    value="${post.restaurant ?? ""}"    placeholder="Restaurant"   />
        <input  class="edit-location"    value="${post.location ?? ""}"    placeholder="Location"   />
        <textarea class="edit-description" placeholder="Description">${post.description ?? ""}</textarea>
        <div class="edit-tags">
          <label><input type="checkbox" value="Vegetarian"> Vegetarian</label>
          <label><input type="checkbox" value="Vegan"> Vegan</label>
          <label><input type="checkbox" value="Halal"> Halal</label>
          <label><input type="checkbox" value="Gluten-Free"> Gluten-Free</label>
        </div>
        <div class="post-actions">
          <button class="btn-save">Save</button>
          <button class="btn-cancel">Cancel</button>
        </div>
      </div>
    `;
    const checkboxes = card.querySelectorAll(
      '.edit-tags input[type="checkbox"]',
    );

    checkboxes.forEach((cb) => {
      if ((post.dietaryTags || []).includes(cb.value)) {
        cb.checked = true;
      }
    });
    //event listener for edit button
    card.querySelector(".btn-edit").addEventListener("click", () => {
      card.querySelector(".post-view").classList.add("d-none");
      card.querySelector(".post-edit").classList.remove("d-none");
    });
    //event listener for cancel edits button
    card.querySelector(".btn-cancel").addEventListener("click", () => {
      card.querySelector(".post-edit").classList.add("d-none");
      card.querySelector(".post-view").classList.remove("d-none");
    });

    //event listener for save edits button
    card.querySelector(".btn-save").addEventListener("click", async () => {
      const selectedTags = [];
      card
        .querySelectorAll('.edit-tags input[type="checkbox"]:checked')
        .forEach((cb) => selectedTags.push(cb.value));

      // get updated post data
      const updatedData = {
        foodTitle: card.querySelector(".edit-foodTitle").value.trim(),
        price: parseFloat(card.querySelector(".edit-price").value) || 0,
        restaurant: card.querySelector(".edit-restaurant").value.trim(),
        location: card.querySelector(".edit-location").value.trim(),
        description: card.querySelector(".edit-description").value.trim(),
        dietaryTags: selectedTags,
      };

      try {
        // Update the post in Firestore
        await updateDoc(doc(db, "posts", post.id), updatedData);

        card.querySelector(".post-view").innerHTML = `
          <h3>${updatedData.foodTitle}</h3>
          <p><strong>Price:</strong> $${updatedData.price}</p>
           <p><strong>Restaurant:</strong> ${updatedData.restaurant}</p>
          <p><strong>Location:</strong> ${updatedData.location}</p>
          <p>${updatedData.description}</p>

          <p><strong>Tags:</strong></p>
          <div class="tags-container">
            ${(updatedData.dietaryTags || [])
              .map((tag) => `<span class="tag">${tag}</span>`)
              .join("")}
          </div>

          <div class="post-actions">
          <button class="btn-edit">Edit</button>
          <button class="btn-delete">Delete</button>
          </div>
        `;

        card.querySelector(".btn-edit").addEventListener("click", () => {
          card.querySelector(".post-view").classList.add("d-none");
          card.querySelector(".post-edit").classList.remove("d-none");
        });
        card
          .querySelector(".btn-delete")
          .addEventListener("click", () => handleDelete(post.id, card));

        card.querySelector(".post-edit").classList.add("d-none");
        card.querySelector(".post-view").classList.remove("d-none");
      } catch (error) {
        console.error("Error updating post:", error);
        alert("Could not save changes. Please try again.");
      }
    });

    card
      .querySelector(".btn-delete")
      .addEventListener("click", () => handleDelete(post.id, card));

    postsContainer.appendChild(card);
  });
}

/**
 * DESCRIPTION: Removes the post from Firestore and the DOM.
 * DATABASE ACCESS: WRITE (DeleteDoc)
 * @param {string} postId - The document ID to remove.
 * @param {HTMLElement} cardElement - The DOM element to remove upon success.
 * @returns {Promise<void>}
 */
async function handleDelete(postId, cardElement) {
  if (!confirm("Delete this post?")) return;
  try {
    await deleteDoc(doc(db, "posts", postId));
    cardElement.remove();

    const container = document.getElementById("posts-container");
    if (container && container.children.length === 0) {
      container.innerHTML = "<p>You have no posts yet.</p>";
    }
  } catch (error) {
    console.error("Error deleting post:", error);
    alert("Could not delete post. Please try again.");
  }
}

// Add new post button in bottom right of page
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("new-post-btn");

  if (btn) {
    btn.addEventListener("click", () => {
      window.location.href = "/post.html";
    });
  }
});
