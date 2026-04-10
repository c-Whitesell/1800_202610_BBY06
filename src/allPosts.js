import { db } from './firebaseConfig.js';
import { auth } from './firebaseConfig.js';
import {
  doc,
  getDocs,
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  where,
} from 'firebase/firestore';
import * as bootstrap from 'bootstrap';
import { fetchPostsByTags } from './filter.js';
let activeFilters = [];

// Calculate the average rating for each post
async function getAverageRating(postId) {
  const q = query(collection(db, 'reviews'), where('postID', '==', postId));

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
  const posts = await fetchPostsByTags(activeFilters, getAverageRating);
  renderPosts(posts);
}

window.viewPost = function (id) {
  window.location.href = `postDetails.html?id=${id}`;
};

document.addEventListener('DOMContentLoaded', loadPosts);

// div.querySelector('.favourite-btn').addEventListener('click', (e) => {
//   const icon = e.currentTarget.querySelector('.material-icons');
//   icon.textContent =
//     icon.textContent === 'favorite_border' ? 'favorite' : 'favorite_border';
// });

function renderPosts(posts) {
  const container = document.getElementById('postsContainer');
  container.innerHTML = '';

  for (const post of posts) {
    let starsHTML = '';
    for (let i = 1; i <= 5; i++) {
      starsHTML += `
        <span class="material-icons text-dark" style="font-size: 20px">
          ${i <= Math.round(post.avgRating) ? 'star' : 'star_outline'}
        </span>
      `;
    }

    const div = document.createElement('div');
    div.className = 'col-12 col-md-6 col-lg-4 mb-4';

    div.innerHTML = `
<div class="card h-100 shadow-sm">

  ${
    post.image
      ? `<img src="data:image/*;base64,${post.image}" class="card-img-top">`
      : ''
  }

  <div class="card-body">
    <h5 class="card-title">${post.foodTitle}</h5>
    <p class="card-text">${post.description}</p>

    <p class="mb-2">${starsHTML}</p>

    <p class="text-muted"><strong>Tags:</strong> ${post.dietaryTags.join(', ')}</p>
  </div>

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
  const dropdown = document.getElementById('filterDropdown');
  dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
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
document.addEventListener('click', function (e) {
  const dropdown = document.getElementById('filterDropdown');

  if (!dropdown.contains(e.target) && !e.target.closest('button')) {
    dropdown.style.display = 'none';
  }
});
