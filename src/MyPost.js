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

//Uses post info and Auth to show the currently logged in user their posts.
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

// Shows user their posts on the page
// gives the user the ability to edit or delete a post from this page
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

    card.querySelector(".btn-edit").addEventListener("click", () => {
      card.querySelector(".post-view").classList.add("d-none");
      card.querySelector(".post-edit").classList.remove("d-none");
    });

    card.querySelector(".btn-cancel").addEventListener("click", () => {
      card.querySelector(".post-edit").classList.add("d-none");
      card.querySelector(".post-view").classList.remove("d-none");
    });

    card.querySelector(".btn-save").addEventListener("click", async () => {
      const selectedTags = [];
      card
        .querySelectorAll('.edit-tags input[type="checkbox"]:checked')
        .forEach((cb) => selectedTags.push(cb.value));

      const updatedData = {
        foodTitle: card.querySelector(".edit-foodTitle").value.trim(),
        price: parseFloat(card.querySelector(".edit-price").value) || 0,
        restaurant: card.querySelector(".edit-restaurant").value.trim(),
        location: card.querySelector(".edit-location").value.trim(),
        description: card.querySelector(".edit-description").value.trim(),
        dietaryTags: selectedTags,
      };

      try {
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

// Removes the post from Firestore and the DOM.
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

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("new-post-btn");

  if (btn) {
    btn.addEventListener("click", () => {
      window.location.href = "/post.html";
    });
  }
});
